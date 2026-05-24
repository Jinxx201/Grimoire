/* ============================================================
   GRIMOIRE v4 — cards.js
   Fic Card · Read Card · Finished Card · DNF Card
   ============================================================ */


/* ── Long-press wrapper attributes ───────────────────────── */
function lpAttrs(id) {
  return `data-id="${id}"
    onpointerdown="onCardPointerDown(event,${id})"
    onpointerup="onCardPointerUp()"
    onpointermove="onCardPointerMove()"
    onpointercancel="onCardPointerUp()"`;
}

/* ── Card tap — open detail unless in select mode ─────────── */
function cardTap(id) {
  if (_selectMode) { toggleSelect(id); return; }
  openDetail(id);
}


/* ── Shelf / Want Card ────────────────────────────────────── */
function ficCard(f) {
  const isReading  = f.yourStatus === 'reading';
  const p          = pct(f);
  const mch        = maxCh(f.totalChapters);
  const isSelected = _selectMode && _selectedIds.has(f.id);

  return `
    <div class="fic-card ${isSelected ? 'card-selected' : ''} ${_selectMode ? 'select-mode' : ''}"
      ${lpAttrs(f.id)}>

      ${_selectMode ? checkboxHtml(f.id) : `<div class="drag-handle" onpointerdown="dragStart(event,${f.id})" title="hold to reorder">⠃</div>`}
      <div class="card-bar" style="background:${pairGrad(f.pairing)}"></div>

      <div class="card-cover-row">
        ${coverThumbHtml(f.id)}
        <div class="card-cover-body">
          ${f.seriesName ? `<div class="series-badge">📚 ${f.seriesName}${f.seriesOrder ? ` · part ${f.seriesOrder}` : ''}</div>` : ''}
          <div class="card-header-tap" onclick="cardTap(${f.id})">
            <div class="card-title">${f.title}</div>
            <div class="card-author">by ${f.author}${f.fandom ? ` · <span class="fandom-inline">${f.fandom}</span>` : ''}</div>
          </div>
          <div class="card-meta">
            <span class="pill pill-pair">${f.pairing}</span>
            ${rPill(f.rating)}
            ${fsPill(f.ficStatus)}
            ${isReading ? '<span class="pill" style="font-size:8px;color:#80b0e0;background:rgba(26,52,104,.2);border:1px solid rgba(26,52,104,.4)">&#128214; reading</span>' : ''}
          </div>
        </div>
      </div>

      ${f.tropes.length ? `<div class="card-tropes">${f.tropes.map(t => `<span class="trope-tag">${t}</span>`).join('')}</div>` : ''}

      <div class="card-stats">
        <span>&#128196; ${f.totalChapters}</span>
        <span>&#128221; ${fmtW(f.words)}</span>
      </div>

      ${isReading ? `
        <div class="shelf-progress">
          <div class="prog-bar-wrap" style="margin-bottom:3px">
            <div class="prog-bar-fill" style="width:${p}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim)">
            <span>ch ${f.progress || 0}/${mch || '?'}</span>
            <span>${p}%</span>
          </div>
        </div>` : ''}

      ${f.lastRead ? `<div class="card-lastread">last read ${timeAgo(f.lastRead)}</div>` : ''}

      ${catAssignRow(f)}

      ${_selectMode ? '' : `
        <div class="card-actions">
          ${isReading
            ? `<button class="btn btn-gold" onclick="go('reading')">&#128214; jump to reading</button>`
            : `<button class="btn btn-gold" onclick="startReading(${f.id})">start reading</button>`}
          ${epubCached(f.id)
            ? `<button class="btn btn-epub-read" onclick="openReader(${f.id})">📖 read offline</button>`
            : `<button class="btn btn-epub" data-epub-btn="${f.id}" onclick="triggerEpubUpload(${f.id})">📎 upload epub</button>`}
          ${openUrl(f) ? `<a href="${openUrl(f)}" target="_blank" class="btn btn-dim">open ↗</a>` : ''}
          <button class="btn btn-edit" onclick="openEdit(${f.id})">&#9998; edit</button>
          <div class="more-menu-wrap">
            <button class="btn btn-dim more-btn" onclick="toggleMore(this)">⋯</button>
            <div class="more-dropdown">
              <button class="more-item" onclick="closeMore();openDetail(${f.id})">📋 more info</button>
              ${getCoverUrl(f.id)
                ? `<button class="more-item more-item-warn" onclick="closeMore();removeCover(${f.id})">🖼 remove cover</button>`
                : `<button class="more-item" onclick="closeMore();triggerCoverUpload(${f.id})">🖼 add cover</button>`}
              ${epubCached(f.id)
                ? `<button class="more-item more-item-warn" onclick="closeMore();removeEpub(${f.id})">✕ remove epub</button>`
                : ''}
              <button class="more-item more-item-danger" onclick="closeMore();del(${f.id})">🗑 remove fic</button>
            </div>
          </div>
        </div>`}
    </div>`;
}


