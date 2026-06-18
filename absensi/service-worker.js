/* Service Worker Absensi NSC
   Android install fix v1.0.4
   Path wajib: /absensi/service-worker.js
*/

const CACHE_VERSION = "nsc-absensi-v1.0.4-android-download";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  "/absensi/",
  "/absensi/index.html",
  "/absensi/style.css",
  "/absensi/script.js",
  "/absensi/pwa.js",
  "/absensi/manifest.webmanifest",
  "/absensi/offline.html",
  "/absensi/icons/icon-192x192.png",
  "/absensi/icons/icon-512x512.png",
  "/absensi/icons/maskable-icon-512x512.png",
  "/absensi/apple-touch-icon.png"
];

const BYPASS_KEYWORDS = [
  "supabase.co",
  "auth/v1",
  "storage/v1",
  "functions/v1",
  "api.whatsapp.com"
];

self.addEventListener("install", (event) => {
  event.waitUntil(cacheCoreAssets());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(cleanOldCaches());
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (shouldBypass(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function cacheCoreAssets() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(CORE_ASSETS.map(async (asset) => {
    try {
      const response = await fetch(asset, { cache: "reload" });
      if (response && response.ok) await cache.put(asset, response.clone());
    } catch (error) {
      console.warn("[SW] Asset tidak masuk cache:", asset, error);
    }
  }));
}

async function cleanOldCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))
  );
}

function shouldBypass(url) {
  if (url.origin !== self.location.origin) return true;
  const href = url.href.toLowerCase();
  return BYPASS_KEYWORDS.some((keyword) => href.includes(keyword));
}

function isStaticAsset(pathname) {
  return /\.(?:css|js|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot|webmanifest)$/i.test(pathname);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || caches.match("/absensi/offline.html");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fresh = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fresh;
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
