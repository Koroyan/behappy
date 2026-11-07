// Accounts, sessions and roles.
//
// Every install starts with an anonymous account: a random id, a bearer token
// (a "device" session) and a recovery code that is shown once. The person may
// later add a verified email and password (identity.mjs); the account id never
// changes, so purchases, community membership and bookings stay attached and
// nothing is lost. Only SHA-256 hashes of tokens and recovery codes are stored.
//
// Staff roles (owner, admin, verifier, moderator, finance, support, analyst)
// live on the server; permissions per role are in admin/permissions.mjs.
// Staff endpoints also require a password session, so a copied device token
// alone can't open them.

import crypto from 'node:crypto';

import { ms, ts } from './db/index.mjs';

const DAY = 24 * 60 * 60 * 1000;
const DEVICE_SESSION_DAYS = 400; // sliding: extended while the app is used
const PASSWORD_SESSION_DAYS = 90;

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
export const newId = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
export const newToken = () => crypto.randomBytes(32).toString('base64url');

// Crockford base32 without ambiguous characters, for human-friendly codes.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function randomCode(groups = 4, groupLen = 5) {
  const out = [];
  for (let g = 0; g < groups; g += 1) {
    let s = '';
    for (let i = 0; i < groupLen; i += 1) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
    out.push(s);
  }
  return out.join('-');
}

export const normalizeRecoveryCode = (code) =>
  String(code || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');

/** The account as the rest of the server sees it. */
export function toAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: ms(row.created_at),
    lastSeenAt: ms(row.last_seen_at),
    email: row.email || null,
    emailVerified: Boolean(row.email_verified_at),
    registered: Boolean(row.email && row.email_verified_at && row.password_hash),
    roles: row.roles || [],
    status: row.status,
    sessionId: row.session_id,
    sessionKind: row.session_kind,
    sessionLastUsedAt: ms(row.session_last_used_at),
    stepUpAt: ms(row.session_step_up_at),
    mfaAt: ms(row.session_mfa_at),
    staffSuspendedAt: ms(row.staff_suspended_at),
    analyticsOptOut: Boolean(row.analytics_opt_out),
  };
}

export async function insertSession(q, { accountId, token, kind = 'device', now = Date.now(), userAgent } = {}) {
  const days = kind === 'password' ? PASSWORD_SESSION_DAYS : DEVICE_SESSION_DAYS;
  const id = newId('ses');
  await q.query(
    'insert into sessions (id, account_id, token_hash, kind, created_at, last_used_at, expires_at, user_agent) values ($1, $2, $3, $4, $5, $5, $6, $7)',
    [id, accountId, sha256(token), kind, ts(now), ts(now + days * DAY), userAgent ? String(userAgent).slice(0, 200) : null]
  );
  return id;
}

export async function createAccount(db, { now = Date.now(), userAgent } = {}) {
  const id = newId('acc');
  const token = newToken();
  const recoveryCode = randomCode();
  await db.tx(async (t) => {
    await t.query('insert into accounts (id, recovery_hash, created_at, last_seen_at) values ($1, $2, $3, $3)', [id, sha256(normalizeRecoveryCode(recoveryCode)), ts(now)]);
    await insertSession(t, { accountId: id, token, kind: 'device', now, userAgent });
  });
  return { accountId: id, token, recoveryCode };
}

const SESSION_SELECT = `select a.*, s.id as session_id, s.kind as session_kind, s.last_used_at as session_last_used_at, s.expires_at as session_expires_at,
    s.step_up_at as session_step_up_at, s.mfa_at as session_mfa_at
  from sessions s join accounts a on a.id = s.account_id
  where s.token_hash = $1 and s.revoked_at is null`;

