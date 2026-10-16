/**
 * In-memory message store to resolve the WhatsApp
 * "Waiting for this message. This may take a while" issue.
 *
 * WhatsApp uses Signal E2E encryption. When a recipient device or linked phone
 * cannot decrypt a message on the first try, WhatsApp sends a retry request.
 * Baileys needs `getMessage(key)` to provide the original message so it can
 * re-encrypt and resend it with updated Signal sessions.
 */

const MAX_STORED_MESSAGES = 1000;
const messages = new Map();

/**
 * Save a message into the cache
 * @param {string|object} key - Message key object or ID
 * @param {object} message - Baileys proto.IMessage object
 */
export function storeMessage(key, message) {
  if (!key || !message) return;
  const id = typeof key === 'string' ? key : key.id;
  if (!id) return;

  messages.set(id, message);

  // Evict oldest entries if capacity exceeded
  if (messages.size > MAX_STORED_MESSAGES) {
    const oldestKey = messages.keys().next().value;
    messages.delete(oldestKey);
  }
}

/**
 * Retrieve a message by key
 * @param {object} key - WAMessageKey
 * @returns {Promise<object|undefined>}
 */
export async function getMessage(key) {
  if (!key?.id) return undefined;
  return messages.get(key.id) || undefined;
}
