# 🤖 SRISHTI 2.7 • Self-Hosted WhatsApp Pass Dispatch Bot

A **100% Free, Zero-Cost** automated WhatsApp microservice for SRISHTI 2.7 built using [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys) and Express.

- ❌ **No Twilio**
- ❌ **No Meta Cloud API fees**
- ❌ **No credit card required**
- ✅ **Sends official entry pass messages + QR pass card images**
- ✅ **Auto-reconnects and keeps login session across restarts**
- ✅ **Web QR scanner at `http://localhost:3001/qr`**

---

## 🚀 Quick Start (Running Locally)

### 1. Open Terminal in `whatsapp-service`:
```bash
cd whatsapp-service
npm start
```

### 2. Link Your WhatsApp Number
Once started, the server will display a QR code in the terminal.

You can also simply open this URL in your browser:
👉 **[http://localhost:3001/qr](http://localhost:3001/qr)**

1. Open WhatsApp on the festival phone / spare number.
2. Go to **Settings** (or 3 dots ⋮) → **Linked Devices** → **Link a Device**.
3. Scan the QR code.

🎉 Once scanned, the terminal will print:
`[WHATSAPP] ✅ Connected successfully! Logged in as: +91XXXXXXXXXX`

Session credentials are saved securely in `whatsapp-service/auth_info_baileys/`. You will **never** need to scan again unless you explicitly log out!

---

## 📡 REST API Reference

The server runs on port `3001` (or `process.env.PORT`).

### 1. Check Service Status
```http
GET http://localhost:3001/status
```
**Response:**
```json
{
  "connected": true,
  "phone": "919876543210",
  "userName": "Srishti Bot",
  "qrAvailable": false
}
```

---

### 2. Send Official Delegate Pass (`POST /send-pass`)
Sends the official festival pass text with venue instructions and an optional delegate card PNG image.

```http
POST http://localhost:3001/send-pass
Content-Type: application/json

{
  "phone": "9876543210",
  "name": "Abhiram",
  "participantCode": "SRI27-U9482",
  "eventName": "HACKAI 24H HACKATHON",
  "college": "Govt Model Engineering College",
  "passUrl": "https://srishti27.com/profile",
  "imageBase64": "data:image/png;base64,..."
}
```

**Output on Student's WhatsApp:**
```text
🎟️ SRISHTI 2.7 • OFFICIAL DELEGATE PASS
━━━━━━━━━━━━━━━━━━━━━━
Hello Abhiram,

Your registration has been confirmed! Here are your official festival credentials:

👤 Participant: Abhiram
🆔 Delegate ID: SRI27-U9482
🏆 Event: HACKAI 24H HACKATHON
🏛️ College: Govt Model Engineering College

📱 View / Download Pass:
https://srishti27.com/profile

━━━━━━━━━━━━━━━━━━━━━━
⚡ VENUE INSTRUCTIONS:
• Present your QR code on arrival at the Gate Turnstile.
• Carry your college ID card for physical verification.
• Save this message or screenshot your QR code for offline access.

See you at SRISHTI 2.7! 🚀
Govt Model Engineering College
```

---

### 3. Send Custom Announcement / Message (`POST /send-message`)
```http
POST http://localhost:3001/send-message
Content-Type: application/json

{
  "phone": "9876543210",
  "message": "Reminder: Coding prelims start at 10:30 AM in Lab 3!"
}
```

---

## 🛠️ Free Hosting Options for Production

1. **Local Festival Laptop / Lab PC (Recommended for the Fest)**:
   Keep this running in a terminal during the 2 days of the festival on the spot registration desk machine.
2. **Oracle Cloud Free Tier (Always Free Compute)**:
   Host on a 24/7 free cloud VM with PM2 (`pm2 start server.js`).
3. **Railway / Render**:
   Deploy as a Node.js web service.

---

## ⚠️ Notes
- `auth_info_baileys/` is excluded by `.gitignore` so your personal session tokens are never pushed to GitHub.
- If you ever want to switch the bot phone number, simply delete the `auth_info_baileys` folder and restart `npm start` to generate a fresh QR code.
