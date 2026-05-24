/* ============================================================
   GRIMOIRE — sw.js  (cache-busted rebuild)
   ============================================================ */

const CACHE_PREFIX = 'grimoire-3-';   // changed prefix kills ALL old caches

const ASSETS = [
  '/',
  '/index.html',
  '/version.json',
  '/scripts/data.js',
  '/scripts/helpers.js',
  '/scripts/cards.js',
  '/scripts/select.js',
  '/scripts/actions.js',
  '/scripts/form.js',
  '/scripts/render.js',
  '/scripts/epub.js',
  '/scripts/init.js',
  '/styles/base.css',
  '/styles/components.css',
  '/styles/extras.css',
  '/styles/reader.css',
  '/styles/categories.css',
  '/manifest.json',
];

async function getLiveVersion() {
  try {
    const res  = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    return data.version || 'unknown';
  } catch (_) { return 'unknown'; }
}

async function getCachedVersion() {
  try {
    const keys = await caches.keys();
    const mine = keys.find(k => k.startsWith(CACHE_PREFIX));
    return mine ? mine.replace(CACHE_PREFIX, '') : null;
  } catch (_) { return null; }
}

// Install: cache everything
self.addEventListener('install', e => {
  e.waitUntil(
    getLiveVersion().then(v =>
      caches.open(CACHE_PREFIX + v)
            .then(c => c.addAll(ASSETS))
            .then(() => self.skipWaiting())
    )
  );
});

// Activate: delete ALL caches not matching current prefix+version
self.addEventListener('activate', e => {
  e.waitUntil(
    getLiveVersion().then(async v => {
      const keep = CACHE_PREFIX + v;
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== keep).map(k => caches.delete(k)));
      return self.clients.claim();
    })
  );
});

// Fetch: network-first for version.json, cache-first for everything else
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (url.pathname === '/version.json') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  if (url.origin !== self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(c => c || fetch(e.request).then(r => {
        if (r.ok) getCachedVersion().then(v =>
          caches.open(CACHE_PREFIX + (v || 'unknown')).then(cache => cache.put(e.request, r.clone()))
        );
        return r;
      }))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(c => c || fetch(e.request).then(r => {
      if (r.ok) getCachedVersion().then(v =>
        caches.open(CACHE_PREFIX + (v || 'unknown')).then(cache => cache.put(e.request, r.clone()))
      );
      return r;
    }))
  );
});

// Message: check for update
self.addEventListener('message', async e => {
  if (e.data !== 'CHECK_UPDATE') return;
  const [cached, live] = await Promise.all([getCachedVersion(), getLiveVersion()]);
  if (live && cached && live !== cached) {
    const cache = await caches.open(CACHE_PREFIX + live);
    await cache.addAll(ASSETS);
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.postMessage({ type: 'UPDATE_READY', version: live }));
  }
});
