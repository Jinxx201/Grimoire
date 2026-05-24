/* ============================================================
   GRIMOIRE v3 — epub.js
   IndexedDB Storage · Epub Parser · Reader UI
   ============================================================ */


/* ── IndexedDB Setup ──────────────────────────────────────── */
const DB_NAME    = 'grimoire-epub-db';
const DB_VERSION = 1;
const STORE_NAME = 'epubs';

function openEpubDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'ficId' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function saveEpub(ficId, arrayBuffer, fileName) {
  const db = await openEpubDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ ficId, data: arrayBuffer, fileName, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

async function loadEpub(ficId) {
  const db = await openEpubDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(ficId);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function deleteEpub(ficId) {
  const db = await openEpubDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(ficId);
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

async function hasEpub(ficId) {
  const record = await loadEpub(ficId);
  return !!record;
}

// Check which fics have epubs and cache the result
let _epubCache = {};

async function refreshEpubCache() {
  const db = await openEpubDB();
  return new Promise((resolve) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAllKeys();
    req.onsuccess = e => {
      _epubCache = {};
      (e.target.result || []).forEach(k => { _epubCache[k] = true; });
      resolve(_epubCache);
    };
    req.onerror = () => resolve({});
  });
}

function epubCached(ficId) {
  return !!_epubCache[ficId];
}


/* ── Upload Trigger ───────────────────────────────────────── */
function triggerEpubUpload(ficId) {
  let inp = document.getElementById('_epub-input');
  if (!inp) {
    inp          = document.createElement('input');
    inp.type     = 'file';
    inp.accept   = '*/*';   // no filter — lets Android show all files in Downloads
    inp.id       = '_epub-input';
    inp.style.display = 'none';
    document.body.appendChild(inp);
  }
  inp.value    = '';
  inp.onchange = e => handleEpubFile(ficId, e.target.files[0]);
  inp.click();
}

async function handleEpubFile(ficId, file) {
  if (!file) return;

  // Validate it's actually an epub (by extension or mime type)
  const isEpub = file.name.toLowerCase().endsWith('.epub')
    || file.type === 'application/epub+zip'
    || file.type === 'application/octet-stream';

  if (!isEpub) {
    alert(`"${file.name}" doesn't look like an epub file. Please select a .epub file.`);
    return;
  }

  // Show loading state on the button
  const btn = document.querySelector(`[data-epub-btn="${ficId}"]`);
  if (btn) { btn.textContent = '⏳ saving…'; btn.disabled = true; }

  try {
    const buffer = await file.arrayBuffer();
    await saveEpub(ficId, buffer, file.name);
    _epubCache[ficId] = true;

    // Mark fic as having an epub
    fics = fics.map(f => f.id === ficId ? { ...f, hasEpub: true } : f);
    save();
    render();
  } catch (err) {
    alert('Could not save epub: ' + err.message);
    if (btn) { btn.textContent = '📎 upload epub'; btn.disabled = false; }
  }
}

async function removeEpub(ficId) {
  if (!confirm('Remove the uploaded epub? You can re-upload anytime.')) return;
  await deleteEpub(ficId);
  delete _epubCache[ficId];
  fics = fics.map(f => f.id === ficId ? { ...f, hasEpub: false } : f);
  save();
  render();
}


/* ── Epub Parser ──────────────────────────────────────────── */
async function parseEpub(arrayBuffer) {
  // epub is a zip file — use JSZip loaded via CDN
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip not loaded');
  }

  const zip      = await JSZip.loadAsync(arrayBuffer);
  const chapters = [];
  let   title    = '';
  let   cover    = null;

  // 1. Read container.xml to find the OPF file path
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Not a valid epub — missing container.xml');

  const opfPathMatch = containerXml.match(/full-path="([^"]+\.opf)"/i);
  if (!opfPathMatch) throw new Error('Could not find OPF path');

  const opfPath    = opfPathMatch[1];
  const opfDir     = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const opfContent = await zip.file(opfPath)?.async('text');
  if (!opfContent) throw new Error('Could not read OPF file');

  // 2. Parse OPF for title and manifest
  const parser  = new DOMParser();
  const opfDoc  = parser.parseFromString(opfContent, 'application/xml');

  // Title
  const titleEl = opfDoc.querySelector('title,dc\\:title');
  if (titleEl) title = titleEl.textContent.trim();

  // Build manifest: id → { href, mediaType }
  const manifest = {};
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    manifest[item.getAttribute('id')] = {
      href:      item.getAttribute('href'),
      mediaType: item.getAttribute('media-type') || ''
    };
  });

  // 3. Get spine order
  const spineItems = [...opfDoc.querySelectorAll('spine itemref')].map(i => i.getAttribute('idref'));

  // 4. Read cover image if present
  const coverId  = opfDoc.querySelector('meta[name="cover"]')?.getAttribute('content');
  const coverItem = coverId ? manifest[coverId] : null;
  if (coverItem && coverItem.mediaType.startsWith('image/')) {
    try {
      const imgData  = await zip.file(opfDir + coverItem.href)?.async('base64');
      if (imgData) cover = `data:${coverItem.mediaType};base64,${imgData}`;
    } catch (_) {}
  }

  // 5. Read each spine item as a chapter
  for (const idref of spineItems) {
    const item = manifest[idref];
    if (!item || !item.mediaType.includes('html')) continue;

    const filePath = opfDir + item.href;
    const rawHtml  = await zip.file(filePath)?.async('text');
    if (!rawHtml) continue;

    // Parse and clean the chapter HTML
    const chDoc   = parser.parseFromString(rawHtml, 'text/html');
    const bodyEl  = chDoc.querySelector('body');
    if (!bodyEl) continue;

    // Extract chapter title from h1/h2/h3 or <title>
    const headingEl = chDoc.querySelector('h1,h2,h3');
    const pageTitle = chDoc.querySelector('title');
    let chapterTitle = headingEl?.textContent.trim()
      || pageTitle?.textContent.trim()
      || `Chapter ${chapters.length + 1}`;

    // Clean up the HTML — keep only safe text elements
    cleanEpubHtml(bodyEl);

    chapters.push({
      title:   chapterTitle,
      html:    bodyEl.innerHTML,
      index:   chapters.length
    });
  }

  if (!chapters.length) throw new Error('No readable chapters found in epub');

  return { title, cover, chapters };
}

