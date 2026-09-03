// server.js
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const app = express();


app.use(cors({
    origin: ['https://ziuty-ttpro.github.io', 'http://localhost:3000', 'https://flrpoints-production.up.railway.app'],
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
    console.error('Brak danych uwierzytelniających Firebase!');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.post('/send-notification', async (req, res) => {
  const { targetUserId, title, body, data } = req.body;
  if (!targetUserId || !title || !body) {
    return res.status(400).json({ error: 'Brak wymaganych pól' });
  }
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(targetUserId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Użytkownik nie istnieje' });
    }
    const fcmToken = userDoc.data().fcmToken;
    if (!fcmToken) {
      return res.status(404).json({ error: 'Brak tokenu FCM' });
    }
    const message = {
      notification: { title, body },
      data: data || {},
      token: fcmToken,
    };
    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Błąd wysyłki:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/register-token', async (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken) {
    return res.status(400).json({ error: 'Brak userId lub fcmToken' });
  }
  try {
    const db = admin.firestore();
    await db.collection('users').doc(userId).set({ fcmToken }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Błąd zapisu tokenu:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serwer działa na porcie ${PORT}`));
