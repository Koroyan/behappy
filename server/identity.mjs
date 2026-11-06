// Email + password for BeHappy accounts.
//
// Registering upgrades the SAME account (same id) the app already uses, so
// purchases, community membership and bookings stay attached. Private
// wellness data (journal, Anulia conversations, art, assessments) lives on the
// device and is untouched.
//
//  - Passwords: scrypt (N=2^15, r=8, p=1, 64-byte key, random salt).
//  - An email is claimed only once it is verified (no squatting someone
//    else's address); codes are single-use, hashed, expire in 15 minutes and
//    allow 5 attempts.
//  - Login: generic error, account lock for 15 minutes after 5 failures,
//    per-IP throttling.
//  - Password reset revokes every session; a password change revokes all
//    other sessions.

import crypto from 'node:crypto';
import { promisify } from 'node:util';

import express from 'express';

import { audit } from './audit.mjs';
import { insertSession, newId, newToken, requireAccount, revokeSession, sha256 } from './auth.mjs';
import { ms, PG, ts } from './db/index.mjs';
import { isEmail, mailText, normalizeEmail } from './notify/mailer.mjs';

const scrypt = promisify(crypto.scrypt);
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64 };
const MINUTE = 60 * 1000;
const CODE_TTL = 15 * MINUTE;
const MAX_CODE_ATTEMPTS = 5;
const LOCK_AFTER = 5;
const LOCK_FOR = 15 * MINUTE;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(password), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 128 * SCRYPT.N * SCRYPT.r * 2 });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(String(password), Buffer.from(saltB64, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: 128 * Number(N) * Number(r) * 2 });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// A short list of the most common passwords; the length rule does most of the work.
const COMMON = new Set(['password', 'password1', 'password12', 'password123', '1234567890', '12345678910', 'qwertyuiop', 'qwerty1234', '1q2w3e4r5t', 'iloveyou12', 'behappy123', 'behappy2024', 'behappy2025', 'behappy2026', 'aaaaaaaaaa', '0000000000', '1111111111']);

/** Returns an error code, or null when the password is acceptable. */
export function passwordProblem(password, email = '') {
  const p = String(password || '');
  if (p.length < 10) return 'password_too_short';
  if (p.length > 200) return 'password_too_long';
  if (new Set(p).size < 4) return 'password_too_simple';
  if (COMMON.has(p.toLowerCase())) return 'password_too_common';
  const local = normalizeEmail(email).split('@')[0];
  if (local && local.length >= 4 && p.toLowerCase().includes(local)) return 'password_contains_email';
  return null;
}

const sixDigits = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const codeHash = (purpose, target, code) => sha256(`${purpose}:${target}:${code}`);

/**
 * Creates a fresh code (older open codes of the same purpose stop working).
 * `fixedCode` is the development-only test code (config.devFixedCode).
 */
export async function createCode(q, { accountId, purpose, target, now, fixedCode = null }) {
  const code = fixedCode && /^\d{6}$/.test(fixedCode) ? fixedCode : sixDigits();
  await q.query('update verification_codes set consumed_at = $3 where account_id = $1 and purpose = $2 and consumed_at is null', [accountId, purpose, ts(now)]);
  await q.query('insert into verification_codes (id, account_id, purpose, target, code_hash, created_at, expires_at) values ($1, $2, $3, $4, $5, $6, $7)', [
    newId('vc'),
    accountId,
    purpose,
    target,
    codeHash(purpose, target, code),
    ts(now),
    ts(now + CODE_TTL),
  ]);
  return code;
}

/** Checks a code. Returns { ok, target } or { ok: false, error }. Consumes it on success. */
export async function consumeCode(q, { accountId, purpose, code, now }) {
  const r = await q.query('select * from verification_codes where account_id = $1 and purpose = $2 and consumed_at is null order by created_at desc limit 1 for update', [accountId, purpose]);
  const row = r.rows[0];
  if (!row) return { ok: false, error: 'code_missing' };
  if (ms(row.expires_at) <= now) return { ok: false, error: 'code_expired' };
  if (row.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, error: 'code_attempts_exceeded' };
  const given = codeHash(purpose, row.target, String(code || '').replace(/\D/g, ''));
  if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(row.code_hash))) {
    await q.query('update verification_codes set attempts = attempts + 1 where id = $1', [row.id]);
    return { ok: false, error: 'code_wrong', attemptsLeft: MAX_CODE_ATTEMPTS - row.attempts - 1 };
  }
  await q.query('update verification_codes set consumed_at = $2 where id = $1', [row.id, ts(now)]);
  return { ok: true, target: row.target };
}

class Window {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.map = new Map();
  }

  allow(key, now = Date.now()) {
    const list = (this.map.get(key) || []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.limit) {
      this.map.set(key, list);
      return false;
    }
    list.push(now);
    this.map.set(key, list);
    return true;
  }
}

const langOf = (req) => (typeof req.body?.lang === 'string' && /^[a-z]{2}$/.test(req.body.lang) ? req.body.lang : 'en');

