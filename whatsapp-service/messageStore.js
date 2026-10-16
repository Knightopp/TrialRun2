/**
 * In-memory message store to resolve the WhatsApp
 * "Waiting for this message. This may take a while" issue,
 * and provide history caching for v-purge, anti-delete logger, and view-once saver.
 */

const MAX_STORED_MESSAGES = 1500;
const MAX_CHAT_HISTORY = 100;

// Map of messageId -> { key, message, timestamp, sender, text }
const messages = new Map();

// Map of chatJid -> Array of { id, key, timestamp, fromMe }
const chatHistory = new Map();

/**
 * Save a message into the cache
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
    // Don't add duplicate IDs
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

  // Evict oldest entries if global capacity exceeded
  if (messages.size > MAX_STORED_MESSAGES) {
    const oldestKey = messages.keys().next().value;
    messages.delete(oldestKey);
  }
}

/**
 * Retrieve a message by key (Required by Baileys for session decryption retries)
 * @param {object} key - WAMessageKey
 * @returns {Promise<object|undefined>}
 */
export async function getMessage(key) {
  if (!key?.id) return undefined;
  const entry = messages.get(key.id);
  return entry?.message || undefined;
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
  // Get last n items (most recent)
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
