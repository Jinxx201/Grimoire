/* ============================================================
   GRIMOIRE v3 — render.js
   Navigation · Render · Sidebar · Settings · Pull-to-Refresh
   ============================================================ */


/* ── Navigation ───────────────────────────────────────────── */
function go(t) {
  tab            = t;
  activeTag      = null;
  activeCategory = null;
  searchQuery    = '';
  _filterOpen    = false;
  if (typeof _selectMode !== 'undefined' && _selectMode) exitSelectMode();
  render();
  document.getElementById('scrollarea').scrollTop = 0;
}

function goFromSidebar(t) {
  closeSidebar();
  go(t);
}

function toggleTag(t, v) {
  activeTag = (activeTag && activeTag.v === v) ? null : { t, v };
  render();
}


/* ── Lightweight List Re-render (keeps keyboard open) ─────── */
function renderFicList() {
  const container = document.getElementById('fic-list-container');
  if (!container) { render(); return; }

  const want     = fics.filter(f => f.yourStatus === 'want');
  const dnf      = fics.filter(f => f.yourStatus === 'dnf');
  const reading  = fics.filter(f => f.yourStatus === 'reading');
  const finished = fics.filter(f => f.yourStatus === 'finished');

  // Update clear button visibility without re-render
  const clearBtn = document.querySelector('.search-clear');
  if (clearBtn) clearBtn.classList.toggle('visible', !!searchQuery);

  let h = '';

  if (tab === 'shelf') {
    const wf = filtered(want);
    h += resultCount(wf.length, want.length);
    h += '<div class="sec-title">📜 want to read</div>';
    if (wf.length) {
      h += wf.map(ficCard).join('');
    } else if (searchQuery) {
      h += `emptyState('search','no results','try a different title, author, or tag')`;
    } else if (reading.length) {
      h += `emptyState('reading','shelf is clear','you have ${reading.length} fic${reading.length>1?"s":""} in progress — check your reading tab')`;
    } else {
      h += `emptyState('shelf','your shelf is empty','tap <b>✦</b> to add your first fic — paste from AO3 or fill in manually')`;
    }

  } else if (tab === 'reading') {
    const rf = filtered(reading);
    h += resultCount(rf.length, reading.length);
    h += '<div class="sec-title">📖 currently reading</div>';
    if (rf.length) {
      h += rf.map(readCard).join('');
    } else if (searchQuery) {
      h += `emptyState('search','no results','try a different title, author, or tag')`;
    } else if (want.length) {
      h += `emptyState('reading','nothing in progress','you have ${want.length} fic${want.length>1?"s":""} on your shelf — tap <b>start reading</b> on any card to begin')`;
    } else {
      h += `emptyState('reading','nothing in progress','add a fic to your shelf first, then tap start reading')`;
    }

  } else if (tab === 'finished') {
    const ff = filtered(finished);
    h += resultCount(ff.length, finished.length);
    h += '<div class="sec-title">✅ finished</div>';
    if (ff.length) {
      h += ff.map(finCard).join('');
    } else if (searchQuery) {
      h += `emptyState('search','no results','try a different title, author, or tag')`;
    } else if (reading.length) {
      h += `emptyState('finished','nothing finished yet','keep going — you're reading ${reading.length} fic${reading.length>1?"s":""}')`;
    } else {
      h += emptyState('finished', 'nothing finished yet', 'start reading a fic to track your progress');
    }
    const df = filtered(dnf);
    if (df.length) {
      h += '<div class="sec-title" style="margin-top:18px;color:#c07070">✗ dropped</div>';
      h += df.map(dnfCard).join('');
    }

  } else if (tab === 'all') {
    const nonDnf = fics.filter(f => f.yourStatus !== 'dnf');
    const af = filtered(nonDnf);
    const df = filtered(dnf);
    const allFicsFiltered = [...af, ...df];
    h += resultCount(allFicsFiltered.length, fics.length);
    h += '<div class="sec-title">📚 master list</div>';
    if (allFicsFiltered.length) {
      // Group series fics together, sorted by seriesName then seriesOrder
      const seriesFics  = af.filter(f => f.seriesName);
      const soloFics    = af.filter(f => !f.seriesName);
      const seriesNames = [...new Set(seriesFics.map(f => f.seriesName))].sort();

      seriesNames.forEach(name => {
        const group = seriesFics
          .filter(f => f.seriesName === name)
          .sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0));
        h += `<div class="series-group-header">📚 ${name}</div>`;
        group.forEach(f => {
          h += `
            <div class="all-row all-row-series" onclick="openDetail(${f.id})">
              <div class="all-row-bar" style="background:${pairGrad(f.pairing)}"></div>
              <div class="all-row-main">
                <div class="all-row-title">${f.seriesOrder ? `${f.seriesOrder}. ` : ''}${f.title}</div>
                <div class="all-row-meta">${f.author} · ${f.pairing}</div>
              </div>
              <div class="all-row-pills">
                ${rPill(f.rating)}
                ${sBadge(f.yourStatus)}
              </div>
            </div>`;
        });
      });

      soloFics.forEach(f => {
        h += `
          <div class="all-row" onclick="openDetail(${f.id})">
            <div class="all-row-bar" style="background:${pairGrad(f.pairing)}"></div>
            <div class="all-row-main">
              <div class="all-row-title">${f.title}</div>
              <div class="all-row-meta">${f.author} · ${f.pairing}</div>
            </div>
            <div class="all-row-pills">
              ${rPill(f.rating)}
              ${sBadge(f.yourStatus)}
            </div>
          </div>`;
      });

      if (df.length) {
        h += '<div class="series-group-header" style="color:#c07070;margin-top:12px">✗ dropped</div>';
        df.forEach(f => {
          h += `
            <div class="all-row" style="opacity:0.6" onclick="openDetail(${f.id})">
              <div class="all-row-bar" style="background:rgba(180,60,60,0.6)"></div>
              <div class="all-row-main">
                <div class="all-row-title">${f.title}</div>
                <div class="all-row-meta">${f.author} · stopped ch ${f.progress || '?'}</div>
              </div>
              <div class="all-row-pills">
                ${sBadge(f.yourStatus)}
              </div>
            </div>`;
        });
      }
    } else {
      h += `emptyState(searchQuery?'search':'list',searchQuery?'no results':'nothing here yet',searchQuery?'try a different search':'add fics using the list picker on each card')`;
    }

  } else if (tab === 'categories' && activeCategory) {
    // Category folder view — support search without re-render
    const cat     = categories.find(c => c.id === activeCategory);
    const catFics = filtered(fics.filter(f => (f.categories || []).includes(activeCategory)));
    h += resultCount(catFics.length, fics.filter(f => (f.categories || []).includes(activeCategory)).length);
    if (catFics.length) {
      h += catFics.map(ficCard).join('');
    } else {
      h += searchQuery
        ? emptyState('search', 'no results', 'try a different search')
        : emptyState('list', 'list is empty', 'hold any card to select fics, then tap add to list');
    }

  } else {
    // tags, categories (no active), stats — fall back to full render
    render();
    return;
  }

  container.innerHTML = h;

  // Restore focus and cursor position
  requestAnimationFrame(() => {
    const el = document.getElementById('search-input');
    if (el && document.activeElement !== el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  });
}


