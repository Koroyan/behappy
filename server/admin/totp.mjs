// Time-based one-time codes (RFC 6238: HMAC-SHA1, 30-second steps, 6 digits),
// compatible with common authenticator apps. Used for staff two-step sign-in.

import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const STEP_SECONDS = 30;

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text) {
  const clean = String(text || '')
    .toUpperCase()
    .split('')
    .filter((c) => ALPHABET.includes(c));
  let bits = 0;
  let value = 0;
  const out = [];
  for (const c of clean) {
    value = (value << 5) | ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newSecret = () => base32Encode(crypto.randomBytes(20));

export function hotp(secretBase32, counter) {
  const key = base32Decode(secretBase32);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = h[h.length - 1] & 15;
  const bin = ((h[offset] & 127) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(bin % 1000000).padStart(6, '0');
}

export const stepAt = (nowMs) => Math.floor(nowMs / 1000 / STEP_SECONDS);

/**
 * Checks a code against the current step and one step either side (clock
 * drift). Returns the matched step, or null. Callers refuse a step that was
 * already used, so a code can't be replayed.
 */
export function verifyTotp(secretBase32, code, nowMs, window = 1) {
  const c = String(code || '').replace(/[^0-9]/g, '');
  if (c.length !== 6) return null;
  const current = stepAt(nowMs);
  for (let d = -window; d <= window; d += 1) {
    const expected = hotp(secretBase32, current + d);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(c))) return current + d;
  }
  return null;
}

export function otpauthUrl({ secret, label, issuer = 'BeHappy Staff' }) {
  const l = encodeURIComponent(`${issuer}:${label}`);
  return `otpauth://totp/${l}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}
