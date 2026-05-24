/* ============================================================
   GRIMOIRE v3 — data.js
   PWA · Service Worker · Data Stores · Persistence
   ============================================================ */


/* ── PWA Manifest ─────────────────────────────────────────── */
(function registerManifest() {
  const manifest = {
    name: 'Grimoire',
    short_name: 'Grimoire',
    start_url: './',
    display: 'standalone',
    background_color: '#07050a',
    theme_color: '#07050a',
    icons: [{
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' fill='%2307050a'/%3E%3Ctext x='96' y='140' text-anchor='middle' font-size='130' fill='%23c9a227'%3E🪄%3C/text%3E%3C/svg%3E",
      sizes: '192x192',
      type: 'image/svg+xml'
    }]
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const link = document.createElement('link');
  link.rel  = 'manifest';
  link.href = URL.createObjectURL(blob);
  document.head.appendChild(link);
})();


/* ── Service Worker ───────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  const sw = `
    const CACHE = 'grim-v3';
    self.addEventListener('install', e =>
      e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', location.href])))
    );
    self.addEventListener('fetch', e =>
      e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./')))
      )
    );
  `;
  navigator.serviceWorker
    .register(URL.createObjectURL(new Blob([sw], { type: 'application/javascript' })))
    .catch(() => {});
}


/* ── Fics Store ───────────────────────────────────────────── */
const STORE = 'grimoire-v3';

let fics = JSON.parse(localStorage.getItem(STORE) || 'null') || [
  {
    id: 1, title: 'The Alkahest', author: 'shadukiam', pairing: 'Dramione',
    rating: 'M', tropes: ['marriage law', 'slow burn', 'enemies to lovers'],
    words: 372568, totalChapters: '83/?', ficStatus: 'ongoing',
    yourStatus: 'want', progress: 0,
    link: 'https://archiveofourown.org/works/6030910',
    yourRating: 0, notes: "marriage law fic — draco-shaped wrench in hermione's plans"
  },
  {
    id: 2, title: 'The Life and Times', author: 'Jewels5', pairing: 'James/Lily',
    rating: 'M', tropes: ['marauders era', 'slow burn', 'humor', 'angst'],
    words: null, totalChapters: '36/?', ficStatus: 'abandoned',
    yourStatus: 'want', progress: 0, link: null,
    yourRating: 0, notes: 'legendary, unfinished masterpiece'
  },
  {
    id: 3, title: 'Commentarius', author: 'B.C Daily', pairing: 'James/Lily',
    rating: 'T', tropes: ['diary format', 'slow burn', 'humor'],
    words: null, totalChapters: '46/46', ficStatus: 'complete',
    yourStatus: 'want', progress: 0, link: null,
    yourRating: 0, notes: "lily's diary POV watching james be a disaster"
  },
  {
    id: 4, title: 'All the Young Dudes', author: 'MsKingBean89', pairing: 'Wolfstar + Marauders',
    rating: 'M', tropes: ['found family', 'angst', 'slow burn'],
    words: null, totalChapters: '188/188', ficStatus: 'complete',
    yourStatus: 'want', progress: 0, link: null,
    yourRating: 0, notes: 'sirius as a human fire hazard'
  },
  {
    id: 5, title: 'Falling Through Time', author: 'wittyhistorian', pairing: 'Hermione/Fred Weasley',
    rating: 'T', tropes: ['time travel', 'time turner', 'romance', 'slow burn'],
    words: 353137, totalChapters: '56/56', ficStatus: 'complete',
    yourStatus: 'want', progress: 0,
    link: 'https://archiveofourown.org/works/4475078',
    yourRating: 0, notes: 'hermione goes back in time, forced to relive hogwarts and the war — falls for fred'
  }
];

function save() {
  localStorage.setItem(STORE, JSON.stringify(fics));
}

function upd(id, fn) {
  fics = fics.map(f => f.id === id ? fn({ ...f }) : f);
  save();
  render();
}


/* ── Shelf Order Store ────────────────────────────────────── */
const ORDER_STORE = 'grimoire-order';
let shelfOrder = JSON.parse(localStorage.getItem(ORDER_STORE) || 'null') || {};

function saveOrder() {
  localStorage.setItem(ORDER_STORE, JSON.stringify(shelfOrder));
}

function getOrder(id) {
  return shelfOrder[id] !== undefined ? shelfOrder[id] : id;
}


/* ── Categories Store ─────────────────────────────────────── */
const CAT_STORE = 'grimoire-categories';
let categories = JSON.parse(localStorage.getItem(CAT_STORE) || 'null') || [];

const CAT_COLORS = [
  '#c9a227', '#9b1b30', '#1e5c32', '#1a3468',
  '#b05080', '#1a7a7a', '#7a4a00', '#6a3a8a'
];

function saveCats() {
  localStorage.setItem(CAT_STORE, JSON.stringify(categories));
}

function nextCatColor() {
  const used = categories.map(c => c.color);
  return CAT_COLORS.find(c => !used.includes(c)) || CAT_COLORS[categories.length % CAT_COLORS.length];
}


/* ── Settings Store ───────────────────────────────────────── */
const SETTINGS_STORE = 'grimoire-settings';

let settings = JSON.parse(localStorage.getItem(SETTINGS_STORE) || 'null') || {
  appName:  'Grimoire',
  subtitle: 'your fanfic archive',
  accent:   'gold',
  font:     'crimson'
};

const ACCENTS = {
  gold:      { gold: '#c9a227', goldB: '#e8c060', goldD: '#7a6020' },
  crimson:   { gold: '#c94060', goldB: '#e87090', goldD: '#7a2030' },
  slytherin: { gold: '#2ea05a', goldB: '#50c880', goldD: '#1a6030' },
  raven:     { gold: '#4070c0', goldB: '#70a0e8', goldD: '#1a3468' },
  rose:      { gold: '#b05080', goldB: '#d878a8', goldD: '#703060' },
  teal:      { gold: '#20a0a0', goldB: '#40c8c8', goldD: '#106060' }
};

const FONTS = {
  crimson: "'Crimson Text', Georgia, serif",
  georgia: "Georgia, 'Times New Roman', serif",
  system:  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
};


/* ── App State ────────────────────────────────────────────── */
let tab            = 'shelf';
let activeTag      = null;
let activeCategory = null;
let searchQuery    = '';
let sortBy         = 'date-desc';
let editingId      = null;
let filterBy       = { rating: '', ficStatus: '', yourStatus: '' };


/* ── Backup Reminder ──────────────────────────────────────── */
const BACKUP_KEY = 'grimoire-last-backup';

function stampBackup() {
  localStorage.setItem(BACKUP_KEY, Date.now().toString());
}

function daysSinceBackup() {
  const ts = parseInt(localStorage.getItem(BACKUP_KEY) || '0');
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / 86400000);
}


/* ── Onboarding ───────────────────────────────────────────── */
const ONBOARD_KEY = 'grimoire-onboarded';

function hasOnboarded() {
  return !!localStorage.getItem(ONBOARD_KEY);
}

function markOnboarded() {
  localStorage.setItem(ONBOARD_KEY, '1');
}


/* ── Last Read Stamp ──────────────────────────────────────── */
function stampLastRead(id) {
  fics = fics.map(f => f.id === id ? { ...f, lastRead: Date.now() } : f);
  save();
}

function timeAgo(ts) {
  if (!ts) return null;
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 2)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1)  return 'yesterday';
  if (days < 7)    return `${days} days ago`;
  if (days < 30)   return `${Math.floor(days/7)}w ago`;
  return `${Math.floor(days/30)}mo ago`;
}
