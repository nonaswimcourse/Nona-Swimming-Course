const CACHE_NAME = 'pagora-tanjung-v7';
const APP_SHELL = [
  '/index.html',
  '/profil/',
  '/ruang-guru/',
  '/galeri/',
  '/kontak/',
  '/kegiatan/',
  '/css/style.css',
  '/js/script.js',
  '/js/data-loader.js',
  '/js/galeri-data.js',
  '/js/kegiatan.js',
  '/js/komentar.js',
  '/js/ui-feedback.js',
  '/js/supabase-config.js',
  '/assets/img/logo.png',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Network-first for navigation/HTML so content stays fresh; cache-first for static assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Don't intercept Supabase API/storage calls or admin pages needing auth freshness.
  if (request.url.includes('supabase.co')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // CSS/JS: stale-while-revalidate so old cached logic (e.g. galeri rendering)
  // never gets stuck on a device — it's refreshed in the background on every visit
  // instead of only when the cache name changes.
  const isAppCode = request.url.endsWith('.css') || request.url.endsWith('.js');
  if (isAppCode) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Everything else (images, icons, fonts): cache-first, they rarely change.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
