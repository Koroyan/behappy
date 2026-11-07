// Accounts in the staff tools.
//
// Staff see account basics (contact details masked unless users.contact),
// entitlements, payment counts, community standing, professional status and
// coarse usage totals. Never journal entries, Anulia conversations,
// assessments, safety plans or messages: most of that never leaves the
// person's device, and the rest is not reachable from here.
//
// No impersonation and no way to set or see a password: staff can only send
// the normal password-reset email to the verified address.

import crypto from 'node:crypto';

import express from 'express';

import { analyticsFor } from '../analytics/index.mjs';
import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { communityFor } from '../community/index.mjs';
import { ms, ts } from '../db/index.mjs';
import { computeEntitlements, entitlementsForAccount } from '../entitlements.mjs';
import { createCode } from '../identity.mjs';
import { runAccountDeletionHooks } from '../lifecycle.mjs';
import { mailText } from '../notify/mailer.mjs';
import { ordersForAccount } from '../orders.mjs';
import { hasStaffRole, permissionsFor, primaryRole } from './permissions.mjs';
import { handle, StaffError, staffFor } from './staff.mjs';

const DAY = 24 * 60 * 60 * 1000;
const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};

export function maskEmail(email) {
  if (!email) return null;
  const [user, domain] = String(email).split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}***@${domain}`;
}

const needReason = (reason, min = 3) => {
  const why = String(reason || '').trim();
  if (why.length < min) fail(400, 'reason_required');
  return why.slice(0, 500);
};

export function createUsersAdmin(deps) {
  const { db, clock, config } = deps;
  const analytics = analyticsFor(deps);

  const contactFor = (viewer) => permissionsFor(viewer.roles).has('users.contact');
  const emailFor = (viewer, email) => (contactFor(viewer) ? email || null : maskEmail(email));

  async function list(viewer, query) {
    const limit = Math.max(1, Math.min(Number(query.limit) || 50, 200));
    const q = String(query.q || '').trim().slice(0, 100);
    const params = [];
    const where = [];
    const add = (sql, v) => {
      params.push(v);
      where.push(sql.split('?').join(`$${params.length}`));
    };
    if (q) {
      if (/^acc_[a-f0-9]{24}$/.test(q)) add('a.id = ?', q);
      else {
        params.push(`%${q.split('%').join('').split('_').join('')}%`);
        const i = params.length;
        where.push(`(a.email ilike $${i} or p.pseudonym ilike $${i} or pp.public_name ilike $${i})`);
      }
    }
    if (query.status === 'suspended') where.push("a.status = 'suspended'");
    if (query.status === 'active') where.push("a.status = 'active'");
    if (query.registered === 'yes') where.push('a.email_verified_at is not null and a.password_hash is not null');
    if (query.registered === 'no') where.push('(a.email_verified_at is null or a.password_hash is null)');
    if (query.staff === 'yes') where.push('cardinality(a.roles) > 0');
    if (query.professional === 'yes') where.push('pp.id is not null');
    if (query.cursor) {
      const [c, id] = String(query.cursor).split('~');
      if (Number(c) > 0 && id) {
        params.push(ts(Number(c)), id);
        where.push(`(a.created_at, a.id) < ($${params.length - 1}, $${params.length})`);
      }
    }
    params.push(limit + 1);
    const r = await db.query(
      `select a.id, a.email, a.email_verified_at, a.password_hash is not null as has_password, a.roles, a.status, a.created_at, a.last_seen_at,
              p.pseudonym, pp.id as pro_id, pp.status as pro_status
       from accounts a
       left join community_profiles p on p.account_id = a.id
       left join professional_profiles pp on pp.account_id = a.id
       ${where.length ? `where ${where.join(' and ')}` : ''}
       order by a.created_at desc, a.id desc limit $${params.length}`,
      params
    );
    const rows = r.rows.slice(0, limit);
    const now = clock.now();
    const out = [];
    for (const x of rows) {
      const ent = await entitlementsForAccount(db, x.id, now);
      out.push({
        id: x.id,
        email: emailFor(viewer, x.email),
        registered: Boolean(x.email_verified_at && x.has_password),
        status: x.status,
        staffRoles: x.roles,
        tier: ent.tier,
        pseudonym: x.pseudonym || null,
        professional: x.pro_id ? { id: x.pro_id, status: x.pro_status } : null,
        createdAt: ms(x.created_at),
        lastSeenAt: ms(x.last_seen_at),
      });
    }
    const last = rows[rows.length - 1];
    return { users: out, nextCursor: r.rows.length > limit && last ? `${ms(last.created_at)}~${last.id}` : null, contactVisible: contactFor(viewer) };
  }

  async function detail(viewer, id) {
    const r = await db.query('select * from accounts where id = $1', [id]);
    const a = r.rows[0];
    if (!a) fail(404, 'not_found');
    const now = clock.now();
    const q1 = (sql, p = [id]) => db.query(sql, p).then((x) => x.rows);
    const [sessions, orders, grants, community, suspension, pro, bookings, ai, tickets, actions] = await Promise.all([
      q1("select kind, count(*)::int as n, max(last_used_at) as last from sessions where account_id = $1 and revoked_at is null and expires_at > now() group by kind"),
      ordersForAccount(db, id),
      q1('select id, days, starts_at, reason, granted_by, created_at, revoked_at from entitlement_grants where account_id = $1 order by id desc'),
      q1(`select p.pseudonym, p.created_at,
            (select count(*)::int from room_memberships m where m.account_id = p.account_id) as rooms,
            (select count(*)::int from community_messages c where c.author_account_id = p.account_id) as messages,
            (select count(*)::int from reports rp where rp.target_account_id = p.account_id) as reports_against
          from community_profiles p where p.account_id = $1`),
      q1('select id, scope, kind, reason, starts_at, ends_at from suspensions where account_id = $1 and lifted_at is null and (ends_at is null or ends_at > now()) order by starts_at desc limit 1'),
      q1('select id, status, public_name, verification_expires_at from professional_profiles where account_id = $1'),
      q1("select count(*)::int as total, count(*) filter (where status = 'confirmed')::int as confirmed from bookings where client_account_id = $1"),
      q1("select feature, count(*)::int as calls from ai_usage where account_id = $1 and created_at > $2 group by feature", [id, ts(now - 30 * DAY)]),
      q1('select id, category, status, created_at from support_tickets where account_id = $1 order by created_at desc limit 10'),
      q1("select action, actor_role, created_at, metadata from audit_log where target_type = 'account' and target_id = $1 order by id desc limit 30"),
    ]);
    const ent = computeEntitlements(
      [...orders, ...grants.filter((g) => !g.revoked_at).map((g) => ({ id: `grant_${g.id}`, status: 'approved', approvedAt: ms(g.starts_at), productKind: 'plus', durationDays: g.days }))],
      now
    );
    const paid = orders.filter((o) => o.status === 'approved' || o.status === 'reversed' || o.status === 'partially_reversed');
    return {
      user: {
        id: a.id,
        email: emailFor(viewer, a.email),
        emailVerified: Boolean(a.email_verified_at),
        registered: Boolean(a.email && a.email_verified_at && a.password_hash),
        status: a.status,
        suspendedAt: ms(a.suspended_at),
        suspensionReason: a.suspension_reason || null,
        staffRoles: a.roles,
        createdAt: ms(a.created_at),
        lastSeenAt: ms(a.last_seen_at),
        lockedUntil: ms(a.locked_until),
        analyticsOptOut: Boolean(a.analytics_opt_out),
      },
      sessions: sessions.map((s) => ({ kind: s.kind, count: s.n, lastUsedAt: ms(s.last) })),
      entitlements: ent,
      payments: { mode: 'test', approved: paid.length, refunded: orders.filter((o) => o.status === 'reversed' || o.status === 'partially_reversed').length, lastAt: paid.length ? Math.max(...paid.map((o) => o.approvedAt || 0)) : null },
      grants: grants.map((g) => ({ id: Number(g.id), days: g.days, startsAt: ms(g.starts_at), reason: g.reason, grantedBy: g.granted_by, createdAt: ms(g.created_at), revokedAt: ms(g.revoked_at) })),
      community: community[0]
        ? { pseudonym: community[0].pseudonym, since: ms(community[0].created_at), rooms: community[0].rooms, messages: community[0].messages, reportsAgainst: community[0].reports_against, suspension: suspension[0] ? { id: Number(suspension[0].id), scope: suspension[0].scope, kind: suspension[0].kind, reason: suspension[0].reason, endsAt: ms(suspension[0].ends_at) } : null }
        : null,
      professional: pro[0] ? { id: pro[0].id, status: pro[0].status, publicName: pro[0].public_name, verificationExpiresAt: ms(pro[0].verification_expires_at) } : null,
      bookingsAsClient: bookings[0],
      aiCalls30d: ai.map((x) => ({ feature: x.feature, calls: x.calls })),
      usage: a.analytics_opt_out ? { optedOut: true } : await analytics.usageFor(id, 30),
      supportTickets: tickets.map((t) => ({ id: t.id, category: t.category, status: t.status, createdAt: ms(t.created_at) })),
      history: actions.map((h) => ({ action: h.action, actorRole: h.actor_role, at: ms(h.created_at), reason: h.metadata?.reason || null })),
      privacyNote: 'Journal entries, Anulia conversations, assessments and safety plans are not available here.',
    };
  }

  const record = (t, actor, action, targetId, metadata) => audit(t, { actorId: actor.id, actorRole: primaryRole(actor.roles), action, targetType: 'account', targetId, metadata });

  async function guardTarget(actor, id) {
    if (id === actor.id) fail(403, 'not_on_yourself');
    const r = await db.query('select id, email, email_verified_at, roles, status from accounts where id = $1', [id]);
    if (!r.rows[0]) fail(404, 'not_found');
    return r.rows[0];
  }

  async function setSuspended(actor, id, suspend, reason) {
    const why = needReason(reason);
    const target = await guardTarget(actor, id);
    if (suspend && hasStaffRole(target) && !actor.roles.includes('owner')) fail(403, 'staff_account');
    await db.tx(async (t) => {
      await t.query('update accounts set status = $2, suspended_at = $3, suspended_by = $4, suspension_reason = $5 where id = $1', [id, suspend ? 'suspended' : 'active', suspend ? ts(clock.now()) : null, suspend ? actor.id : null, suspend ? why : null]);
      await record(t, actor, suspend ? 'account.suspended' : 'account.reinstated', id, { reason: why });
    });
    if (suspend) await Promise.resolve(deps.realtime?.disconnect(id)).catch(() => {});
    return { ok: true, status: suspend ? 'suspended' : 'active' };
  }

  async function restrictPosting(actor, id, { hours, reason }) {
    const why = needReason(reason);
    await guardTarget(actor, id);
    const h = Math.round(Number(hours));
    if (!Number.isFinite(h) || h < 1 || h > 24 * 90) fail(400, 'bad_hours');
    const now = clock.now();
    await db.tx(async (t) => {
      await t.query("insert into suspensions (account_id, scope, kind, reason, starts_at, ends_at, created_by) values ($1, 'community', 'temporary', $2, $3, $4, $5)", [id, why, ts(now), ts(now + h * 3600 * 1000), actor.id]);
      await record(t, actor, 'account.posting_restricted', id, { hours: h, reason: why });
    });
    communityFor(deps).bus.emit('suspended', { accountId: id });
    return { ok: true, until: now + h * 3600 * 1000 };
  }

  async function revokeSessions(actor, id, reason) {
    const why = needReason(reason);
    await guardTarget(actor, id);
    const r = await db.query('update sessions set revoked_at = $2 where account_id = $1 and revoked_at is null', [id, ts(clock.now())]);
    await record(db, actor, 'account.sessions_revoked', id, { count: r.rowCount, reason: why });
    await Promise.resolve(deps.realtime?.disconnect(id)).catch(() => {});
    return { ok: true, revoked: r.rowCount };
  }

  async function sendPasswordReset(actor, id, reason) {
    const why = needReason(reason);
    const target = await guardTarget(actor, id);
    if (!target.email || !target.email_verified_at) fail(409, 'no_verified_email');
    if (!deps.mailer?.available) fail(503, 'email_unavailable');
    const now = clock.now();
    const fixed = config.devTools && !config.isProduction ? config.devFixedCode || null : null;
    const code = await db.tx(async (t) => {
      const c = await createCode(t, { accountId: id, purpose: 'reset_password', target: target.email, now, fixedCode: fixed });
      await record(t, actor, 'account.password_reset_email', id, { reason: why });
      return c;
    });
    // The code goes only to the person's own verified address; staff never see it.
    await deps.mailer.send({ to: target.email, subject: mailText('en', 'resetSubject', { code }), text: mailText('en', 'resetBody', { code }) });
    return { ok: true, sentTo: maskEmail(target.email) };
  }

  async function grantPlus(actor, id, { days, reason }) {
    const why = needReason(reason);
    await guardTarget(actor, id);
    const n = Math.round(Number(days));
    if (!Number.isFinite(n) || n < 1 || n > 366) fail(400, 'bad_days');
    const now = clock.now();
    const r = await db.tx(async (t) => {
      const g = await t.query("insert into entitlement_grants (account_id, kind, days, starts_at, reason, granted_by) values ($1, 'plus', $2, $3, $4, $5) returning id", [id, n, ts(now), why, actor.id]);
      await record(t, actor, 'entitlement.granted', id, { kind: 'plus', days: n, reason: why, complimentary: true });
      return g.rows[0].id;
    });
    return { ok: true, grantId: Number(r), entitlements: await entitlementsForAccount(db, id, now) };
  }

  async function revokeGrant(actor, id, grantId, reason) {
    const why = needReason(reason);
    await guardTarget(actor, id);
    const r = await db.query('update entitlement_grants set revoked_at = $3, revoked_by = $4, revoke_reason = $5 where id = $1 and account_id = $2 and revoked_at is null returning id', [Number(grantId), id, ts(clock.now()), actor.id, why]);
    if (!r.rowCount) fail(404, 'not_found');
    await record(db, actor, 'entitlement.revoked', id, { grantId: Number(grantId), reason: why });
    return { ok: true, entitlements: await entitlementsForAccount(db, id, clock.now()) };
  }

  /** Deletes an account the way the person's own "Delete account" does (hard to undo: confirmed by typing the email). */
  async function deleteAccount(actor, id, { reason, confirmEmail }) {
    const why = needReason(reason, 10);
    const target = await guardTarget(actor, id);
    if (hasStaffRole(target)) fail(409, 'staff_account');
    if (!target.email || String(confirmEmail || '').trim().toLowerCase() !== String(target.email).toLowerCase()) fail(400, 'confirmation_mismatch');
    const now = clock.now();
    const hashed = crypto.createHash('sha256').update(id).digest('hex').slice(0, 16);
    await db.tx(async (t) => {
      await t.query('update orders set account_deleted = true where account_id = $1', [id]);
      await runAccountDeletionHooks(t, id, now);
      await t.query('delete from accounts where id = $1', [id]);
      await audit(t, { actorId: actor.id, actorRole: primaryRole(actor.roles), action: 'account.deleted_by_staff', targetType: 'account', targetId: hashed, metadata: { reason: why } });
    });
    await Promise.resolve(deps.realtime?.disconnect(id)).catch(() => {});
    return { ok: true };
  }

  async function exportCsv(viewer) {
    const r = await db.query('select id, email, email_verified_at, password_hash is not null as has_password, status, created_at, last_seen_at, cardinality(roles) > 0 as staff from accounts order by created_at');
    const contact = contactFor(viewer);
    const lines = [`account_id,${contact ? 'email,' : ''}registered,status,staff,created_at,last_seen_at`];
    for (const x of r.rows) {
      const cells = [x.id, ...(contact ? [x.email || ''] : []), x.email_verified_at && x.has_password ? 'yes' : 'no', x.status, x.staff ? 'yes' : 'no', new Date(x.created_at).toISOString(), new Date(x.last_seen_at).toISOString()];
      lines.push(cells.map((c) => (/[",]/.test(String(c)) ? `"${String(c).split('"').join('""')}"` : c)).join(','));
    }
    await audit(db, { actorId: viewer.id, actorRole: primaryRole(viewer.roles), action: 'accounts.exported', targetType: 'accounts', targetId: 'all', metadata: { rows: r.rowCount, withEmail: contact } });
    return lines.join(String.fromCharCode(10)) + String.fromCharCode(10);
  }

  return { list, detail, setSuspended, restrictPosting, revokeSessions, sendPasswordReset, grantPlus, revokeGrant, deleteAccount, exportCsv };
}

