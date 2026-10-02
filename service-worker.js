// ============================================================
// SERVICE WORKER – cache + FCM w jednym pliku
// ============================================================

// Import Firebase (dla FCM)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCXkEhwVp9EkSEuQq1nwkiuNkXTRJk8-n0",
    authDomain: "rejestflr.firebaseapp.com",
    projectId: "rejestflr",
    storageBucket: "rejestflr.firebasestorage.app",
    messagingSenderId: "1017001684786",
    appId: "1:1017001684786:web:1a440900555ed8340bf12b"
});

const messaging = firebase.messaging();

// ============================================================
// FCM – obsługa push w tle
// ============================================================
messaging.onBackgroundMessage((payload) => {
    console.log('?? [SW] Powiadomienie odebrane w tle:', payload);

    // ? Jeśli payload ma obiekt "notification" – SDK Firebase wyświetli je SAM
    // NIE wywołuj showNotification, bo dostaniesz duplikat
    if (payload.notification) {
        console.log('[SW] SDK wyświetli powiadomienie natywnie (notification field)');
        return;
    }

    // ? Fallback – tylko dla data-only
    if (payload.data) {
        const notificationTitle = payload.data.title || 'Nowe powiadomienie';
        const notificationOptions = {
            body: payload.data.body || '',
            icon: '/FLRpoints/icon-192.png',
            badge: '/FLRpoints/icon-192.png',
            vibrate: [200, 100, 200],
            tag: 'flr-' + Date.now(),
            data: payload.data
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});

// ============================================================
// CACHE – offline
// ============================================================
const CACHE_NAME = 'flr-slave-points-v1.3.5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const offlineFallbackPage = './index.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
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

self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (!url.startsWith(self.location.origin)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return cache.match(offlineFallbackPage);
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).catch(() => caches.match(offlineFallbackPage));
      })
    );
  }
});
