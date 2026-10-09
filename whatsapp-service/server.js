import express from 'express';
import cors from 'cors';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Bot State
let sock = null;
let isConnected = false;
let latestQR = null;
let botUser = null;

/**
 * Format Indian / international phone numbers to WhatsApp JID format
 * Example: '9876543210' -> '919876543210@s.whatsapp.net'
 */
function formatWhatsAppJid(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, ''); // strip spaces, plus, dashes
  
  // If 10-digit Indian number, prepend country code 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    // 0XXXXXXXXXX -> 91XXXXXXXXXX
    cleaned = `91${cleaned.slice(1)}`;
  }
  
  if (cleaned.length < 10) return null;
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Initialize the Baileys WhatsApp Socket
 */
async function startWhatsAppBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`\n======================================================`);
    console.log(`  🚀 SRISHTI 2.7 • SELF-HOSTED WHATSAPP DISPATCH BOT`);
    console.log(`  Using Baileys version: ${version.join('.')}`);
    console.log(`======================================================\n`);

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false, // We'll handle terminal printing cleanly ourselves
      logger: pino({ level: 'silent' }), // Suppress raw socket noise
      browser: ['SRISHTI 2.7 Command Center', 'Chrome', '1.0.0'],
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQR = qr;
        isConnected = false;
        console.log('\n[WHATSAPP] 📲 New QR Code Generated! Scan with your phone:\n');
        qrcodeTerminal.generate(qr, { small: true });
        console.log(`\n👉 Or open in browser: http://localhost:${PORT}/qr\n`);
      }

      if (connection === 'open') {
        isConnected = true;
        latestQR = null;
        botUser = sock.user;
        const phone = botUser?.id ? botUser.id.split(':')[0] : 'Unknown';
        console.log(`\n[WHATSAPP] ✅ Connected successfully!`);
        console.log(`[WHATSAPP] 👤 Logged in as: +${phone} (${botUser?.name || 'Festival Bot'})\n`);
      }

      if (connection === 'close') {
        isConnected = false;
        botUser = null;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[WHATSAPP] ⚠️ Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(startWhatsAppBot, 3000);
        } else {
          console.log('[WHATSAPP] ❌ Logged out. Delete auth_info_baileys folder and restart to re-scan.');
        }
      }
    });

  } catch (error) {
    console.error('[WHATSAPP] Failed to start socket:', error);
    setTimeout(startWhatsAppBot, 5000);
  }
}

// -----------------------------------------------------------------------------
// REST API ENDPOINTS
// -----------------------------------------------------------------------------

// 1. Service Health & Information
app.get('/', (req, res) => {
  res.json({
    service: 'SRISHTI 2.7 WhatsApp Dispatch Microservice',
    status: isConnected ? 'online' : 'connecting',
    phone: botUser?.id ? botUser.id.split(':')[0] : null,
    qrReady: !isConnected && !!latestQR,
    endpoints: {
      status: 'GET /status',
      qrScanner: 'GET /qr',
      sendPass: 'POST /send-pass',
      sendMessage: 'POST /send-message'
    }
  });
});

// 2. Real-time Connection Status
app.get('/status', (req, res) => {
  res.json({
    connected: isConnected,
    phone: botUser?.id ? botUser.id.split(':')[0] : null,
    userName: botUser?.name || null,
    qrAvailable: !isConnected && !!latestQR
  });
});

