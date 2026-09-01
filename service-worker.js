importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'flr-slave-points-v1.0.8';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png'
];
const offlineFallbackPage = './index.html';

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

// Tło powiadomień
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
// INSTALL & ACTIVATE
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => cacheName !== CACHE_NAME && caches.delete(cacheName))
    )).then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH – POPRAWNIE POMIJA FIREBASE
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // === POMIJAMY WSZYSTKIE ŻĄDANIA DO FIREBASE ===
  if (
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('firebaseinstallations.googleapis.com') ||
    url.origin.includes('fcmregistrations.googleapis.com') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('gstatic.com')
  ) {
    // NIE WYWOŁUJEMY event.respondWith() – pozwalamy przeglądarce obsłużyć normalnie
    return;
  }

  // === OBSŁUGA ZASOBÓW LOKALNYCH ===
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => caches.match(offlineFallbackPage));
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
        if (client.url.includes('FLRpoints') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
