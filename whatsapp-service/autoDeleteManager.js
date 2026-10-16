import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import sharp from 'sharp';
import { 
  areJidsSameUser, 
  jidNormalizedUser, 
  isJidGroup, 
  downloadMediaMessage, 
  extractMessageContent 
} from '@whiskeysockets/baileys';
import { 
  storeMessage, 
  getFullStoredMessage, 
  getRecentChatMessages, 
  removeChatMessagesFromHistory 
} from './messageStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, 'auto_delete_config.json');

const logger = pino({ level: 'silent' });

// Default configuration
const DEFAULT_CONFIG = {
  defaultEmoji: '🗑️',
  activeChats: {},
  antiLinkChats: {},
  antiDeleteEnabled: true
};

// In-memory cache for recent deletions to prevent duplicate handling
const recentlyDeleted = new Set();

/**
 * Strip unicode variation selectors and trim for reliable emoji matching
 */
export function normalizeEmoji(emoji) {
  if (!emoji || typeof emoji !== 'string') return '';
  return emoji.replace(/[\uFE00-\uFE0F]/g, '').trim();
}

/**
 * Load configuration from disk
 */
export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        defaultEmoji: parsed.defaultEmoji || DEFAULT_CONFIG.defaultEmoji,
        activeChats: parsed.activeChats || {},
        antiLinkChats: parsed.antiLinkChats || {},
        antiDeleteEnabled: parsed.antiDeleteEnabled !== false
      };
    }
  } catch (err) {
    console.error('[CONFIG] Error reading config file:', err.message);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save configuration to disk
 */
export function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('[CONFIG] Error saving config file:', err.message);
  }
}

/**
 * Check if a chat has auto-delete activated
 */
export function isChatActive(chatJid, config) {
  if (!chatJid) return false;
  const cfg = config || loadConfig();
  const normalized = jidNormalizedUser(chatJid) || chatJid;
  return !!cfg.activeChats[normalized] || !!cfg.activeChats[chatJid];
}

/**
 * Get trigger emoji for a chat
 */
export function getChatEmoji(chatJid, config) {
  const cfg = config || loadConfig();
  const normalized = jidNormalizedUser(chatJid) || chatJid;
  const chatConfig = cfg.activeChats[normalized] || cfg.activeChats[chatJid];
  return chatConfig?.emoji || cfg.defaultEmoji || DEFAULT_CONFIG.defaultEmoji;
}

/**
 * Activate auto-delete in a chat
 */
export function activateChat(chatJid, emoji = null) {
  const cfg = loadConfig();
  const normalized = jidNormalizedUser(chatJid) || chatJid;
  const selectedEmoji = emoji ? emoji.trim() : (cfg.activeChats[normalized]?.emoji || cfg.defaultEmoji);

  cfg.activeChats[normalized] = {
    enabled: true,
    emoji: selectedEmoji,
    activatedAt: new Date().toISOString()
  };
  saveConfig(cfg);
  return { jid: normalized, emoji: selectedEmoji };
}

/**
 * Deactivate auto-delete in a chat
 */
export function deactivateChat(chatJid) {
  const cfg = loadConfig();
  const normalized = jidNormalizedUser(chatJid) || chatJid;
  let removed = false;

  if (cfg.activeChats[normalized]) {
    delete cfg.activeChats[normalized];
    removed = true;
  }
  if (cfg.activeChats[chatJid]) {
    delete cfg.activeChats[chatJid];
    removed = true;
  }

  if (removed) {
    saveConfig(cfg);
  }
  return removed;
}

/**
 * Toggle Anti-Link protection for a group
 */
export function toggleAntiLink(chatJid, state = null) {
  const cfg = loadConfig();
  const normalized = jidNormalizedUser(chatJid) || chatJid;
  let enabled = false;

  if (state === 'on' || state === 'true' || state === '1') {
    cfg.antiLinkChats[normalized] = true;
    enabled = true;
  } else if (state === 'off' || state === 'false' || state === '0') {
    delete cfg.antiLinkChats[normalized];
    enabled = false;
  } else {
    // Toggle
    if (cfg.antiLinkChats[normalized]) {
      delete cfg.antiLinkChats[normalized];
      enabled = false;
    } else {
      cfg.antiLinkChats[normalized] = true;
      enabled = true;
    }
  }

  saveConfig(cfg);
  return enabled;
}