// 3. Browser-friendly QR Code Scanner Webpage
app.get('/qr', (req, res) => {
  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SRISHTI 2.7 WhatsApp Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; background: #09090b; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { background: #18181b; padding: 2.5rem; border-radius: 20px; text-align: center; border: 1px solid #27272a; max-width: 420px; }
            .badge { background: #22c55e22; color: #4ade80; border: 1px solid #22c55e66; padding: 0.3rem 0.8rem; border-radius: 99px; font-weight: bold; font-size: 0.85rem; }
            h2 { margin: 1.2rem 0 0.5rem; }
            p { color: #a1a1aa; font-size: 0.95rem; }
          </style>
        </head>
        <body>
          <div class="box">
            <span class="badge">● CONNECTED & ACTIVE</span>
            <h2>WhatsApp Bot Online</h2>
            <p>Logged in as: <strong>+${botUser?.id ? botUser.id.split(':')[0] : 'Connected'}</strong></p>
            <p style="margin-top: 1.5rem; font-size: 0.82rem; color: #71717a;">You can close this tab. The service is actively ready to dispatch passes.</p>
          </div>
        </body>
      </html>
    `);
  }

  if (!latestQR) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Generating QR...</title>
          <meta http-equiv="refresh" content="3">
          <style>body { font-family: system-ui; background: #09090b; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; }</style>
        </head>
        <body>
          <div style="text-align: center;">
            <p>Initializing WhatsApp session... Page will refresh automatically.</p>
          </div>
        </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Scan WhatsApp QR • SRISHTI 2.7</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box; }
          .card { background: #121217; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 2.2rem; text-align: center; max-width: 380px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
          .eyebrow { font-size: 0.75rem; letter-spacing: 0.15em; color: #38bdf8; text-transform: uppercase; font-weight: 700; }
          h2 { margin: 0.5rem 0 1rem; font-size: 1.35rem; }
          #qrcode { background: #ffffff; padding: 16px; border-radius: 16px; display: inline-block; margin: 1rem 0; }
          .instructions { color: #a1a1aa; font-size: 0.85rem; line-height: 1.5; text-align: left; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; margin-top: 1rem; }
          ol { margin: 0; padding-left: 1.2rem; }
          li { margin-bottom: 0.3rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="eyebrow">SRISHTI 2.7 COMMAND CENTER</div>
          <h2>Link WhatsApp Bot</h2>
          <div id="qrcode"></div>
          <div class="instructions">
            <strong>How to pair:</strong>
            <ol>
              <li>Open WhatsApp on the festival phone</li>
              <li>Tap <strong>Settings / ⋮ Menu</strong> → <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a Device</strong> and point camera here</li>
            </ol>
          </div>
        </div>
        <script>
          new QRCode(document.getElementById("qrcode"), {
            text: ${JSON.stringify(latestQR)},
            width: 240,
            height: 240,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
          // Poll status every 4 seconds to auto-redirect once connected
          setInterval(async () => {
            try {
              const res = await fetch('/status');
              const data = await res.json();
              if (data.connected) window.location.reload();
            } catch(_) {}
          }, 4000);
        </script>
      </body>
    </html>
  `);
});

// 4. Send Official Delegate Pass with optional card PNG image
app.post('/send-pass', async (req, res) => {
  try {
    if (!isConnected || !sock) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp bot is not connected. Scan QR code first at /qr'
      });
    }

    const { 
      phone, 
      name, 
      participantCode, 
      eventName = 'All Registered Events', 
      college = '', 
      passUrl = 'https://srishti27.com/profile',
      imageBase64 = null
    } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    const jid = formatWhatsAppJid(phone);
    if (!jid) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
    }

    const displayName = name || 'Delegate';
    const displayCode = participantCode || 'SRI27-PASS';

    // Construct high-impact festival pass message
    const caption = 
`🎟️ *SRISHTI 2.7 • OFFICIAL DELEGATE PASS*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${displayName}*,

Your registration has been confirmed! Here are your official festival credentials:

👤 *Participant:* ${displayName}
🆔 *Delegate ID:* *${displayCode}*
🏆 *Event:* ${eventName}
${college ? `🏛️ *College:* ${college}\n` : ''}
📱 *View / Download Pass:*
${passUrl}

━━━━━━━━━━━━━━━━━━━━━━
⚡ *VENUE INSTRUCTIONS:*
• Present your QR code on arrival at the Gate Turnstile.
• Carry your college ID card for physical verification.
• Save this message or screenshot your QR code for offline access.

See you at *SRISHTI 2.7*! 🚀
_Govt Model Engineering College_`;

    let sendResult;

    // Send as Image Message if base64 provided
    if (imageBase64 && typeof imageBase64 === 'string') {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(cleanBase64, 'base64');

        sendResult = await sock.sendMessage(jid, {
          image: imageBuffer,
          caption: caption,
          mimetype: 'image/png'
        });
      } catch (imgErr) {
        console.warn('[WHATSAPP] Failed sending image attachment, falling back to text:', imgErr);
        sendResult = await sock.sendMessage(jid, { text: caption });
      }
    } else {
      // Send as pure text
      sendResult = await sock.sendMessage(jid, { text: caption });
    }

    console.log(`[WHATSAPP] ✉️ Pass dispatched successfully to ${phone} (${displayCode})`);

    return res.json({
      success: true,
      messageId: sendResult?.key?.id,
      recipient: jid,
      participantCode: displayCode
    });

  } catch (error) {
    console.error('[WHATSAPP] Error dispatching pass:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch WhatsApp pass.'
    });
  }
});

// 5. Send Generic Text Message
app.post('/send-message', async (req, res) => {
  try {
    if (!isConnected || !sock) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp bot is not connected. Scan QR code first at /qr'
      });
    }

    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Phone and message are required.' });
    }

    const jid = formatWhatsAppJid(phone);
    if (!jid) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
    }

    const result = await sock.sendMessage(jid, { text: String(message) });
    return res.json({ success: true, messageId: result?.key?.id, recipient: jid });
  } catch (error) {
    console.error('[WHATSAPP] Error sending message:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start Express Server & WhatsApp Client
app.listen(PORT, () => {
  console.log(`[HTTP] 🌐 Dispatch API listening on http://localhost:${PORT}`);
  startWhatsAppBot();
});