export function createAuthRouter({ db, mailer, clock = { now: () => Date.now() }, devFixedCode = null, limits = {} }) {
  const router = express.Router();
  const auth = requireAccount(db, { clock });
  const loginByIp = new Window(limits.loginsPer15MinPerIp ?? 20, 15 * MINUTE);
  const codesByAccount = new Window(limits.codesPerHourPerAccount ?? 5, 60 * MINUTE);
  const forgotByIp = new Window(limits.resetsPerHourPerIp ?? 10, 60 * MINUTE);
  const json = express.json({ limit: '10kb' });
  const fail = (res, status, error, extra = {}) => res.status(status).json({ error, ...extra });

  const sendCode = async (to, kind, code, lang) => {
    const subject = mailText(lang, kind === 'reset' ? 'resetSubject' : 'verifySubject', { code });
    const text = mailText(lang, kind === 'reset' ? 'resetBody' : 'verifyBody', { code });
    await mailer.send({ to, subject, text });
  };

  // Step 1: choose email + password. The email is reserved only after it is verified.
  router.post('/register', json, auth, async (req, res) => {
    const now = clock.now();
    if (!mailer.available) return fail(res, 503, 'email_unavailable');
    const email = normalizeEmail(req.body?.email);
    if (!isEmail(email)) return fail(res, 400, 'bad_email');
    const problem = passwordProblem(req.body?.password, email);
    if (problem) return fail(res, 400, problem);
    if (req.account.registered) return fail(res, 409, 'already_registered');
    const taken = await db.query('select 1 from accounts where email = $1 and id <> $2 and email_verified_at is not null', [email, req.account.id]);
    if (taken.rowCount) return fail(res, 409, 'email_in_use');
    if (!codesByAccount.allow(req.account.id, now)) return fail(res, 429, 'rate_limited');
    const passwordHash = await hashPassword(req.body.password);
    const code = await db.tx(async (t) => {
      await t.query('update accounts set password_hash = $2, password_changed_at = $3 where id = $1', [req.account.id, passwordHash, ts(now)]);
      return createCode(t, { accountId: req.account.id, purpose: 'verify_email', target: email, now, fixedCode: devFixedCode });
    });
    await sendCode(email, 'verify', code, langOf(req));
    res.json({ ok: true, verification: 'sent', email, ...(devFixedCode ? { testCode: devFixedCode } : {}) });
  });

  router.post('/resend', json, auth, async (req, res) => {
    const now = clock.now();
    if (!mailer.available) return fail(res, 503, 'email_unavailable');
    const r = await db.query("select target from verification_codes where account_id = $1 and purpose = 'verify_email' order by created_at desc limit 1", [req.account.id]);
    const target = r.rows[0]?.target;
    if (!target || req.account.registered) return fail(res, 409, 'nothing_to_verify');
    if (!codesByAccount.allow(req.account.id, now)) return fail(res, 429, 'rate_limited');
    const code = await db.tx((t) => createCode(t, { accountId: req.account.id, purpose: 'verify_email', target, now, fixedCode: devFixedCode }));
    await sendCode(target, 'verify', code, langOf(req));
    res.json({ ok: true, verification: 'sent', ...(devFixedCode ? { testCode: devFixedCode } : {}) });
  });

  // Step 2: the code from the email. The account becomes "registered".
  router.post('/verify-email', json, auth, async (req, res) => {
    const now = clock.now();
    const result = await db.tx(async (t) => {
      const checked = await consumeCode(t, { accountId: req.account.id, purpose: 'verify_email', code: req.body?.code, now });
      if (!checked.ok) return checked;
      try {
        await t.query('update accounts set email = $2, email_verified_at = $3 where id = $1', [req.account.id, checked.target, ts(now)]);
      } catch (e) {
        if (e.code === PG.UNIQUE) return { ok: false, error: 'email_in_use' };
        throw e;
      }
      await audit(t, { actorId: req.account.id, actorRole: 'user', action: 'account.registered', targetType: 'account', targetId: req.account.id });
      return { ok: true, email: checked.target };
    });
    if (!result.ok) return fail(res, result.error === 'email_in_use' ? 409 : 400, result.error, result.attemptsLeft !== undefined ? { attemptsLeft: result.attemptsLeft } : {});
    res.json({ ok: true, registered: true, email: result.email });
  });

  router.post('/login', json, async (req, res) => {
    const now = clock.now();
    if (!loginByIp.allow(req.ip, now)) return fail(res, 429, 'rate_limited');
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const r = await db.query('select * from accounts where email = $1 and email_verified_at is not null', [email]);
    const row = r.rows[0];
    if (row && row.locked_until && ms(row.locked_until) > now) return fail(res, 429, 'account_locked', { retryAt: ms(row.locked_until) });
    // Hash even when the account doesn't exist, so timing doesn't reveal it.
    const ok = row?.password_hash ? await verifyPassword(password, row.password_hash) : (await hashPassword(password), false);
    if (!ok) {
      if (row) {
        const failures = row.failed_logins + 1;
        await db.query('update accounts set failed_logins = $2, locked_until = $3 where id = $1', [row.id, failures >= LOCK_AFTER ? 0 : failures, failures >= LOCK_AFTER ? ts(now + LOCK_FOR) : null]);
      }
      return fail(res, 401, 'invalid_credentials');
    }
    if (row.status !== 'active') return fail(res, 403, 'account_suspended');
    const token = newToken();
    await db.tx(async (t) => {
      await t.query('update accounts set failed_logins = 0, locked_until = null, last_seen_at = $2 where id = $1', [row.id, ts(now)]);
      await insertSession(t, { accountId: row.id, token, kind: 'password', now, userAgent: req.get('user-agent') });
    });
    res.json({ accountId: row.id, token });
  });

  router.post('/logout', auth, async (req, res) => {
    await revokeSession(db, req.account.sessionId, clock.now());
    res.json({ ok: true });
  });

  // Always answers the same way, whether or not the email has an account.
  router.post('/password/forgot', json, async (req, res) => {
    const now = clock.now();
    if (!forgotByIp.allow(req.ip, now)) return fail(res, 429, 'rate_limited');
    if (!mailer.available) return fail(res, 503, 'email_unavailable');
    const email = normalizeEmail(req.body?.email);
    const r = await db.query('select id from accounts where email = $1 and email_verified_at is not null', [email]);
    const id = r.rows[0]?.id;
    if (id && codesByAccount.allow(id, now)) {
      const code = await db.tx((t) => createCode(t, { accountId: id, purpose: 'reset_password', target: email, now, fixedCode: devFixedCode }));
      await sendCode(email, 'reset', code, langOf(req));
    }
    res.json({ ok: true, ...(devFixedCode ? { testCode: devFixedCode } : {}) });
  });

  router.post('/password/reset', json, async (req, res) => {
    const now = clock.now();
    if (!forgotByIp.allow(req.ip, now)) return fail(res, 429, 'rate_limited');
    const email = normalizeEmail(req.body?.email);
    const problem = passwordProblem(req.body?.password, email);
    if (problem) return fail(res, 400, problem);
    const r = await db.query('select id from accounts where email = $1 and email_verified_at is not null', [email]);
    const id = r.rows[0]?.id;
    if (!id) return fail(res, 400, 'code_wrong');
    const passwordHash = await hashPassword(req.body.password);
    const token = newToken();
    const result = await db.tx(async (t) => {
      const checked = await consumeCode(t, { accountId: id, purpose: 'reset_password', code: req.body?.code, now });
      if (!checked.ok) return checked;
      await t.query('update accounts set password_hash = $2, password_changed_at = $3, failed_logins = 0, locked_until = null where id = $1', [id, passwordHash, ts(now)]);
      await t.query('update sessions set revoked_at = $2 where account_id = $1 and revoked_at is null', [id, ts(now)]);
      await insertSession(t, { accountId: id, token, kind: 'password', now, userAgent: req.get('user-agent') });
      await audit(t, { actorId: id, actorRole: 'user', action: 'account.password_reset', targetType: 'account', targetId: id });
      return { ok: true };
    });
    if (!result.ok) return fail(res, 400, result.error);
    res.json({ accountId: id, token });
  });

  router.post('/password/change', json, auth, async (req, res) => {
    const now = clock.now();
    if (!req.account.registered) return fail(res, 403, 'registration_required');
    const r = await db.query('select password_hash, email from accounts where id = $1', [req.account.id]);
    if (!(await verifyPassword(req.body?.current, r.rows[0].password_hash))) return fail(res, 401, 'invalid_credentials');
    const problem = passwordProblem(req.body?.password, r.rows[0].email);
    if (problem) return fail(res, 400, problem);
    const passwordHash = await hashPassword(req.body.password);
    await db.tx(async (t) => {
      await t.query('update accounts set password_hash = $2, password_changed_at = $3 where id = $1', [req.account.id, passwordHash, ts(now)]);
      await t.query('update sessions set revoked_at = $3 where account_id = $1 and id <> $2 and revoked_at is null', [req.account.id, req.account.sessionId, ts(now)]);
    });
    res.json({ ok: true });
  });

  router.get('/sessions', auth, async (req, res) => {
    const r = await db.query('select id, kind, created_at, last_used_at, user_agent from sessions where account_id = $1 and revoked_at is null order by last_used_at desc', [req.account.id]);
    res.json({
      sessions: r.rows.map((s) => ({ id: s.id, kind: s.kind, createdAt: ms(s.created_at), lastUsedAt: ms(s.last_used_at), device: s.user_agent || null, current: s.id === req.account.sessionId })),
    });
  });

  router.delete('/sessions/:id', auth, async (req, res) => {
    const r = await db.query('update sessions set revoked_at = $3 where id = $1 and account_id = $2 and revoked_at is null', [req.params.id, req.account.id, ts(clock.now())]);
    if (!r.rowCount) return fail(res, 404, 'not_found');
    res.json({ ok: true });
  });

  return router;
}
