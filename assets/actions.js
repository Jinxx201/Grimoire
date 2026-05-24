/* ============================================================
   GRIMOIRE v3 — actions.js
   Fic Actions · Progress · Drag-to-Reorder · Detail Drawer
   Export / Import
   ============================================================ */


/* ── Three-dots More Menu ─────────────────────────────────── */
let _moreOpen   = null;
let _moreRemove = null;

function toggleMore(btn) {
  // If tapping the same button, close
  if (_moreOpen && _moreOpen._srcBtn === btn) { closeMore(); return; }

  closeMore();

  const wrap = btn.closest('.more-menu-wrap');
  const dd   = wrap.querySelector('.more-dropdown');

  // Move dropdown to body so overflow:hidden on cards/app doesn't clip it
  document.body.appendChild(dd);
  dd._srcBtn = btn;
  dd._srcWrap = wrap;

  // Measure position AFTER appending to body
  dd.style.visibility = 'hidden';
  dd.style.display    = 'block';

  const br  = btn.getBoundingClientRect();
  const vw  = window.innerWidth;
  const ddW = dd.offsetWidth;
  const ddH = dd.offsetHeight;

  let left = br.right - ddW;
  if (left < 8)            left = 8;
  if (left + ddW > vw - 8) left = vw - ddW - 8;

  dd.style.left       = left + 'px';
  dd.style.top        = (br.top - ddH - 6 >= 8 ? br.top - ddH - 6 : br.bottom + 6) + 'px';
  dd.style.visibility = '';
  dd.classList.add('open');
  _moreOpen = dd;

  // Dismiss on outside tap or scroll
  function onOutside(e) {
    if (e.target.closest('.more-menu-wrap') || e.target === btn) return;
    if (dd.contains(e.target)) return;
    closeMore();
  }

  function onScroll() { closeMore(); }

  const scrollArea = document.getElementById('scrollarea');
  document.addEventListener('pointerdown', onOutside, { capture: true });
  if (scrollArea) scrollArea.addEventListener('scroll', onScroll, { once: true, passive: true });

  _moreRemove = () => {
    document.removeEventListener('pointerdown', onOutside, { capture: true });
    if (scrollArea) scrollArea.removeEventListener('scroll', onScroll);
    _moreRemove = null;
  };
}

function closeMore() {
  if (!_moreOpen) return;
  const dd = _moreOpen;

  dd.classList.remove('open');
  dd.style.display    = '';
  dd.style.visibility = '';
  dd.style.left       = '';
  dd.style.top        = '';
  delete dd._srcBtn;

  // Move dropdown back into its original wrap
  if (dd._srcWrap) {
    dd._srcWrap.appendChild(dd);
    delete dd._srcWrap;
  }

  _moreOpen = null;
  if (_moreRemove) _moreRemove();
}


/* ── Fic Actions ──────────────────────────────────────────── */
function startReading(id) {
  upd(id, f => ({ ...f, yourStatus: 'reading', lastRead: Date.now() }));
  go('reading');
}
function moveBack(id)     { upd(id, f => ({ ...f, yourStatus: 'want' })); }

function markDNF(id) {
  upd(id, f => ({ ...f, yourStatus: 'dnf', lastRead: Date.now() }));
}

function addReread(id) {
  if (!confirm('Mark as re-reading? This resets your chapter progress and moves it back to Reading.')) return;
  upd(id, f => ({
    ...f,
    yourStatus:  'reading',
    rereadCount: (f.rereadCount || 0) + 1,
    progress:    0,
    lastRead:    Date.now()
  }));
}
function rate(id, r)      { upd(id, f => ({ ...f, yourRating: r })); }

function markDone(id) {
  upd(id, f => ({ ...f, yourStatus: 'finished', lastRead: Date.now() }));
  showCelebration(id);
}

function del(id) {
  if (!confirm('remove this fic?')) return;
  fics = fics.filter(x => x.id !== id);
  save();
  render();
}


