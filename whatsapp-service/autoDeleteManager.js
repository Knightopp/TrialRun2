import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { areJidsSameUser, jidNormalizedUser, isJidGroup } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, 'auto_delete_config.json');

// Default configuration
const DEFAULT_CONFIG = {
  defaultEmoji: '🗑️',
  activeChats: {}
};

// In-memory cache for recent deletions to prevent duplicate handling
const recentlyDeleted = new Set();

/**
 * Strip unicode variation selectors (like \uFE0F) and trim for reliable emoji matching
 */
export function normalizeEmoji(emoji) {
  if (!emoji || typeof emoji !== 'string') return '';
  return emoji.replace(/[\uFE00-\uFE0F]/g, '').trim();
}

/**
 * Load auto-delete configuration from disk
 */
export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        defaultEmoji: parsed.defaultEmoji || DEFAULT_CONFIG.defaultEmoji,
        activeChats: parsed.activeChats || {}
      };
    }
  } catch (err) {
    console.error('[AUTO-DELETE] Error reading config file, using default:', err.message);
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
    console.error('[AUTO-DELETE] Error saving config file:', err.message);
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
 * Get the trigger emoji for a specific chat
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
 * Update trigger emoji for a specific chat or globally
 */
export function updateEmoji(chatJid, newEmoji) {
  if (!newEmoji) return null;
  const cfg = loadConfig();
  const normalizedEmoji = newEmoji.trim();

  if (chatJid) {
    const normalizedJid = jidNormalizedUser(chatJid) || chatJid;
    if (!cfg.activeChats[normalizedJid]) {
      cfg.activeChats[normalizedJid] = {
        enabled: true,
        emoji: normalizedEmoji,
        activatedAt: new Date().toISOString()
      };
    } else {
      cfg.activeChats[normalizedJid].emoji = normalizedEmoji;
    }
  } else {
    cfg.defaultEmoji = normalizedEmoji;
  }

  saveConfig(cfg);
  return normalizedEmoji;
}

/**
 * Verify whether an action or message came from the bot owner (the user)
 */
export function isOwner(key, botUser) {
  if (!key) return false;
  // If sent directly from the logged in device
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
    ''
  ).trim();
}

/**
 * Handle command messages with prefix 'v'
 * e.g. v -a, v-a, v -d, v -emoji ❌, v -status, v -help
 */
