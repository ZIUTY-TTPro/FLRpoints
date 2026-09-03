const CACHE_NAME = 'flr-slave-points-v1.0.9';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const offlineFallbackPage = './index.html';

// ==========================
// INSTALL
// ==========================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// ==========================
// ACTIVATE
// ==========================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================
// FETCH – Z POMINIĘCIEM WSZYSTKICH ZEWNĘTRZNYCH ZAPYTAŃ
// ==========================
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // ?? KLUCZOWA POPRAWKA: CAŁKOWICIE POMIŃ zapytania poza origin (Firebase, Google APIs itp.)
  if (!url.startsWith(self.location.origin)) {
    // Nie dotykamy zewnętrznych zapytań – przepuszczamy je bez ingerencji
    return;
  }

  // Dla zapytań do własnego origin – obsługa cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy);
          });
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedResp = await cache.match(offlineFallbackPage);
          return cachedResp;
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).catch(() => {
          return caches.match(offlineFallbackPage);
        });
      })
    );
  }
});

// ==========================
// MESSAGE HANDLER
// ==========================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
