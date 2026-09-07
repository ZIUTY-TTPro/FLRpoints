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

        // 🔥 ULEPSZONA WIADOMOŚĆ – priorytet HIGH, BEZ notification (tylko data)
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
        if (error.code === 'messaging/registration-token-not-registered') {
            await db.collection('users').doc(targetUserId).update({ fcmToken: null });
            console.warn(`⚠️ Usunięto nieprawidłowy token dla ${targetUserId}`);
            return res.status(410).json({ error: 'Token unieważniony – usunięto' });
        }
        res.status(500).json({ error: error.message });
    }
});
