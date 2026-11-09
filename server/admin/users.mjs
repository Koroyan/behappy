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

import { parseRange } from '../analytics/index.mjs';
import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { communityFor } from '../community/index.mjs';
import { ms, ts } from '../db/index.mjs';
import { computeEntitlements, entitlementsForAccount } from '../entitlements.mjs';
import { createCode } from '../identity.mjs';
import { runAccountDeletionHooks } from '../lifecycle.mjs';
import { mailText } from '../notify/mailer.mjs';
import { toOrder } from '../orders.mjs';
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
    // Plans for the whole page in two queries (orders and staff grants), not one per row.
    const ids = rows.map((x) => x.id);
    const [ordersAll, grantsAll] = ids.length ? await Promise.all([db.query('select * from orders where account_id = any($1::text[])', [ids]), db.query('select account_id, id, days, starts_at from entitlement_grants where account_id = any($1::text[]) and revoked_at is null', [ids])]) : [{ rows: [] }, { rows: [] }];
    const sourcesFor = (accountId) => [
      ...ordersAll.rows.filter((o) => o.account_id === accountId).map(toOrder),
      ...grantsAll.rows.filter((g) => g.account_id === accountId).map((g) => ({ id: `grant_${g.id}`, status: 'approved', approvedAt: ms(g.starts_at), productKind: 'plus', durationDays: g.days })),
    ];
    for (const x of rows) {
      const ent = computeEntitlements(sourcesFor(x.id), now);
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

  /** What this viewer may open on an account page (each tab is also checked by its own endpoint). */
  const tabsFor = (viewer) => {
    const p = permissionsFor(viewer.roles);
    return {
      overview: true,
      activity: p.has('users.activity.view'),
      transactions: p.has('users.transactions.view'),
      subscriptions: p.has('users.transactions.view'),
      appointments: p.has('users.appointments.view'),
      community: p.has('users.community.view'),
      support: p.has('support.view'),
      security: p.has('users.security.view'),
    };
  };

  async function loadAccount(id) {
    const r = await db.query('select * from accounts where id = $1', [id]);
    if (!r.rows[0]) fail(404, 'not_found');
    return r.rows[0];
  }

  /** Overview: account basics. Other tabs come from their own endpoints and permissions. */
  async function detail(viewer, id) {
    const a = await loadAccount(id);
    const now = clock.now();
    const q1 = (sql, p = [id]) => db.query(sql, p).then((x) => x.rows);
    const [sessions, pro, tickets, suspension, days] = await Promise.all([
      q1("select kind, count(*)::int as n, max(last_used_at) as last from sessions where account_id = $1 and revoked_at is null and expires_at > now() group by kind"),
      q1('select id, status, public_name, verification_expires_at from professional_profiles where account_id = $1'),
      q1("select count(*) filter (where status in ('open', 'waiting_on_staff', 'waiting_on_user'))::int as open, count(*)::int as total from support_tickets where account_id = $1"),
      q1("select id from suspensions where account_id = $1 and lifted_at is null and (ends_at is null or ends_at > now()) limit 1"),
      q1("select count(*)::int as days, coalesce(sum(sessions), 0)::int as sessions from analytics_daily where account_id = $1 and day >= $2", [id, new Date(now - 29 * DAY).toISOString().slice(0, 10)]),
    ]);
    const ent = await entitlementsForAccount(db, id, now);
    const tabs = tabsFor(viewer);
    return {
      tabs,
      user: {
        id: a.id,
        email: emailFor(viewer, a.email),
        emailVerified: Boolean(a.email_verified_at),
        registered: Boolean(a.email && a.email_verified_at && a.password_hash),
        type: a.roles?.length ? 'staff' : pro[0] ? 'professional' : a.email_verified_at && a.password_hash ? 'registered' : 'device',
        status: a.status,
        suspendedAt: ms(a.suspended_at),
        suspensionReason: a.suspension_reason || null,
        staffRoles: a.roles,
        createdAt: ms(a.created_at),
        lastSeenAt: ms(a.last_seen_at),
        lockedUntil: ms(a.locked_until),
        analyticsOptOut: Boolean(a.analytics_opt_out),
        // Preferred language is kept on the person's device, not on the server.
        language: null,
      },
      plan: { tier: ent.tier, plusExpiresAt: ent.plus.expiresAt, artProgram: ent.artProgram.owned },
      sessions: sessions.map((s) => ({ kind: s.kind, count: s.n, lastUsedAt: ms(s.last) })),
      restrictions: { account: a.status === 'suspended', community: tabs.community ? Boolean(suspension[0]) : undefined },
      professional: pro[0] ? { id: pro[0].id, status: pro[0].status, publicName: pro[0].public_name, verificationExpiresAt: ms(pro[0].verification_expires_at) } : null,
      supportOpen: tickets[0].open,
      // Session counts only with the activity permission (and never when the person opted out).
      usage30d: tabs.activity && !a.analytics_opt_out ? { activeDays: days[0].days, sessions: days[0].sessions } : null,
      privacyNote: 'Journal entries, Bea conversations, assessments and safety plans are not available here.',
    };
  }

  // ---------- Activity ----------
  async function activity(viewer, id, query) {
    const a = await loadAccount(id);
    const range = parseRange(query, clock.now());
    const from = new Date(`${range.from}T00:00:00Z`);
    const to = new Date(Date.parse(`${range.to}T00:00:00Z`) + DAY);
    const perms = permissionsFor(viewer.roles);
    const q1 = (sql, p) => db.query(sql, p).then((x) => x.rows);
    const [orders, grants, bookings, joins, tickets, security, ai] = await Promise.all([
      q1('select id, product_kind, status, amount_minor, currency, created_at, approved_at, reversed_at from orders where account_id = $1 and created_at < $3 and coalesce(reversed_at, approved_at, created_at) >= $2', [id, from, to]),
      q1('select id, days, created_at, revoked_at from entitlement_grants where account_id = $1 and created_at >= $2 and created_at < $3', [id, from, to]),
      q1('select b.id, b.status, b.created_at, b.confirmed_at, b.cancelled_at, p.public_name from bookings b join professional_profiles p on p.id = b.professional_id where b.client_account_id = $1 and b.created_at < $3 and coalesce(b.cancelled_at, b.confirmed_at, b.created_at) >= $2', [id, from, to]),
      q1('select joined_at from room_memberships where account_id = $1 and joined_at >= $2 and joined_at < $3', [id, from, to]),
      q1('select id, category, created_at from support_tickets where account_id = $1 and created_at >= $2 and created_at < $3', [id, from, to]),
      perms.has('users.security.view') ? q1("select kind, created_at from auth_events where account_id = $1 and created_at >= $2 and created_at < $3 order by id desc limit 100", [id, from, to]) : [],
      q1('select feature, count(*)::int as n, count(*) filter (where status = \'error\')::int as errors from ai_usage where account_id = $1 and created_at >= $2 and created_at < $3 group by feature', [id, from, to]),
    ]);
    const events = [];
    const at = (d) => ms(d);
    if (ms(a.created_at) >= from.getTime() && ms(a.created_at) < to.getTime()) events.push({ type: 'account_created', at: at(a.created_at), source: 'server' });
    if (a.email_verified_at && ms(a.email_verified_at) >= from.getTime() && ms(a.email_verified_at) < to.getTime()) events.push({ type: 'email_verified', at: at(a.email_verified_at), source: 'server' });
    for (const o of orders) {
      events.push({ type: 'checkout_started', at: at(o.created_at), source: 'server', ref: { kind: 'order', id: o.id }, detail: { product: o.product_kind, mode: 'test' } });
      if (o.approved_at) events.push({ type: 'payment_completed', at: at(o.approved_at), source: 'server', ref: { kind: 'order', id: o.id }, detail: { product: o.product_kind, amountMinor: o.amount_minor, currency: o.currency, mode: 'test' } });
      if (o.reversed_at) events.push({ type: 'payment_refunded', at: at(o.reversed_at), source: 'server', ref: { kind: 'order', id: o.id }, detail: { product: o.product_kind, mode: 'test' } });
    }
    for (const g of grants) events.push({ type: g.revoked_at ? 'complimentary_revoked' : 'complimentary_given', at: at(g.created_at), source: 'server', detail: { days: g.days } });
    for (const b of bookings) {
      events.push({ type: 'appointment_requested', at: at(b.created_at), source: 'server', ref: { kind: 'appointment', id: b.id }, detail: { professional: b.public_name } });
      if (b.confirmed_at) events.push({ type: 'appointment_confirmed', at: at(b.confirmed_at), source: 'server', ref: { kind: 'appointment', id: b.id } });
      if (b.cancelled_at) events.push({ type: 'appointment_cancelled', at: at(b.cancelled_at), source: 'server', ref: { kind: 'appointment', id: b.id }, detail: { status: b.status } });
    }
    // Which room is not shown: the topic of a room says something about a person.
    for (const j of joins) events.push({ type: 'community_room_joined', at: at(j.joined_at), source: 'server' });
    for (const t of tickets) events.push({ type: 'support_request', at: at(t.created_at), source: 'server', ref: { kind: 'ticket', id: t.id }, detail: { category: t.category } });
    for (const s of security) events.push({ type: 'security_event', at: at(s.created_at), source: 'server', detail: { kind: s.kind } });

    // Product use from the app's own statistics: estimates, and only with the person's consent.
    let usage = null;
    if (a.analytics_opt_out) usage = { optedOut: true };
    else {
      const daily = await q1('select day::text as day, active_seconds, sessions, actions, features, platform from analytics_daily where account_id = $1 and day between $2 and $3 order by day', [id, range.from, range.to]);
      const actionRows = await q1("select feature, props ->> 'kind' as kind, count(*)::int as n from analytics_events where account_id = $1 and name = 'action' and occurred_at >= $2 and occurred_at < $3 group by 1, 2", [id, from, to]);
      const byFeature = {};
      let seconds = 0;
      let sessions = 0;
      const platforms = {};
      for (const d of daily) {
        seconds += d.active_seconds;
        sessions += d.sessions;
        if (d.platform) platforms[d.platform] = (platforms[d.platform] || 0) + 1;
        for (const [f, s] of Object.entries(d.features || {})) byFeature[f] = (byFeature[f] || 0) + Number(s);
        if (d.sessions) events.push({ type: 'app_used', at: Date.parse(`${d.day}T12:00:00Z`), source: 'app', detail: { sessions: d.sessions, minutes: Math.round(d.active_seconds / 60), features: Object.keys(d.features || {}) } });
      }
      usage = {
        optedOut: false,
        estimated: true,
        sessions,
        activeDays: daily.filter((d) => d.sessions || d.active_seconds).length,
        minutes: Math.round(seconds / 60),
        avgSessionMinutes: sessions ? Math.round((seconds / sessions / 60) * 10) / 10 : 0,
        features: Object.entries(byFeature).sort((x, y) => y[1] - x[1]).map(([feature, s]) => ({ feature, minutes: Math.round(s / 60) })),
        completions: actionRows.map((r) => ({ feature: r.feature, kind: r.kind, count: r.n })),
        platforms: Object.entries(platforms).map(([platform, n]) => ({ platform, days: n })),
        daily: daily.map((d) => ({ day: d.day, minutes: Math.round(d.active_seconds / 60), sessions: d.sessions })),
      };
    }
    events.sort((x, y) => y.at - x.at);
    await audit(db, { actorId: viewer.id, actorRole: primaryRole(viewer.roles), action: 'account.activity_viewed', targetType: 'account', targetId: id, metadata: { from: range.from, to: range.to } });
    return { range, usage, ai: ai.map((x) => ({ feature: x.feature, requests: x.n, errors: x.errors })), events: events.slice(0, 300) };
  }

  // ---------- Transactions and subscriptions ----------
  const orderDto = (o) => ({
    id: o.id,
    product: o.product_id,
    kind: o.product_kind,
    amountMinor: o.amount_minor,
    currency: o.currency,
    mode: o.mode,
    provider: 'flitt',
    providerReference: o.payment_id || null,
    status: o.status,
    createdAt: ms(o.created_at),
    approvedAt: ms(o.approved_at),
    reversedAt: ms(o.reversed_at),
    reversalMinor: o.reversal_amount,
    durationDays: o.duration_days,
    card: o.masked_card || null,
  });

  async function transactions(viewer, id) {
    await loadAccount(id);
    const [orders, grants] = await Promise.all([
      db.query('select * from orders where account_id = $1 order by created_at desc limit 200', [id]),
      db.query('select id, days, starts_at, reason, granted_by, created_at, revoked_at, revoke_reason from entitlement_grants where account_id = $1 order by created_at desc', [id]),
    ]);
    // Plus periods, stacked the same way entitlements are computed.
    const sources = [
      ...orders.rows.filter((o) => o.product_kind === 'plus' && o.status === 'approved' && o.approved_at && o.duration_days).map((o) => ({ kind: 'paid', ref: o.id, at: ms(o.approved_at), days: o.duration_days })),
      ...grants.rows.filter((g) => !g.revoked_at).map((g) => ({ kind: 'complimentary', ref: `grant_${g.id}`, at: ms(g.starts_at), days: g.days })),
    ].sort((x, y) => x.at - y.at);
    let end = 0;
    const periods = sources.map((s) => {
      const start = Math.max(end, s.at);
      end = start + s.days * DAY;
      return { kind: s.kind, ref: s.ref, startsAt: start, endsAt: end, days: s.days };
    });
    const ent = await entitlementsForAccount(db, id, clock.now());
    return {
      mode: 'test',
      orders: orders.rows.map(orderDto),
      grants: grants.rows.map((g) => ({ id: Number(g.id), days: g.days, startsAt: ms(g.starts_at), reason: g.reason, createdAt: ms(g.created_at), revokedAt: ms(g.revoked_at), revokeReason: g.revoke_reason })),
      subscription: { tier: ent.tier, plusExpiresAt: ent.plus.expiresAt, artProgram: ent.artProgram.owned, periods: periods.reverse() },
    };
  }

  async function transaction(viewer, orderId, accountId) {
    const r = await db.query('select * from orders where id = $1', [String(orderId)]);
    const o = r.rows[0];
    if (!o) fail(404, 'not_found');
    if (accountId && o.account_id !== accountId) fail(404, 'not_found');
    const audits = await db.query("select action, actor_role, metadata, created_at from audit_log where target_type = 'order' and target_id = $1 order by id", [o.id]);
    let entitlement = null;
    if (o.product_kind === 'plus' && o.account_id) {
      const t = await transactions(viewer, o.account_id);
      entitlement = t.subscription.periods.find((p) => p.ref === o.id) || null;
    } else if (o.product_kind === 'professional') {
      const m = await db.query('select id, kind, starts_at, ends_at, revoked_at, revoke_reason from professional_memberships where order_id = $1', [o.id]);
      entitlement = m.rows[0] ? { kind: 'membership', startsAt: ms(m.rows[0].starts_at), endsAt: ms(m.rows[0].ends_at), revokedAt: ms(m.rows[0].revoked_at), reason: m.rows[0].revoke_reason } : null;
    } else if (o.product_kind === 'art') {
      entitlement = o.status === 'approved' ? { kind: 'art_program', startsAt: ms(o.approved_at) } : null;
    }
    const history = Array.isArray(o.history) ? o.history.map((h) => ({ status: h.status || h.to || null, at: h.at || null, via: h.via || null })) : [];
    await audit(db, { actorId: viewer.id, actorRole: primaryRole(viewer.roles), action: 'order.viewed', targetType: 'order', targetId: o.id });
    return {
      order: { ...orderDto(o), accountId: permissionsFor(viewer.roles).has('users.view') ? o.account_id : undefined, accountDeleted: o.account_deleted, lastCheckAt: ms(o.last_status_check_at), providerStatus: o.flitt_status || null },
      history,
      entitlement,
      staffActions: audits.rows.map((x) => ({ action: x.action, actorRole: x.actor_role, at: ms(x.created_at), reason: x.metadata?.reason || null })),
      note: 'Flitt TEST (sandbox): not real money.',
    };
  }

  // ---------- Appointments, community, support, security ----------
  async function appointments(viewer, id) {
    await loadAccount(id);
    const r = await db.query(
      `select b.id, b.status, b.attendance, b.starts_at, b.ends_at, b.mode, b.service_title, b.created_at, b.cancelled_at, b.cancel_reason, b.professional_id, p.public_name
       from bookings b join professional_profiles p on p.id = b.professional_id where b.client_account_id = $1 order by b.starts_at desc limit 200`,
      [id]
    );
    return {
      appointments: r.rows.map((b) => ({
        id: b.id,
        status: b.status,
        attendance: b.attendance,
        startsAt: ms(b.starts_at),
        minutes: Math.round((ms(b.ends_at) - ms(b.starts_at)) / 60000),
        mode: b.mode,
        service: b.service_title,
        createdAt: ms(b.created_at),
        cancelledAt: ms(b.cancelled_at),
        professional: { id: b.professional_id, publicName: b.public_name },
      })),
    };
  }

  async function community(viewer, id) {
    await loadAccount(id);
    const p = await db.query('select ref, pseudonym, created_at from community_profiles where account_id = $1', [id]);
    if (!p.rows[0]) return { profile: null };
    const q1 = (sql) => db.query(sql, [id]).then((x) => x.rows);
    const [counts, against, by, actions, suspensions, appeals] = await Promise.all([
      q1(`select (select count(*)::int from room_memberships where account_id = $1) as rooms, (select count(*)::int from community_messages where author_account_id = $1) as messages`),
      q1('select id, reason, status, resolution, created_at from reports where target_account_id = $1 order by id desc limit 30'),
      q1('select count(*)::int as n from reports where reporter_account_id = $1'),
      q1('select action, reason, duration_hours, report_id, created_at from moderation_actions where target_account_id = $1 order by id desc limit 30'),
      q1('select id, kind, reason, starts_at, ends_at, lifted_at from suspensions where account_id = $1 order by starts_at desc limit 20'),
      q1('select id, status, created_at from appeals where account_id = $1 order by id desc limit 20'),
    ]);
    await audit(db, { actorId: viewer.id, actorRole: primaryRole(viewer.roles), action: 'account.community_viewed', targetType: 'account', targetId: id });
    return {
      profile: { ref: p.rows[0].ref, pseudonym: p.rows[0].pseudonym, since: ms(p.rows[0].created_at), rooms: counts[0].rooms, messages: counts[0].messages },
      reportsAgainst: against.map((r) => ({ id: Number(r.id), reason: r.reason, status: r.status, resolution: r.resolution, at: ms(r.created_at) })),
      reportsMade: by[0].n,
      warnings: actions.filter((a) => a.action === 'warn').length,
      actions: actions.map((a) => ({ action: a.action, reason: a.reason, hours: a.duration_hours, reportId: a.report_id ? Number(a.report_id) : null, at: ms(a.created_at) })),
      restrictions: suspensions.map((s) => ({ id: Number(s.id), kind: s.kind, reason: s.reason, startsAt: ms(s.starts_at), endsAt: ms(s.ends_at), lifted: Boolean(s.lifted_at) })),
      appeals: appeals.map((x) => ({ id: Number(x.id), status: x.status, at: ms(x.created_at) })),
    };
  }

  async function supportHistory(viewer, id) {
    await loadAccount(id);
    const r = await db.query('select t.id, t.category, t.status, t.created_at, t.updated_at, a.email as assignee from support_tickets t left join accounts a on a.id = t.assigned_to where t.account_id = $1 order by t.created_at desc limit 100', [id]);
    return { tickets: r.rows.map((t) => ({ id: t.id, category: t.category, status: t.status, createdAt: ms(t.created_at), updatedAt: ms(t.updated_at), assignedTo: t.assignee || null })) };
  }

  async function security(viewer, id) {
    await loadAccount(id);
    const [events, actions, sessions] = await Promise.all([
      db.query('select id, kind, ip_hash, created_at from auth_events where account_id = $1 order by id desc limit 100', [id]),
      db.query("select action, actor_role, metadata, created_at from audit_log where target_type = 'account' and target_id = $1 order by id desc limit 50", [id]),
      db.query('select kind, created_at, last_used_at, revoked_at, user_agent from sessions where account_id = $1 order by created_at desc limit 30', [id]),
    ]);
    return {
      events: events.rows.map((e) => ({ id: Number(e.id), kind: e.kind, ipHash: e.ip_hash ? e.ip_hash.slice(0, 10) : null, at: ms(e.created_at) })),
      staffActions: actions.rows.map((h) => ({ action: h.action, actorRole: h.actor_role, at: ms(h.created_at), reason: h.metadata?.reason || null })),
      sessions: sessions.rows.map((s) => ({ kind: s.kind, createdAt: ms(s.created_at), lastUsedAt: ms(s.last_used_at), revokedAt: ms(s.revoked_at), device: s.user_agent ? String(s.user_agent).slice(0, 60) : null })),
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

  return { list, detail, activity, transactions, transaction, appointments, community, supportHistory, security, setSuspended, restrictPosting, revokeSessions, sendPasswordReset, grantPlus, revokeGrant, deleteAccount, exportCsv };
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
  r.get('/users/:id/activity', ...can('users.activity.view'), handle((req) => users.activity(req.account, req.params.id, req.query)));
  r.get('/users/:id/transactions', ...can('users.transactions.view'), handle((req) => users.transactions(req.account, req.params.id)));
  r.get('/users/:id/transactions/:orderId', ...can('users.transactions.view'), handle((req) => users.transaction(req.account, req.params.orderId, req.params.id)));
  r.get('/transactions/:orderId', ...can('users.transactions.view'), handle((req) => users.transaction(req.account, req.params.orderId)));
  r.get('/users/:id/appointments', ...can('users.appointments.view'), handle((req) => users.appointments(req.account, req.params.id)));
  r.get('/users/:id/community', ...can('users.community.view'), handle((req) => users.community(req.account, req.params.id)));
  r.get('/users/:id/support', ...can('support.view'), handle((req) => users.supportHistory(req.account, req.params.id)));
  r.get('/users/:id/security', ...can('users.security.view'), handle((req) => users.security(req.account, req.params.id)));
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