/* ── Full Render ──────────────────────────────────────────── */
function render() {
  const want     = fics.filter(f => f.yourStatus === 'want');
  const reading  = fics.filter(f => f.yourStatus === 'reading');
  const dnf      = fics.filter(f => f.yourStatus === 'dnf');
  const finished = fics.filter(f => f.yourStatus === 'finished');

  // Sync active nav button — only for main 4 tabs
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-' + tab);
  if (nb) nb.classList.add('active');

  // For sidebar tabs add a back-to-shelf breadcrumb
  const isSidebarTab = ['tags', 'stats', 'categories'].includes(tab);
  const backBtn = isSidebarTab
    ? `<button class="sidebar-back-btn" onclick="go('shelf')">← back to shelf</button>`
    : '';

  const pairings = [...new Set(fics.map(f => f.pairing))];
  const tropes   = [...new Set(fics.flatMap(f => f.tropes))];
  const ratings  = [...new Set(fics.map(f => f.rating))];

  let h = '';

  /* ── Shelf ──────────────────────────────────────────────── */
  if (tab === 'shelf') {
    h += `
      <div class="page-header">
        <div class="header-rune">⚡ ✦ ⚡</div>
        <div class="header-title">${settings.appName || 'The Grimoire'}</div>
        <div class="header-sub">${settings.subtitle || 'your fanfic archive'}</div>
        <div class="ornament">
          <div class="orn-l"></div>
          <span style="color:var(--goldD)">✦</span>
          <div class="orn-r"></div>
        </div>
      </div>
      <div class="house-pips">
        <div class="house-pip" style="background:var(--gryff)"></div>
        <div class="house-pip" style="background:var(--slyth)"></div>
        <div class="house-pip" style="background:var(--raven)"></div>
        <div class="house-pip" style="background:var(--huffle)"></div>
      </div>
      <div class="stats">
        <div class="stat-card" style="border-top-color:var(--gold)">
          <div class="stat-num" style="color:var(--goldB)">${want.length}</div>
          <div class="stat-lbl">📜 want</div>
        </div>
        <div class="stat-card" style="border-top-color:#5a8fd0">
          <div class="stat-num" style="color:#80b0e0">${reading.length}</div>
          <div class="stat-lbl">📖 reading</div>
        </div>
        <div class="stat-card" style="border-top-color:var(--slyth)">
          <div class="stat-num" style="color:#5ab07a">${finished.length}</div>
          <div class="stat-lbl">✅ done</div>
        </div>
        <div class="stat-card" style="border-top-color:rgba(180,60,60,0.6)">
          <div class="stat-num" style="color:#c07070">${dnf.length}</div>
          <div class="stat-lbl">✗ dropped</div>
        </div>
      </div>`;

    h += categoryFilterBar();
    h += searchBar('search title, author, pairing, tag…');
    h += '<div id="fic-list-container">';
    const wf = filtered(want);
    h += resultCount(wf.length, want.length);
    h += '<div class="sec-title">📜 want to read</div>';
    if (wf.length) {
      h += wf.map(ficCard).join('');
    } else if (searchQuery) {
      h += `emptyState('search','no results','try a different title, author, or tag')`;
    } else if (reading.length) {
      h += `emptyState('reading','shelf is clear','you have ${reading.length} fic${reading.length>1?"s":""} in progress — check your reading tab')`;
    } else {
      h += `emptyState('shelf','your shelf is empty','tap <b>✦</b> to add your first fic — paste from AO3 or fill in manually')`;
    }
    h += '</div>';

  /* ── Reading ────────────────────────────────────────────── */
  } else if (tab === 'reading') {
    h += '<div style="height:16px"></div>';
    h += searchBar('search title, author, pairing, tag…');
    h += '<div id="fic-list-container">';
    const rf = filtered(reading);
    h += resultCount(rf.length, reading.length);
    h += '<div class="sec-title">📖 currently reading</div>';
    if (rf.length) {
      h += rf.map(readCard).join('');
    } else if (searchQuery) {
      h += `emptyState('search','no results','try a different title, author, or tag')`;
    } else if (want.length) {
      h += `emptyState('reading','nothing in progress','you have ${want.length} fic${want.length>1?"s":""} on your shelf — tap <b>start reading</b> on any card to begin')`;
    } else {
      h += `emptyState('reading','nothing in progress','add a fic to your shelf first, then tap start reading')`;
    }
    h += '</div>';

  /* ── Finished ───────────────────────────────────────────── */
  } else if (tab === 'finished') {
    h += '<div style="height:16px"></div>';
    h += searchBar('search title, author, pairing, tag…');
    h += '<div id="fic-list-container">';
    const ff = filtered(finished);
    h += resultCount(ff.length, finished.length);
    h += '<div class="sec-title">✅ finished</div>';
    if (ff.length) {
      h += ff.map(finCard).join('');
    } else if (searchQuery) {
      h += `emptyState('search','no results','try a different title, author, or tag')`;
    } else if (reading.length) {
      h += `emptyState('finished','nothing finished yet','keep going — you're reading ${reading.length} fic${reading.length>1?"s":""}')`;
    } else {
      h += `emptyState('finished','nothing finished yet','start reading a fic to track your progress')`;
    }
    const df2 = filtered(dnf);
    if (df2.length) {
      h += '<div class="sec-title" style="margin-top:18px;color:#c07070">✗ dropped</div>';
      h += df2.map(dnfCard).join('');
    }
    h += '</div>';

  /* ── All / Master List ──────────────────────────────────── */
  } else if (tab === 'all') {
    const nonDnf2  = fics.filter(f => f.yourStatus !== 'dnf');
    const af       = filtered(nonDnf2);
    const df2      = filtered(dnf);
    h += '<div style="height:16px"></div>';
    h += searchBar('search title, author, pairing, tag…');
    h += resultCount(af.length + df2.length, fics.length);
    h += '<div class="sec-title">📚 master list</div>';
    h += '<div id="fic-list-container">';

    if (af.length || df2.length) {
      const seriesFics2  = af.filter(f => f.seriesName);
      const soloFics2    = af.filter(f => !f.seriesName);
      const seriesNames2 = [...new Set(seriesFics2.map(f => f.seriesName))].sort();

      seriesNames2.forEach(name => {
        const group = seriesFics2
          .filter(f => f.seriesName === name)
          .sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0));
        h += `<div class="series-group-header">📚 ${name}</div>`;
        group.forEach(f => {
          h += `
            <div class="all-row all-row-series" onclick="openDetail(${f.id})">
              <div class="all-row-bar" style="background:${pairGrad(f.pairing)}"></div>
              <div class="all-row-main">
                <div class="all-row-title">${f.seriesOrder ? `${f.seriesOrder}. ` : ''}${f.title}</div>
                <div class="all-row-meta">${f.author} · ${f.pairing}</div>
              </div>
              <div class="all-row-pills">
                ${rPill(f.rating)}
                ${sBadge(f.yourStatus)}
              </div>
            </div>`;
        });
      });

      soloFics2.forEach(f => {
        h += `
          <div class="all-row" onclick="openDetail(${f.id})">
            <div class="all-row-bar" style="background:${pairGrad(f.pairing)}"></div>
            <div class="all-row-main">
              <div class="all-row-title">${f.title}</div>
              <div class="all-row-meta">${f.author} · ${f.pairing}</div>
            </div>
            <div class="all-row-pills">
              ${rPill(f.rating)}
              ${sBadge(f.yourStatus)}
            </div>
          </div>`;
      });

      if (df2.length) {
        h += '<div class="series-group-header" style="color:#c07070;margin-top:12px">✗ dropped</div>';
        df2.forEach(f => {
          h += `
            <div class="all-row" style="opacity:0.6" onclick="openDetail(${f.id})">
              <div class="all-row-bar" style="background:rgba(180,60,60,0.6)"></div>
              <div class="all-row-main">
                <div class="all-row-title">${f.title}</div>
                <div class="all-row-meta">${f.author} · stopped ch ${f.progress || '?'}</div>
              </div>
              <div class="all-row-pills">
                ${sBadge(f.yourStatus)}
              </div>
            </div>`;
        });
      }
    } else {
      h += `emptyState(searchQuery?'search':'shelf',searchQuery?'no results':'nothing here yet',searchQuery?'try a different search':'tap ✦ to add your first fic')`;
    }

    h += '</div>';

  /* ── Tags ───────────────────────────────────────────────── */
  } else if (tab === 'tags') {
    h += backBtn;
    h += '<div style="height:8px"></div><div class="sec-title">🏷 tag index</div>';

    function chips(type, tags) {
      return tags.map(tag => {
        const cnt = type === 'pairing' ? fics.filter(f => f.pairing === tag).length
                  : type === 'trope'   ? fics.filter(f => f.tropes.includes(tag)).length
                  : fics.filter(f => f.rating === tag).length;
        const active = activeTag && activeTag.v === tag;
        return `<span class="tag-chip ${active ? 'active' : ''}" onclick="toggleTag('${type}','${tag}')">
          ${tag}<span class="tag-cnt">${cnt}</span>
        </span>`;
      }).join('');
    }

    h += `<div class="tag-group-lbl">by pairing</div><div class="tag-list">${chips('pairing', pairings)}</div>`;
    h += `<div class="tag-group-lbl">by trope</div><div class="tag-list">${chips('trope', tropes)}</div>`;
    h += `<div class="tag-group-lbl">by rating</div><div class="tag-list">${chips('rating', ratings)}</div>`;

    if (activeTag) {
      const matched = activeTag.t === 'pairing' ? fics.filter(f => f.pairing === activeTag.v)
                    : activeTag.t === 'trope'   ? fics.filter(f => f.tropes.includes(activeTag.v))
                    : fics.filter(f => f.rating === activeTag.v);
      h += `<div class="sec-title" style="margin-top:4px">tagged: ${activeTag.v}</div>`;
      h += matched.length ? matched.map(ficCard).join('') : emptyState('search','no fics found','try a different tag');
    }

  /* ── Categories Management ──────────────────────────────── */
  } else if (tab === 'categories') {
    h += backBtn;
    h += '<div style="height:8px"></div>';

    // If a category is selected, show its fics as a folder view
    if (activeCategory) {
      const cat      = categories.find(c => c.id === activeCategory);
      const catFics  = filtered(fics.filter(f => (f.categories || []).includes(activeCategory)));
      h += `
        <div class="cat-folder-header">
          <button class="cat-folder-back" onclick="setActiveCategory(null)">← all lists</button>
          <span class="cat-folder-title" style="--chip-color:${cat?.color || '#c9a227'}">${cat?.name || ''}</span>
          <span class="cat-folder-count">${catFics.length} fic${catFics.length !== 1 ? 's' : ''}</span>
        </div>`;
      h += searchBar('search in this list…');
      if (catFics.length) {
        h += catFics.map(ficCard).join('');
      } else {
        h += `emptyState('list','list is empty','hold any card to select fics, then tap add to list')`;
      }

    } else {
      // Folder grid view
      h += '<div class="sec-title">🗂 my lists</div>';

      if (categories.length) {
        h += '<div class="cat-folder-grid">';
        categories.forEach(cat => {
          const count = fics.filter(f => (f.categories || []).includes(cat.id)).length;
          const preview = fics
            .filter(f => (f.categories || []).includes(cat.id))
            .slice(0, 3)
            .map(f => `<div class="cat-folder-preview-title">${f.title}</div>`)
            .join('');
          h += `
            <div class="cat-folder-card" onclick="setActiveCategory('${cat.id}')">
              <div class="cat-folder-color-bar" style="background:${cat.color}"></div>
              <div class="cat-folder-card-inner">
                <div class="cat-folder-name">${cat.name}</div>
                <div class="cat-folder-meta">${count} fic${count !== 1 ? 's' : ''}</div>
                <div class="cat-folder-preview">${preview || '<span style="color:var(--dim);font-size:11px;font-style:italic">empty</span>'}</div>
              </div>
              <div class="cat-folder-arrow">›</div>
            </div>`;
        });
        h += '</div>';
      }

      // Manage section below folders
      h += `
        <div class="sec-title" style="margin-top:20px">⚙ manage lists</div>
        <div class="cat-manage-create">
          <input
            id="new-cat-name"
            class="cat-name-input"
            placeholder="new list name…"
            maxlength="24"
            oninput="document.getElementById('new-cat-color').style.display=this.value?'flex':'none'"
          >
          <div id="new-cat-color" class="cat-color-picker" style="display:none">
            ${CAT_COLORS.map(c =>
              `<span class="cat-color-dot" style="background:${c}" data-c="${c}" onclick="selectNewCatColor(this)"></span>`
            ).join('')}
          </div>
          <button class="btn btn-gold cat-create-btn" onclick="createCategory()">+ add list</button>
        </div>`;

      if (categories.length) {
        h += '<div class="cat-list">';
        categories.forEach(cat => {
          const count = fics.filter(f => (f.categories || []).includes(cat.id)).length;
          h += `
            <div class="cat-manage-row" id="catrow-${cat.id}">
              <span class="cat-color-swatch" style="background:${cat.color}"></span>
              <span class="cat-manage-name">${cat.name}</span>
              <span class="cat-manage-count">${count} fic${count !== 1 ? 's' : ''}</span>
              <div class="cat-manage-actions">
                <button class="btn btn-edit" style="padding:4px 8px" onclick="startRenameCategory('${cat.id}')">✎</button>
                <button class="btn btn-red"  style="padding:4px 8px" onclick="deleteCategory('${cat.id}')">✕</button>
              </div>
            </div>`;
        });
        h += '</div>';
      }
    }

  /* ── Reading Stats ──────────────────────────────────────── */
  } else if (tab === 'stats') {
    const fin          = fics.filter(f => f.yourStatus === 'finished');
    const totalWords   = fin.reduce((s, f) => s + (f.words || 0), 0);
    const ratedFics    = fin.filter(f => f.yourRating > 0);
    const avgRating    = ratedFics.length
      ? (ratedFics.reduce((s, f) => s + f.yourRating, 0) / ratedFics.length).toFixed(1)
      : null;

    h += backBtn;
    h += '<div style="height:8px"></div>';
    h += '<div class="sec-title">📊 reading stats</div>';

    // Top pairings across all fics
    const pairCount = {};
    fics.forEach(f => { pairCount[f.pairing] = (pairCount[f.pairing] || 0) + 1; });
    const topPairs  = Object.entries(pairCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Top tropes
    const tropeCount = {};
    fics.forEach(f => (f.tropes || []).forEach(t => { tropeCount[t] = (tropeCount[t] || 0) + 1; }));
    const topTropes = Object.entries(tropeCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Recently read
    const recentlyRead = [...fics]
      .filter(f => f.lastRead)
      .sort((a, b) => b.lastRead - a.lastRead)
      .slice(0, 3);

    h += `
      <div class="stats-grid">
        <div class="stats-cell">
          <div class="stats-num" style="color:var(--goldB)">${fics.length}</div>
          <div class="stats-lbl">total fics</div>
        </div>
        <div class="stats-cell">
          <div class="stats-num" style="color:#5ab07a">${fin.length}</div>
          <div class="stats-lbl">finished</div>
        </div>
        <div class="stats-cell">
          <div class="stats-num" style="color:#80b0e0">${totalWords >= 1000000
            ? (totalWords/1000000).toFixed(1)+'M'
            : totalWords >= 1000 ? Math.round(totalWords/1000)+'k' : totalWords || '—'}</div>
          <div class="stats-lbl">words read</div>
        </div>
        <div class="stats-cell">
          <div class="stats-num" style="color:var(--gold)">${avgRating ? avgRating + ' ★' : '—'}</div>
          <div class="stats-lbl">avg rating</div>
        </div>
      </div>`;

    if (topPairs.length) {
      h += '<div class="sec-title" style="margin-top:20px">top pairings</div>';
      h += '<div class="stats-bar-list">';
      const maxP = topPairs[0][1];
      topPairs.forEach(([name, cnt]) => {
        h += `
          <div class="stats-bar-row">
            <div class="stats-bar-label">${name}</div>
            <div class="stats-bar-track">
              <div class="stats-bar-fill" style="width:${Math.round(cnt/maxP*100)}%"></div>
            </div>
            <div class="stats-bar-count">${cnt}</div>
          </div>`;
      });
      h += '</div>';
    }

    if (topTropes.length) {
      h += '<div class="sec-title" style="margin-top:20px">top tropes</div>';
      h += '<div class="tag-list">';
      topTropes.forEach(([name, cnt]) => {
        h += `<span class="tag-chip">${name}<span class="tag-cnt">${cnt}</span></span>`;
      });
      h += '</div>';
    }

    if (recentlyRead.length) {
      h += '<div class="sec-title" style="margin-top:20px">recently read</div>';
      recentlyRead.forEach(f => {
        h += `
          <div class="stats-recent-row">
            <div class="stats-recent-title">${f.title}</div>
            <div class="stats-recent-meta">${timeAgo(f.lastRead)} · ch ${f.progress || 0}</div>
          </div>`;
      });
    }

    if (!fin.length && !fics.length) {
      h += emptyState('stats', 'no stats yet', 'add fics and start reading to see your stats here');
    }
  }

  document.getElementById('content').innerHTML = h;
}


/* ── Sidebar ──────────────────────────────────────────────── */
function openSidebar() {
  refreshSidebarStats();
  refreshBackupReminder();
  const nameInput = document.getElementById('set-appname');
  if (nameInput) nameInput.value = settings.appName || '';
  const subInput = document.getElementById('set-subtitle');
  if (subInput) subInput.value = settings.subtitle || '';
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

function refreshSidebarStats() {
  const want       = fics.filter(f => f.yourStatus === 'want').length;
  const reading    = fics.filter(f => f.yourStatus === 'reading').length;
  const finished   = fics.filter(f => f.yourStatus === 'finished').length;
  const total      = fics.length;
  const totalWords = fics.reduce((sum, f) => sum + (f.words || 0), 0);

  const pairCount = {};
  fics.forEach(f => { pairCount[f.pairing] = (pairCount[f.pairing] || 0) + 1; });
  const topPair = Object.entries(pairCount).sort((a, b) => b[1] - a[1])[0];

  const container = document.getElementById('sidebar-stats');
  if (!container) return;

  container.innerHTML = `
    <div class="sidebar-stat">
      <div class="sidebar-stat-num" style="color:var(--goldB)">${want}</div>
      <div class="sidebar-stat-lbl">📜 want</div>
    </div>
    <div class="sidebar-stat">
      <div class="sidebar-stat-num" style="color:#80b0e0">${reading}</div>
      <div class="sidebar-stat-lbl">📖 reading</div>
    </div>
    <div class="sidebar-stat">
      <div class="sidebar-stat-num" style="color:#5ab07a">${finished}</div>
      <div class="sidebar-stat-lbl">✅ done</div>
    </div>
    <div class="sidebar-stat">
      <div class="sidebar-stat-num" style="color:var(--parchment)">${total}</div>
      <div class="sidebar-stat-lbl">📚 total</div>
    </div>
    <div class="sidebar-words">
      <span class="sidebar-words-lbl">total words in library</span>
      <span class="sidebar-words-num">${
        totalWords >= 1000000 ? (totalWords / 1000000).toFixed(1) + 'M'
        : totalWords >= 1000  ? Math.round(totalWords / 1000) + 'k'
        : totalWords || '—'
      }</span>
    </div>
    ${topPair
      ? `<div class="sidebar-top-pair">favourite pairing: <b style="color:var(--text)">${topPair[0]}</b> (${topPair[1]} fic${topPair[1] > 1 ? 's' : ''})</div>`
      : ''}
  `;
}


/* ── Settings ─────────────────────────────────────────────── */
function applySettings() {
  const name = settings.appName || 'The Grimoire';
  document.title = name;
  const el = document.getElementById('sidebar-app-title');
  if (el) el.textContent = name;

  const accent = ACCENTS[settings.accent] || ACCENTS.gold;
  const root   = document.documentElement;
  root.style.setProperty('--gold',  accent.gold);
  root.style.setProperty('--goldB', accent.goldB);
  root.style.setProperty('--goldD', accent.goldD);

  // Apply font
  const fontStack = FONTS[settings.font || 'crimson'] || FONTS.crimson;
  root.style.setProperty('--body-font', fontStack);
  document.body.style.fontFamily = fontStack;

  document.querySelectorAll('.color-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.color === settings.accent);
  });

  document.querySelectorAll('.font-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.font === (settings.font || 'crimson'));
  });
}

