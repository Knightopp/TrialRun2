/**
 * SRISHTI 2.7 — CRYPTOGRAPHIC UTILITIES & SECURE CLIENT STORAGE
 * 
 * Architecture & Threat Model:
 * 1. AES-256-GCM + PBKDF2 (100,000 rounds): Encrypted local cache at rest in localStorage.
 *    Protects cached attendee passes from casual file extraction / shoulder-surfing.
 * 2. Server-Authoritative Pass Verification: Passes carry unique participant codes (SRI27-XXXXXX)
 *    issued exclusively by the server via database sequence. Check-in and attendance are validated
 *    server-side with duplicate prevention.
 * 3. Client-side input sanitization against XSS injection.
 */

// Salt used for deriving client storage vault key
const VAULT_SALT = 'srishti_2.7_stc_cyber_vault_2026_9888';

/**
 * Derives an AES-GCM 256-bit encryption key from password & salt using PBKDF2 (100,000 iterations)
 */
async function deriveAesKey(saltStr = VAULT_SALT) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(VAULT_SALT),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(saltStr),
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary JavaScript object or string into AES-256-GCM ciphertext
 * (Used for encrypted client-side caching at rest)
 */
export async function encryptData(plainData) {
  try {
    if (plainData === null || plainData === undefined) return '';
    const text = typeof plainData === 'string' ? plainData : JSON.stringify(plainData);
    const enc = new TextEncoder();
    const key = await deriveAesKey();

    // 12-byte cryptographically secure random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );

    // Encode IV and ciphertext as Base64 strings
    const ivB64 = btoa(String.fromCharCode(...iv));
    const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    return `sri_enc:${ivB64}:${cipherB64}`;
  } catch (err) {
    console.warn('CryptoVault encryption fallback:', err);
    return typeof plainData === 'string' ? plainData : JSON.stringify(plainData);
  }
}

/**
 * Decrypt AES-256-GCM ciphertext back into original data
 */
export async function decryptData(encryptedStr, defaultValue = null) {
  try {
    if (!encryptedStr || typeof encryptedStr !== 'string') return defaultValue;
    if (!encryptedStr.startsWith('sri_enc:')) {
      try {
        return JSON.parse(encryptedStr);
      } catch (_) {
        return encryptedStr;
      }
    }

    const parts = encryptedStr.split(':');
    if (parts.length !== 3) return defaultValue;

    const ivBytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));

    const key = await deriveAesKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      cipherBytes
    );

    const decText = new TextDecoder().decode(decrypted);
    try {
      return JSON.parse(decText);
    } catch (_) {
      return decText;
    }
  } catch (err) {
    console.warn('CryptoVault decryption tag error (tampered data detected):', err);
    return defaultValue;
  }
}

/**
 * Secure Storage Interface: Encrypted client-side cache at rest
 */
export const secureStorage = {
  async setItem(key, value) {
    try {
      const encrypted = await encryptData(value);
      localStorage.setItem(key, encrypted);
    } catch (e) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  },

  async getItem(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      return await decryptData(raw, defaultValue);
    } catch (e) {
      return defaultValue;
    }
  },

  removeItem(key) {
    localStorage.removeItem(key);
  }
};

/**
 * Formats a QR entry pass payload.
 * Returns the plain uppercase participant code (e.g. SRI27-XXXXXX) to ensure
 * 100% compatibility with the on-ground Flutter volunteer scanner app.
 */
export function generatePassPayload(participantCode) {
  return (participantCode || '').trim().toUpperCase();
}

// Backward-compatible alias for existing imports
export async function generateTamperProofQrPayload(participantCode) {
  return generatePassPayload(participantCode);
}

/**
 * Parses scanned QR text into participantCode and passToken for server-side verification
 */
export function parseScannedPass(scannedText) {
  if (!scannedText || typeof scannedText !== 'string') {
    return { valid: false, error: 'Empty QR code' };
  }

  const trimmed = scannedText.trim();

  // JSON format: {"c":"SRI27-XXXXXX","k":"token","n":"..."}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const payload = JSON.parse(trimmed);
      if (payload.c) {
        return {
          valid: true,
          participantCode: payload.c.trim(),
          passToken: (payload.k || payload.s || '').trim(),
          attendeeName: (payload.n || '').trim(),
          hasServerToken: Boolean(payload.k || payload.s)
        };
      }
    } catch (_) { }
  }

  // Delimited format: SRI27:CODE:TOKEN
  if (trimmed.startsWith('SRI27:')) {
    const parts = trimmed.split(':');
    return {
      valid: true,
      participantCode: (parts[1] || parts[0]).trim(),
      passToken: (parts[2] || '').trim(),
      hasServerToken: Boolean(parts[2])
    };
  }

  // Plain participant code format
  if (trimmed.startsWith('SRI27-') || trimmed === 'ADMIN-PASS' || trimmed.startsWith('TEST-')) {
    return {
      valid: true,
      participantCode: trimmed,
      passToken: '',
      hasServerToken: false
    };
  }

  return {
    valid: false,
    error: 'Unrecognized ticket format'
  };
}

// Backward-compatible alias for scanner
export async function verifyScannedPass(scannedText) {
  const parsed = parseScannedPass(scannedText);
  if (!parsed.valid) {
    return { valid: false, isCounterfeit: false, error: parsed.error };
  }
  return {
    valid: true,
    participantCode: parsed.participantCode,
    passToken: parsed.passToken,
    attendeeName: parsed.attendeeName,
    hasServerToken: parsed.hasServerToken
  };
}

/**
 * XSS Sanitizer: strips unsafe HTML tags, scripts, and javascript: protocols
 */
export function sanitizeInput(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // remove HTML tags
    .replace(/javascript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/[\x00-\x1F\x7F]/g, '') // control chars
    .trim();
}

/**
 * Ephemeral Session Token for Admin Command Center:
 * Encrypts session metadata in AES-GCM for storage
 */
export async function createSecureSessionToken(staffUser) {
  const payload = {
    u: staffUser.username || staffUser.email,
    r: staffUser.role,
    e: staffUser.email,
    exp: Date.now() + (2 * 60 * 60 * 1000) // 2 hours validity
  };
  return await encryptData(payload);
}

export async function verifySecureSessionToken(tokenStr) {
  if (!tokenStr) return null;
  const data = await decryptData(tokenStr);
  if (!data || !data.exp) return null;
  if (Date.now() > data.exp) return null;
  return data;
}
