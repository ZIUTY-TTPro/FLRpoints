const CACHE_NAME = 'flr-slave-points-v1.0.5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png'
];
const offlineFallbackPage = './index.html';

// ============================================================
// INSTALL & ACTIVATE
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

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

// ============================================================
// FETCH – POMIJA FIREBASE, CACHE'UJE RESZTĘ
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pomijamy Firebase, Google APIs oraz zapytania inne niż GET
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com') ||
    url.hostname.includes('fcmregistrations.googleapis.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('onesignal.com') // Dodatkowo omijamy OneSignal, jeśli występuje
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Zwrócenie z cache lub pobranie z sieci
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Opcjonalnie można tu dodać aktualizację cache w tle
        return networkResponse;
      }).catch(() => {
        // Jeśli sieć zawiedzie i nie ma w cache, zwróć stronę offline dla nawigacji
        if (event.request.mode === 'navigate') {
          return caches.match(offlineFallbackPage);
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// ============================================================
// KLIKNIĘCIE W POWIADOMIENIE
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('FLRpoints') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
