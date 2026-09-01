importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'flr-slave-points-v1.0.3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const offlineFallbackPage = './index.html';

// ==========================
// FIREBASE MESSAGING (BACKGROUND)
// ==========================
firebase.initializeApp({
  apiKey: "AIzaSyCXkEhwVp9EkSEuQq1nwkiuNkXTRJk8-n0",
  authDomain: "rejestflr.firebaseapp.com",
  projectId: "rejestflr",
  storageBucket: "rejestflr.firebasestorage.app",
  messagingSenderId: "1017001684786",
  appId: "1:1017001684786:web:1a440900555ed8340bf12b"
});

const messaging = firebase.messaging();
// ====== DODAJ SWÓJ VAPID TUTAJ ======
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
// FETCH SUPPORT
// ==========================
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          if (event.request.url.startsWith('http')) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, copy);
            });
          }
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