function saveSettings() {
  const nameInput = document.getElementById('set-appname').value.trim();
  if (nameInput) settings.appName = nameInput;
  const subInput = document.getElementById('set-subtitle')?.value.trim();
  if (subInput !== undefined) settings.subtitle = subInput;
  localStorage.setItem(SETTINGS_STORE, JSON.stringify(settings));
  applySettings();
  render();

  const msg = document.getElementById('settings-msg');
  msg.innerHTML = '<span style="color:#5ab07a">✔ saved</span>';
  setTimeout(() => { msg.innerHTML = ''; }, 2000);
}

function setAccent(color) {
  settings.accent = color;
  applySettings();
}

function setFont(font) {
  settings.font = font;
  applySettings();
}


/* ── Backup Reminder ──────────────────────────────────────── */
function refreshBackupReminder() {
  const el = document.getElementById('backup-reminder');
  if (!el) return;
  const days = daysSinceBackup();
  if (days === null) {
    el.innerHTML = '<span style="color:#e06070">⚠ never backed up</span>';
  } else if (days === 0) {
    el.innerHTML = '<span style="color:#5ab07a">✔ backed up today</span>';
  } else if (days <= 7) {
    el.innerHTML = `<span style="color:var(--gold)">${days} day${days>1?'s':''} since last backup</span>`;
  } else {
    el.innerHTML = `<span style="color:#e06070">⚠ ${days} days since last backup — export soon</span>`;
  }
}