function cleanEpubHtml(el) {
  // Remove scripts, styles, forms
  ['script','style','form','input','button','iframe','object','embed'].forEach(tag => {
    el.querySelectorAll(tag).forEach(n => n.remove());
  });

  // Strip all attributes except a few safe ones from all elements
  const SAFE_ATTRS = new Set(['href','src','alt','title']);
  el.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attr => {
      if (!SAFE_ATTRS.has(attr.name)) node.removeAttribute(attr.name);
    });
  });
}


/* ── Reader State ─────────────────────────────────────────── */
let _reader = {
  ficId:        null,
  chapters:     [],
  chapterIndex: 0,
  fontSize:     18,
  theme:        'dark',
  font:         'crimson',
  scrollPos:    0
};

const READER_SETTINGS_KEY = 'grimoire-reader-settings';

function loadReaderSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(READER_SETTINGS_KEY) || '{}');
    if (s.fontSize) _reader.fontSize = s.fontSize;
    if (s.font)     _reader.font     = s.font;
    // Theme: use saved preference, or auto-match system dark/light mode
    if (s.theme) {
      _reader.theme = s.theme;
    } else {
      _reader.theme = window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light' : 'dark';
    }
  } catch (_) {}
}

function saveReaderSettings() {
  localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify({
    fontSize: _reader.fontSize,
    theme:    _reader.theme,
    font:     _reader.font
  }));
}

// Per-fic reading position
const READER_POS_KEY = 'grimoire-reader-pos';

function saveReaderPos(ficId, chapterIndex, scrollPos) {
  try {
    const all = JSON.parse(localStorage.getItem(READER_POS_KEY) || '{}');
    all[ficId] = { chapterIndex, scrollPos };
    localStorage.setItem(READER_POS_KEY, JSON.stringify(all));
  } catch (_) {}
}

function loadReaderPos(ficId) {
  try {
    const all = JSON.parse(localStorage.getItem(READER_POS_KEY) || '{}');
    return all[ficId] || { chapterIndex: 0, scrollPos: 0 };
  } catch (_) { return { chapterIndex: 0, scrollPos: 0 }; }
}


