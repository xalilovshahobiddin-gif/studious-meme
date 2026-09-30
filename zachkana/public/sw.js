/* Zachkana service worker — oflayn rejim
   - Ilova qobigʻi (shell) oldindan keshlanadi
   - Sahifalar: avval tarmoq, boʻlmasa kesh
   - Statik fayllar va shriftlar: kesh + fonda yangilash */
const VERSION = 'zk-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './ui/zachkana-ui.css',
  './ui/zachkana-icons.js',
  './css/app.css',
  './js/data.js',
  './js/app.js',
  './assets/logo-mark.svg',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);

  // Server qismlari keshlanmaydi: API (ilova oʻzi keshlaydi), admin panel, yuklangan fayllar
  if (url.origin === self.location.origin && /^\/(api|admin|livewire|filament|storage|up)(\/|$)/.test(url.pathname.slice(scope.pathname.length - 1))) return;

  // Sahifa navigatsiyasi: avval tarmoq
  // Faqat bosh sahifa (SPA) index.html sifatida keshlanadi
  if (req.mode === 'navigate') {
    const isShell = url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html';
    e.respondWith(
      fetch(req)
        .then(res => { if (isShell && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); } return res; })
        .catch(() => caches.match(isShell ? './index.html' : req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Oʻz fayllarimiz va Google Fonts: kesh + fonda yangilash
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (sameOrigin || isFont) {
    e.respondWith(
      caches.open(VERSION).then(async cache => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