/* ── Onboarding ───────────────────────────────────────────── */
function showOnboarding() {
  const el   = document.createElement('div');
  el.id      = 'onboard-overlay';
  el.className = 'onboard-overlay';
  el.innerHTML = `
    <div class="onboard-sheet">
      <div class="onboard-rune">
        <svg width="80" height="60" viewBox="0 0 130 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Left page -->
          <path d="M8 72 L8 18 Q8 14 12 14 L54 14 Q62 14 65 22 Q65 22 65 50 Q58 42 46 40 Q28 38 18 42 L18 76 Z"
            fill="none" stroke="#c9a227" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
          <!-- Right page -->
          <path d="M122 72 L122 18 Q122 14 118 14 L76 14 Q68 14 65 22 Q65 22 65 50 Q72 42 84 40 Q102 38 112 42 L112 76 Z"
            fill="none" stroke="#c9a227" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
          <!-- Spine curve bottom -->
          <path d="M18 76 Q65 88 112 76"
            fill="none" stroke="#c9a227" stroke-width="6" stroke-linecap="round"/>
          <!-- Center spine line -->
          <path d="M65 50 L65 86"
            fill="none" stroke="#c9a227" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="onboard-title">welcome to the grimoire</div>
      <div class="onboard-sub">your personal fanfic archive</div>
      <div class="onboard-steps">
        <div class="onboard-step">
          <span class="onboard-step-ico">✦</span>
          <div class="onboard-step-title">add a fic</div>
        </div>
        <div class="onboard-step">
          <span class="onboard-step-ico">📖</span>
          <div class="onboard-step-title">track your progress</div>
        </div>
        <div class="onboard-step">
          <span class="onboard-step-ico">📎</span>
          <div class="onboard-step-title">read offline</div>
        </div>
        <div class="onboard-step">
          <span class="onboard-step-ico">💾</span>
          <div class="onboard-step-title">back up your library</div>
        </div>
      </div>
      <button class="onboard-btn" onclick="dismissOnboarding()">✦ open my grimoire</button>
    </div>
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
}

function dismissOnboarding() {
  markOnboarded();
  const el = document.getElementById('onboard-overlay');
  if (el) {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 350);
  }
}


/* ── Pull to Refresh ──────────────────────────────────────── */
(function initPullToRefresh() {
  const scrollArea = document.getElementById('scrollarea');
  const indicator  = document.getElementById('ptr-indicator');
  const THRESHOLD  = 80;

  let startY    = 0;
  let pulling   = false;
  let triggered = false;

  scrollArea.addEventListener('touchstart', e => {
    if (scrollArea.scrollTop === 0) {
      startY  = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  scrollArea.addEventListener('touchmove', e => {
    if (!pulling) return;
    const delta = e.touches[0].clientY - startY;
    if (delta <= 0) { pulling = false; return; }

    triggered             = delta >= THRESHOLD;
    indicator.textContent = triggered ? '↻ release to refresh' : '↓ pull to refresh';
    indicator.className   = triggered ? 'ready' : 'pulling';
  }, { passive: true });

  scrollArea.addEventListener('touchend', () => {
    if (!pulling) return;
    pulling = false;

    if (triggered) {
      indicator.className   = 'spinning';
      indicator.textContent = '↻';
      setTimeout(() => {
        render();
        indicator.className = '';
      }, 400);
    } else {
      indicator.className = '';
    }

    triggered = false;
  });
})();
