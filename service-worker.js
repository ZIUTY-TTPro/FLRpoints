importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'flr-slave-points-v1.0.6';
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
// FETCH – pomija Firebase, cache'uje resztę
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORUJ zapytania do Firebase / Google APIs
  if (
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('firebaseinstallations.googleapis.com') ||
    url.origin.includes('fcmregistrations.googleapis.com') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('gstatic.com')
  ) {
    return; // Przepuszczamy bez ingerencji SW
  }

  // 2. Cache dla zasobów lokalnych
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(offlineFallbackPage);
        }
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
// MESSAGE HANDLER
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
