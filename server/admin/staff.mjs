// The gate in front of every staff endpoint, plus step-up confirmation,
// two-step sign-in codes and staff management.
//
// guard(permission) checks, on every request: a staff role that grants the
// permission, a password session (not a copied device token), an active
// account, staff access not suspended, the two-step code when it is on (or
// required), and for sensitive permissions a fresh confirmation (password,
// plus the code when two-step is on) within the last few minutes.
//
// There is no impersonation, no way to set someone else's password, and no
// permission that opens journals, conversations, assessments or notes.

import express from 'express';

import { audit } from '../audit.mjs';
import { ms, ts } from '../db/index.mjs';
import { verifyPassword } from '../identity.mjs';
import { hasStaffRole, isStaffRole, PERMISSIONS, permissionsFor, primaryRole, ROLE_PERMISSIONS, STAFF_ROLES, STEP_UP_PERMISSIONS } from './permissions.mjs';
import { settingsFor } from './settings.mjs';
import { newSecret, otpauthUrl, verifyTotp } from './totp.mjs';

const MINUTE = 60 * 1000;

export class StaffError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};

/** Express wrapper: JSON results, StaffError/known errors as status + code. */
export const handle = (fn) => async (req, res, next) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined && !res.headersSent) res.json(out);
  } catch (e) {
    if (e?.status && e?.code && e.status < 600) return res.status(e.status).json({ error: e.code, ...(e.extra || {}) });
    next(e);
  }
};

class Attempts {
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;
    this.map = new Map();
  }
  allow(key, now) {
    const list = (this.map.get(key) || []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.max) {
      this.map.set(key, list);
      return false;
    }
    list.push(now);
    this.map.set(key, list);
    return true;
  }
}

