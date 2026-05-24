/* ============================================================
   GRIMOIRE v3 — helpers.js
   Formatting · URL · Pills · Badges · Search · Sort · Filter
   ============================================================ */


/* ── Formatting ───────────────────────────────────────────── */
function fmtW(n) {
  if (!n) return '—';
  return n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(n);
}

function maxCh(s) {
  if (!s) return 0;
  const n = parseInt((s || '').split('/')[1]);
  return isNaN(n) ? 0 : n;
}

function pct(f) {
  const t = maxCh(f.totalChapters);
  return (!t || !f.progress) ? 0 : Math.min(100, Math.round(f.progress / t * 100));
}


/* ── AO3 URL Helpers ──────────────────────────────────────── */
function extractAo3Id(url) {
  if (!url) return null;
  const m = url.match(/archiveofourown\.org\/works\/(\d+)/);
  return m ? m[1] : null;
}

function openUrl(f) {
  const workId = f.ao3WorkId || extractAo3Id(f.link);
  if (workId && f.progress > 0) {
    return `https://archiveofourown.org/works/${workId}?show_chapter=${f.progress}`;
  }
  return f.link || null;
}


/* ── Colour / Gradient Helpers ────────────────────────────── */
function pairGrad(p) {
  const pl = p.toLowerCase();
  if (pl.includes('draco') || pl.includes('malfoy') || pl.includes('dramione'))
    return 'linear-gradient(to bottom, #9b1b30, #1e5c32)';
  if (pl.includes('lily') || pl.includes('james'))   return '#9b1b30';
  if (pl.includes('wolf') || pl.includes('siri') || pl.includes('remus')) return '#1a3468';
  if (pl.includes('fred') || pl.includes('george') || pl.includes('weasley')) return '#c49a00';
  return '#7a6020';
}


/* ── Pill / Badge Builders ────────────────────────────────── */
function rPill(r) {
  const map = {
    M: ['#e06070', 'rgba(155,27,48,.18)',  'rgba(155,27,48,.35)'],
    T: ['#6080c0', 'rgba(26,52,104,.25)',  'rgba(26,52,104,.45)'],
    E: ['#b070c0', 'rgba(80,20,80,.25)',   'rgba(80,20,80,.45)'],
    G: ['#50a070', 'rgba(30,92,50,.2)',    'rgba(30,92,50,.4)']
  };
  const [c, bg, b] = map[r] || map.T;
  return `<span class="pill" style="color:${c};background:${bg};border:1px solid ${b}">${r}</span>`;
}

function fsPill(s) {
  if (s === 'complete')  return '<span class="pill pill-complete">✔ complete</span>';
  if (s === 'abandoned') return '<span class="pill pill-abandoned">✗ abandoned</span>';
  return '<span class="pill pill-ongoing">⟳ ongoing</span>';
}

function sBadge(s) {
  const map = {
    want:     '<span class="sbadge sb-want">📜 want</span>',
    reading:  '<span class="sbadge sb-reading">📖 reading</span>',
    finished: '<span class="sbadge sb-finished">✅ done</span>',
    dnf:      '<span class="sbadge sb-dnf">✗ dropped</span>'
  };
  return map[s] || '';
}


