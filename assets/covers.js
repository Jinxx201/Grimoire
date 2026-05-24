/* ============================================================
   GRIMOIRE v4 — covers.js
   Cover Image Storage · Upload · Cache · Remove
   ============================================================ */


/* ── IndexedDB Setup ──────────────────────────────────────── */
const COVER_DB_NAME    = 'grimoire-covers-db';
const COVER_DB_VERSION = 1;
const COVER_STORE_NAME = 'covers';

function openCoverDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(COVER_DB_NAME, COVER_DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(COVER_STORE_NAME)) {
        db.createObjectStore(COVER_STORE_NAME, { keyPath: 'ficId' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function saveCover(ficId, dataUrl) {
  const db = await openCoverDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(COVER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(COVER_STORE_NAME);
    store.put({ ficId, dataUrl, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}

async function loadCover(ficId) {
  const db = await openCoverDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(COVER_STORE_NAME, 'readonly');
    const store = tx.objectStore(COVER_STORE_NAME);
    const req   = store.get(ficId);
    req.onsuccess = e => resolve(e.target.result?.dataUrl || null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function deleteCover(ficId) {
  const db = await openCoverDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(COVER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(COVER_STORE_NAME);
    store.delete(ficId);
    tx.oncomplete = () => resolve();
    tx.onerror    = e => reject(e.target.error);
  });
}


/* ── Cover Cache (dataUrl in memory) ─────────────────────── */
let _coverCache = {};   // ficId → dataUrl or null

async function refreshCoverCache() {
  const db = await openCoverDB();
  return new Promise(resolve => {
    const tx    = db.transaction(COVER_STORE_NAME, 'readonly');
    const store = tx.objectStore(COVER_STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = e => {
      _coverCache = {};
      (e.target.result || []).forEach(r => { _coverCache[r.ficId] = r.dataUrl; });
      resolve(_coverCache);
    };
    req.onerror = () => resolve({});
  });
}

function getCoverUrl(ficId) {
  return _coverCache[ficId] || null;
}


/* ── Upload ───────────────────────────────────────────────── */
function triggerCoverUpload(ficId) {
  let inp = document.getElementById('_cover-input');
  if (!inp) {
    inp          = document.createElement('input');
    inp.type     = 'file';
    inp.accept   = 'image/*';
    inp.id       = '_cover-input';
    inp.style.display = 'none';
    document.body.appendChild(inp);
  }
  inp.value    = '';
  inp.onchange = e => handleCoverFile(ficId, e.target.files[0]);
  inp.click();
}

async function handleCoverFile(ficId, file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please pick an image file.');
    return;
  }

  // Resize to max 400×600 and compress to keep storage small
  const dataUrl = await resizeImage(file, 400, 600);
  await saveCover(ficId, dataUrl);
  _coverCache[ficId] = dataUrl;

  // Update the cover thumbnail in place without full re-render
  const thumb = document.getElementById(`cover-${ficId}`);
  if (thumb) {
    thumb.outerHTML = coverThumbHtml(ficId);
  } else {
    render();
  }
}

async function removeCover(ficId) {
  if (!confirm('Remove the cover image?')) return;
  await deleteCover(ficId);
  delete _coverCache[ficId];
  render();
}

function resizeImage(file, maxW, maxH) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w     = Math.round(img.width  * ratio);
      const h     = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}


/* ── Cover Thumbnail HTML ─────────────────────────────────── */
function coverThumbHtml(ficId) {
  const url = getCoverUrl(ficId);
  if (url) {
    return `<div class="cover-thumb" id="cover-${ficId}">
      <img src="${url}" class="cover-img" alt="cover" onclick="triggerCoverUpload(${ficId})">
    </div>`;
  }
  return `<div class="cover-thumb cover-thumb-empty" id="cover-${ficId}" onclick="triggerCoverUpload(${ficId})" title="add cover">
    <span class="cover-add-ico">🖼</span>
  </div>`;
}


/* ── Init ─────────────────────────────────────────────────── */
/* ── Init ─────────────────────────────────────────────────── */
refreshCoverCache();
