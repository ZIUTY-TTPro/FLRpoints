const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: ['https://ziuty-ttpro.github.io', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

let serviceAccount;
try {
    serviceAccount = require('./service-account.json');
} catch (e) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        console.error('❌ Brak danych uwierzytelniających Firebase!');
        process.exit(1);
    }
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ============================================================
// ENDPOINT: wysyłka powiadomienia (z wysokim priorytetem)
// ============================================================
app.post('/send-notification', async (req, res) => {
    const { targetUserId, title, body, data } = req.body;

    console.log('📩 Otrzymano żądanie:', { targetUserId, title, body, data });

    if (!targetUserId || !title || !body) {
        console.error('❌ Brak wymaganych pól');
        return res.status(400).json({ error: 'Brak wymaganych pól: targetUserId, title, body' });
    }

    try {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            console.error('❌ Użytkownik nie istnieje:', targetUserId);
            return res.status(404).json({ error: 'Użytkownik nie istnieje' });
        }

        const fcmToken = userDoc.data().fcmToken;
        if (!fcmToken) {
            console.error('❌ Brak tokenu FCM dla:', targetUserId);
            return res.status(404).json({ error: 'Brak tokenu FCM dla tego użytkownika' });
        }

        const stringData = { title, body };
        if (data) {
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    stringData[key] = String(data[key]);
                }
            });
        }

        // 🔥 ULEPSZONA WIADOMOŚĆ – priorytet HIGH
        const message = {
            data: stringData,
            token: fcmToken,
            android: {
                priority: 'high',
                ttl: 3600 * 1000, // 1 godzina
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                },
            },
        };

        console.log('📤 Wysyłam powiadomienie (priorytet HIGH) do:', targetUserId);
        const response = await admin.messaging().send(message);
        console.log('✅ Powiadomienie wysłane:', response);

        res.json({ success: true, messageId: response });

    } catch (error) {
        console.error('❌ Błąd wysyłki powiadomienia:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// ENDPOINT: rejestracja tokenu
// ============================================================
app.post('/register-token', async (req, res) => {
    const { userId, fcmToken, role } = req.body;

    if (!userId || !fcmToken) {
        return res.status(400).json({ error: 'Brak userId lub fcmToken' });
    }

    try {
        const data = { fcmToken };
        if (role) data.role = role;

        await db.collection('users').doc(userId).set(data, { merge: true });
        console.log('✅ Token zarejestrowany dla:', userId);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Błąd zapisu tokenu:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Serwer działa na porcie ${PORT}`);
});