/* ── Form Value Helpers ───────────────────────────────────── */
function gv(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function sf(id, v) {
  const el = document.getElementById(id);
  if (el && v !== null && v !== undefined && String(v).trim() !== '') {
    el.value = String(v);
  }
}


function applyFilters(list) {
  let r = list;
  if (filterBy.rating)     r = r.filter(f => f.rating     === filterBy.rating);
  if (filterBy.ficStatus)  r = r.filter(f => f.ficStatus  === filterBy.ficStatus);
  if (filterBy.yourStatus) r = r.filter(f => f.yourStatus === filterBy.yourStatus);
  return r;
}

function filtered(list) {
  return applySort(applySearch(applyFilters(applyCategory(list))));
}

function setFilter(key, val) {
  filterBy[key] = (filterBy[key] === val) ? '' : val;
  render();
}

function clearFilters() {
  filterBy = { rating: '', ficStatus: '', yourStatus: '' };
  render();
}

function activeFilterCount() {
  return Object.values(filterBy).filter(Boolean).length;
}

let _filterOpen = false;
function toggleFilterPanel() {
  _filterOpen = !_filterOpen;
  const panel = document.getElementById('filter-panel');
  if (panel) panel.classList.toggle('open', _filterOpen);
  const btn = document.getElementById('filter-btn');
  if (btn) btn.classList.toggle('filter-btn-active', _filterOpen || activeFilterCount() > 0);
}

function filterPanel() {
  const cnt = activeFilterCount();
  return `
    <div class="filter-wrap">
      <button class="filter-btn ${cnt > 0 ? 'filter-btn-active' : ''}" id="filter-btn" onclick="toggleFilterPanel()">
        ⚙ filter${cnt > 0 ? ` <span class="filter-badge">${cnt}</span>` : ''}
      </button>
      <div class="filter-panel ${_filterOpen ? 'open' : ''}" id="filter-panel">
        <div class="filter-row">
          <div class="filter-group-lbl">rating</div>
          <div class="filter-chips">
            ${['G','T','M','E'].map(r => `
              <span class="filter-chip ${filterBy.rating===r?'filter-chip-on':''}" onclick="setFilter('rating','${r}')">${r}</span>
            `).join('')}
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-group-lbl">fic status</div>
          <div class="filter-chips">
            ${[['complete','✔ complete'],['ongoing','⟳ ongoing'],['abandoned','✗ abandoned']].map(([v,l]) => `
              <span class="filter-chip ${filterBy.ficStatus===v?'filter-chip-on':''}" onclick="setFilter('ficStatus','${v}')">${l}</span>
            `).join('')}
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-group-lbl">your status</div>
          <div class="filter-chips">
            ${[['want','📜 want'],['reading','📖 reading'],['finished','✅ done']].map(([v,l]) => `
              <span class="filter-chip ${filterBy.yourStatus===v?'filter-chip-on':''}" onclick="setFilter('yourStatus','${v}')">${l}</span>
            `).join('')}
          </div>
        </div>
        ${cnt > 0 ? `<button class="filter-clear" onclick="clearFilters()">✕ clear all filters</button>` : ''}
      </div>
    </div>`;
}


/* ── Search, Sort & Filter ────────────────────────────────── */
function applySearch(list) {
  if (!searchQuery) return list;
  const q = searchQuery.toLowerCase();
  return list.filter(f =>
    f.title.toLowerCase().includes(q) ||
    f.author.toLowerCase().includes(q) ||
    f.pairing.toLowerCase().includes(q) ||
    (f.fandom  || '').toLowerCase().includes(q) ||
    (f.tropes  || []).some(t => t.toLowerCase().includes(q)) ||
    (f.plot    || '').toLowerCase().includes(q) ||
    (f.notes   || '').toLowerCase().includes(q)
  );
}

function applySort(list) {
  const s = [...list];
  if      (sortBy === 'title-asc')    s.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortBy === 'title-desc')   s.sort((a, b) => b.title.localeCompare(a.title));
  else if (sortBy === 'rating-desc')  s.sort((a, b) => (b.yourRating || 0) - (a.yourRating || 0));
  else if (sortBy === 'lastread')     s.sort((a, b) => (b.lastRead   || 0) - (a.lastRead   || 0));
  else if (sortBy === 'date-asc')     s.sort((a, b) => (a.id        || 0) - (b.id         || 0));
  else if (sortBy === 'date-desc')    s.sort((a, b) => (b.id        || 0) - (a.id         || 0));
  else s.sort((a, b) => getOrder(a.id) - getOrder(b.id));
  return s;
}

function applyCategory(list) {
  if (!activeCategory) return list;
  return list.filter(f => (f.categories || []).includes(activeCategory));
}

function onSearch(v) {
  searchQuery = v;
  renderFicList();
}

function clearSearch() {
  searchQuery = '';
  render();
}

function onSort(v) {
  sortBy = v;
  render();
}