export async function findAccountByToken(db, token, now = Date.now()) {
  if (!token || typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  const r = await db.query(SESSION_SELECT, [sha256(token)]);
  const row = r.rows[0];
  if (!row) return null;
  if (row.session_expires_at && ms(row.session_expires_at) <= now) return null;
  return toAccount(row);
}

export async function getAccount(db, id) {
  const r = await db.query('select * from accounts where id = $1', [id]);
  return toAccount(r.rows[0]);
}

/**
 * Issues a fresh device token for the account that owns this recovery code.
 * Other device sessions are signed out, as in 2.0: if someone else used the
 * code, the original device notices.
 */
export async function restoreAccount(db, recoveryCode, { now = Date.now(), userAgent } = {}) {
  const normalized = normalizeRecoveryCode(recoveryCode);
  if (normalized.length < 16) return null;
  const r = await db.query('select id from accounts where recovery_hash = $1', [sha256(normalized)]);
  const accountId = r.rows[0]?.id;
  if (!accountId) return null;
  const token = newToken();
  await db.tx(async (t) => {
    await t.query("update sessions set revoked_at = $2 where account_id = $1 and kind = 'device' and revoked_at is null", [accountId, ts(now)]);
    await insertSession(t, { accountId, token, kind: 'device', now, userAgent });
    await t.query('update accounts set last_seen_at = $2 where id = $1', [accountId, ts(now)]);
  });
  return { accountId, token };
}

/** Replaces the recovery code (the new one is shown to the person once). */
export async function rotateRecoveryCode(db, accountId) {
  const recoveryCode = randomCode();
  await db.query('update accounts set recovery_hash = $2 where id = $1', [accountId, sha256(normalizeRecoveryCode(recoveryCode))]);
  return recoveryCode;
}

export async function revokeSession(db, sessionId, now = Date.now()) {
  await db.query('update sessions set revoked_at = $2 where id = $1 and revoked_at is null', [sessionId, ts(now)]);
}

export const bearerToken = (req) => {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

/** Express middleware: requires "Authorization: Bearer <token>". */
export function requireAccount(db, { clock = { now: () => Date.now() } } = {}) {
  return async (req, res, next) => {
    const now = clock.now();
    const account = await findAccountByToken(db, bearerToken(req), now);
    if (!account) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid account token.' });
      return;
    }
    req.account = account;
    // Touch at most once per hour, and slide the session forward.
    if (now - (account.sessionLastUsedAt || 0) > 60 * 60 * 1000) {
      const days = account.sessionKind === 'password' ? PASSWORD_SESSION_DAYS : DEVICE_SESSION_DAYS;
      await db.query('update sessions set last_used_at = $2, expires_at = greatest(expires_at, $3) where id = $1', [account.sessionId, ts(now), ts(now + days * DAY)]);
      await db.query('update accounts set last_seen_at = $2 where id = $1', [account.id, ts(now)]);
    }
    next();
  };
}

/** Optional auth: sets req.account when a valid token is present, never rejects. */
export function optionalAccount(db, { clock = { now: () => Date.now() } } = {}) {
  return async (req, _res, next) => {
    const token = bearerToken(req);
    if (token) req.account = await findAccountByToken(db, token, clock.now());
    next();
  };
}

/** Requires a registered account (verified email + password) that isn't suspended. */
export function requireRegistered(req, res, next) {
  if (!req.account?.registered) return res.status(403).json({ error: 'registration_required', message: 'Create a BeHappy account (email and password) first.' });
  if (req.account.status !== 'active') return res.status(403).json({ error: 'account_suspended' });
  next();
}

/**
 * Staff roles. Requires the role AND a password session: a device token
 * copied from an unlocked phone can't open moderation or admin tools.
 */
// Legacy role checks; staff endpoints now use admin/staff.mjs guard(permission).
// The owner counts as every role; suspended staff count as none.
const hasRole = (account, role) => Boolean(account?.roles?.includes(role) || account?.roles?.includes('owner'));

export function requireStaff(...roles) {
  return (req, res, next) => {
    const a = req.account;
    if (!a || !roles.some((r) => hasRole(a, r))) return res.status(403).json({ error: 'forbidden' });
    if (a.sessionKind !== 'password' || !a.registered) return res.status(403).json({ error: 'password_session_required', message: 'Sign in with your email and password to use staff tools.' });
    if (a.staffSuspendedAt) return res.status(403).json({ error: 'staff_suspended' });
    next();
  };
}

export const isStaff = (account, role) => Boolean(hasRole(account, role) && account.sessionKind === 'password' && account.registered && !account.staffSuspendedAt);
