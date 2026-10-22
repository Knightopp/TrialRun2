import express from 'express';
import cors from 'cors';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import NodeCache from 'node-cache';
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  handleCommandMessage, 
  handleReaction, 
  loadConfig,
  checkAntiLink,
  handleAntiDelete 
} from './autoDeleteManager.js';
import { getMessage, storeMessage } from './messageStore.js';

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

// Retry counter cache to prevent decryption failure loops & "Waiting for this message"
const msgRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

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
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      msgRetryCounterCache,
      getMessage,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      emitOwnEvents: true,
      markOnlineOnConnect: true
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
          console.log('[WHATSAPP] ❌ Logged out. Re-initializing session...');
          latestQR = null;
          setTimeout(startWhatsAppBot, 3000);
        }
      }
    });

    // -------------------------------------------------------------------------
    // AUTO-DELETE REACTION & COMMAND LISTENERS
    // -------------------------------------------------------------------------

    // 1. Listen for message reactions (delete message for everyone when owner reacts with trigger emoji)
    sock.ev.on('messages.reaction', async (reactions) => {
      try {
        if (!Array.isArray(reactions)) return;
        for (const item of reactions) {
          if (!item || !item.key || !item.reaction) continue;
          await handleReaction(sock, {
            targetKey: item.key,
            reactionText: item.reaction.text,
            reactionKey: item.reaction.key,
            botUser: sock.user || botUser
          });
        }
      } catch (err) {
        console.error('[WHATSAPP] Error processing reaction:', err);
      }
    });

    // 2. Listen for incoming messages (commands: v -..., reactions, anti-link, anti-delete)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      try {
        if (!Array.isArray(messages)) return;
        for (const msg of messages) {
          if (!msg || !msg.message) continue;

          // Cache message with full metadata so Baileys can re-encrypt on retry and for purge/anti-delete
          if (msg.key && msg.message) {
            storeMessage(msg.key, msg.message, msg);
          }

          // Check for anti-delete revoke protocol message
          if (msg.message?.protocolMessage?.type === 0 || msg.message?.protocolMessage?.type === 'REVOKE') {
            const deletedKey = msg.message.protocolMessage.key;
            if (deletedKey) {
              await handleAntiDelete(sock, deletedKey, sock.user || botUser);
            }
          }

          // Check Anti-Link protection in groups
          await checkAntiLink(sock, msg, sock.user || botUser);

          // Check if message itself is a reaction (e.g. from mobile or web sync)
          if (msg.message.reactionMessage) {
            const reaction = msg.message.reactionMessage;
            await handleReaction(sock, {
              targetKey: reaction.key,
              reactionText: reaction.text,
              reactionKey: msg.key,
              botUser: sock.user || botUser
            });
            continue;
          }

          // Check for bot commands (prefix: v)
          await handleCommandMessage(sock, msg, sock.user || botUser);
        }
      } catch (err) {
        console.error('[WHATSAPP] Error processing message upsert:', err);
      }
    });

    // 3. Listen for message updates (such as message revokes from other participants)
    sock.ev.on('messages.update', async (updates) => {
      try {
        if (!Array.isArray(updates)) return;
        for (const update of updates) {
          if (update.update?.messageStubType === 1 || update.update?.message === null) {
            if (update.key) {
              await handleAntiDelete(sock, update.key, sock.user || botUser);
            }
          }
        }
      } catch (err) {
        console.error('[WHATSAPP] Error in messages.update handler:', err);
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
  const autoDelCfg = loadConfig();
  res.json({
    service: 'SRISHTI 2.7 WhatsApp Dispatch Microservice',
    version: '2.3.0',
    status: isConnected ? 'online' : 'connecting',
    phone: botUser?.id ? botUser.id.split(':')[0] : null,
    qrReady: !isConnected && !!latestQR,
    autoDelete: {
      activeChatsCount: Object.keys(autoDelCfg.activeChats || {}).length,
      defaultEmoji: autoDelCfg.defaultEmoji
    },
    endpoints: {
      status: 'GET /status',
      qrScanner: 'GET /qr',
      qrData: 'GET /qr-data',
      autoDelete: 'GET /auto-delete',
      sendPass: 'POST /send-pass',
      sendMessage: 'POST /send-message'
    }
  });
});

// 1.1 Auto-Delete Status API
app.get('/auto-delete', (req, res) => {
  const cfg = loadConfig();
  res.json({
    success: true,
    defaultEmoji: cfg.defaultEmoji,
    activeChatsCount: Object.keys(cfg.activeChats || {}).length,
    activeChats: cfg.activeChats || {}
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

// 2.1 Live QR Data API
app.get('/qr-data', (req, res) => {
  res.json({
    connected: isConnected,
    phone: botUser?.id ? botUser.id.split(':')[0] : null,
    qr: latestQR
  });
});

// 3. Browser-friendly Reactive QR Code Scanner Webpage
app.get('/qr', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Scan WhatsApp QR • SRISHTI 2.7</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.25rem; box-sizing: border-box; }
          .card { background: #121217; border: 1px solid rgba(255,255,255,0.12); border-radius: 24px; padding: 2rem; text-align: center; max-width: 380px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.8); }
          .eyebrow { font-size: 0.72rem; letter-spacing: 0.16em; color: #38bdf8; text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem; }
          h2 { margin: 0.2rem 0 1rem; font-size: 1.35rem; }
          .qr-wrapper { background: #ffffff; padding: 16px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; min-width: 240px; min-height: 240px; margin: 0.75rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.6); position: relative; }
          .instructions { color: #a1a1aa; font-size: 0.85rem; line-height: 1.5; text-align: left; background: rgba(255,255,255,0.04); padding: 1rem; border-radius: 14px; margin-top: 1rem; border: 1px solid rgba(255,255,255,0.06); }
          ol { margin: 0; padding-left: 1.25rem; }
          li { margin-bottom: 0.35rem; }
          .status-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.75rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 0.75rem; }
          .badge-waiting { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); }
          .badge-connected { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.35); }
          .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        </style>
      </head>
      <body>
        <div class="card" id="mainCard">
          <div class="eyebrow">SRISHTI 2.7 COMMAND CENTER</div>
          <h2>Link WhatsApp Bot</h2>
          <div id="statusBadge" class="status-badge badge-waiting">
            <span class="dot"></span> <span id="statusText">Generating Live QR...</span>
          </div>

          <div class="qr-wrapper" id="qrContainer">
            <div id="qrcode"></div>
          </div>

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
          let currentQR = null;
          let qrCodeObj = null;

          async function checkQR() {
            try {
              const res = await fetch('/qr-data');
              const data = await res.json();

              if (data.connected) {
                document.getElementById('mainCard').innerHTML = \`
                  <div class="status-badge badge-connected" style="margin-bottom: 1rem;">
                    <span class="dot"></span> CONNECTED & ONLINE
                  </div>
                  <h2 style="color: #ffffff; margin-bottom: 0.5rem;">WhatsApp Bot Active!</h2>
                  <p style="color: #a1a1aa; font-size: 0.95rem; margin-top: 0.25rem;">
                    Logged in as: <strong style="color: #ffffff;">+\${data.phone || 'Connected Device'}</strong>
                  </p>
                  <p style="margin-top: 1.5rem; font-size: 0.82rem; color: #71717a; background: rgba(255,255,255,0.04); padding: 0.85rem; border-radius: 12px;">
                    ✅ The bot is now permanently running and ready to dispatch passes automatically.
                  </p>
                \`;
                return;
              }

              if (data.qr && data.qr !== currentQR) {
                currentQR = data.qr;
                document.getElementById('statusText').innerText = 'Live QR • Scan Now';
                const el = document.getElementById('qrcode');
                el.innerHTML = '';
                new QRCode(el, {
                  text: data.qr,
                  width: 240,
                  height: 240,
                  colorDark: "#000000",
                  colorLight: "#ffffff",
                  correctLevel: QRCode.CorrectLevel.M
                });
              }
            } catch (_) {}
          }

          checkQR();
          setInterval(checkQR, 2000);
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
      passUrl = 'https://srishti2-7.vercel.app/profile',
      imageBase64 = null,
      imageUrl = null,
      customMessage = null
    } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    const jid = formatWhatsAppJid(phone);
    if (!jid) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
    }

    // 1. Verify recipient on WhatsApp & get canonical JID
    let targetJid = jid;
    try {
      const results = await sock.onWhatsApp(jid);
      if (results && results.length > 0) {
        if (results[0].exists) {
          targetJid = results[0].jid;
        } else {
          return res.status(400).json({
            success: false,
            error: `The phone number +${phone} is not registered on WhatsApp.`
          });
        }
      }
    } catch (checkErr) {
      console.warn('[WHATSAPP] onWhatsApp check skipped/errored:', checkErr.message);
    }

    // 2. Pre-warm Signal Protocol session to prevent "Waiting for this message"
    try {
      await sock.presenceSubscribe(targetJid);
      await sock.sendPresenceUpdate('composing', targetJid);
      // Wait 650ms for recipient's WhatsApp client to fetch pre-keys and negotiate ratchet
      await new Promise(r => setTimeout(r, 650));
    } catch (presErr) {
      console.warn('[WHATSAPP] Presence handshake warning:', presErr.message);
    }

    const displayName = name || 'Delegate';
    const displayCode = participantCode || 'SRI27-PASS';

    // Construct high-impact festival pass message (custom or default)
    let caption = '';
    if (customMessage && typeof customMessage === 'string' && customMessage.trim().length > 0) {
      caption = customMessage
        .replace(/{name}/g, displayName)
        .replace(/{participantCode}/g, displayCode)
        .replace(/{eventName}/g, eventName)
        .replace(/{college}/g, college || '')
        .replace(/{passUrl}/g, passUrl);
    } else {
      caption = 
`🎟️ *SRISHTI 2.7 | OFFICIAL DELEGATE PASS*

Hello *${displayName}*, your registration is confirmed!

🆔 *Delegate ID:* ${displayCode}  
🏆 *Event:* ${eventName}  
🏛️ *College:* ${college || 'Delegate'}

📱 *Your Digital Pass & QR Code:*  
${passUrl}

Please present your QR code and college ID at the entrance.

See you at *SRISHTI 2.7*! 🚀`;
    }

    let sendResult;

    // Send as Image Message if base64 or URL provided
    if (imageBase64 && typeof imageBase64 === 'string') {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(cleanBase64, 'base64');

        sendResult = await sock.sendMessage(targetJid, {
          image: imageBuffer,
          caption: caption,
          mimetype: 'image/png'
        });
      } catch (imgErr) {
        console.warn('[WHATSAPP] Failed sending base64 image, falling back to text:', imgErr);
        sendResult = await sock.sendMessage(targetJid, { text: caption });
      }
    } else if (imageUrl && typeof imageUrl === 'string') {
      try {
        sendResult = await sock.sendMessage(targetJid, {
          image: { url: imageUrl },
          caption: caption,
          mimetype: 'image/png'
        });
      } catch (urlErr) {
        console.warn('[WHATSAPP] Failed sending image URL, falling back to text:', urlErr);
        sendResult = await sock.sendMessage(targetJid, { text: caption });
      }
    } else {
      // Send as pure text
      sendResult = await sock.sendMessage(targetJid, { text: caption });
    }

    // Reset presence
    sock.sendPresenceUpdate('paused', targetJid).catch(() => {});

    if (sendResult?.key && sendResult?.message) {
      storeMessage(sendResult.key, sendResult.message, sendResult);
    }

    console.log(`[WHATSAPP] ✉️ Pass dispatched successfully to ${phone} (${displayCode})`);

    return res.json({
      success: true,
      messageId: sendResult?.key?.id,
      recipient: targetJid,
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

    let targetJid = jid;
    try {
      const results = await sock.onWhatsApp(jid);
      if (results && results.length > 0) {
        if (results[0].exists) {
          targetJid = results[0].jid;
        } else {
          return res.status(400).json({
            success: false,
            error: `The phone number +${phone} is not registered on WhatsApp.`
          });
        }
      }
    } catch (_) {}

    try {
      await sock.presenceSubscribe(targetJid);
      await sock.sendPresenceUpdate('composing', targetJid);
      await new Promise(r => setTimeout(r, 500));
    } catch (_) {}

    const result = await sock.sendMessage(targetJid, { text: String(message) });
    sock.sendPresenceUpdate('paused', targetJid).catch(() => {});

    if (result?.key && result?.message) {
      storeMessage(result.key, result.message, result);
    }
    return res.json({ success: true, messageId: result?.key?.id, recipient: targetJid });
  } catch (error) {
    console.error('[WHATSAPP] Error sending message:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start Express Server & WhatsApp Client
app.listen(PORT, () => {
  console.log(`[HTTP] 🌐 Dispatch API listening on http://localhost:${PORT}`);
  startWhatsAppBot();

  // Self-ping to prevent Render Free Tier from spinning down (15 min inactivity timeout)
  const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://trialrun2.onrender.com';
  setInterval(async () => {
    try {
      const response = await fetch(`${renderUrl}/status`);
      if (response.ok) {
        console.log(`[KEEP-ALIVE] Pinged ${renderUrl}/status successfully. Service remains awake.`);
      }
    } catch (pingErr) {
      console.warn(`[KEEP-ALIVE] Ping warning:`, pingErr.message);
    }
  }, 8 * 60 * 1000); // Ping every 8 minutes
});
