/**
 * End-to-end encryption for backups. Everything here runs on the person's
 * device; the server only ever receives the outputs (sealed boxes and a
 * wrapped key) and can't open any of them.
 *
 * Audited primitives only (@noble/ciphers, @noble/hashes: pure JavaScript,
 * identical on web, iOS and Android; no custom cryptography):
 * - data key (DEK): 32 random bytes from the platform's CSPRNG;
 * - every payload: XChaCha20-Poly1305 (authenticated encryption, random
 *   24-byte nonce) with associated data that binds it to the account, the
 *   kind of object and its id, so a box can't be swapped between accounts or
 *   objects without failing to open;
 * - recovery key: 160 random bits shown to the person as 36 characters
 *   (Crockford base32, with a 20-bit checksum that catches typos). It is not a
 *   password: with this much entropy a memory-hard KDF adds nothing, so the
 *   key-encryption key is HKDF-SHA256(recovery key, random salt). There is no
 *   user-chosen passphrase (that would be the weak link and would need
 *   scrypt/Argon2).
 * - the DEK is stored on the server only wrapped by that key-encryption key.
 * BeHappy never has the recovery key, so it can't recover a lost one.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

export type RandomBytes = (n: number) => Uint8Array;

export const CRYPTO_VERSION = 1;
const NONCE = 24;
const TAG = 16;
const RECOVERY_BYTES = 20;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const utf8 = (s: string) => enc.encode(s);
export const fromUtf8 = (b: Uint8Array) => dec.decode(b);

export class BackupCryptoError extends Error {
  constructor(public code: 'wrong_key' | 'tampered' | 'bad_format' | 'bad_recovery_key' | 'recovery_typo') {
    super(code);
  }
}

// ---------- Encodings (not cryptography) ----------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_INDEX = new Map([...B64].map((c, i) => [c, i]));

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = String(text).replace(/[\s=]/g, '');
  if (/[^A-Za-z0-9+/]/.test(clean) || clean.length % 4 === 1) throw new BackupCryptoError('bad_format');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64_INDEX.get(clean[i])! << 18) | (B64_INDEX.get(clean[i + 1])! << 12) | ((B64_INDEX.get(clean[i + 2]) ?? 0) << 6) | (B64_INDEX.get(clean[i + 3]) ?? 0);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.slice(0, o);
}

export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
export function fromHex(h: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})*$/i.test(h)) throw new BackupCryptoError('bad_format');
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** SHA-256 as hex (integrity of uploads, record fingerprints). */
export const sha256Hex = (b: Uint8Array | string) => toHex(sha256(typeof b === 'string' ? utf8(b) : b));

// ---------- Recovery key ----------

// Crockford base32: no I, L, O, U (read as 1, 1, 0 and refused).
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function toBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function fromBase32(text: string): Uint8Array {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of text) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new BackupCryptoError('bad_recovery_key');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

const checksum = (entropy: Uint8Array) => toBase32(sha256(entropy).slice(0, 3)).slice(0, 4);

/** A new recovery key: 160 random bits + checksum, shown as 9 groups of 4 ("K7QM-…"). */
export function newRecoveryKey(random: RandomBytes): { entropy: Uint8Array; text: string } {
  const entropy = random(RECOVERY_BYTES);
  if (entropy.length !== RECOVERY_BYTES) throw new Error('random source failed');
  const body = toBase32(entropy) + checksum(entropy);
  return { entropy, text: body.match(/.{4}/g)!.join('-') };
}

