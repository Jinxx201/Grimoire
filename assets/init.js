/* ============================================================
   GRIMOIRE v3 — init.js
   App Entry Point
   ============================================================ */

applySettings();
render();

// ── Service Worker + Auto-update ─────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => {
      // Check for updates every time the app is opened
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });

      // Also ask the SW to check for a new version.json on each load
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('CHECK_UPDATE');
      }
    })
    .catch(() => {
      // SW registration failed (e.g. file:// protocol) — app still works online
    });

  // Listen for UPDATE_READY message from the service worker
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'UPDATE_READY') showUpdateToast();
  });
}

function showUpdateToast() {
  if (document.getElementById('update-toast')) return; // already showing

  const toast = document.createElement('div');
  toast.id    = 'update-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    left: 50%;
    transform: translateX(-50%);
    background: #1a1508;
    border: 1px solid #8a6820;
    border-radius: 8px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 99999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.7);
    font-family: 'Cinzel', serif;
    font-size: 11px;
    letter-spacing: 1px;
    color: #c8a028;
    white-space: nowrap;
  `;
  toast.innerHTML = `
    <span>✦ update ready</span>
    <button onclick="window.location.reload()" style="
      background: #8a6820;
      color: #0e0c09;
      border: none;
      border-radius: 4px;
      padding: 5px 12px;
      font-family: 'Cinzel', serif;
      font-size: 10px;
      letter-spacing: 1px;
      cursor: pointer;
    ">reload</button>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: #6a5a3a;
      font-size: 16px;
      cursor: pointer;
      padding: 0 2px;
      line-height: 1;
    ">×</button>
  `;
  document.body.appendChild(toast);
}

// Show backup reminder in sidebar whenever it opens
refreshBackupReminder();

// Show onboarding on first visit
if (!hasOnboarded()) {
  setTimeout(showOnboarding, 600);
}

// Scroll-to-top button + hamburger auto-hide on scroll
(function initScrollTop() {
  const scrollArea = document.getElementById('scrollarea');
  const btn        = document.getElementById('scroll-top-btn');
  const hamburger  = document.getElementById('hamburger');
  if (!scrollArea) return;

  let lastScrollY  = 0;
  let ticking      = false;

  scrollArea.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = scrollArea.scrollTop;

        // Scroll-to-top button
        if (btn) btn.classList.toggle('visible', y > 300);

        // Hamburger: hide when scrolled down, show when back near top
        if (hamburger) {
          if (y > 60 && y > lastScrollY) {
            // Scrolling DOWN past threshold — hide
            hamburger.classList.add('hamburger-hidden');
          } else if (y <= 60 || y < lastScrollY - 10) {
            // Back near top OR scrolling UP — show
            hamburger.classList.remove('hamburger-hidden');
          }
        }

        lastScrollY = y;
        ticking     = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

function scrollToTop() {
  const scrollArea = document.getElementById('scrollarea');
  if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
}
