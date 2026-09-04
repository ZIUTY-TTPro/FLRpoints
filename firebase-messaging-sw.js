// firebase-messaging-sw.js – wersja COMPAT
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

// Obsługa powiadomień w tle – odczyt z payload.data
messaging.onBackgroundMessage((payload) => {
    console.log('?? [SW] Powiadomienie w tle:', payload);
    const notificationTitle = payload.data?.title || 'Nowe powiadomienie';
    const notificationOptions = {
        body: payload.data?.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        // Możesz dodać więcej opcji, np. sound, actions, itp.
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});
