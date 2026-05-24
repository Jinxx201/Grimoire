/* ============================================================
   GRIMOIRE v3 — form.js
   Add/Edit Sheet · AO3 Parser · Categories Management
   ============================================================ */


/* ── Tag Chip Input ───────────────────────────────────────── */
let _liveTags = [];

function _commitTagFromInput(input) {
  const val = input.value.trim();
  if (val && !_liveTags.includes(val)) {
    _liveTags.push(val);
    syncTagHidden();
    renderTagChips();
  }
  input.value = '';
}

function handleTagKey(e) {
  const input = e.target;

  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    e.stopPropagation();
    _commitTagFromInput(input);
    return false;
  }

  if (e.key === 'Backspace' && !input.value && _liveTags.length) {
    _liveTags.pop();
    syncTagHidden();
    renderTagChips();
  }
}

// Wire up tag input listeners once the DOM is ready.
// Using addEventListener (not inline onkeydown) is required for mobile —
// soft-keyboard "Next"/"Done" buttons may not fire keydown on the element
// if only an inline attribute handler is present.
document.addEventListener('DOMContentLoaded', function () {
  const tagInput = document.getElementById('f-tropes-input');
  if (!tagInput) return;

  tagInput.addEventListener('keydown', handleTagKey);

  // Safety net: if focus leaves the field with text still in it
  // (e.g. mobile "Next" button bypassed keydown), commit it as a chip.
  tagInput.addEventListener('blur', function () {
    _commitTagFromInput(this);
  });
});

function removeTag(idx) {
  _liveTags.splice(idx, 1);
  syncTagHidden();
  renderTagChips();
}

function syncTagHidden() {
  const hidden = document.getElementById('f-tropes');
  if (hidden) hidden.value = _liveTags.join(', ');
}

function renderTagChips() {
  const container = document.getElementById('tag-chips-live');
  if (!container) return;
  container.innerHTML = _liveTags.map((t, i) =>
    `<span class="live-tag-chip">${t}<button class="live-tag-remove" onclick="removeTag(${i})">✕</button></span>`
  ).join('');
}

function loadTagsIntoInput(tagsArray) {
  _liveTags = [...(tagsArray || [])];
  syncTagHidden();
  renderTagChips();
}

function clearTagInput() {
  _liveTags = [];
  syncTagHidden();
  renderTagChips();
  const inp = document.getElementById('f-tropes-input');
  if (inp) inp.value = '';
}


/* ── Quick Add (after URL detection) ─────────────────────── */
function showQuickAdd() {
  const bar = document.getElementById('quick-add-bar');
  if (bar) {
    bar.style.display = 'block';
    setTimeout(() => {
      const inp = document.getElementById('quick-title');
      if (inp) inp.focus();
    }, 80);
  }
}

function hideQuickAdd() {
  const bar = document.getElementById('quick-add-bar');
  if (bar) bar.style.display = 'none';
  const qt = document.getElementById('quick-title');
  const qa = document.getElementById('quick-author');
  if (qt) qt.value = '';
  if (qa) qa.value = '';
}

function quickAdd() {
  const title  = (document.getElementById('quick-title')?.value  || '').trim();
  const author = (document.getElementById('quick-author')?.value || '').trim();
  const link   = gv('f-link');

  if (!title) {
    const inp = document.getElementById('quick-title');
    if (inp) { inp.style.borderColor = '#e06070'; inp.focus(); }
    return;
  }

  // Detect if FFN link for status defaults
  const isFFN = link && link.includes('fanfiction.net');

  fics.push({
    id:            Date.now(),
    title,
    author:        author || '',
    pairing:       '',
    fandom:        '',
    rating:        'M',
    tropes:        [],
    words:         null,
    totalChapters: '?/?',
    ficStatus:     'ongoing',
    yourStatus:    'want',
    progress:      0,
    link:          link || null,
    ao3WorkId:     null,
    yourRating:    0,
    plot:          '',
    notes:         '',
    categories:    []
  });

  save();
  closeSheet();
  go('shelf');

  // Flash a subtle confirmation
  setTimeout(() => {
    const cards = document.querySelectorAll('.fic-card');
    if (cards.length) cards[0].style.animation = 'none';
  }, 100);
}