export function createStaff(deps) {
  const { db, clock } = deps;
  const settings = settingsFor(deps);
  const stepUpAttempts = new Attempts(6, 15 * MINUTE);

  async function recordEvent(kind, { accountId = null, ip = null, metadata = {} } = {}) {
    const ipHash = ip && deps.crypto ? deps.crypto.hmac(`ip:${ip}`).slice(0, 24) : null;
    await db.query('insert into auth_events (account_id, kind, ip_hash, metadata, created_at) values ($1, $2, $3, $4::jsonb, $5)', [accountId, kind, ipHash, JSON.stringify(metadata || {}), ts(clock.now())]);
  }

  async function mfaRow(q, accountId) {
    const r = await q.query('select * from staff_mfa where account_id = $1', [accountId]);
    return r.rows[0] || null;
  }

  const secretOf = (row) => deps.crypto.decryptText('messages', { ciphertext: row.secret_ciphertext, iv: row.secret_iv, tag: row.secret_tag });

  async function mfaState(account) {
    const row = await mfaRow(db, account.id);
    return { enabled: Boolean(row?.enabled_at), required: Boolean(await settings.get('staff.mfaRequired')), verified: Boolean(account.mfaAt) };
  }

  async function stepUpMinutes() {
    return Number(await settings.get('staff.stepUpMinutes')) || 15;
  }

  async function stepUpUntil(account) {
    if (!account.stepUpAt) return null;
    const until = account.stepUpAt + (await stepUpMinutes()) * MINUTE;
    return until > clock.now() ? until : null;
  }

  /** Any staff role, password session, active, not suspended. No MFA requirement (so people can enrol). */
  function baseCheck(a) {
    if (!a) return { status: 401, error: 'unauthorized' };
    if (!hasStaffRole(a)) return { status: 403, error: 'forbidden' };
    if (!a.registered || a.sessionKind !== 'password') return { status: 403, error: 'password_session_required', message: 'Sign in with your email and password to use staff tools.' };
    if (a.status !== 'active') return { status: 403, error: 'account_suspended' };
    if (a.staffSuspendedAt) return { status: 403, error: 'staff_suspended' };
    return null;
  }

  const base = (req, res, next) => {
    const problem = baseCheck(req.account);
    if (problem) return res.status(problem.status).json(problem.status === 401 ? { error: problem.error } : { error: problem.error, ...(problem.message ? { message: problem.message } : {}) });
    req.account.primaryRole = primaryRole(req.account.roles);
    req.account.permissions = permissionsFor(req.account.roles);
    next();
  };

  /** The permission gate. Sensitive permissions also need a fresh confirmation. */
  function guard(permission, { stepUp } = {}) {
    if (!PERMISSIONS[permission]) throw new Error(`Unknown permission ${permission}`);
    const needsStepUp = stepUp ?? STEP_UP_PERMISSIONS.has(permission);
    return async (req, res, next) => {
      try {
        const a = req.account;
        if (!a) return res.status(401).json({ error: 'unauthorized' });
        if (!permissionsFor(a.roles).has(permission)) return res.status(403).json({ error: 'forbidden', permission });
        const problem = baseCheck(a);
        if (problem) return res.status(problem.status).json({ error: problem.error, ...(problem.message ? { message: problem.message } : {}) });
        const mfa = await mfaState(a);
        if (mfa.required && !mfa.enabled) return res.status(403).json({ error: 'mfa_setup_required' });
        if (mfa.enabled && !mfa.verified) return res.status(403).json({ error: 'mfa_code_required' });
        if (needsStepUp && !(await stepUpUntil(a))) return res.status(403).json({ error: 'step_up_required', permission });
        a.primaryRole = primaryRole(a.roles);
        a.permissions = permissionsFor(a.roles);
        next();
      } catch (e) {
        next(e);
      }
    };
  }

  /** Re-confirm the password (and the code when two-step is on) for this session. */
  async function stepUp(account, { password, code }, ip) {
    const now = clock.now();
    if (!stepUpAttempts.allow(account.id, now)) {
      await recordEvent('step_up_rate_limited', { accountId: account.id, ip });
      fail(429, 'rate_limited');
    }
    const r = await db.query('select password_hash from accounts where id = $1', [account.id]);
    const okPassword = await verifyPassword(String(password || ''), r.rows[0]?.password_hash);
    const row = await mfaRow(db, account.id);
    let step = null;
    if (row?.enabled_at) {
      step = verifyTotp(secretOf(row), code, now);
      if (step !== null && step <= Number(row.last_used_step)) step = null;
    }
    if (!okPassword || (row?.enabled_at && step === null)) {
      await recordEvent('step_up_failed', { accountId: account.id, ip, metadata: { reason: okPassword ? 'code' : 'password' } });
      fail(401, okPassword ? 'code_wrong' : 'invalid_credentials');
    }
    await db.tx(async (t) => {
      await t.query('update sessions set step_up_at = $2, mfa_at = case when $3::boolean then $2 else mfa_at end where id = $1', [account.sessionId, ts(now), step !== null]);
      if (step !== null) await t.query('update staff_mfa set last_used_step = $2 where account_id = $1', [account.id, step]);
    });
    await recordEvent('step_up_ok', { accountId: account.id, ip });
    return { ok: true, validUntil: now + (await stepUpMinutes()) * MINUTE };
  }

  /** Enter the two-step code once per session to open staff tools. */
  async function verifyMfa(account, code, ip) {
    const now = clock.now();
    if (!stepUpAttempts.allow(account.id, now)) fail(429, 'rate_limited');
    const row = await mfaRow(db, account.id);
    if (!row?.enabled_at) fail(409, 'mfa_not_enabled');
    const step = verifyTotp(secretOf(row), code, now);
    if (step === null || step <= Number(row.last_used_step)) {
      await recordEvent('mfa_failed', { accountId: account.id, ip });
      fail(401, 'code_wrong');
    }
    await db.tx(async (t) => {
      await t.query('update sessions set mfa_at = $2 where id = $1', [account.sessionId, ts(now)]);
      await t.query('update staff_mfa set last_used_step = $2 where account_id = $1', [account.id, step]);
    });
    await recordEvent('mfa_ok', { accountId: account.id, ip });
    return { ok: true };
  }

  async function mfaSetup(account) {
    if (!(await stepUpUntil(account))) fail(403, 'step_up_required');
    const existing = await mfaRow(db, account.id);
    if (existing?.enabled_at) fail(409, 'mfa_already_enabled');
    const secret = newSecret();
    const enc = deps.crypto.encrypt('messages', secret);
    await db.query(
      `insert into staff_mfa (account_id, secret_ciphertext, secret_iv, secret_tag, created_at) values ($1, $2, $3, $4, $5)
       on conflict (account_id) do update set secret_ciphertext = excluded.secret_ciphertext, secret_iv = excluded.secret_iv, secret_tag = excluded.secret_tag, enabled_at = null, last_used_step = 0, created_at = excluded.created_at`,
      [account.id, enc.ciphertext, enc.iv, enc.tag, ts(clock.now())]
    );
    // Shown once, for the authenticator app; never logged.
    return { secret, otpauthUrl: otpauthUrl({ secret, label: account.email || account.id }) };
  }

  async function mfaEnable(account, code, ip) {
    const now = clock.now();
    const row = await mfaRow(db, account.id);
    if (!row) fail(409, 'mfa_not_set_up');
    if (row.enabled_at) fail(409, 'mfa_already_enabled');
    const step = verifyTotp(secretOf(row), code, now);
    if (step === null) fail(401, 'code_wrong');
    await db.tx(async (t) => {
      await t.query('update staff_mfa set enabled_at = $2, last_used_step = $3 where account_id = $1', [account.id, ts(now), step]);
      await t.query('update sessions set mfa_at = $2 where id = $1', [account.sessionId, ts(now)]);
      await audit(t, { actorId: account.id, actorRole: primaryRole(account.roles), action: 'staff.mfa_enabled', targetType: 'account', targetId: account.id });
    });
    await recordEvent('mfa_enabled', { accountId: account.id, ip });
    return { ok: true };
  }

  async function mfaDisable(account, ip) {
    if (!(await stepUpUntil(account))) fail(403, 'step_up_required');
    if (await settings.get('staff.mfaRequired')) fail(409, 'mfa_required_by_policy');
    await db.tx(async (t) => {
      await t.query('delete from staff_mfa where account_id = $1', [account.id]);
      await audit(t, { actorId: account.id, actorRole: primaryRole(account.roles), action: 'staff.mfa_disabled', targetType: 'account', targetId: account.id });
    });
    await recordEvent('mfa_disabled', { accountId: account.id, ip });
    return { ok: true };
  }

  // ---------- Staff management (owner) ----------
  async function staffList() {
    const r = await db.query(
      `select a.id, a.email, a.roles, a.status, a.staff_suspended_at, a.staff_suspension_reason, a.last_seen_at, a.created_at, (m.enabled_at is not null) as mfa
       from accounts a left join staff_mfa m on m.account_id = a.id where cardinality(a.roles) > 0 order by a.created_at`
    );
    return r.rows.map((x) => ({
      id: x.id,
      email: x.email,
      roles: x.roles,
      primaryRole: primaryRole(x.roles),
      status: x.status,
      staffSuspendedAt: ms(x.staff_suspended_at),
      suspensionReason: x.staff_suspension_reason || null,
      mfaEnabled: Boolean(x.mfa),
      lastSeenAt: ms(x.last_seen_at),
      createdAt: ms(x.created_at),
    }));
  }

  const needReason = (reason) => {
    const why = String(reason || '').trim();
    if (why.length < 3) fail(400, 'reason_required');
    return why.slice(0, 300);
  };

  async function owners(q, exceptId) {
    const r = await q.query("select count(*)::int as n from accounts where 'owner' = any(roles) and staff_suspended_at is null and status = 'active' and id <> $1", [exceptId || '']);
    return r.rows[0].n;
  }

  async function changeRole(actor, { email, accountId, role, grant, reason }, ip) {
    if (!isStaffRole(role)) fail(400, 'bad_role');
    const why = needReason(reason);
    const out = await db.tx(async (t) => {
      const r = accountId
        ? await t.query('select id, email, roles, email_verified_at, password_hash from accounts where id = $1 for update', [String(accountId)])
        : await t.query('select id, email, roles, email_verified_at, password_hash from accounts where email = $1 for update', [String(email || '').trim().toLowerCase()]);
      const target = r.rows[0];
      if (!target || !target.email_verified_at || !target.password_hash) fail(404, 'not_found', { message: 'No registered account with this email.' });
      if (target.id === actor.id) fail(403, 'cannot_change_own_roles');
      if (!grant && role === 'owner' && (await owners(t, target.id)) < 1) fail(409, 'last_owner');
      const roles = grant ? [...new Set([...target.roles, role])] : target.roles.filter((x) => x !== role);
      await t.query('update accounts set roles = $2::text[] where id = $1', [target.id, roles]);
      await audit(t, { actorId: actor.id, actorRole: primaryRole(actor.roles), action: grant ? 'staff.role_granted' : 'staff.role_revoked', targetType: 'account', targetId: target.id, metadata: { role, reason: why } });
      return { ok: true, accountId: target.id, roles };
    });
    // Outside the transaction: PGlite has one connection, and the event uses it.
    await recordEvent(grant ? 'role_granted' : 'role_revoked', { accountId: out.accountId, ip, metadata: { role, by: actor.id } });
    return out;
  }

  async function setStaffSuspended(actor, accountId, suspend, reason) {
    const why = suspend ? needReason(reason) : String(reason || '').slice(0, 300);
    if (accountId === actor.id) fail(403, 'cannot_change_own_roles');
    return db.tx(async (t) => {
      const r = await t.query('select id, roles from accounts where id = $1 for update', [accountId]);
      const target = r.rows[0];
      if (!target || !hasStaffRole(target)) fail(404, 'not_found');
      if (suspend && target.roles.includes('owner') && (await owners(t, target.id)) < 1) fail(409, 'last_owner');
      await t.query('update accounts set staff_suspended_at = $2, staff_suspended_by = $3, staff_suspension_reason = $4 where id = $1', [accountId, suspend ? ts(clock.now()) : null, suspend ? actor.id : null, suspend ? why : null]);
      await audit(t, { actorId: actor.id, actorRole: primaryRole(actor.roles), action: suspend ? 'staff.suspended' : 'staff.reinstated', targetType: 'account', targetId: accountId, metadata: { reason: why } });
      return { ok: true };
    });
  }

  async function resetMfa(actor, accountId, reason) {
    const why = needReason(reason);
    if (accountId === actor.id) fail(403, 'cannot_change_own_roles');
    await db.tx(async (t) => {
      await t.query('delete from staff_mfa where account_id = $1', [accountId]);
      // Their open sessions must sign in again.
      await t.query('update sessions set revoked_at = $2 where account_id = $1 and revoked_at is null', [accountId, ts(clock.now())]);
      await audit(t, { actorId: actor.id, actorRole: primaryRole(actor.roles), action: 'staff.mfa_reset', targetType: 'account', targetId: accountId, metadata: { reason: why } });
    });
    await Promise.resolve(deps.realtime?.disconnect(accountId)).catch(() => {});
    return { ok: true };
  }

  async function revokeSessions(actor, accountId, reason) {
    const why = needReason(reason);
    const now = clock.now();
    const r = await db.query('update sessions set revoked_at = $2 where account_id = $1 and revoked_at is null', [accountId, ts(now)]);
    await audit(db, { actorId: actor.id, actorRole: primaryRole(actor.roles), action: 'account.sessions_revoked', targetType: 'account', targetId: accountId, metadata: { count: r.rowCount, reason: why } });
    await recordEvent('sessions_revoked', { accountId, metadata: { by: actor.id, count: r.rowCount } });
    await Promise.resolve(deps.realtime?.disconnect(accountId)).catch(() => {});
    return { ok: true, revoked: r.rowCount };
  }

  async function me(account) {
    const mfa = await mfaState(account);
    return {
      accountId: account.id,
      email: account.email,
      roles: account.roles.filter(isStaffRole),
      primaryRole: primaryRole(account.roles),
      permissions: [...permissionsFor(account.roles)].sort(),
      stepUp: { validUntil: await stepUpUntil(account), minutes: await stepUpMinutes() },
      mfa,
      mode: 'test',
    };
  }

  return { base, guard, stepUp, verifyMfa, mfaSetup, mfaEnable, mfaDisable, staffList, changeRole, setStaffSuspended, resetMfa, revokeSessions, recordEvent, me, stepUpUntil };
}