export function mountUsersAdmin(app, deps) {
  const users = createUsersAdmin(deps);
  const staff = staffFor(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '32kb' });
  const can = (p) => [json, auth, staff.guard(p)];
  const r = express.Router();
  r.get('/users', ...can('users.view'), handle((req) => users.list(req.account, req.query)));
  r.get('/users/export', ...can('users.export'), handle(async (req, res) => {
    const csv = await users.exportCsv(req.account);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="behappy-accounts.csv"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(csv);
  }));
  r.get('/users/:id', ...can('users.view'), handle((req) => users.detail(req.account, req.params.id)));
  r.post('/users/:id/suspend', ...can('users.manage'), handle((req) => users.setSuspended(req.account, req.params.id, true, req.body?.reason)));
  r.post('/users/:id/reinstate', ...can('users.manage'), handle((req) => users.setSuspended(req.account, req.params.id, false, req.body?.reason)));
  r.post('/users/:id/restrict-posting', ...can('users.manage'), handle((req) => users.restrictPosting(req.account, req.params.id, req.body || {})));
  r.post('/users/:id/sessions/revoke', ...can('users.sessions'), handle((req) => users.revokeSessions(req.account, req.params.id, req.body?.reason)));
  r.post('/users/:id/password-reset', ...can('users.sessions'), handle((req) => users.sendPasswordReset(req.account, req.params.id, req.body?.reason)));
  r.post('/users/:id/grants', ...can('users.entitlements'), handle((req) => users.grantPlus(req.account, req.params.id, req.body || {})));
  r.post('/users/:id/grants/:grantId/revoke', ...can('users.entitlements'), handle((req) => users.revokeGrant(req.account, req.params.id, req.params.grantId, req.body?.reason)));
  r.post('/users/:id/delete', ...can('users.deletion'), handle((req) => users.deleteAccount(req.account, req.params.id, req.body || {})));
  app.use('/api/admin', r);
}
