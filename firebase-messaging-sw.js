// firebase-messaging-sw.js – wersja COMPAT z obsługą notification i data
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
    console.log('[SW] Powiadomienie w tle:', payload);
    const notificationTitle = payload.data?.title || payload.notification?.title || 'Nowe powiadomienie';
    const notificationOptions = {
        body: payload.data?.body || payload.notification?.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        data: payload.data || {}
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});