export function staffFor(deps) {
  deps.staff ||= createStaff(deps);
  return deps.staff;
}

/** /api/admin/me, step-up, two-step codes and staff management (mounted by the core app). */
export function staffRouter(deps, { auth }) {
  const staff = staffFor(deps);
  const r = express.Router();
  const json = express.json({ limit: '16kb' });
  const base = [json, auth, staff.base];
  const can = (permission) => [json, auth, staff.guard(permission)];
  r.get('/me', ...base, handle((req) => staff.me(req.account)));
  r.get('/roles', ...base, handle(() => ({ roles: STAFF_ROLES.map((role) => ({ role, permissions: ROLE_PERMISSIONS[role] })), permissions: PERMISSIONS })));
  r.post('/step-up', ...base, handle((req) => staff.stepUp(req.account, { password: req.body?.password, code: req.body?.code }, req.ip)));
  r.post('/mfa/verify', ...base, handle((req) => staff.verifyMfa(req.account, req.body?.code, req.ip)));
  r.post('/mfa/setup', ...base, handle((req) => staff.mfaSetup(req.account)));
  r.post('/mfa/enable', ...base, handle((req) => staff.mfaEnable(req.account, req.body?.code, req.ip)));
  r.post('/mfa/disable', ...base, handle((req) => staff.mfaDisable(req.account, req.ip)));

  r.get('/staff', ...can('staff.view'), handle(async () => ({ staff: await staff.staffList() })));
  r.post('/staff/roles', ...can('staff.manage'), handle((req) => staff.changeRole(req.account, { email: req.body?.email, accountId: req.body?.accountId, role: String(req.body?.role || ''), grant: req.body?.grant !== false, reason: req.body?.reason }, req.ip)));
  r.post('/staff/:id/suspend', ...can('staff.manage'), handle((req) => staff.setStaffSuspended(req.account, req.params.id, true, req.body?.reason)));
  r.post('/staff/:id/reinstate', ...can('staff.manage'), handle((req) => staff.setStaffSuspended(req.account, req.params.id, false, req.body?.reason)));
  r.post('/staff/:id/mfa/reset', ...can('staff.manage'), handle((req) => staff.resetMfa(req.account, req.params.id, req.body?.reason)));
  r.post('/staff/:id/sessions/revoke', ...can('security.manage'), handle((req) => staff.revokeSessions(req.account, req.params.id, req.body?.reason)));
  return r;
}
