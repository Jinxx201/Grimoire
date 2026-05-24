/* ============================================================
   GRIMOIRE v4 — select.js
   Long-press Selection Mode · Bulk Category Assignment
   ============================================================ */


/* ── Selection State ──────────────────────────────────────── */
let _selectMode    = false;
let _selectedIds   = new Set();
let _longPressTimer = null;


/* ── Enter / Exit Selection Mode ─────────────────────────── */
function enterSelectMode(id) {
  _selectMode = true;
  _selectedIds.clear();
  _selectedIds.add(id);
  render();
  showSelectBar();
}

function exitSelectMode() {
  _selectMode    = false;
  _selectedIds.clear();
  hideSelectBar();
  hideCatPicker();
  render();
}

function isSelectMode() {
  return _selectMode;
}


/* ── Toggle individual card ───────────────────────────────── */
function toggleSelect(id) {
  if (!_selectMode) return;
  if (_selectedIds.has(id)) _selectedIds.delete(id);
  else                       _selectedIds.add(id);

  // Update just this card's checkbox without full re-render
  const card = document.querySelector(`.fic-card[data-id="${id}"], .fin-card[data-id="${id}"], .dnf-card[data-id="${id}"]`);
  if (card) {
    card.classList.toggle('card-selected', _selectedIds.has(id));
    const cb = card.querySelector('.card-checkbox');
    if (cb) cb.classList.toggle('checked', _selectedIds.has(id));
  }

  updateSelectBar();
}

function selectAll() {
  // Select all visible fic cards
  document.querySelectorAll('[data-id]').forEach(card => {
    const id = parseInt(card.dataset.id);
    if (id) _selectedIds.add(id);
    card.classList.add('card-selected');
    const cb = card.querySelector('.card-checkbox');
    if (cb) cb.classList.add('checked');
  });
  updateSelectBar();
}


/* ── Long Press Detection ─────────────────────────────────── */
function onCardPointerDown(e, id) {
  // Ignore taps on any interactive element — buttons, links, inputs, drag handle
  if (!e.target || typeof e.target.closest !== 'function') return;
  if (e.target.closest('button') ||
      e.target.closest('a')      ||
      e.target.closest('input')  ||
      e.target.closest('select') ||
      e.target.closest('.drag-handle')) return;

  if (_selectMode) {
    toggleSelect(id);
    return;
  }

  _longPressTimer = setTimeout(() => {
    _longPressTimer = null;
    if (typeof closeMore === 'function') closeMore();
    if (navigator.vibrate) navigator.vibrate(40);
    enterSelectMode(id);
  }, 450);
}

function onCardPointerUp() {
  if (_longPressTimer) {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
  }
}

function onCardPointerMove() {
  // Cancel long press if finger moves (user is scrolling)
  if (_longPressTimer) {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
  }
}


/* ── Checkbox HTML (injected into every card) ─────────────── */
function checkboxHtml(id) {
  const checked = _selectedIds.has(id);
  return `<div class="card-checkbox ${checked ? 'checked' : ''}" onclick="event.stopPropagation();toggleSelect(${id})"></div>`;
}


/* ── Action Bar ───────────────────────────────────────────── */
function showSelectBar() {
  let bar = document.getElementById('select-bar');
  if (!bar) {
    bar    = document.createElement('div');
    bar.id = 'select-bar';
    bar.className = 'select-bar';
    bar.innerHTML = `
      <button class="select-bar-cancel" onclick="exitSelectMode()">✕ cancel</button>
      <span class="select-bar-count" id="select-count">1 selected</span>
      <button class="select-bar-all" onclick="selectAll()">select all</button>
      <button class="select-bar-action" onclick="openCatPicker()">+ add to list</button>
    `;
    document.body.appendChild(bar);
  }
  requestAnimationFrame(() => bar.classList.add('visible'));
  updateSelectBar();
}

function hideSelectBar() {
  const bar = document.getElementById('select-bar');
  if (bar) {
    bar.classList.remove('visible');
    setTimeout(() => bar.remove(), 300);
  }
}

function updateSelectBar() {
  const count = document.getElementById('select-count');
  if (count) {
    const n = _selectedIds.size;
    count.textContent = `${n} selected`;
  }
  // Disable action if nothing selected
  const btn = document.querySelector('.select-bar-action');
  if (btn) btn.disabled = _selectedIds.size === 0;
}


/* ── Category Picker Sheet ────────────────────────────────── */
function openCatPicker() {
  if (!_selectedIds.size) return;
  if (!categories.length) {
    alert('No lists yet — create one in ☰ → Lists first.');
    return;
  }

  let picker = document.getElementById('cat-picker-sheet');
  if (!picker) {
    picker    = document.createElement('div');
    picker.id = 'cat-picker-sheet';
    picker.className = 'cat-picker-sheet';
    document.body.appendChild(picker);
  }

  picker.innerHTML = `
    <div class="cat-picker-inner" onclick="event.stopPropagation()">
      <div class="cat-picker-title">add ${_selectedIds.size} fic${_selectedIds.size !== 1 ? 's' : ''} to list</div>
      <div class="cat-picker-list">
        ${categories.map(cat => {
          // Count how many selected fics are already in this category
          const alreadyIn = [..._selectedIds].filter(id => {
            const f = fics.find(x => x.id === id);
            return f && (f.categories || []).includes(cat.id);
          }).length;
          const allIn = alreadyIn === _selectedIds.size;
          return `
            <div class="cat-picker-row ${allIn ? 'cat-picker-row-on' : ''}" onclick="assignToCategory('${cat.id}')">
              <span class="cat-picker-dot" style="background:${cat.color}"></span>
              <span class="cat-picker-name">${cat.name}</span>
              <span class="cat-picker-badge">${alreadyIn > 0 ? `${alreadyIn}/${_selectedIds.size}` : ''}</span>
              <span class="cat-picker-check">${allIn ? '✓' : '+'}</span>
            </div>`;
        }).join('')}
      </div>
      <button class="cat-picker-cancel" onclick="hideCatPicker()">cancel</button>
    </div>
  `;

  requestAnimationFrame(() => picker.classList.add('visible'));
}

function hideCatPicker() {
  const picker = document.getElementById('cat-picker-sheet');
  if (picker) {
    picker.classList.remove('visible');
    setTimeout(() => picker.remove(), 280);
  }
}

function assignToCategory(catId) {
  const ids = [..._selectedIds];
  const allIn = ids.every(id => {
    const f = fics.find(x => x.id === id);
    return f && (f.categories || []).includes(catId);
  });

  // If all already in → remove. If any not in → add all.
  fics = fics.map(f => {
    if (!ids.includes(f.id)) return f;
    const cats = f.categories || [];
    return {
      ...f,
      categories: allIn
        ? cats.filter(c => c !== catId)
        : cats.includes(catId) ? cats : [...cats, catId]
    };
  });

  save();
  hideCatPicker();
  exitSelectMode();

  // Brief confirmation toast
  const cat  = categories.find(c => c.id === catId);
  const msg  = document.createElement('div');
  msg.className = 'select-toast';
  msg.textContent = allIn
    ? `removed from ${cat?.name}`
    : `added ${ids.length} fic${ids.length !== 1 ? 's' : ''} to ${cat?.name}`;
  document.body.appendChild(msg);
  requestAnimationFrame(() => msg.classList.add('visible'));
  setTimeout(() => {
    msg.classList.remove('visible');
    setTimeout(() => msg.remove(), 300);
  }, 2200);
}


/* ── Close on back / escape ───────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _selectMode) exitSelectMode();
});
