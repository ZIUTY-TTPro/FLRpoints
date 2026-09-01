importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'flr-slave-points-v1.0.16';

// ============================================================
// FIREBASE MESSAGING (BACKGROUND)
// ============================================================
try {
  firebase.initializeApp({
    apiKey: "AIzaSyCXkEhwVp9EkSEuQq1nwkiuNkXTRJk8-n0",
    authDomain: "rejestflr.firebaseapp.com",
    projectId: "rejestflr",
    storageBucket: "rejestflr.firebasestorage.app",
    messagingSenderId: "1017001684786",
    appId: "1:1017001684786:web:1a440900555ed8340bf12b"
  });
  console.log('[SW] Firebase initialized');
} catch (e) {
  console.error('[SW] Firebase init error:', e);
}

const messaging = firebase.messaging();

// ===== NIE UŻYWAMY usePublicVapidKey TUTAJ – klucz jest przekazywany w getToken w index.html =====

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Odebrano wiadomość w tle:', payload);
  const notificationTitle = payload.notification?.title || 'FLR Slave Points';
  const notificationOptions = {
    body: payload.notification?.body || 'Nowa zmiana w rejestrze punktów!',
    icon: './icon-192.png',
    badge: './icon-192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================================================
// INSTALL & ACTIVATE (minimalne cache)
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './icon-192.png'
      ]);
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

// ============================================================
// NIE MA FETCH HANDLERA – FIREBASE NIE JEST PRZECHWYTYWANE
// ============================================================