/* ── Open Reader ──────────────────────────────────────────── */
async function openReader(ficId) {
  const fic = fics.find(f => f.id === ficId);
  if (!fic) return;

  // Show loading screen
  showReaderLoading(fic.title);

  try {
    const record = await loadEpub(ficId);
    if (!record) throw new Error('Epub not found — please re-upload');

    const parsed = await parseEpub(record.data);
    loadReaderSettings();

    const pos = loadReaderPos(ficId);
    _reader.ficId        = ficId;
    _reader.chapters     = parsed.chapters;
    _reader.chapterIndex = Math.min(pos.chapterIndex, parsed.chapters.length - 1);
    _reader.scrollPos    = pos.scrollPos;

    renderReader(fic, parsed);
  } catch (err) {
    hideReaderLoading();
    alert('Could not open epub: ' + err.message);
  }
}

function showReaderLoading(title) {
  document.getElementById('app').style.display     = 'none';
  document.getElementById('fab').style.display     = 'none';
  document.getElementById('hamburger').style.display = 'none';

  let el = document.getElementById('reader-root');
  if (!el) {
    el    = document.createElement('div');
    el.id = 'reader-root';
    document.body.appendChild(el);
  }

  el.innerHTML = `
    <div class="reader-loading">
      <div class="reader-loading-rune">📖</div>
      <div class="reader-loading-title">${title}</div>
      <div class="reader-loading-msg">opening…</div>
    </div>`;
  el.style.display = 'flex';
}

function hideReaderLoading() {
  document.getElementById('app').style.display     = '';
  document.getElementById('fab').style.display     = 'flex';
  document.getElementById('hamburger').style.display = '';
  const el = document.getElementById('reader-root');
  if (el) el.style.display = 'none';
}