/* ── Sheet Open / Close ───────────────────────────────────── */
function openSheet() {
  editingId = null;
  document.getElementById('sheet-title').textContent  = '✦ add a fic';
  document.getElementById('sheet-submit').textContent = '✦ add to grimoire';
  document.getElementById('paste-box').style.display      = '';
  document.getElementById('paste-divider').style.display  = '';
  document.getElementById('overlay').style.display        = 'flex';
  document.getElementById('fab').style.display            = 'none';
  document.getElementById('hamburger').style.display      = 'none';
}

function openEdit(id) {
  const f = fics.find(x => x.id === id);
  if (!f) return;
  editingId = id;

  document.getElementById('sheet-title').textContent  = '✎ edit fic';
  document.getElementById('sheet-submit').textContent = '✔ save changes';
  document.getElementById('paste-box').style.display      = 'none';
  document.getElementById('paste-divider').style.display  = 'none';

  sf('f-title',     f.title);
  sf('f-author',    f.author);
  sf('f-pairing',   f.pairing);
  sf('f-fandom',    f.fandom || '');
  sf('f-rating',    f.rating);
  sf('f-chapters',  f.totalChapters);
  sf('f-words',     f.words);
  sf('f-ficstatus', f.ficStatus);
  sf('f-link',      f.link);
  loadTagsIntoInput(f.tropes || []);
  sf('f-plot',      f.plot);
  sf('f-notes',     f.notes);
  sf('f-series',    f.seriesName  || '');
  sf('f-seriesorder', f.seriesOrder || '');

  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('fab').style.display     = 'none';
  document.getElementById('hamburger').style.display = 'none';

  setTimeout(() => {
    const sheet = document.querySelector('.sheet');
    if (sheet) sheet.scrollTop = 0;
  }, 50);
}

function closeSheet() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('fab').style.display     = 'flex';
  document.getElementById('hamburger').style.display = '';

  ['f-title','f-author','f-pairing','f-fandom','f-chapters','f-words',
   'f-link','f-plot','f-notes','paste-area','f-series','f-seriesorder'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  clearTagInput();

  document.getElementById('f-rating').value    = 'M';
  document.getElementById('f-ficstatus').value = 'ongoing';
  hideQuickAdd();
  document.getElementById('parse-status').innerHTML = '';

  const hiddenId = document.getElementById('f-ao3id');
  if (hiddenId) hiddenId.value = '';

  editingId = null;
}

function overlayClick(e) {
  if (e.target === document.getElementById('overlay')) closeSheet();
}


/* ── Submit Form ──────────────────────────────────────────── */
function submitForm() {
  const title = gv('f-title');
  if (!title) {
    const el = document.getElementById('f-title');
    el.style.borderColor = '#e06070';
    el.focus();
    return;
  }

  // Duplicate check — only for new fics, not edits
  if (!editingId) {
    const author = gv('f-author').toLowerCase();
    const dupe   = fics.find(f =>
      f.title.toLowerCase() === title.toLowerCase() &&
      (f.author || '').toLowerCase() === author
    );
    if (dupe) {
      const go = confirm(`"${title}" by ${gv('f-author') || 'this author'} is already in your Grimoire.\n\nAdd it anyway?`);
      if (!go) return;
    }
  }

  const parsedAo3Id = (document.getElementById('f-ao3id')?.value || '').trim() || null;
  const newLink     = gv('f-link') || null;

  if (editingId) {
    upd(editingId, f => ({
      ...f,
      title,
      author:        gv('f-author')    || f.author,
      pairing:       gv('f-pairing')   || f.pairing,
      fandom:        gv('f-fandom')    || f.fandom  || null,
      rating:        gv('f-rating')    || f.rating,
      tropes:        gv('f-tropes').split(',').map(t => t.trim()).filter(Boolean),
      words:         parseInt(gv('f-words')) || f.words || null,
      totalChapters: gv('f-chapters')  || f.totalChapters,
      ficStatus:     gv('f-ficstatus') || f.ficStatus,
      link:          newLink           || f.link || null,
      ao3WorkId:     parsedAo3Id       || extractAo3Id(newLink) || f.ao3WorkId || null,
      plot:          gv('f-plot'),
      notes:         gv('f-notes'),
      seriesName:    gv('f-series')     || null,
      seriesOrder:   parseInt(gv('f-seriesorder')) || null
    }));
  } else {
    fics.push({
      id:            Date.now(),
      title,
      author:        gv('f-author'),
      pairing:       gv('f-pairing')   || 'Unknown',
      fandom:        gv('f-fandom')    || null,
      rating:        gv('f-rating')    || 'M',
      tropes:        gv('f-tropes').split(',').map(t => t.trim()).filter(Boolean),
      words:         parseInt(gv('f-words')) || null,
      totalChapters: gv('f-chapters')  || '?/?',
      ficStatus:     gv('f-ficstatus') || 'ongoing',
      yourStatus:    'want',
      progress:      0,
      link:          newLink,
      ao3WorkId:     parsedAo3Id || extractAo3Id(newLink) || null,
      yourRating:    0,
      plot:          gv('f-plot'),
      notes:         gv('f-notes'),
      seriesName:    gv('f-series')     || null,
      seriesOrder:   parseInt(gv('f-seriesorder')) || null,
      rereadCount:   0
    });
    save();
    go('shelf');
  }

  closeSheet();
}


