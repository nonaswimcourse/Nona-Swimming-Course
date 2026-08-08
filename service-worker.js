// Service worker minimal — tujuan utamanya cuma bikin situs ini "installable"
// (bisa ditambah ke Layar Utama) dengan logo yang benar. Bukan untuk offline caching penuh.
const CACHE_NAME = "nona-swimming-shell-v1";
const APP_SHELL = [
  "/",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first, fallback ke cache kalau offline
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