/* ── Render Reader ────────────────────────────────────────── */
function renderReader(fic, parsed) {
  const el = document.getElementById('reader-root');
  if (!el) return;

  const chapter = _reader.chapters[_reader.chapterIndex];
  const total   = _reader.chapters.length;

  el.innerHTML = `
    <div class="reader-wrap reader-theme-${_reader.theme}" id="reader-wrap">

      <!-- Top Bar -->
      <div class="reader-topbar" id="reader-topbar">
        <button class="reader-back-btn" onclick="closeReader()">← back</button>
        <button class="reader-fic-title reader-title-btn" onclick="openDetail(${fic.id})" title="tap for story info">${fic.title}</button>
        <button class="reader-settings-btn" onclick="toggleReaderSettings()">Aa</button>
      </div>

      <!-- Settings Panel -->
      <div class="reader-settings-panel" id="reader-settings-panel" style="display:none">
        <div class="reader-settings-row">
          <span class="reader-settings-lbl">font size</span>
          <div class="reader-font-controls">
            <button class="reader-ctrl-btn" onclick="changeFontSize(-1)">A−</button>
            <span class="reader-font-val" id="reader-font-val">${_reader.fontSize}px</span>
            <button class="reader-ctrl-btn" onclick="changeFontSize(1)">A+</button>
          </div>
        </div>
        <div class="reader-settings-row">
          <span class="reader-settings-lbl">theme</span>
          <div class="reader-theme-controls">
            <button class="reader-theme-btn ${_reader.theme === 'dark'  ? 'active' : ''}" onclick="setReaderTheme('dark')">dark</button>
            <button class="reader-theme-btn ${_reader.theme === 'sepia' ? 'active' : ''}" onclick="setReaderTheme('sepia')">sepia</button>
            <button class="reader-theme-btn ${_reader.theme === 'light' ? 'active' : ''}" onclick="setReaderTheme('light')">light</button>
          </div>
        </div>
        <div class="reader-settings-row">
          <span class="reader-settings-lbl">font</span>
          <div class="reader-theme-controls">
            <button class="reader-theme-btn ${_reader.font === 'crimson' ? 'active' : ''}" style="font-family:'Crimson Text',serif" onclick="setReaderFont('crimson')">Crimson</button>
            <button class="reader-theme-btn ${_reader.font === 'georgia' ? 'active' : ''}" style="font-family:Georgia,serif"        onclick="setReaderFont('georgia')">Georgia</button>
            <button class="reader-theme-btn ${_reader.font === 'system'  ? 'active' : ''}" style="font-family:system-ui,sans-serif" onclick="setReaderFont('system')">System</button>
          </div>
        </div>
        <div class="reader-settings-row" style="border-top:1px solid var(--r-border);padding-top:10px;margin-top:4px">
          <span class="reader-settings-lbl" style="color:var(--r-dim)">epub</span>
          <button class="reader-ctrl-btn" style="color:#e06070;border-color:rgba(155,27,48,.4)" onclick="confirmRemoveEpub()">remove epub</button>
        </div>
      </div>

      <!-- Highlight Bar (appears on text selection) -->
      <div class="hl-bar" id="hl-bar" style="display:none">
        <span class="hl-bar-label">highlight</span>
        ${HL_COLORS.map(c => `
          <button class="hl-color-swatch ${c.value === _hlColor ? 'active' : ''}"
            style="background:${c.value}" data-color="${c.value}"
            onclick="hlPickColor('${c.value}')"></button>
        `).join('')}
        <button class="hl-do-btn" id="hl-do-btn">✓</button>
        <button class="hl-undo-btn" id="hl-undo-btn" style="display:none" title="undo last highlight">↩</button>
      </div>

      <!-- Chapter Content -->
      <div class="reader-scroll" id="reader-scroll">
        <div class="reader-chapter-title">
          ${chapter.title}
          ${chapter.html ? (() => {
            const words = chapter.html.replace(/<[^>]+>/g,'').split(/\s+/).filter(Boolean).length;
            const mins  = Math.ceil(words / 250);
            return `<span class="reader-read-time">${mins} min read</span>`;
          })() : ''}
        </div>
        <div class="reader-body" id="reader-body" style="font-size:${_reader.fontSize}px;font-family:${FONTS[_reader.font] || FONTS.crimson}">
          ${chapter.html}
        </div>
        <div class="reader-chapter-end">
          — end of chapter —
          ${_reader.chapterIndex < _reader.chapters.length - 1
            ? `<div class="reader-pull-hint">swipe up for next chapter ↑</div>`
            : `<div class="reader-pull-hint">you've reached the end ✦</div>`}
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="reader-bottombar">
        <button class="reader-nav-btn" onclick="readerPrevChapter()" ${_reader.chapterIndex === 0 ? 'disabled' : ''}>‹ prev</button>
        <button class="reader-toc-btn" onclick="toggleReaderTOC()">
          ${_reader.chapterIndex + 1} / ${total}
        </button>
        <button class="reader-nav-btn" onclick="readerNextChapter()" ${_reader.chapterIndex === total - 1 ? 'disabled' : ''}>next ›</button>
      </div>

      <!-- Table of Contents -->
      <div class="reader-toc-overlay" id="reader-toc" style="display:none" onclick="closeReaderTOC()">
        <div class="reader-toc-panel" onclick="event.stopPropagation()">
          <div class="reader-toc-title">chapters</div>
          <div class="reader-toc-list">
            ${_reader.chapters.map((ch, i) => `
              <div class="reader-toc-item ${i === _reader.chapterIndex ? 'active' : ''}"
                onclick="jumpToChapter(${i})">${ch.title}</div>
            `).join('')}
          </div>
        </div>
      </div>

    </div>`;

  el.style.display = 'flex';

  // Restore scroll position
  requestAnimationFrame(() => {
    const scroll = document.getElementById('reader-scroll');
    if (scroll && _reader.scrollPos) scroll.scrollTop = _reader.scrollPos;
  });

  // Auto-save scroll position as user reads
  const scroll = document.getElementById('reader-scroll');
  if (scroll) {
    scroll.addEventListener('scroll', () => {
      _reader.scrollPos = scroll.scrollTop;
      saveReaderPos(_reader.ficId, _reader.chapterIndex, _reader.scrollPos);
      // Close settings panel when user starts scrolling
      const panel = document.getElementById('reader-settings-panel');
      if (panel && panel.style.display !== 'none') panel.style.display = 'none';
    }, { passive: true });

    // Close settings panel when tapping anywhere in the scroll area
    scroll.addEventListener('touchstart', () => {
      const panel = document.getElementById('reader-settings-panel');
      if (panel && panel.style.display !== 'none') panel.style.display = 'none';
    }, { passive: true });
  }

  // Apply saved highlights for this chapter
  hlApply(_reader.ficId, _reader.chapterIndex);
  hlAttach(_reader.ficId, _reader.chapterIndex);

  // Tap center of screen to show/hide top bar
  const readerScroll = document.getElementById('reader-scroll');
  if (readerScroll) {
    readerScroll.addEventListener('click', e => {
      const midZone = window.innerHeight * 0.3;
      const y = e.clientY;
      if (y > midZone && y < window.innerHeight - midZone) {
        const topbar = document.getElementById('reader-topbar');
        if (topbar) topbar.classList.toggle('hidden');
      }
    });

    // ── Swipe-up for next chapter, swipe-down for prev ──────
    let _touchStartY    = 0;
    let _touchStartTime = 0;

    readerScroll.addEventListener('touchstart', e => {
      _touchStartY    = e.touches[0].clientY;
      _touchStartTime = Date.now();
    }, { passive: true });

    readerScroll.addEventListener('touchend', e => {
      const dy       = _touchStartY - e.changedTouches[0].clientY; // positive = swipe up
      const elapsed  = Date.now() - _touchStartTime;
      const velocity = Math.abs(dy) / elapsed; // px/ms

      // Must be a fast, intentional swipe (not just a slow scroll release)
      if (Math.abs(dy) < 60 || velocity < 0.3) return;

      const atBottom = readerScroll.scrollHeight - readerScroll.scrollTop
                       <= readerScroll.clientHeight + 40;
      const atTop    = readerScroll.scrollTop <= 10;

      if (dy > 0 && atBottom) {
        // Swipe UP at bottom of page → next chapter
        if (_reader.chapterIndex < _reader.chapters.length - 1) {
          showChapterFlash('next');
          setTimeout(readerNextChapter, 220);
        }
      } else if (dy < 0 && atTop) {
        // Swipe DOWN at top of page → previous chapter
        if (_reader.chapterIndex > 0) {
          showChapterFlash('prev');
          setTimeout(readerPrevChapter, 220);
        }
      }
    }, { passive: true });
  }
}


/* ── Chapter Transition Flash ─────────────────────────────── */
function showChapterFlash(direction) {
  let el = document.getElementById('chapter-flash');
  if (!el) {
    el    = document.createElement('div');
    el.id = 'chapter-flash';
    el.className = 'chapter-flash';
    document.getElementById('reader-wrap')?.appendChild(el);
  }
  el.textContent = direction === 'next' ? 'next chapter →' : '← prev chapter';
  el.classList.remove('fade-out');
  void el.offsetWidth; // force reflow
  el.classList.add('fade-out');
}


/* ── Reader Controls ──────────────────────────────────────── */
function closeReader() {
  // Save position before closing
  const scroll = document.getElementById('reader-scroll');
  if (scroll) saveReaderPos(_reader.ficId, _reader.chapterIndex, scroll.scrollTop);

  // Sync chapter progress back to fic tracker
  if (_reader.ficId) {
    const chapterNum = _reader.chapterIndex + 1;
    fics = fics.map(f => {
      if (f.id !== _reader.ficId) return f;
      return { ...f, progress: Math.max(f.progress || 0, chapterNum) };
    });
    save();
  }

  hideReaderLoading();
  _reader.ficId = null;
  render();
}

function readerNextChapter() {
  if (_reader.chapterIndex >= _reader.chapters.length - 1) return;
  _reader.chapterIndex++;
  _reader.scrollPos = 0;
  saveReaderPos(_reader.ficId, _reader.chapterIndex, 0);
  refreshReaderChapter();
}

function readerPrevChapter() {
  if (_reader.chapterIndex <= 0) return;
  _reader.chapterIndex--;
  _reader.scrollPos = 0;
  saveReaderPos(_reader.ficId, _reader.chapterIndex, 0);
  refreshReaderChapter();
}

function jumpToChapter(index) {
  _reader.chapterIndex = index;
  _reader.scrollPos    = 0;
  saveReaderPos(_reader.ficId, index, 0);
  closeReaderTOC();
  refreshReaderChapter();
}

function refreshReaderChapter() {
  const chapter  = _reader.chapters[_reader.chapterIndex];
  const total    = _reader.chapters.length;
  const body     = document.getElementById('reader-body');
  const title    = document.querySelector('.reader-chapter-title');
  const tocBtn   = document.querySelector('.reader-toc-btn');
  const prevBtn  = document.querySelector('.reader-nav-btn:first-child');
  const nextBtn  = document.querySelector('.reader-nav-btn:last-child');

  if (body)    { hlDetach(); body.innerHTML = chapter.html; }
  if (title)   title.textContent    = chapter.title;
  if (tocBtn)  tocBtn.textContent   = `${_reader.chapterIndex + 1} / ${total}`;
  if (prevBtn) prevBtn.disabled     = _reader.chapterIndex === 0;
  if (nextBtn) nextBtn.disabled     = _reader.chapterIndex === total - 1;

  // Reset scroll
  const scroll = document.getElementById('reader-scroll');
  if (scroll) scroll.scrollTop = 0;

  // Update TOC active item
  document.querySelectorAll('.reader-toc-item').forEach((el, i) => {
    el.classList.toggle('active', i === _reader.chapterIndex);
  });

  // Re-apply highlights for new chapter
  hlApply(_reader.ficId, _reader.chapterIndex);
  hlAttach(_reader.ficId, _reader.chapterIndex);
}

function changeFontSize(delta) {
  _reader.fontSize = Math.max(12, Math.min(28, _reader.fontSize + delta));
  const body = document.getElementById('reader-body');
  const val  = document.getElementById('reader-font-val');
  if (body) body.style.fontSize = _reader.fontSize + 'px';
  if (val)  val.textContent     = _reader.fontSize + 'px';
  saveReaderSettings();
}

function setReaderTheme(theme) {
  _reader.theme = theme;
  const wrap = document.getElementById('reader-wrap');
  if (wrap) wrap.className = `reader-wrap reader-theme-${theme}`;
  document.querySelectorAll('.reader-theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === theme);
  });
  saveReaderSettings();
}

function setReaderFont(font) {
  _reader.font = font;
  const body = document.getElementById('reader-body');
  if (body) body.style.fontFamily = FONTS[font] || FONTS.crimson;
  document.querySelectorAll('.reader-theme-btn').forEach(btn => {
    const map = { Crimson: 'crimson', Georgia: 'georgia', System: 'system' };
    if (map[btn.textContent.trim()] !== undefined) {
      btn.classList.toggle('active', map[btn.textContent.trim()] === font);
    }
  });
  saveReaderSettings();
}

function confirmRemoveEpub() {
  const ficId = _reader.ficId;
  if (!ficId) return;
  const fic = fics.find(f => f.id === ficId);
  if (!confirm(`Remove the uploaded epub for "${fic?.title || 'this fic'}"? You can re-upload anytime.`)) return;
  closeReader();
  removeEpub(ficId);
}

function toggleReaderSettings() {
  const panel = document.getElementById('reader-settings-panel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleReaderTOC() {
  const toc = document.getElementById('reader-toc');
  if (toc) toc.style.display = toc.style.display === 'none' ? 'flex' : 'none';
}

function closeReaderTOC() {
  const toc = document.getElementById('reader-toc');
  if (toc) toc.style.display = 'none';
}


/* ── Init: refresh epub cache on load ────────────────────── */
refreshEpubCache().then(() => {
  // Re-render once we know which fics have epubs
  if (typeof render === 'function') render();
});

/* ── Highlights ───────────────────────────────────────────── */
const HL_KEY = 'grimoire-highlights';

const HL_COLORS = [
  { label: 'yellow', value: 'rgba(255,220,50,0.35)'  },
  { label: 'pink',   value: 'rgba(255,100,150,0.35)' },
  { label: 'green',  value: 'rgba(80,210,130,0.35)'  },
  { label: 'blue',   value: 'rgba(80,160,255,0.35)'  },
];
let _hlColor  = HL_COLORS[0].value;
let _lastHlId = null;   // tracks last-added highlight id for undo

function hlLoad(ficId) {
  try { return JSON.parse(localStorage.getItem(HL_KEY) || '{}')[ficId] || []; }
  catch (_) { return []; }
}

function hlSave(ficId, list) {
  try {
    const all = JSON.parse(localStorage.getItem(HL_KEY) || '{}');
    all[ficId] = list;
    localStorage.setItem(HL_KEY, JSON.stringify(all));
  } catch (_) {}
}

function hlApply(ficId, chIdx) {
  const body = document.getElementById('reader-body');
  if (!body) return;
  let html = _reader.chapters[chIdx]?.html || '';
  const list = hlLoad(ficId).filter(h => h.chapterIndex === chIdx);
  list.forEach(h => {
    const safe = h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(
      new RegExp(safe),
      `<mark class="rdr-hl" style="background:${h.color};border-radius:2px;padding:0 1px" data-hlid="${h.id}">${h.text}</mark>`
    );
  });
  body.innerHTML = html;

  // Tap a highlight to remove it
  body.querySelectorAll('.rdr-hl').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const id = parseInt(el.dataset.hlid);
      const updated = hlLoad(ficId).filter(h => h.id !== id);
      hlSave(ficId, updated);
      hlApply(ficId, chIdx);
      hlAttach(ficId, chIdx);
    });
  });
}

function hlAttach(ficId, chIdx) {
  const body = document.getElementById('reader-body');
  const bar  = document.getElementById('hl-bar');
  if (!body || !bar) return;

  // Show undo button only when there are highlights to undo
  _syncUndoBtn(ficId, chIdx);

  function onSelectionChange() {
    const sel  = window.getSelection();
    const text = sel?.toString().trim();
    if (text && text.length > 1 && body.contains(sel.anchorNode)) {
      // Don't offer to highlight text that's already highlighted
      const existing = hlLoad(ficId).filter(h => h.chapterIndex === chIdx);
      const alreadyDone = existing.some(h =>
        h.text.includes(text) || text.includes(h.text)
      );
      bar.style.display = alreadyDone ? 'none' : 'flex';
    } else {
      bar.style.display = 'none';
    }
  }

  document.addEventListener('selectionchange', onSelectionChange);
  body._hlSelHandler = onSelectionChange;

  document.getElementById('hl-do-btn')?.addEventListener('click', () => {
    const sel  = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 2) return;

    // Final duplicate guard
    const existing = hlLoad(ficId).filter(h => h.chapterIndex === chIdx);
    if (existing.some(h => h.text.includes(text) || text.includes(h.text))) {
      sel.removeAllRanges();
      bar.style.display = 'none';
      return;
    }

    const newId = Date.now();
    _lastHlId   = newId;
    const list  = hlLoad(ficId);
    list.push({ id: newId, chapterIndex: chIdx, text, color: _hlColor });
    hlSave(ficId, list);
    sel.removeAllRanges();
    bar.style.display = 'none';
    hlApply(ficId, chIdx);
    hlAttach(ficId, chIdx);
  });

  document.getElementById('hl-undo-btn')?.addEventListener('click', () => {
    if (!_lastHlId) return;
    const updated = hlLoad(ficId).filter(h => h.id !== _lastHlId);
    hlSave(ficId, updated);
    _lastHlId = updated.length ? updated[updated.length - 1].id : null;
    hlApply(ficId, chIdx);
    hlAttach(ficId, chIdx);
  });
}

function _syncUndoBtn(ficId, chIdx) {
  const btn      = document.getElementById('hl-undo-btn');
  const existing = hlLoad(ficId).filter(h => h.chapterIndex === chIdx);
  if (btn) btn.style.display = existing.length ? 'flex' : 'none';
}

function hlDetach() {
  const body = document.getElementById('reader-body');
  if (body?._hlSelHandler) {
    document.removeEventListener('selectionchange', body._hlSelHandler);
    body._hlSelHandler = null;
  }
  const bar = document.getElementById('hl-bar');
  if (bar) bar.style.display = 'none';
}

function hlPickColor(color) {
  _hlColor = color;
  document.querySelectorAll('.hl-color-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.color === color);
  });
}