/* ── Search Bar HTML ──────────────────────────────────────── */
function searchBar(placeholder) {
  return `
    <div class="search-bar">
      <div class="search-wrap">
        <span class="search-ico">🔍</span>
        <input
          class="search-input"
          id="search-input"
          type="text"
          placeholder="${placeholder}"
          value="${searchQuery.replace(/"/g, '&quot;')}"
          oninput="onSearch(this.value)"
        >
        <button class="search-clear ${searchQuery ? 'visible' : ''}" onclick="clearSearch()" title="clear">✕</button>
      </div>
      <select class="sort-select" onchange="onSort(this.value)">
        <option value="date-desc"  ${sortBy === 'date-desc'  ? 'selected' : ''}>newest</option>
        <option value="date-asc"   ${sortBy === 'date-asc'   ? 'selected' : ''}>oldest</option>
        <option value="title-asc"  ${sortBy === 'title-asc'  ? 'selected' : ''}>A→Z</option>
        <option value="title-desc" ${sortBy === 'title-desc' ? 'selected' : ''}>Z→A</option>
        <option value="rating-desc"${sortBy === 'rating-desc'? 'selected' : ''}>top rated</option>
        <option value="lastread"   ${sortBy === 'lastread'   ? 'selected' : ''}>last read</option>
      </select>
    </div>
    ${filterPanel()}`;
}


/* ── Collapsible Notes ────────────────────────────────────── */
// Track which card notes are expanded
const _expandedNotes = new Set();

function toggleNotes(id) {
  if (_expandedNotes.has(id)) _expandedNotes.delete(id);
  else                        _expandedNotes.add(id);

  const el = document.getElementById(`notes-${id}`);
  const btn = document.getElementById(`notes-btn-${id}`);
  if (!el) return;

  const expanded = _expandedNotes.has(id);
  el.classList.toggle('notes-expanded', expanded);
  if (btn) btn.textContent = expanded ? '▲ less' : '▼ more';
}

function notesHtml(f) {
  if (!f.notes) return '';
  const long     = f.notes.length > 80;
  const expanded = _expandedNotes.has(f.id);
  const preview  = long && !expanded ? f.notes.slice(0, 80) + '…' : f.notes;
  return `
    <div class="card-notes ${expanded ? 'notes-expanded' : ''}" id="notes-${f.id}">${preview}</div>
    ${long ? `<button class="notes-toggle-btn" id="notes-btn-${f.id}" onclick="toggleNotes(${f.id})">
      ${expanded ? '▲ less' : '▼ more'}
    </button>` : ''}`;
}

function resultCount(shown, total) {
  if (!searchQuery) return '';
  return `<div class="search-count">${shown} of ${total} fic${total !== 1 ? 's' : ''}</div>`;
}


/* ── Category Filter Bar HTML ─────────────────────────────── */
function categoryFilterBar() {
  if (!categories.length) return '';

  const allActive = !activeCategory;
  const chips = categories.map(cat => {
    const isActive = activeCategory === cat.id;
    return `<span
      class="cat-chip ${isActive ? 'cat-chip-active' : ''}"
      style="--chip-color:${cat.color}"
      onclick="setActiveCategory('${cat.id}')"
    >${cat.name}</span>`;
  }).join('');

  return `
    <div class="cat-filter-bar">
      <span class="cat-chip ${allActive ? 'cat-chip-active cat-chip-all' : 'cat-chip-all'}"
        onclick="setActiveCategory(null)">All</span>
      ${chips}
    </div>`;
}

function setActiveCategory(id) {
  activeCategory = (activeCategory === id) ? null : id;
  render();
}


/* ── Category Assign Row HTML (on cards) ──────────────────── */
function catAssignRow(f) {
  if (!categories.length) return '';
  const ficCats = f.categories || [];
  const chips = categories.map(cat => {
    const on = ficCats.includes(cat.id);
    return `<span
      class="cat-assign-chip ${on ? 'cat-assign-on' : ''}"
      style="--chip-color:${cat.color}"
      onclick="toggleFicCat(${f.id},'${cat.id}')"
    >${cat.name}</span>`;
  }).join('');
  return `<div class="cat-assign-row">${chips}</div>`;
}

