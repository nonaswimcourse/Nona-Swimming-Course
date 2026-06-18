/* Service Worker PWA Absensi NSC
   File ini aman untuk GitHub Pages, Netlify, Vercel, atau hosting biasa.
   Scope mengikuti lokasi file ini. Jika file berada di /absensi/, scope-nya /absensi/.
*/

const CACHE_VERSION = "nsc-absensi-pwa-v1.0.0";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const BASE_URL = new URL("./", self.location.href);

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./offline.html",
  "./Logo percobaan.png",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/maskable-icon-512x512.png"
];

const EXCLUDED_KEYWORDS = [
  "supabase.co",
  "auth/v1",
  "storage/v1",
  "functions/v1"
];

self.addEventListener("install", (event) => {
  event.waitUntil(cacheCoreAssets());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches());
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (shouldBypassCache(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
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

  await Promise.all(
    CORE_ASSETS.map(async (asset) => {
      try {
        const requestUrl = new URL(asset, BASE_URL);
        const response = await fetch(requestUrl, { cache: "reload" });
        if (response.ok) {
          await cache.put(requestUrl, response);
        }
      } catch (error) {
        console.warn("[SW] gagal cache asset:", asset, error);
      }
    })
  );
}

async function deleteOldCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => !key.startsWith(CACHE_VERSION))
      .map((key) => caches.delete(key))
  );
}

function shouldBypassCache(url) {
  if (url.origin !== self.location.origin) return true;

  const fullUrl = url.href.toLowerCase();
  return EXCLUDED_KEYWORDS.some((keyword) => fullUrl.includes(keyword));
}

function isStaticAsset(pathname) {
  return /\.(?:css|js|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot|webmanifest)$/i.test(pathname);
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const offlineUrl = new URL("./offline.html", BASE_URL);
    return caches.match(offlineUrl);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fresh = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
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