/** Reads a typed recovery key: spaces, dashes and case don't matter; O→0, I/L→1. A typo fails the checksum. */
export function parseRecoveryKey(input: string): Uint8Array {
  const clean = String(input || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (clean.length !== 36) throw new BackupCryptoError('bad_recovery_key');
  const entropy = fromBase32(clean.slice(0, 32)).slice(0, RECOVERY_BYTES);
  if (checksum(entropy) !== clean.slice(32)) throw new BackupCryptoError('recovery_typo');
  return entropy;
}

// ---------- Keys ----------

export const newDataKey = (random: RandomBytes) => {
  const k = random(32);
  if (k.length !== 32) throw new Error('random source failed');
  return k;
};

const kekFrom = (entropy: Uint8Array, salt: Uint8Array) => hkdf(sha256, entropy, salt, utf8('behappy-backup-v1 key-encryption key'), 32);

/** What the server keeps to let a new device unlock the backup: the DEK, wrapped. No secret in clear. */
export interface KeyEnvelope {
  v: 1;
  kdf: 'hkdf-sha256';
  aead: 'xchacha20poly1305';
  salt: string;
  wrapped: string;
  /** Short public id of this key (tells devices the backup was re-keyed). */
  keyId: string;
}

export function wrapDataKey(dek: Uint8Array, recoveryEntropy: Uint8Array, accountId: string, random: RandomBytes): KeyEnvelope {
  const salt = random(16);
  const sealed = seal(kekFrom(recoveryEntropy, salt), dek, aad(accountId, 'key', 'dek'), random);
  return { v: 1, kdf: 'hkdf-sha256', aead: 'xchacha20poly1305', salt: toHex(salt), wrapped: toBase64(sealed), keyId: sha256Hex(dek).slice(0, 16) };
}

/** Opens the envelope with the recovery key; a wrong key fails authentication (BackupCryptoError wrong_key). */
export function unwrapDataKey(envelope: KeyEnvelope, recoveryEntropy: Uint8Array, accountId: string): Uint8Array {
  if (!envelope || envelope.v !== 1 || envelope.kdf !== 'hkdf-sha256' || envelope.aead !== 'xchacha20poly1305') throw new BackupCryptoError('bad_format');
  try {
    return open(kekFrom(recoveryEntropy, fromHex(envelope.salt)), fromBase64(envelope.wrapped), aad(accountId, 'key', 'dek'));
  } catch (e) {
    if (e instanceof BackupCryptoError && e.code === 'bad_format') throw e;
    throw new BackupCryptoError('wrong_key');
  }
}

// ---------- Boxes ----------

/** Associated data: which account, which kind of object, which object. Authenticated, not secret. */
export const aad = (accountId: string, kind: 'key' | 'snapshot' | 'blob', id: string) => utf8(`behappy-backup|v${CRYPTO_VERSION}|${accountId}|${kind}|${id}`);

/** [version 1 byte][nonce 24][ciphertext + 16-byte tag]. */
export function seal(key: Uint8Array, plaintext: Uint8Array, associated: Uint8Array, random: RandomBytes): Uint8Array {
  const nonce = random(NONCE);
  if (nonce.length !== NONCE) throw new Error('random source failed');
  const ct = xchacha20poly1305(key, nonce, associated).encrypt(plaintext);
  const out = new Uint8Array(1 + NONCE + ct.length);
  out[0] = CRYPTO_VERSION;
  out.set(nonce, 1);
  out.set(ct, 1 + NONCE);
  return out;
}

/** Opens a box; any change to it, or the wrong key, account or object, fails (BackupCryptoError tampered). */
export function open(key: Uint8Array, box: Uint8Array, associated: Uint8Array): Uint8Array {
  if (!(box instanceof Uint8Array) || box.length < 1 + NONCE + TAG || box[0] !== CRYPTO_VERSION) throw new BackupCryptoError('bad_format');
  try {
    return xchacha20poly1305(key, box.slice(1, 1 + NONCE), associated).decrypt(box.slice(1 + NONCE));
  } catch {
    throw new BackupCryptoError('tampered');
  }
}

export const sealText = (key: Uint8Array, text: string, associated: Uint8Array, random: RandomBytes) => seal(key, utf8(text), associated, random);
export const openText = (key: Uint8Array, box: Uint8Array, associated: Uint8Array) => fromUtf8(open(key, box, associated));
