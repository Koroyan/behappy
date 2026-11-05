// Anonymous accounts.
//
// BeHappy has no sign-up. On first launch the app asks the server for an
// anonymous account and receives a bearer token plus a one-time-display
// recovery code. Entitlements (Plus pass, Art program) attach to the account
// on the server, so they can't be granted by editing local storage. The
// recovery code lets a person restore purchases on a new device.
//
// Only SHA-256 hashes of tokens and recovery codes are stored.

import crypto from 'node:crypto';

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

// Crockford base32 without ambiguous characters, for human-friendly codes.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function randomCode(groups = 4, groupLen = 5) {
  const bytes = crypto.randomBytes(groups * groupLen);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  const out = [];
  for (let g = 0; g < groups; g += 1) out.push(chars.slice(g * groupLen, (g + 1) * groupLen).join(''));
  return out.join('-');
}

export const normalizeRecoveryCode = (code) =>
  String(code || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');

export function createAccount(store) {
  const id = `acc_${crypto.randomBytes(12).toString('hex')}`;
  const token = crypto.randomBytes(32).toString('base64url');
  const recoveryCode = randomCode();
  const now = Date.now();
  store.mutate((db) => {
    db.accounts[id] = {
      id,
      tokenHash: sha256(token),
      recoveryHash: sha256(normalizeRecoveryCode(recoveryCode)),
      createdAt: now,
      lastSeenAt: now,
    };
  });
  return { accountId: id, token, recoveryCode };
}

export function findAccountByToken(store, token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  const hash = sha256(token);
  for (const account of Object.values(store.accounts)) {
    if (account.tokenHash && crypto.timingSafeEqual(Buffer.from(account.tokenHash), Buffer.from(hash))) {
      return account;
    }
  }
  return null;
}

/** Issues a fresh token for the account that owns this recovery code. */
export function restoreAccount(store, recoveryCode) {
  const normalized = normalizeRecoveryCode(recoveryCode);
  if (normalized.length < 16) return null;
  const hash = sha256(normalized);
  const account = Object.values(store.accounts).find((a) => a.recoveryHash === hash);
  if (!account) return null;
  const token = crypto.randomBytes(32).toString('base64url');
  store.mutate((db) => {
    db.accounts[account.id].tokenHash = sha256(token);
    db.accounts[account.id].lastSeenAt = Date.now();
  });
  return { accountId: account.id, token };
}

/** Rotates the recovery code (shown once to the user again). */
export function rotateRecoveryCode(store, accountId) {
  const recoveryCode = randomCode();
  store.mutate((db) => {
    db.accounts[accountId].recoveryHash = sha256(normalizeRecoveryCode(recoveryCode));
  });
  return recoveryCode;
}

/** Express middleware: requires "Authorization: Bearer <token>". */
export function requireAccount(store) {
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const account = findAccountByToken(store, token);
    if (!account) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid account token.' });
      return;
    }
    req.account = account;
    // Touch at most once per hour to avoid rewriting the store on every request.
    if (Date.now() - (account.lastSeenAt || 0) > 60 * 60 * 1000) {
      store.mutate((db) => {
        db.accounts[account.id].lastSeenAt = Date.now();
      });
    }
    next();
  };
}