/* ── Reading Card ─────────────────────────────────────────── */
function readCard(f) {
  const p          = pct(f);
  const mch        = maxCh(f.totalChapters);
  const isSelected = _selectMode && _selectedIds.has(f.id);

  return `
    <div class="fic-card ${isSelected ? 'card-selected' : ''} ${_selectMode ? 'select-mode' : ''}"
      ${lpAttrs(f.id)}>

      ${_selectMode ? checkboxHtml(f.id) : ''}
      <div class="card-bar" style="background:${pairGrad(f.pairing)}"></div>

      ${f.seriesName ? `<div class="series-badge">📚 ${f.seriesName}${f.seriesOrder ? ` · part ${f.seriesOrder}` : ''}</div>` : ''}

      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:8px">
        <div class="card-header-tap" onclick="cardTap(${f.id})" style="flex:1">
          <div class="card-title">${f.title}</div>
          <div class="card-author">by ${f.author}</div>
        </div>
        <div style="display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end">
          <span class="pill pill-pair" style="font-size:8px">${f.pairing}</span>
          ${rPill(f.rating)}
        </div>
      </div>

      <div class="prog-bar-wrap">
        <div class="prog-bar-fill" id="fill-${f.id}" style="width:${p}%"></div>
      </div>
      <div class="prog-label">
        <span>ch ${f.progress || 0} / ${mch || '?'}</span>
        <span id="pct-${f.id}">${p}%</span>
      </div>

      ${_selectMode ? '' : `
        <div class="prog-input">
          <button class="stepper-btn" onclick="stepProg(${f.id},-1)">−</button>
          <span class="stepper-val" id="sv-${f.id}">ch ${f.progress || 0}</span>
          <button class="stepper-btn" onclick="stepProg(${f.id},1)">+</button>
          <span style="color:var(--dim);font-size:11px;margin-left:4px">/ ${mch || '?'} · ${fmtW(f.words)}</span>
        </div>`}

      ${f.lastRead ? `<div class="card-lastread">last read ${timeAgo(f.lastRead)}</div>` : ''}
      ${catAssignRow(f)}

      ${_selectMode ? '' : `
        <div class="card-actions" style="margin-top:12px">
          <button class="btn btn-green" onclick="markDone(${f.id})">mark finished</button>
          <button class="btn btn-dim"   onclick="moveBack(${f.id})">← shelf</button>
          ${epubCached(f.id)
            ? `<button class="btn btn-epub-read" onclick="openReader(${f.id})">📖 read offline</button>`
            : `<button class="btn btn-epub" data-epub-btn="${f.id}" onclick="triggerEpubUpload(${f.id})">📎 upload epub</button>`}
          ${openUrl(f) ? `<a href="${openUrl(f)}" target="_blank" class="btn btn-gold">
            ${f.progress > 0 ? `read ch ${f.progress} ↗` : (f.link && f.link.includes('fanfiction.net') ? 'open on FFN ↗' : 'open on AO3 ↗')}
          </a>` : ''}
          <button class="btn btn-edit" onclick="openEdit(${f.id})">✎ edit</button>
          <div class="more-menu-wrap">
            <button class="btn btn-dim more-btn" onclick="toggleMore(this)">⋯</button>
            <div class="more-dropdown">
              <button class="more-item" onclick="closeMore();openDetail(${f.id})">📋 more info</button>
              <button class="more-item more-item-warn" onclick="closeMore();markDNF(${f.id})">✗ drop this fic</button>
              ${getCoverUrl(f.id)
                ? `<button class="more-item more-item-warn" onclick="closeMore();removeCover(${f.id})">🖼 remove cover</button>`
                : `<button class="more-item" onclick="closeMore();triggerCoverUpload(${f.id})">🖼 add cover</button>`}
              ${epubCached(f.id)
                ? `<button class="more-item more-item-warn" onclick="closeMore();removeEpub(${f.id})">✕ remove epub</button>`
                : ''}
              <button class="more-item more-item-danger" onclick="closeMore();del(${f.id})">🗑 remove fic</button>
            </div>
          </div>
        </div>`}
    </div>`;
}