export async function handleCommandMessage(sock, msg, botUser) {
  if (!sock || !msg || !msg.message) return false;

  // Extract text
  const text = extractMessageText(msg.message);
  if (!text) return false;

  // Check if text matches prefix 'v' (e.g. 'v -a', 'v-a', 'v -help', 'v help')
  const prefixMatch = text.match(/^v(?:\s+|-)(.+)$/i) || text.match(/^v$/i);
  if (!prefixMatch) return false;

  // Only the bot owner can use commands! Silently ignore anyone else
  if (!isOwner(msg.key, botUser)) {
    return false;
  }

  const chatJid = msg.key.remoteJid;
  if (!chatJid || chatJid === 'status@broadcast') return false;

  // Raw command argument string
  const rawArg = prefixMatch[1] ? prefixMatch[1].trim() : 'help';
  const parts = rawArg.split(/\s+/);
  const action = parts[0].toLowerCase().replace(/^-+/, ''); // strip leading dashes
  const extraParam = parts.slice(1).join(' ').trim();

  console.log(`[AUTO-DELETE] ⚙️ Owner command received in ${chatJid}: action="${action}", param="${extraParam}"`);

  let replyText = '';

  switch (action) {
    case 'a':
    case 'activate':
    case 'on': {
      const emojiParam = extraParam || null;
      const result = activateChat(chatJid, emojiParam);
      replyText = 
`⚡ *Auto-Delete on Reaction: ACTIVATED*
━━━━━━━━━━━━━━━━━━━━━
• *Status:* Active for this chat
• *Trigger Emoji:* ${result.emoji}
• *Permission:* Only *YOU* can delete messages by reacting with ${result.emoji}
• *How to use:* React to any message with ${result.emoji} and it will be deleted for everyone.
• *To Deactivate:* Send \`v -d\``;
      break;
    }

    case 'd':
    case 'deactivate':
    case 'off': {
      const deactivated = deactivateChat(chatJid);
      if (deactivated) {
        replyText = `⚪ *Auto-Delete on Reaction: DEACTIVATED*\nThis chat will no longer automatically delete messages on reaction.`;
      } else {
        replyText = `⚪ Auto-delete was not active in this chat.`;
      }
      break;
    }

    case 'emoji':
    case 'setemoji':
    case 'e': {
      if (!extraParam) {
        const currentEmoji = getChatEmoji(chatJid);
        replyText = `ℹ️ Current trigger emoji for this chat is: ${currentEmoji}\nTo change it, send: \`v -emoji <your_emoji>\``;
      } else {
        const newEmoji = updateEmoji(chatJid, extraParam);
        replyText = `✅ Trigger emoji for this chat updated to: ${newEmoji}\nReact with ${newEmoji} to delete messages for everyone.`;
      }
      break;
    }

    case 'status':
    case 's': {
      const active = isChatActive(chatJid);
      const emoji = getChatEmoji(chatJid);
      replyText = 
`📊 *Auto-Delete Status for this Chat*
━━━━━━━━━━━━━━━━━━━━━
• *Active:* ${active ? '✅ YES' : '❌ NO'}
• *Trigger Emoji:* ${emoji}
• *Chat ID:* \`${chatJid}\`
• *Chat Type:* ${isJidGroup(chatJid) ? 'Group' : 'Direct Message'}
• *Commands:* \`v -a\` to activate, \`v -d\` to deactivate, \`v -help\` for help`;
      break;
    }

    case 'list':
    case 'l': {
      const cfg = loadConfig();
      const keys = Object.keys(cfg.activeChats);
      if (keys.length === 0) {
        replyText = `📋 *Active Chats:* None\nActivate with \`v -a\` in any chat.`;
      } else {
        replyText = 
`📋 *Chats with Auto-Delete Active (${keys.length}):*
━━━━━━━━━━━━━━━━━━━━━
${keys.map((jid, i) => `${i + 1}. \`${jid}\` (Emoji: ${cfg.activeChats[jid]?.emoji || cfg.defaultEmoji})`).join('\n')}`;
      }
      break;
    }

    case 'h':
    case 'help':
    default: {
      replyText = 
`🤖 *Auto-Delete Reaction Bot (Prefix: v)*
━━━━━━━━━━━━━━━━━━━━━
• \`v -a\` : Activate auto-delete in this chat
• \`v -a <emoji>\` : Activate with custom emoji (e.g. \`v -a ❌\`)
• \`v -d\` : Deactivate auto-delete in this chat
• \`v -emoji <emoji>\` : Set trigger emoji (e.g. \`v -emoji 🗑️\`)
• \`v -status\` : Check status in current chat
• \`v -list\` : List all chats where auto-delete is active
• \`v -help\` : Show this help message
━━━━━━━━━━━━━━━━━━━━━
🔒 *Security:* Only YOU (the bot owner) can trigger deletions or run \`v\` commands.`;
      break;
    }
  }

  try {
    await sock.sendMessage(chatJid, { text: replyText }, { quoted: msg });
    return true;
  } catch (err) {
    console.error('[AUTO-DELETE] Failed to send command response:', err.message);
    return false;
  }
}

/**
 * Handle reaction event and trigger delete for everyone if conditions match
 */
export async function handleReaction(sock, { targetKey, reactionText, reactionKey, botUser }) {
  if (!sock || !targetKey || !targetKey.id || !reactionText) return false;

  // 1. Verify reaction was sent by the bot owner ONLY
  if (!isOwner(reactionKey, botUser)) {
    return false;
  }

  const chatJid = targetKey.remoteJid || reactionKey?.remoteJid;
  if (!chatJid || chatJid === 'status@broadcast') return false;

  // 2. Verify auto-delete is active in this chat
  if (!isChatActive(chatJid)) {
    return false;
  }

  // 3. Verify emoji matches the configured trigger emoji for this chat
  const targetEmoji = getChatEmoji(chatJid);
  const normalizedIncoming = normalizeEmoji(reactionText);
  const normalizedTarget = normalizeEmoji(targetEmoji);

  if (!normalizedIncoming || normalizedIncoming !== normalizedTarget) {
    return false;
  }

  // 4. Prevent duplicate delete attempts
  const dedupeKey = `${chatJid}_${targetKey.id}`;
  if (recentlyDeleted.has(dedupeKey)) {
    return false;
  }
  recentlyDeleted.add(dedupeKey);
  setTimeout(() => recentlyDeleted.delete(dedupeKey), 60000); // 1 minute cache

  console.log(`[AUTO-DELETE] 🎯 Reaction '${reactionText}' by Owner detected on msg ${targetKey.id} in ${chatJid}. Deleting for everyone...`);

  // 5. Build delete key
  // For group messages sent by others, participant must be passed.
  // For own messages or DM messages, fromMe & id & remoteJid are used.
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
    console.warn(`[AUTO-DELETE] ⚠️ Failed to delete message ${targetKey.id}:`, err.message);
    if (isJidGroup(chatJid) && !targetKey.fromMe) {
      console.warn(`[AUTO-DELETE] 💡 Tip: In WhatsApp groups, deleting other members' messages requires the bot account to be a Group Admin.`);
    }
    return false;
  }
}