export function isAntiLinkActive(chatJid, config) {
  if (!chatJid) return false;
  const cfg = config || loadConfig();
  const normalized = jidNormalizedUser(chatJid) || chatJid;
  return !!cfg.antiLinkChats[normalized] || !!cfg.antiLinkChats[chatJid];
}

/**
 * Verify if action or message came from the bot owner (the user)
 */
export function isOwner(key, botUser) {
  if (!key) return false;
  if (key.fromMe) return true;
  if (!botUser?.id) return false;

  const senderJid = key.participant || key.remoteJid;
  if (!senderJid) return false;

  return areJidsSameUser(senderJid, botUser.id);
}

/**
 * Extract plain text string from any WhatsApp message object
 */
export function extractMessageText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    ''
  ).trim();
}

/**
 * Parse time string like '10s', '20m', '1h', '1d' into milliseconds
 */
function parseDuration(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

/**
 * Fetch Text-to-Speech audio buffer via Google TTS
 */
async function generateTTSAudio(text) {
  const clean = text.slice(0, 200);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(clean)}&tl=en&client=tw-ob`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`TTS failed with HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Convert an image buffer to 512x512 transparent WebP sticker
 */
export async function convertToStickerBuffer(imageBuffer) {
  return await sharp(imageBuffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Handle command messages starting with prefix 'v'
 */
export async function handleCommandMessage(sock, msg, botUser) {
  if (!sock || !msg || !msg.message) return false;

  const text = extractMessageText(msg.message);
  if (!text) return false;

  // Prefix 'v' check (case-insensitive: 'v -...', 'v ...')
  const prefixMatch = text.match(/^v(?:\s+|-)(.+)$/i) || text.match(/^v$/i);
  if (!prefixMatch) return false;

  // Strict security: Only bot owner can use commands!
  if (!isOwner(msg.key, botUser)) {
    return false;
  }

  const chatJid = msg.key.remoteJid;
  if (!chatJid || chatJid === 'status@broadcast') return false;

  const rawArg = prefixMatch[1] ? prefixMatch[1].trim() : 'help';
  const parts = rawArg.split(/\s+/);
  const action = parts[0].toLowerCase().replace(/^-+/, '');
  const extraParam = parts.slice(1).join(' ').trim();

  console.log(`[BOT-CMD] ⚙️ Owner command: action="${action}", param="${extraParam}" in ${chatJid}`);

  let replyText = '';
  let shouldSendReply = true;

  switch (action) {
    case 'a':
    case 'activate':
    case 'on': {
      const emojiParam = extraParam || null;
      activateChat(chatJid, emojiParam);
      replyText = 'activated';
      break;
    }

    case 'd':
    case 'deactivate':
    case 'off': {
      deactivateChat(chatJid);
      replyText = 'deactivated';
      break;
    }

    // 1. Bulk Delete / Purge
    case 'purge':
    case 'clear': {
      const count = Math.min(Math.max(1, parseInt(extraParam, 10) || 5), 50);
      const recent = getRecentChatMessages(chatJid, count);

      console.log(`[PURGE] Purging ${recent.length} recent messages in ${chatJid}...`);
      for (const item of recent) {
        try {
          await sock.sendMessage(chatJid, {
            delete: {
              remoteJid: chatJid,
              id: item.id,
              fromMe: item.fromMe,
              ...(item.key?.participant ? { participant: item.key.participant } : {})
            }
          });
        } catch (_) {}
      }

      // Delete the v -purge command message itself
      try {
        await sock.sendMessage(chatJid, { delete: msg.key });
      } catch (_) {}

      removeChatMessagesFromHistory(chatJid, recent.map(m => m.id));

      const confirmation = await sock.sendMessage(chatJid, {
        text: `🧹 *Purged ${recent.length} messages.*`
      });
      // Auto-delete confirmation after 3 seconds
      setTimeout(() => {
        sock.sendMessage(chatJid, { delete: confirmation.key }).catch(() => {});
      }, 3000);

      shouldSendReply = false;
      break;
    }

    // 2. Group Mute / Lock
    case 'mute':
    case 'lock': {
      if (!isJidGroup(chatJid)) {
        replyText = '❌ This command can only be used in groups.';
      } else {
        try {
          await sock.groupSettingUpdate(chatJid, 'announcement');
          replyText = '🔒 *Group Muted:* Only Admins can send messages now.';
        } catch (err) {
          replyText = '⚠️ Failed to mute group: ensure bot account is a Group Admin.';
        }
      }
      break;
    }

    // 3. Group Unmute / Unlock
    case 'unmute':
    case 'unlock': {
      if (!isJidGroup(chatJid)) {
        replyText = '❌ This command can only be used in groups.';
      } else {
        try {
          await sock.groupSettingUpdate(chatJid, 'not_announcement');
          replyText = '🔓 *Group Unmuted:* All participants can send messages now.';
        } catch (err) {
          replyText = '⚠️ Failed to unmute group: ensure bot account is a Group Admin.';
        }
      }
      break;
    }

    // 4. Tag All / Mention Everyone
    case 'tagall':
    case 'everyone': {
      if (!isJidGroup(chatJid)) {
        replyText = '❌ This command can only be used in groups.';
      } else {
        try {
          const meta = await sock.groupMetadata(chatJid);
          const participants = meta.participants.map(p => p.id);
          const announcement = extraParam || '📢 *Announcement for Everyone!*';
          const mentionsStr = participants.map(p => `@${p.split('@')[0]}`).join(' ');

          await sock.sendMessage(chatJid, {
            text: `${announcement}\n\n${mentionsStr}`,
            mentions: participants
          });
          shouldSendReply = false;
        } catch (err) {
          replyText = `⚠️ Failed to fetch group members: ${err.message}`;
        }
      }
      break;
    }

    // 5. Anti-Link Shield Toggle
    case 'antilink': {
      if (!isJidGroup(chatJid)) {
        replyText = '❌ Anti-Link can only be enabled in WhatsApp groups.';
      } else {
        const enabled = toggleAntiLink(chatJid, extraParam);
        replyText = enabled 
          ? '🛡️ *Anti-Link Shield: ACTIVATED*\nAny invite links from non-admins will be auto-deleted.'
          : '⚪ *Anti-Link Shield: DEACTIVATED*';
      }
      break;
    }

    // 6. Sticker Maker
    case 's':
    case 'sticker': {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const targetContent = quoted || msg.message;
      const content = extractMessageContent(targetContent);
      const imgMsg = content?.imageMessage || content?.viewOnceMessage?.message?.imageMessage;

      if (!imgMsg) {
        replyText = '⚠️ Please reply to an image or send a photo with caption `v -s`';
      } else {
        try {
          const quotedKey = {
            remoteJid: chatJid,
            id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId || msg.key.id
          };
          const buffer = await downloadMediaMessage(
            { key: quotedKey, message: content },
            'buffer',
            {},
            { logger, reuploadRequest: sock.updateMediaMessage }
          );

          const stickerBuf = await convertToStickerBuffer(buffer);
          await sock.sendMessage(chatJid, { sticker: stickerBuf });
          shouldSendReply = false;
        } catch (stkErr) {
          replyText = `⚠️ Failed to create sticker: ${stkErr.message}`;
        }
      }
      break;
    }

    // 7. Text to Speech
    case 'tts':
    case 'speak': {
      if (!extraParam) {
        replyText = 'ℹ️ Usage: `v -tts <text to speak>`';
      } else {
        try {
          const audioBuffer = await generateTTSAudio(extraParam);
          await sock.sendMessage(chatJid, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            ptt: true
          });
          shouldSendReply = false;
        } catch (ttsErr) {
          replyText = `⚠️ Failed to generate speech: ${ttsErr.message}`;
        }
      }
      break;
    }

    // 8. Quick Reminder
    case 'remind':
    case 'reminder': {
      const timePart = parts[1];
      const reminderText = parts.slice(2).join(' ').trim();

      const ms = parseDuration(timePart);
      if (!ms || !reminderText) {
        replyText = 'ℹ️ Usage: `v -remind <time> <reminder message>`\nExample: `v -remind 20m Check festival prelims` (s=seconds, m=minutes, h=hours)';
      } else {
        replyText = `⏰ *Reminder set for ${timePart}:* "${reminderText}"`;

        setTimeout(async () => {
          try {
            await sock.sendMessage(chatJid, {
              text: `🔔 *REMINDER ALERT!* 🔔\n\n"${reminderText}"\n\n_(Scheduled ${timePart} ago)_`
            });
          } catch (remErr) {
            console.error('[REMINDER] Error sending reminder alert:', remErr);
          }
        }, ms);
      }
      break;
    }

    case 'emoji':
    case 'e': {
      if (!extraParam) {
        const cur = getChatEmoji(chatJid);
        replyText = `ℹ️ Current trigger emoji for this chat is: ${cur}\nTo change: \`v -emoji <emoji>\``;
      } else {
        const cfg = loadConfig();
        const norm = jidNormalizedUser(chatJid) || chatJid;
        cfg.activeChats[norm] = {
          enabled: true,
          emoji: extraParam.trim(),
          activatedAt: new Date().toISOString()
        };
        saveConfig(cfg);
        replyText = `✅ Trigger emoji updated to: ${extraParam.trim()}`;
      }
      break;
    }

    case 'status':
    case 's-status': {
      const active = isChatActive(chatJid);
      const emoji = getChatEmoji(chatJid);
      const antilink = isAntiLinkActive(chatJid);
      replyText = 
`📊 *Status for this Chat*
━━━━━━━━━━━━━━━━━━━━━
• *Auto-Delete on Emoji:* ${active ? '✅ Active' : '⚪ Inactive'} (${emoji})
• *Anti-Link Shield:* ${antilink ? '🛡️ Enabled' : '⚪ Disabled'}
• *Chat ID:* \`${chatJid}\`
• *Chat Type:* ${isJidGroup(chatJid) ? 'Group' : 'Direct Message'}`;
      break;
    }

    case 'h':
    case 'help':
    default: {
      replyText = 
`🤖 *WhatsApp Command Center (Prefix: v)*
━━━━━━━━━━━━━━━━━━━━━
• \`v -a [emoji]\` : Activate emoji auto-delete
• \`v -d\` : Deactivate auto-delete
• \`v -purge <count>\` : Bulk delete last N messages
• \`v -mute\` : Lock group (admins only)
• \`v -unmute\` : Unlock group (everyone)
• \`v -tagall [text]\` : Tag everyone in group
• \`v -antilink [on|off]\` : Auto-delete invite links
• \`v -s\` : Convert replied image to sticker
• \`v -tts <text>\` : Text to voice note
• \`v -remind <time> <msg>\` : Quick reminder (e.g. 20m)
• \`v -status\` : View chat settings
━━━━━━━━━━━━━━━━━━━━━
📌 *Emoji Reactions:*
• 🗑️ (or set emoji) → Delete message for everyone
• 📌 → Pin message in chat
• 💾 or ⭐ → Save View-Once media to private chat
• ✨ → Turn reacted photo into sticker
━━━━━━━━━━━━━━━━━━━━━
🔒 *Security:* Owner Only`;
      break;
    }
  }

  if (shouldSendReply && replyText) {
    try {
      const sent = await sock.sendMessage(chatJid, { text: replyText });
      if (sent?.key && sent?.message) {
        storeMessage(sent.key, sent.message, sent);
      }
      return true;
    } catch (err) {
      console.error('[BOT-CMD] Failed to send response:', err.message);
      return false;
    }
  }

  return true;
}

/**
 * Handle reaction events (Delete, Pin, View-Once, Sticker)
 */
export async function handleReaction(sock, { targetKey, reactionText, reactionKey, botUser }) {
  if (!sock || !targetKey || !targetKey.id || !reactionText) return false;

  // 1. Verify reaction was sent by bot owner ONLY
  if (!isOwner(reactionKey, botUser)) {
    return false;
  }

  const chatJid = targetKey.remoteJid || reactionKey?.remoteJid;
  if (!chatJid || chatJid === 'status@broadcast') return false;

  const ownerJid = botUser?.id ? jidNormalizedUser(botUser.id) : null;
  const rawEmoji = normalizeEmoji(reactionText);

  // ---------------------------------------------------------------------------
  // A. PIN REACTION (📌 Pin, 📍 Unpin)
  // ---------------------------------------------------------------------------
  if (rawEmoji === '📌') {
    try {
      await sock.sendMessage(chatJid, {
        pin: targetKey,
        type: 1, // PIN_FOR_ALL
        time: 604800 // 7 days
      });
      console.log(`[PIN] 📌 Pinned message ${targetKey.id} in ${chatJid}`);
      return true;
    } catch (pinErr) {
      console.warn(`[PIN] ⚠️ Failed to pin message:`, pinErr.message);
      return false;
    }
  }

  if (rawEmoji === '📍') {
    try {
      await sock.sendMessage(chatJid, {
        pin: targetKey,
        type: 2 // UNPIN_FOR_ALL
      });
      console.log(`[PIN] 📍 Unpinned message ${targetKey.id} in ${chatJid}`);
      return true;
    } catch (unpinErr) {
      console.warn(`[PIN] ⚠️ Failed to unpin message:`, unpinErr.message);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // B. SAVE VIEW-ONCE / MEDIA REACTION (💾 or ⭐)
  // ---------------------------------------------------------------------------
  if ((rawEmoji === '💾' || rawEmoji === '⭐') && ownerJid) {
    const stored = getFullStoredMessage(targetKey.id);
    const rawMsg = stored?.message || stored?.fullMsg?.message;
    if (rawMsg) {
      try {
        const content = extractMessageContent(rawMsg);
        const media = content?.viewOnceMessage?.message || content?.viewOnceMessageV2?.message || content;

        if (media?.imageMessage || media?.videoMessage || media?.audioMessage) {
          const mediaBuf = await downloadMediaMessage(
            { key: targetKey, message: media },
            'buffer',
            {},
            { logger, reuploadRequest: sock.updateMediaMessage }
          );

          if (media.imageMessage) {
            await sock.sendMessage(ownerJid, {
              image: mediaBuf,
              caption: `💾 *Saved View-Once Photo* from \`${chatJid}\``
            });
          } else if (media.videoMessage) {
            await sock.sendMessage(ownerJid, {
              video: mediaBuf,
              caption: `💾 *Saved View-Once Video* from \`${chatJid}\``
            });
          } else if (media.audioMessage) {
            await sock.sendMessage(ownerJid, {
              audio: mediaBuf,
              mimetype: 'audio/mp4'
            });
          }
          console.log(`[VIEW-ONCE] 💾 Saved view-once media to owner DM.`);
          return true;
        } else {
          const txt = extractMessageText(media);
          if (txt) {
            await sock.sendMessage(ownerJid, {
              text: `💾 *Saved Message Content:*\n"${txt}"\n\n_(From ${chatJid})_`
            });
            return true;
          }
        }
      } catch (voErr) {
        console.error('[VIEW-ONCE] Error saving view-once media:', voErr.message);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // C. REACTION STICKER MAKER (✨)
  // ---------------------------------------------------------------------------
  if (rawEmoji === '✨') {
    const stored = getFullStoredMessage(targetKey.id);
    const rawMsg = stored?.message || stored?.fullMsg?.message;
    if (rawMsg) {
      const content = extractMessageContent(rawMsg);
      const imgMsg = content?.imageMessage || content?.viewOnceMessage?.message?.imageMessage;
      if (imgMsg) {
        try {
          const mediaBuf = await downloadMediaMessage(
            { key: targetKey, message: content },
            'buffer',
            {},
            { logger, reuploadRequest: sock.updateMediaMessage }
          );
          const stickerBuf = await convertToStickerBuffer(mediaBuf);
          await sock.sendMessage(chatJid, { sticker: stickerBuf });
          console.log(`[STICKER] ✨ Created sticker via reaction in ${chatJid}`);
          return true;
        } catch (stkErr) {
          console.error('[STICKER] Reaction sticker error:', stkErr.message);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // D. AUTO-DELETE MESSAGE FOR EVERYONE
  // ---------------------------------------------------------------------------
  if (!isChatActive(chatJid)) {
    return false;
  }

  const targetEmoji = getChatEmoji(chatJid);
  const normalizedTarget = normalizeEmoji(targetEmoji);

  if (!rawEmoji || rawEmoji !== normalizedTarget) {
    return false;
  }

  // Deduplication check
  const dedupeKey = `${chatJid}_${targetKey.id}`;
  if (recentlyDeleted.has(dedupeKey)) {
    return false;
  }
  recentlyDeleted.add(dedupeKey);
  setTimeout(() => recentlyDeleted.delete(dedupeKey), 60000);

  console.log(`[AUTO-DELETE] 🎯 Reaction '${reactionText}' detected on msg ${targetKey.id} in ${chatJid}. Deleting for everyone...`);

  const deleteKey = {
    remoteJid: chatJid,
    id: targetKey.id,
    fromMe: Boolean(targetKey.fromMe),
    ...(targetKey.participant ? { participant: targetKey.participant } : {})
  };

  try {
    await sock.sendMessage(chatJid, { delete: deleteKey });
    console.log(`[AUTO-DELETE] ✅ Successfully deleted message ${targetKey.id} for everyone in ${chatJid}`);
    return true;
  } catch (err) {
    console.warn(`[AUTO-DELETE] ⚠️ Could not delete message:`, err.message);
    return false;
  }
}

/**
 * Anti-Link message inspector
 */
export async function checkAntiLink(sock, msg, botUser) {
  if (!sock || !msg || !msg.message) return;
  const chatJid = msg.key.remoteJid;
  if (!isJidGroup(chatJid) || !isAntiLinkActive(chatJid)) return;

  // Don't act on owner
  if (isOwner(msg.key, botUser)) return;

  const text = extractMessageText(msg.message);
  if (!text) return;

  // Detect WhatsApp group invites / channel links
  const hasLink = /chat\.whatsapp\.com\/[A-Za-z0-9]+|wa\.me\/|whatsapp\.com\/channel\//i.test(text);
  if (hasLink) {
    console.log(`[ANTI-LINK] 🛡️ Unauthorized link detected from ${msg.key.participant} in ${chatJid}. Deleting...`);
    try {
      await sock.sendMessage(chatJid, { delete: msg.key });
      const participantId = (msg.key.participant || '').split('@')[0];
      const alertMsg = await sock.sendMessage(chatJid, {
        text: `⚠️ @${participantId} WhatsApp group invite links are not allowed here!`,
        mentions: [msg.key.participant]
      });
      // Clean up alert after 5 seconds
      setTimeout(() => {
        sock.sendMessage(chatJid, { delete: alertMsg.key }).catch(() => {});
      }, 5000);
    } catch (err) {
      console.warn('[ANTI-LINK] Failed to delete link message:', err.message);
    }
  }
}

/**
 * Anti-Delete logger: Intercepts deleted messages and forwards to owner private chat
 */
export async function handleAntiDelete(sock, deletedKey, botUser) {
  if (!sock || !deletedKey?.id) return;
  const cfg = loadConfig();
  if (!cfg.antiDeleteEnabled) return;

  // Skip if deleted by owner
  if (deletedKey.fromMe) return;

  const stored = getFullStoredMessage(deletedKey.id);
  if (!stored) return;

  const ownerJid = botUser?.id ? jidNormalizedUser(botUser.id) : null;
  if (!ownerJid) return;

  const senderJid = deletedKey.participant || deletedKey.remoteJid;
  const senderPhone = senderJid ? senderJid.split('@')[0] : 'Unknown';
  const chatJid = deletedKey.remoteJid;

  const text = extractMessageText(stored.message);
  const timeStr = new Date(stored.timestamp * 1000 || Date.now()).toLocaleTimeString();

  const report = 
`🚨 *ANTI-DELETE ALERT: DELETED MESSAGE DETECTED*
━━━━━━━━━━━━━━━━━━━━━
👤 *From:* +${senderPhone}
📍 *Chat:* \`${chatJid}\`
🕒 *Time:* ${timeStr}
💬 *Content:*
${text ? `"${text}"` : '_(Media / Attachment)_'}`;

  try {
    await sock.sendMessage(ownerJid, { text: report });

    // If media, attempt to forward recovered media
    const content = extractMessageContent(stored.message);
    if (content?.imageMessage || content?.videoMessage || content?.audioMessage) {
      try {
        const mediaBuf = await downloadMediaMessage(
          { key: stored.key, message: content },
          'buffer',
          {},
          { logger, reuploadRequest: sock.updateMediaMessage }
        );
        if (content.imageMessage) {
          await sock.sendMessage(ownerJid, { image: mediaBuf, caption: '📸 Recovered Deleted Photo' });
        } else if (content.videoMessage) {
          await sock.sendMessage(ownerJid, { video: mediaBuf, caption: '🎥 Recovered Deleted Video' });
        } else if (content.audioMessage) {
          await sock.sendMessage(ownerJid, { audio: mediaBuf, mimetype: 'audio/mp4' });
        }
      } catch (_) {}
    }
    console.log(`[ANTI-DELETE] 🚨 Forwarded deleted message from +${senderPhone} to owner.`);
  } catch (err) {
    console.error('[ANTI-DELETE] Failed to send anti-delete report:', err.message);
  }
}