/* ── AO3 / FFN Snippet Parser ─────────────────────────────── */
function parseSnippet() {
  const raw = document.getElementById('paste-area').value.trim();
  const st  = document.getElementById('parse-status');

  if (!raw) {
    st.innerHTML = '<span class="parse-err">paste something first</span>';
    return;
  }

  // ── FFN URL detection ─────────────────────────────────────
  // ── URL detection — try FicHub API for auto-fill ─────────
  const ffnMatch  = raw.match(/(?:https?:\/\/)?(?:www\.|m\.)?fanfiction\.net\/s\/(\d+)/i);
  const ao3Match  = raw.match(/(?:https?:\/\/)?archiveofourown\.org\/works\/(\d+)/i);
  const hasHtml   = /<[a-z]/i.test(raw);
  const isUrlOnly = !raw.includes('\n') && !hasHtml && (ffnMatch || ao3Match);

  if (isUrlOnly) {
    // Normalise the URL
    let cleanUrl;
    if (ffnMatch) {
      cleanUrl = `https://www.fanfiction.net/s/${ffnMatch[1]}/1/`;
    } else {
      cleanUrl = `https://archiveofourown.org/works/${ao3Match[1]}`;
    }

    sf('f-link', cleanUrl);
    st.innerHTML = '<span class="parse-ok">⟳ fetching fic details…</span>';

    // Call FicHub metadata API — free, public, handles Cloudflare for FFN
    const apiUrl = `https://fichub.net/api/v0/meta?q=${encodeURIComponent(cleanUrl)}`;

    fetch(apiUrl, {
      headers: { 'User-Agent': 'Grimoire-App/1.0 +fanfic-tracker' }
    })
    .then(r => r.json())
    .then(data => {
      if (data.err !== 0 && data.err !== undefined) throw new Error(data.msg || 'FicHub error');

      const meta = data.meta || data;

      // Title
      const title = meta.title || meta.source?.title || '';
      if (title) sf('f-title', title);

      // Author
      const author = meta.author || meta.source?.author || '';
      if (author) sf('f-author', author);

      // Summary / plot
      const summary = meta.desc || meta.description || meta.summary || '';
      if (summary) sf('f-plot', summary.replace(/<[^>]+>/g, ''));

      // Words
      const words = meta.words || meta.numWords || '';
      if (words) sf('f-words', String(words).replace(/,/g, ''));

      // Chapters
      const chaps = meta.chapters || meta.numChapters || '';
      if (chaps) sf('f-chapters', chaps);

      // Status
      const status = meta.status || '';
      if (status.toLowerCase().includes('complet')) sf('f-ficstatus', 'complete');
      else if (status.toLowerCase().includes('progress') || status === 'ongoing') sf('f-ficstatus', 'ongoing');

      // Rating
      const rating = meta.rating || '';
      if (rating.includes('M') || rating.includes('Mature')) sf('f-rating', 'M');
      else if (rating.includes('E') || rating.includes('Explicit')) sf('f-rating', 'E');
      else if (rating.includes('T') || rating.includes('Teen')) sf('f-rating', 'T');
      else if (rating.includes('G') || rating.includes('General')) sf('f-rating', 'G');

      // Tags / tropes
      const tags = meta.tags || meta.freeformTags || [];
      const tagList = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim());
      if (tagList.length) loadTagsIntoInput(tagList.filter(Boolean));

      // Fandom
      const fandom = meta.fandom || meta.fandoms?.[0] || '';
      if (fandom) sf('f-fandom', fandom);

      st.innerHTML = `<span class="parse-ok">✔ details filled from FicHub — check and adjust if needed</span>`;
      showQuickAdd();
    })
    .catch(err => {
      // FicHub failed — fall back to quick-add with just the link saved
      st.innerHTML = `<span class="parse-ok">✔ link saved — FicHub unavailable, fill details manually</span>`;
      showQuickAdd();
    });

    return;
  }

  // ── Full HTML snippet parse ───────────────────────────────
  try {
    const doc  = new DOMParser().parseFromString(raw, 'text/html');
    const text = doc.body.innerText || doc.body.textContent || '';

    let title = '', author = '', pairing = '', rating = 'M',
        tropes = [], words = null, chapters = '?/?',
        ficStatus = 'ongoing', notes = '', link = '';

    const anchors = doc.querySelectorAll('a');

    // Title & link — AO3 /works/ anchor
    for (const a of anchors) {
      const strong = a.querySelector('strong');
      if (strong && a.href && a.href.includes('/works/')) {
        title = strong.textContent.trim();
        link  = a.href.replace(/^about:/, '').trim();
        if (link.startsWith('/')) link = 'https://archiveofourown.org' + link;
        break;
      }
    }

    // FF.net fallback
    if (!title) {
      for (const a of anchors) {
        const strong = a.querySelector('strong');
        if (strong && a.href && a.href.includes('fanfiction.net')) {
          title = strong.textContent.trim();
          link  = a.href;
          break;
        }
      }
    }

    // Final fallback
    if (!title) {
      const s = doc.querySelector('strong');
      if (s) title = s.textContent.trim();
    }

    // Author — /users/ or /u/ link
    for (const a of anchors) {
      const strong = a.querySelector('strong');
      if (strong && a.href && (a.href.includes('/users/') || a.href.includes('/u/'))) {
        author = strong.textContent.trim();
        break;
      }
    }

    // Word count — format: (199529 words) or 199,529 words
    const wm = text.match(/\(([0-9,]+)\s+words?\)/i)
             || text.match(/([0-9,]+)\s+words?/i);
    if (wm) words = parseInt(wm[1].replace(/,/g, '')) || null;

    // Chapters
    const cm = text.match(/Chapters?:\s*([\d?]+\/[\d?]+)/i);
    if (cm) {
      chapters = cm[1];
      const pts = chapters.split('/');
      ficStatus = (pts[0] === pts[1] && pts[1] !== '?') ? 'complete' : 'ongoing';
    }

    // Rating — stop at next field keyword
    const FIELD_STOP = /Warnings?:|Relationships?:|Characters?:|Additional Tags?:|Summary:|Fandom:|Chapters?:|Rating:/i;
    const rm = text.match(/Rating:\s*(.+?)(?=\s*(?:Warnings?:|Relationships?:|Characters?:|Additional Tags?:|Summary:|Fandom:|$))/i);
    if (rm) {
      const rt = rm[1].toLowerCase().trim();
      if      (rt.includes('explicit')) rating = 'E';
      else if (rt.includes('mature'))   rating = 'M';
      else if (rt.includes('teen'))     rating = 'T';
      else                              rating = 'G';
    }

    // Pairing — first relationship, stop at next field
    const relm = text.match(/Relationships?:\s*(.+?)(?=\s*(?:Characters?:|Additional Tags?:|Summary:|Warnings?:|Rating:|$))/i);
    if (relm) {
      pairing = relm[1].trim()
        .split(',')[0]
        .replace(/\s*-\s*Relationship\s*/gi, '')
        .trim();
    }

    // Tropes / tags — stop at next field
    const tagm = text.match(/Additional Tags?:\s*(.+?)(?=\s*(?:Summary:|Characters?:|Relationships?:|Rating:|Warnings?:|$))/i);
    if (tagm) {
      tropes = tagm[1].split(',').map(t => t.trim()).filter(Boolean).slice(0, 8);
    }

    // Fandom
    const fanm = text.match(/Fandom:\s*(.+?)(?=\s*(?:Rating:|Warnings?:|Relationships?:|Characters?:|Additional Tags?:|Summary:|$))/i);
    if (fanm) {
      const fandom = fanm[1].trim().split(',')[0].trim();
      if (fandom) sf('f-fandom', fandom);
    }

    // Summary / plot — everything after "Summary:"
    const summ = text.match(/Summary:\s*([\s\S]{10,600}?)(?:\s*$)/i);
    if (summ) {
      notes = summ[1].replace(/\s+/g, ' ').trim().slice(0, 300)
        + (summ[1].length > 300 ? '…' : '');
    }

    if (!title) throw new Error('could not find title — try copying more of the fic block');

    // Save AO3 work ID for chapter-jump links
    const parsedWorkId = extractAo3Id(link);
    let hiddenId = document.getElementById('f-ao3id');
    if (!hiddenId) {
      hiddenId      = document.createElement('input');
      hiddenId.type = 'hidden';
      hiddenId.id   = 'f-ao3id';
      document.body.appendChild(hiddenId);
    }
    hiddenId.value = parsedWorkId || '';

    sf('f-title',     title);
    sf('f-author',    author);
    sf('f-pairing',   pairing);
    sf('f-rating',    rating);
    sf('f-chapters',  chapters);
    sf('f-words',     words);
    sf('f-ficstatus', ficStatus);
    sf('f-link',      link);
    loadTagsIntoInput(tropes);
    sf('f-plot',      notes);
    sf('f-notes',     '');

    st.innerHTML = '<span class="parse-ok">✔ parsed — review fields below then tap add</span>';

  } catch (e) {
    st.innerHTML = `<span class="parse-err">✗ ${e.message}</span>`;
  }
}


