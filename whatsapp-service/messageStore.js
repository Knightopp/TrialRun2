/**
 * Persistent and in-memory message store for Baileys
 * Resolves the WhatsApp "Waiting for this message. This may take a while" issue
 * by caching messages on disk across restarts and returning properly reconstructed
 * proto.Message objects during session decryption retries.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { proto } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.join(__dirname, 'messages_cache.json');

const MAX_STORED_MESSAGES = 2500;
const MAX_CHAT_HISTORY = 100;

// Map of messageId -> { key, message, fullMsg, timestamp }
const messages = new Map();

// Map of chatJid -> Array of { id, key, timestamp, fromMe }
const chatHistory = new Map();

let saveScheduled = false;

/**
 * Deep recursive helper to restore serialized Buffer objects
 */
function restoreBuffers(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return Buffer.from(obj.data);
  }
  for (const k of Object.keys(obj)) {
    obj[k] = restoreBuffers(obj[k]);
  }
  return obj;
}

/**
 * Load persisted messages from disk on startup
 */
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item?.id && item?.data) {
          messages.set(item.id, restoreBuffers(item.data));
        }
      }
      console.log(`[MESSAGE-STORE] 📦 Restored ${messages.size} cached messages from disk for decryption retries.`);
    }
  }
} catch (err) {
  console.warn('[MESSAGE-STORE] ⚠️ Could not load message cache from disk:', err.message);
}

/**
 * Debounced background save of message cache to disk
 */
function scheduleDiskSave() {
  if (saveScheduled) return;
  saveScheduled = true;

  setTimeout(() => {
    saveScheduled = false;
    try {
      const arr = [];
      for (const [id, data] of messages.entries()) {
        arr.push({ id, data });
      }
      // Keep last 1000 messages in disk cache
      const slice = arr.slice(-1000);
      fs.writeFileSync(CACHE_FILE, JSON.stringify(slice), 'utf-8');
    } catch (e) {
      console.warn('[MESSAGE-STORE] ⚠️ Disk cache save warning:', e.message);
    }
  }, 1500);
}

/**
 * Save a message into the cache (in-memory + scheduled disk sync)
 * @param {object} key - WAMessageKey
 * @param {object} message - Baileys proto.IMessage object
 * @param {object} [fullMsg] - Full WAMessage object
 */
export function storeMessage(key, message, fullMsg = null) {
  if (!key || !message) return;
  const id = key.id;
  if (!id) return;

  const chatJid = key.remoteJid;
  const timestamp = fullMsg?.messageTimestamp || Date.now();

  // Store in primary message cache
  messages.set(id, {
    key,
    message,
    fullMsg,
    timestamp
  });

  // Track chat history for purge
  if (chatJid && chatJid !== 'status@broadcast') {
    if (!chatHistory.has(chatJid)) {
      chatHistory.set(chatJid, []);
    }
    const history = chatHistory.get(chatJid);
    if (!history.some(m => m.id === id)) {
      history.push({
        id,
        key,
        timestamp,
        fromMe: Boolean(key.fromMe)
      });
      if (history.length > MAX_CHAT_HISTORY) {
        history.shift();
      }
    }
  }

  // Evict oldest entries if capacity exceeded
  if (messages.size > MAX_STORED_MESSAGES) {
    const oldestKey = messages.keys().next().value;
    messages.delete(oldestKey);
  }

  scheduleDiskSave();
}

/**
 * Retrieve a message by key (Required by Baileys for session decryption retries)
 * Returns a valid proto.Message instance so Baileys re-encrypts successfully.
 * @param {object} key - WAMessageKey
 * @returns {Promise<object|undefined>}
 */
export async function getMessage(key) {
  if (!key?.id) return undefined;
  const entry = messages.get(key.id);
  if (!entry?.message) return undefined;

  try {
    return proto.Message.fromObject(entry.message);
  } catch (err) {
    return entry.message;
  }
}

/**
 * Retrieve full stored message entry with metadata
 * @param {string} id - Message ID
 * @returns {object|undefined}
 */
export function getFullStoredMessage(id) {
  if (!id) return undefined;
  return messages.get(id);
}

/**
 * Get recent message keys from a specific chat (for v -purge)
 * @param {string} chatJid - Chat JID
 * @param {number} count - Number of messages to retrieve
 * @returns {Array} Array of message keys
 */
export function getRecentChatMessages(chatJid, count = 5) {
  if (!chatJid || !chatHistory.has(chatJid)) return [];
  const history = chatHistory.get(chatJid);
  const n = Math.min(Math.max(1, count), history.length);
  return history.slice(-n);
}

/**
 * Remove messages from chat history after purge
 */
export function removeChatMessagesFromHistory(chatJid, ids) {
  if (!chatJid || !chatHistory.has(chatJid)) return;
  const history = chatHistory.get(chatJid);
  const idSet = new Set(ids);
  chatHistory.set(chatJid, history.filter(m => !idSet.has(m.id)));
}
