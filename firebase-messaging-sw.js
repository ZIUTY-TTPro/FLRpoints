// firebase-messaging-sw.js – wersja COMPAT z obsługą message
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

messaging.onBackgroundMessage((payload) => {
    console.log('?? [SW] Powiadomienie w tle:', payload);
    const notificationTitle = payload.data?.title || 'Nowe powiadomienie';
    const notificationOptions = {
        body: payload.data?.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================================================
// DODATKOWY HANDLER MESSAGE – usuwa błąd
// ============================================================
self.addEventListener('message', (event) => {
    if (event.data) {
        // Jeśli strona przekazała port do odpowiedzi, odeślij status
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ status: 'OK' });
        }
    }
});
