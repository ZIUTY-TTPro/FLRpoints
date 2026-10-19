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
            notification: {
                title: title,
                body: body
            },
            data: stringData,
            token: fcmToken,
            android: {
                priority: 'high',
                ttl: 3600 * 1000
            },
            webpush: {
                headers: {
                    Urgency: 'high'
                },
                notification: {
                    title: title,
                    body: body,
                    icon: 'https://ziuty-ttpro.github.io/FLRpoints/icon-192.png',
                    badge: 'https://ziuty-ttpro.github.io/FLRpoints/icon-192.png',
                    vibrate: [200, 100, 200]
                }
            }
        };

        console.log('📤 Wysyłam powiadomienie (priorytet HIGH) do:', targetUserId);

        try {
            const response = await admin.messaging().send(message);
            console.log('✅ FCM przyjął wiadomość:', response);
            console.log('   → Token:', fcmToken.substring(0, 30) + '...');
            return res.json({ success: true, messageId: response });
        } catch (err) {
            // 🛑 TU JEST NASZ BEZPIECZNIK
            // Sprawdzamy, czy błąd oznacza, że token jest martwy (apka odinstalowana, dane wyczyszczone, rotacja)
            if (
                err.code === 'messaging/registration-token-not-registered' ||
                err.code === 'messaging/invalid-registration-token' ||
                err.code === 'messaging/invalid-argument'
            ) {
                console.warn(`⚠️ Martwy token dla ${targetUserId} (${err.code}). Usuwam z bazy.`);
                
                // Usuwamy token i jego timestamp z Firestore, żeby baza była czysta
                await db.collection('users').doc(targetUserId).update({
                    fcmToken: admin.firestore.FieldValue.delete(),
                    fcmTokenUpdatedAt: admin.firestore.FieldValue.delete()
                });

                // Zwracamy 410 (Gone) – twój front w index.html już to obsługuje i pokaże ładny komunikat
                return res.status(410).json({
                    success: false,
                    error: 'Token wygasł lub urządzenie zostało wyrejestrowane',
                    code: err.code
                });
            }
            // Inne błędy (np. sieć, limit) lecą dalej do głównego catch
            throw err;
        }

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