/* ── Finished Card ────────────────────────────────────────── */
function finCard(f) {
  const isSelected = _selectMode && _selectedIds.has(f.id);
  const stars = [1,2,3,4,5]
    .map(n => `<span class="star ${n <= (f.yourRating||0) ? 'on' : ''}" onclick="rate(${f.id},${n})">★</span>`)
    .join('');

  return `
    <div class="fin-card ${isSelected ? 'card-selected' : ''} ${_selectMode ? 'select-mode' : ''}"
      data-id="${f.id}"
      onpointerdown="onCardPointerDown(event,${f.id})"
      onpointerup="onCardPointerUp()"
      onpointermove="onCardPointerMove()"
      onpointercancel="onCardPointerUp()">

      ${_selectMode ? checkboxHtml(f.id) : ''}
      <div class="card-bar" style="background:var(--slyth)"></div>

      ${f.seriesName ? `<div class="series-badge">📚 ${f.seriesName}${f.seriesOrder ? ` · part ${f.seriesOrder}` : ''}</div>` : ''}

      <div class="card-header-tap" onclick="cardTap(${f.id})">
        <div class="card-title">${f.title}</div>
        <div class="card-author">${f.author} · ${f.pairing} · ${f.totalChapters} · ${fmtW(f.words)}</div>
      </div>

      ${_selectMode ? '' : `<div class="stars">${stars}</div>
      <div class="star-lbl">${f.yourRating ? f.yourRating+'/5 stars' : 'tap to rate'}</div>`}

      ${f.rereadCount ? `<div class="reread-badge">♻ read ${f.rereadCount+1}× total</div>` : ''}

      ${catAssignRow(f)}

      ${_selectMode ? '' : `
        <div class="card-actions" style="margin-top:10px">
          <button class="btn btn-dim"  onclick="moveBack(${f.id})">← back</button>
          <button class="btn btn-gold" onclick="addReread(${f.id})">♻ reread</button>
          ${epubCached(f.id)
            ? `<button class="btn btn-epub-read" onclick="openReader(${f.id})">📖 read offline</button>`
            : `<button class="btn btn-epub" data-epub-btn="${f.id}" onclick="triggerEpubUpload(${f.id})">📎 upload epub</button>`}
          ${openUrl(f) ? `<a href="${openUrl(f)}" target="_blank" class="btn btn-dim">open ↗</a>` : ''}
          <button class="btn btn-edit" onclick="openEdit(${f.id})">✎ edit</button>
          <div class="more-menu-wrap">
            <button class="btn btn-dim more-btn" onclick="toggleMore(this)">⋯</button>
            <div class="more-dropdown">
              <button class="more-item" onclick="closeMore();openDetail(${f.id})">📋 more info</button>
              ${getCoverUrl(f.id)
                ? `<button class="more-item more-item-warn" onclick="closeMore();removeCover(${f.id})">🖼 remove cover</button>`
                : `<button class="more-item" onclick="closeMore();triggerCoverUpload(${f.id})">🖼 add cover</button>`}
              ${epubCached(f.id)
                ? `<button class="more-item more-item-warn" onclick="closeMore();removeEpub(${f.id})">✕ remove epub</button>`
                : ''}
              <button class="more-item more-item-danger" onclick="closeMore();del(${f.id})">🗑 remove fic</button>
            </div>
          </div>
        </div>`}
    </div>`;
}


/* ── DNF Card ─────────────────────────────────────────────── */
function dnfCard(f) {
  const isSelected = _selectMode && _selectedIds.has(f.id);

  return `
    <div class="dnf-card ${isSelected ? 'card-selected' : ''} ${_selectMode ? 'select-mode' : ''}"
      data-id="${f.id}"
      onpointerdown="onCardPointerDown(event,${f.id})"
      onpointerup="onCardPointerUp()"
      onpointermove="onCardPointerMove()"
      onpointercancel="onCardPointerUp()">

      ${_selectMode ? checkboxHtml(f.id) : ''}
      <div class="card-bar" style="background:rgba(180,60,60,0.6)"></div>

      ${f.seriesName ? `<div class="series-badge">📚 ${f.seriesName}${f.seriesOrder ? ` · part ${f.seriesOrder}` : ''}</div>` : ''}

      <div class="card-header-tap" onclick="cardTap(${f.id})">
        <div class="card-title">${f.title}</div>
        <div class="card-author">by ${f.author} · dropped at ch ${f.progress || '?'}</div>
      </div>

      <div class="card-meta">
        <span class="pill pill-pair">${f.pairing}</span>
        ${rPill(f.rating)}
        ${fsPill(f.ficStatus)}
      </div>

      ${catAssignRow(f)}

      ${_selectMode ? '' : `
        <div class="card-actions" style="margin-top:10px">
          <button class="btn btn-dim"  onclick="moveBack(${f.id})">← back to shelf</button>
          <button class="btn btn-gold" onclick="startReading(${f.id})">↺ try again</button>
          <button class="btn btn-edit" onclick="openEdit(${f.id})">✎ edit</button>
          <div class="more-menu-wrap">
            <button class="btn btn-dim more-btn" onclick="toggleMore(this)">⋯</button>
            <div class="more-dropdown">
              <button class="more-item" onclick="closeMore();openDetail(${f.id})">📋 more info</button>
              ${epubCached(f.id)
                ? `<button class="more-item more-item-warn" onclick="closeMore();removeEpub(${f.id})">✕ remove epub</button>`
                : ''}
              <button class="more-item more-item-danger" onclick="closeMore();del(${f.id})">🗑 remove fic</button>
            </div>
          </div>
        </div>`}
    </div>`;
}