/* ── Categories Management ────────────────────────────────── */

// Tracks the selected color in the new-category color picker
let _newCatColor = null;

function selectNewCatColor(el) {
  document.querySelectorAll('.cat-color-dot').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  _newCatColor = el.dataset.c;
}

function createCategory() {
  const nameEl = document.getElementById('new-cat-name');
  const name   = (nameEl?.value || '').trim();
  if (!name) {
    if (nameEl) { nameEl.style.borderColor = '#e06070'; nameEl.focus(); }
    return;
  }

  const color = _newCatColor || nextCatColor();
  categories.push({ id: 'cat_' + Date.now(), name, color });
  saveCats();

  // Reset picker
  if (nameEl) nameEl.value = '';
  _newCatColor = null;
  document.getElementById('new-cat-color').style.display = 'none';
  document.querySelectorAll('.cat-color-dot').forEach(d => d.classList.remove('selected'));

  render();
}

function deleteCategory(catId) {
  if (!confirm('delete this category? fics will be untagged but not removed.')) return;
  categories = categories.filter(c => c.id !== catId);
  // Remove from all fics
  fics = fics.map(f => ({
    ...f,
    categories: (f.categories || []).filter(c => c !== catId)
  }));
  saveCats();
  save();
  render();
}

function startRenameCategory(catId) {
  const row = document.getElementById('catrow-' + catId);
  if (!row) return;
  const cat     = categories.find(c => c.id === catId);
  const nameSpan = row.querySelector('.cat-manage-name');
  if (!nameSpan || !cat) return;

  const input = document.createElement('input');
  input.className = 'cat-rename-input';
  input.value     = cat.name;
  input.maxLength = 24;
  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  function commit() {
    const newName = input.value.trim();
    if (newName && newName !== cat.name) {
      categories = categories.map(c => c.id === catId ? { ...c, name: newName } : c);
      saveCats();
    }
    render();
  }

  input.addEventListener('blur',  commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') render();
  });
}
