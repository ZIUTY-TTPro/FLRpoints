importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ============================================================
// CACHE
// ============================================================
const CACHE_NAME = 'flr-slave-points-v1.0.4';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
const offlineFallbackPage = './index.html';

// ============================================================
// FIREBASE MESSAGING (BACKGROUND)
// ============================================================
firebase.initializeApp({
  apiKey: "AIzaSyCXkEhwVp9EkSEuQq1nwkiuNkXTRJk8-n0",
  authDomain: "rejestflr.firebaseapp.com",
  projectId: "rejestflr",
  storageBucket: "rejestflr.firebasestorage.app",
  messagingSenderId: "1017001684786",
  appId: "1:1017001684786:web:1a440900555ed8340bf12b"
});

const messaging = firebase.messaging();
messaging.usePublicVapidKey('BJFcSy8ljJCtz4qwjJvh2EXXquh3gxYnaHKMVLbey_gZn_zCLDoQ16iP0NcBkjk-00crP_gVkYFEs0GoZfnZ5k8');

messaging.onBackgroundMessage((payload) => {
  console.log('[service-worker.js] Odebrano wiadomość w tle: ', payload);
  const notificationTitle = payload.notification?.title || 'FLR Slave Points';
  const notificationOptions = {
    body: payload.notification?.body || 'Nowa zmiana w rejestrze punktów!',
    icon: './icon-192.png',
    badge: './icon-192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================================================
// INSTALL
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// ============================================================
// ACTIVATE
// ============================================================
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
// FETCH – POŁĄCZENIE TWOJEGO I MOJEGO KODU
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORUJ zapytania do Firebase / Google APIs (przepuszczaj bezpośrednio do sieci)
  if (
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('firebaseinstallations.googleapis.com') ||
    url.origin.includes('fcmregistrations.googleapis.com') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('gstatic.com')
  ) {
    return; // Zostaw standardową obsługę przeglądarce – nie ingerujemy
  }

  // 2. Standardowa obsługa Cache dla zasobów lokalnych (PWA)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // Jeśli nie ma w cache, pobierz z sieci
      return fetch(event.request).catch(() => {
        // Jeśli brak sieci i to nawigacja – zwróć stronę offline
        if (event.request.mode === 'navigate') {
          return caches.match(offlineFallbackPage);
        }
        // Dla innych zasobów – zwróć błąd 503
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ============================================================
// OBSŁUGA KLIKNIĘCIA W POWIADOMIENIE
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

// ============================================================
// MESSAGE HANDLER (do aktualizacji SW)
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