function toggleFicCat(ficId, catId) {
  fics = fics.map(f => {
    if (f.id !== ficId) return f;
    const cats = f.categories || [];
    return {
      ...f,
      categories: cats.includes(catId)
        ? cats.filter(c => c !== catId)
        : [...cats, catId]
    };
  });
  save();
  render();
}


/* ── Illustrated Empty States ─────────────────────────────── */
const EMPTY_SVGS = {
  shelf: `<svg class="empty-illustration" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="55" width="60" height="6" rx="2" fill="currentColor" opacity=".4"/>
    <rect x="18" y="28" width="10" height="27" rx="2" fill="currentColor" opacity=".5"/>
    <rect x="32" y="20" width="10" height="35" rx="2" fill="currentColor" opacity=".7"/>
    <rect x="46" y="33" width="10" height="22" rx="2" fill="currentColor" opacity=".5"/>
    <text x="40" y="16" text-anchor="middle" font-size="12" fill="currentColor" opacity=".6">✦</text>
  </svg>`,

  reading: `<svg class="empty-illustration" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="18" width="24" height="44" rx="3" fill="currentColor" opacity=".3"/>
    <rect x="42" y="18" width="24" height="44" rx="3" fill="currentColor" opacity=".3"/>
    <rect x="16" y="24" width="20" height="2" rx="1" fill="currentColor" opacity=".5"/>
    <rect x="16" y="30" width="20" height="2" rx="1" fill="currentColor" opacity=".5"/>
    <rect x="16" y="36" width="14" height="2" rx="1" fill="currentColor" opacity=".5"/>
    <rect x="44" y="24" width="20" height="2" rx="1" fill="currentColor" opacity=".5"/>
    <rect x="44" y="30" width="20" height="2" rx="1" fill="currentColor" opacity=".5"/>
    <rect x="44" y="36" width="14" height="2" rx="1" fill="currentColor" opacity=".5"/>
  </svg>`,

  finished: `<svg class="empty-illustration" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="26" stroke="currentColor" stroke-width="2" opacity=".3"/>
    <path d="M28 40 L36 48 L52 32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>
  </svg>`,

  search: `<svg class="empty-illustration" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="35" cy="35" r="18" stroke="currentColor" stroke-width="2" opacity=".4"/>
    <line x1="48" y1="48" x2="62" y2="62" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".4"/>
    <line x1="29" y1="35" x2="41" y2="35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>
    <line x1="35" y1="29" x2="35" y2="41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".3"/>
  </svg>`,

  list: `<svg class="empty-illustration" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="20" width="48" height="8" rx="3" fill="currentColor" opacity=".2"/>
    <rect x="16" y="34" width="48" height="8" rx="3" fill="currentColor" opacity=".2"/>
    <rect x="16" y="48" width="32" height="8" rx="3" fill="currentColor" opacity=".2"/>
    <circle cx="24" cy="24" r="3" fill="currentColor" opacity=".5"/>
    <circle cx="24" cy="38" r="3" fill="currentColor" opacity=".5"/>
    <circle cx="24" cy="52" r="3" fill="currentColor" opacity=".3"/>
  </svg>`,

  stats: `<svg class="empty-illustration" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="48" width="10" height="16" rx="2" fill="currentColor" opacity=".3"/>
    <rect x="30" y="34" width="10" height="30" rx="2" fill="currentColor" opacity=".4"/>
    <rect x="46" y="24" width="10" height="40" rx="2" fill="currentColor" opacity=".5"/>
    <rect x="62" y="38" width="10" height="26" rx="2" fill="currentColor" opacity=".35"/>
    <line x1="10" y1="64" x2="76" y2="64" stroke="currentColor" stroke-width="1.5" opacity=".3"/>
  </svg>`
};

function emptyState(type, title, hint) {
  return `
    <div class="empty">
      ${EMPTY_SVGS[type] || EMPTY_SVGS.shelf}
      <div class="empty-title">${title}</div>
      <div class="empty-hint">${hint}</div>
    </div>`;
}
