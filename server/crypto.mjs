// Field encryption and one-way identifiers.
//
//  - documents: verification documents (identity, diplomas, licences)
//  - messages:  private client <-> professional messages and booking notes
//  - identifiers: HMAC key for one-way hashes (free-trial abuse checks)
//
// AES-256-GCM with a random 12-byte IV per value. Production must configure
// the keys (DOCUMENT_ENCRYPTION_KEY, MESSAGE_ENCRYPTION_KEY,
// IDENTIFIER_HMAC_KEY; the server refuses to start without them).
// Development generates throwaway keys in DATA_DIR/dev-keys.json; tests keep
// them in memory. Losing a production key makes its data unreadable, so the
// owner must back the keys up separately from the database.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const NAMES = ['documents', 'messages', 'identifiers'];

function devKeys(dataDir) {
  if (!dataDir) return Object.fromEntries(NAMES.map((n) => [n, crypto.randomBytes(32)]));
  const file = path.join(dataDir, 'dev-keys.json');
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    stored = {};
  }
  let changed = false;
  for (const n of NAMES) {
    if (!stored[n]) {
      stored[n] = crypto.randomBytes(32).toString('base64');
      changed = true;
    }
  }
  if (changed) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(stored, null, 2));
  }
  return Object.fromEntries(NAMES.map((n) => [n, Buffer.from(stored[n], 'base64')]));
}

export function createCrypto(config = {}) {
  const configured = {
    documents: config.encryption?.documentsKey,
    messages: config.encryption?.messagesKey,
    identifiers: config.encryption?.identifierSalt,
  };
  let fallback = null;
  const key = (name) => {
    if (configured[name]) {
      const k = Buffer.from(configured[name], 'base64');
      if (k.length !== 32) throw new Error(`The ${name} key must be 32 bytes (base64).`);
      return k;
    }
    if (config.isProduction) throw new Error(`The ${name} encryption key is not configured.`);
    fallback ||= devKeys(config.persistDevKeys ? config.dataDir : null);
    return fallback[name];
  };
  return {
    encrypt(name, plain) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key(name), iv);
      const ciphertext = Buffer.concat([cipher.update(Buffer.isBuffer(plain) ? plain : Buffer.from(String(plain), 'utf8')), cipher.final()]);
      return { ciphertext, iv, tag: cipher.getAuthTag() };
    },
    decrypt(name, { ciphertext, iv, tag }) {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key(name), Buffer.from(iv));
      decipher.setAuthTag(Buffer.from(tag));
      return Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]);
    },
    decryptText(name, parts) {
      return this.decrypt(name, parts).toString('utf8');
    },
    hmac(value) {
      return crypto.createHmac('sha256', key('identifiers')).update(String(value)).digest('hex');
    },
  };
}