/* ── Completion Celebration ───────────────────────────────── */
function showCelebration(id) {
  const fic  = fics.find(f => f.id === id);
  const name = fic ? fic.title : 'fic';

  const el   = document.createElement('div');
  el.className = 'celebration-toast';
  el.innerHTML = `
    <div class="cel-rune">✦</div>
    <div class="cel-title">finished!</div>
    <div class="cel-name">${name}</div>
    <div class="cel-sub">added to your finished shelf</div>
  `;
  document.body.appendChild(el);

  // Particle burst
  for (let i = 0; i < 18; i++) {
    const p  = document.createElement('div');
    p.className = 'cel-particle';
    const tx = (Math.random() - 0.5) * 180;
    const ty = -(60 + Math.random() * 120);
    p.style.cssText = `
      left: ${42 + Math.random() * 16}vw;
      top:  ${38 + Math.random() * 24}vh;
      --tx: ${tx}px;
      --ty: ${ty}px;
      animation-delay: ${Math.random() * 0.4}s;
      animation-duration: ${0.8 + Math.random() * 0.6}s;
      background: ${['#c9a227','#e8c060','#fff8e0','#9b1b30','#5ab07a'][Math.floor(Math.random()*5)]};
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 2000);
  }

  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 2800);
}


/* ── Progress ─────────────────────────────────────────────── */
function updProg(id, v) {
  const f = fics.find(x => x.id === id);
  if (!f) return;
  f.progress = parseInt(v) || 0;
  f.lastRead  = Date.now();

  // Auto-finish when last chapter reached and total is known
  const mch = maxCh(f.totalChapters);
  if (mch && f.progress >= mch && f.yourStatus === 'reading') {
    f.yourStatus = 'finished';
    save();
    showCelebration(id);
    render();
    return;
  }

  save();
  const fill = document.getElementById('fill-' + id);
  const lbl  = document.getElementById('pct-'  + id);
  if (fill) fill.style.width = pct(f) + '%';
  if (lbl)  lbl.textContent  = pct(f) + '%';
}

function stepProg(id, delta) {
  const f = fics.find(x => x.id === id);
  if (!f) return;
  const mch  = maxCh(f.totalChapters);
  f.progress = Math.max(0, Math.min(mch || 9999, (f.progress || 0) + delta));
  f.lastRead  = Date.now();

  // Auto-finish when last chapter reached and total is known
  if (mch && f.progress >= mch && f.yourStatus === 'reading') {
    f.yourStatus = 'finished';
    save();
    showCelebration(id);
    render();
    return;
  }

  save();
  const fill = document.getElementById('fill-' + id);
  const lbl  = document.getElementById('pct-'  + id);
  const sv   = document.getElementById('sv-'   + id);
  if (fill) fill.style.width = pct(f) + '%';
  if (lbl)  lbl.textContent  = pct(f) + '%';
  if (sv)   sv.textContent   = 'ch ' + f.progress;
}


/* ── Drag-to-Reorder ─────────────────────────────────────── */
let _drag = null;

function dragStart(e, id) {
  e.preventDefault();
  const card = e.currentTarget.closest('.fic-card');
  if (!card) return;

  const container = document.getElementById('fic-list-container');
  if (!container) return;

  const cards     = [...container.querySelectorAll('.fic-card[data-id]')];
  const origIndex = cards.findIndex(c => c.dataset.id == id);

  // Ghost clone
  const rect  = card.getBoundingClientRect();
  const clone = card.cloneNode(true);
  clone.style.cssText = `
    position:fixed; top:${rect.top}px; left:${rect.left}px; width:${rect.width}px;
    opacity:0.85; z-index:9999; pointer-events:none;
    border-color:var(--gold); box-shadow:0 8px 32px rgba(0,0,0,.6)`;
  document.body.appendChild(clone);

  card.style.opacity = '0.3';
  _drag = { id, el: card, startY: e.clientY, cloneEl: clone, origIndex, cards };

  document.addEventListener('pointermove',   dragMove, { passive: false });
  document.addEventListener('pointerup',     dragEnd);
  document.addEventListener('pointercancel', dragEnd);
}

function dragMove(e) {
  if (!_drag) return;
  e.preventDefault();

  const dy = e.clientY - _drag.startY;
  _drag.cloneEl.style.top = (_drag.el.getBoundingClientRect().top + dy) + 'px';

  const cy = e.clientY;
  let targetIdx = _drag.origIndex;

  _drag.cards.forEach((c, i) => {
    if (c === _drag.el) return;
    const mid = c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2;
    if (cy > mid && i > targetIdx) targetIdx = i;
    if (cy < mid && i < targetIdx) targetIdx = i;
  });

  _drag._targetIdx = targetIdx;

  _drag.cards.forEach((c, i) => {
    c.style.transform = '';
    if (_drag.origIndex < targetIdx && i > _drag.origIndex && i <= targetIdx)
      c.style.transform = `translateY(-${_drag.el.offsetHeight}px)`;
    else if (_drag.origIndex > targetIdx && i < _drag.origIndex && i >= targetIdx)
      c.style.transform = `translateY(${_drag.el.offsetHeight}px)`;
  });
}

function dragEnd() {
  if (!_drag) return;
  document.removeEventListener('pointermove',   dragMove);
  document.removeEventListener('pointerup',     dragEnd);
  document.removeEventListener('pointercancel', dragEnd);

  _drag.cloneEl.remove();
  _drag.cards.forEach(c => { c.style.transform = ''; c.style.opacity = ''; });

  const targetIdx = _drag._targetIdx !== undefined ? _drag._targetIdx : _drag.origIndex;

  if (targetIdx !== _drag.origIndex) {
    const want   = fics.filter(f => f.yourStatus === 'want');
    const sorted = [...want].sort((a, b) => getOrder(a.id) - getOrder(b.id));
    const moved  = sorted.splice(_drag.origIndex, 1)[0];
    sorted.splice(targetIdx, 0, moved);
    sorted.forEach((f, i) => { shelfOrder[f.id] = i; });
    saveOrder();
    render();
  }

  _drag = null;
}


/* ── Detail Drawer ────────────────────────────────────────── */
function openDetail(id) {
  const f = fics.find(x => x.id === id);
  if (!f) return;

  const p       = pct(f);
  const mch     = maxCh(f.totalChapters);
  const ficCats = (f.categories || []).map(cid => {
    const cat = categories.find(c => c.id === cid);
    return cat
      ? `<span class="cat-assign-chip cat-assign-on" style="--chip-color:${cat.color}">${cat.name}</span>`
      : '';
  }).join('');

  const stars = f.yourRating
    ? `<span style="color:var(--gold)">${'★'.repeat(f.yourRating)}</span>`
      + `<span style="color:var(--dim)">${'★'.repeat(5 - f.yourRating)}</span>`
    : '<span style="color:var(--dim)">not yet rated</span>';

  document.getElementById('detail-overlay').innerHTML = `
    <div class="detail-sheet" onclick="event.stopPropagation()">
      <div class="detail-bar" style="background:${pairGrad(f.pairing)}"></div>
      <div class="detail-close" onclick="closeDetail()">✕</div>

      <div class="detail-title">${f.title}</div>
      <div class="detail-author">by ${f.author}</div>

      <div class="detail-pills">
        <span class="pill pill-pair">${f.pairing}</span>
        ${rPill(f.rating)}
        ${fsPill(f.ficStatus)}
        ${sBadge(f.yourStatus)}
      </div>

      <div class="detail-grid">
        <div class="detail-cell">
          <div class="detail-cell-lbl">fandom</div>
          <div class="detail-cell-val">${f.fandom || '—'}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-cell-lbl">chapters</div>
          <div class="detail-cell-val">${f.totalChapters}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-cell-lbl">words</div>
          <div class="detail-cell-val">${fmtW(f.words)}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-cell-lbl">progress</div>
          <div class="detail-cell-val">${f.yourStatus === 'reading'
            ? 'ch ' + (f.progress || 0) + '/' + mch
            : f.yourStatus}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-cell-lbl">rating</div>
          <div class="detail-cell-val">${stars}</div>
        </div>
      </div>

      ${f.yourStatus === 'reading' ? `
        <div class="detail-prog-wrap">
          <div class="prog-bar-wrap">
            <div class="prog-bar-fill" style="width:${p}%"></div>
          </div>
          <div style="text-align:right;font-size:11px;color:var(--dim);margin-top:3px">${p}% complete</div>
        </div>` : ''}

      ${f.seriesName ? `
        <div class="detail-section-lbl">📚 series</div>
        <div class="detail-notes">${f.seriesName}${f.seriesOrder ? ` — part ${f.seriesOrder}` : ''}</div>
      ` : ''}

      ${f.plot ? `
        <div class="detail-section-lbl">📖 plot / summary</div>
        <div class="detail-notes">${f.plot}</div>
      ` : ''}

      ${f.notes ? `
        <div class="detail-section-lbl">📝 notes</div>
        <div class="detail-notes">${f.notes}</div>
      ` : ''}

      ${f.rereadCount ? `
        <div class="detail-section-lbl">♻ rereads</div>
        <div class="detail-notes">read ${f.rereadCount + 1}× total</div>
      ` : ''}

      ${f.tropes.length ? `
        <div class="detail-section-lbl">tropes</div>
        <div class="card-tropes">${f.tropes.map(t => `<span class="trope-tag">${t}</span>`).join('')}</div>
      ` : ''}

      ${ficCats ? `
        <div class="detail-section-lbl">categories</div>
        <div class="cat-assign-row" style="border:none;padding:0;margin:0 0 12px">${ficCats}</div>
      ` : ''}

      <div class="detail-actions">
        ${openUrl(f) ? `<a href="${openUrl(f)}" target="_blank" class="btn btn-gold" style="justify-content:center;flex:1">
          ${f.yourStatus === 'reading' && f.progress > 0
            ? 'read ch ' + f.progress + ' ↗'
            : (f.link && f.link.includes('fanfiction.net') ? 'open on FFN ↗' : 'open on AO3 ↗')}
        </a>` : ''}
        <button class="btn btn-edit" style="justify-content:center"
          onclick="closeDetail();openEdit(${f.id})">✎ edit</button>
      </div>
    </div>
  `;

  const ov = document.getElementById('detail-overlay');
  ov.style.display = 'flex';
  requestAnimationFrame(() => ov.classList.add('open'));
}

function closeDetail() {
  const ov = document.getElementById('detail-overlay');
  ov.classList.remove('open');
  setTimeout(() => { ov.style.display = 'none'; ov.innerHTML = ''; }, 280);
}


/* ── Export / Import ──────────────────────────────────────── */
function exportData() {
  const payload = { version: 3, exported: new Date().toISOString(), fics, categories, shelfOrder, settings };
  const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = 'grimoire-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  stampBackup();

  const msg = document.getElementById('backup-msg');
  if (msg) {
    msg.innerHTML = '<span style="color:#5ab07a">✔ exported</span>';
    setTimeout(() => { msg.innerHTML = ''; }, 3000);
  }
}

function exportHTML() {
  const date     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const total    = fics.length;
  const finished = fics.filter(f => f.yourStatus === 'finished');
  const reading  = fics.filter(f => f.yourStatus === 'reading');
  const want     = fics.filter(f => f.yourStatus === 'want');
  const dnf      = fics.filter(f => f.yourStatus === 'dnf');

  function stars(n) {
    if (!n) return '<span style="color:#5a4a2a">not rated</span>';
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  function wordFmt(n) {
    if (!n) return '—';
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  }

  function ficRow(f) {
    const tropes = (f.tropes || []).map(t =>
      `<span style="background:rgba(200,160,40,.12);border:1px solid rgba(200,160,40,.3);
       color:#c8a028;font-size:11px;padding:2px 8px;border-radius:20px;
       letter-spacing:.5px">${t}</span>`
    ).join(' ');

    const seriesBadge = f.seriesName
      ? `<div style="font-size:11px;color:#8a6820;font-family:'Cinzel',serif;
           letter-spacing:.5px;margin-bottom:6px">
           📚 ${f.seriesName}${f.seriesOrder ? ` · part ${f.seriesOrder}` : ''}
         </div>`
      : '';

    const rereadBadge = f.rereadCount
      ? `<span style="font-size:11px;color:#6a5a3a">♻ read ${f.rereadCount + 1}× total</span>`
      : '';

    const progressLine = f.yourStatus === 'reading' && f.progress
      ? `<span style="color:#8a9ab0">stopped at ch ${f.progress}</span> · `
      : f.yourStatus === 'dnf' && f.progress
      ? `<span style="color:#c07070">dropped at ch ${f.progress}</span> · `
      : '';

    const linkEl = f.link
      ? `<a href="${f.link}" target="_blank"
           style="color:#8a6820;font-size:11px;text-decoration:none;
                  border-bottom:1px solid rgba(200,160,40,.3)">open ↗</a>`
      : '';

    return `
      <div style="background:#1a1508;border:1px solid #2a2010;border-radius:6px;
                  padding:16px;margin-bottom:10px;border-left:3px solid #8a6820">
        ${seriesBadge}
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <div style="font-family:'Cinzel',serif;font-size:15px;color:#e8d898;
                        letter-spacing:.5px;margin-bottom:3px">${f.title}</div>
            <div style="font-size:12px;color:#7a6a4a">by ${f.author}
              ${f.pairing ? ` · <span style="color:#9a8a5a">${f.pairing}</span>` : ''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="color:#c8a028;font-size:13px;letter-spacing:1px">${stars(f.yourRating)}</div>
            ${rereadBadge}
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;font-size:11px;color:#6a5a3a;
                    font-family:'Cinzel',serif;letter-spacing:.5px">
          ${f.rating ? `<span>${f.rating}</span> ·` : ''}
          ${progressLine}
          <span>${f.totalChapters || '?'} ch</span> ·
          <span>${wordFmt(f.words)} words</span> ·
          <span style="color:${f.ficStatus==='complete'?'#5ab07a':f.ficStatus==='abandoned'?'#c07070':'#9a8a5a'}">
            ${f.ficStatus || 'ongoing'}
          </span>
          ${linkEl ? `· ${linkEl}` : ''}
        </div>

        ${tropes ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">${tropes}</div>` : ''}

        ${f.plot ? `<div style="font-size:13px;color:#9a8a6a;line-height:1.6;
                                border-top:1px solid #2a2010;padding-top:10px;
                                margin-top:4px">${f.plot}</div>` : ''}
      </div>`;
  }

  function section(title, list, accentColor) {
    if (!list.length) return '';
    const seriesFics  = list.filter(f => f.seriesName);
    const soloFics    = list.filter(f => !f.seriesName);
    const seriesNames = [...new Set(seriesFics.map(f => f.seriesName))].sort();
    let rows = '';

    seriesNames.forEach(name => {
      const group = seriesFics
        .filter(f => f.seriesName === name)
        .sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0));
      rows += `<div style="font-family:'Cinzel',serif;font-size:11px;letter-spacing:2px;
                           text-transform:uppercase;color:#8a6820;padding:10px 0 6px;
                           border-bottom:1px solid #2a2010;margin-bottom:6px">
                 📚 ${name}
               </div>`;
      rows += group.map(ficRow).join('');
    });
    rows += soloFics.map(ficRow).join('');

    return `
      <div style="margin-bottom:36px">
        <div style="font-family:'Cinzel',serif;font-size:13px;letter-spacing:3px;
                    text-transform:uppercase;color:${accentColor};
                    border-bottom:2px solid ${accentColor};padding-bottom:8px;
                    margin-bottom:16px">
          ${title} <span style="font-size:11px;opacity:.6">(${list.length})</span>
        </div>
        ${rows}
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>My Grimoire · ${date}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0e0c09;
      color: #c8b87a;
      font-family: 'EB Garamond', Georgia, serif;
      font-size: 15px;
      line-height: 1.7;
      padding: 32px 16px 64px;
      max-width: 720px;
      margin: 0 auto;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="text-align:center;margin-bottom:48px;padding-bottom:32px;
              border-bottom:1px solid #2a2010">
    <div style="font-size:32px;margin-bottom:12px">✦</div>
    <div style="font-family:'Cinzel',serif;font-size:26px;letter-spacing:4px;
                color:#e8d898;margin-bottom:8px">MY GRIMOIRE</div>
    <div style="font-family:'Cinzel',serif;font-size:11px;letter-spacing:2px;
                color:#6a5a3a;text-transform:uppercase">exported ${date}</div>
    <div style="display:flex;justify-content:center;gap:32px;margin-top:24px;
                font-family:'Cinzel',serif;font-size:11px;letter-spacing:1px">
      <div style="text-align:center">
        <div style="font-size:22px;color:#e8d898">${total}</div>
        <div style="color:#6a5a3a">total</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:22px;color:#5ab07a">${finished.length}</div>
        <div style="color:#6a5a3a">finished</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:22px;color:#80b0e0">${reading.length}</div>
        <div style="color:#6a5a3a">reading</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:22px;color:#c8a028">${want.length}</div>
        <div style="color:#6a5a3a">want</div>
      </div>
      ${dnf.length ? `
      <div style="text-align:center">
        <div style="font-size:22px;color:#c07070">${dnf.length}</div>
        <div style="color:#6a5a3a">dropped</div>
      </div>` : ''}
    </div>
  </div>

  ${section('📖 Currently Reading', reading,  '#80b0e0')}
  ${section('✅ Finished',          finished, '#5ab07a')}
  ${section('📜 Want to Read',      want,     '#c8a028')}
  ${section('✗ Dropped',     dnf,      '#c07070')}

  <!-- Footer -->
  <div style="text-align:center;margin-top:48px;padding-top:24px;
              border-top:1px solid #2a2010;font-family:'Cinzel',serif;
              font-size:10px;letter-spacing:2px;color:#3a2a10">
    ✦ GENERATED BY THE GRIMOIRE ✦
  </div>

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `my-grimoire-${new Date().toISOString().slice(0,10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const msg = document.getElementById('backup-msg');
  if (msg) {
    msg.innerHTML = '<span style="color:#5ab07a">✔ html exported</span>';
    setTimeout(() => { msg.innerHTML = ''; }, 3000);
  }
}

function triggerImport() {
  let inp = document.getElementById('_import-input');
  if (!inp) {
    inp          = document.createElement('input');
    inp.type     = 'file';
    inp.accept   = '.json,application/json';
    inp.id       = '_import-input';
    inp.style.display = 'none';
    inp.onchange = importData;
    document.body.appendChild(inp);
  }
  inp.value = '';
  inp.click();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const msg    = document.getElementById('backup-msg');
  const reader = new FileReader();

  reader.onload = ev => {
    try {
      const data         = JSON.parse(ev.target.result);
      const importedFics = Array.isArray(data) ? data : (data.fics || []);
      if (!importedFics.length) throw new Error('no fics found in file');

      if (!confirm(`Import ${importedFics.length} fic${importedFics.length !== 1 ? 's' : ''}? This will replace your current library.`)) return;

      fics = importedFics;
      save();

      if (data.categories) { categories = data.categories; saveCats(); }
      if (data.shelfOrder) { shelfOrder = data.shelfOrder; saveOrder(); }
      if (data.settings)   { settings   = data.settings;  localStorage.setItem(SETTINGS_STORE, JSON.stringify(settings)); }

      applySettings();
      render();
      closeSidebar();

      if (msg) {
        msg.innerHTML = `<span style="color:#5ab07a">✔ imported ${fics.length} fic${fics.length !== 1 ? 's' : ''}</span>`;
        setTimeout(() => { msg.innerHTML = ''; }, 4000);
      }
    } catch (err) {
      if (msg) {
        msg.innerHTML = `<span style="color:#e06070">✗ ${err.message}</span>`;
        setTimeout(() => { msg.innerHTML = ''; }, 5000);
      }
    }
  };

  reader.readAsText(file);
}
