// Read-mostly staff dashboards: the KPI overview, finance (Flitt TEST mode),
// AI usage and controls, the security center and global search.
//
// Every number comes from server records. Payments are sandbox (TEST)
// transactions and are labelled as such everywhere: they are not income.
// Complimentary days are counted separately and never as revenue.

import crypto from 'node:crypto';

import express from 'express';

import { costOf, MODEL_PRICES, overridePrice, priceFor } from '../aiPricing.mjs';
import { analyticsFor, parseRange } from '../analytics/index.mjs';
import { audit } from '../audit.mjs';
import { requireAccount } from '../auth.mjs';
import { LEAKED_ROOT_KEY_PRESENT, productionProblems } from '../config.mjs';
import { ms, ts } from '../db/index.mjs';
import { PROMPT_SET_VERSION, SERVER_PROMPTS } from '../prompts/index.mjs';
import { professionalsFor } from '../professional/index.mjs';
import { maskEmail } from './users.mjs';
import { permissionsFor, primaryRole, STAFF_ROLES } from './permissions.mjs';
import { safetyFor } from './safety.mjs';
import { settingsFor } from './settings.mjs';
import { handle, StaffError, staffFor } from './staff.mjs';

const DAY = 24 * 60 * 60 * 1000;
const dayMs = (iso) => Date.parse(`${iso}T00:00:00Z`);
const isoDay = (t) => new Date(t).toISOString().slice(0, 10);
const fail = (status, code, extra) => {
  throw new StaffError(status, code, extra);
};
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const change = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

/** Fills every day of the range, so charts have no gaps. */
function fillDays(range, rows, pick) {
  const map = new Map(rows.map((r) => [r.day, r]));
  const out = [];
  for (let d = dayMs(range.from); d <= dayMs(range.to); d += DAY) {
    const key = isoDay(d);
    out.push({ day: key, ...pick(map.get(key)) });
  }
  return out;
}

export function createInsights(deps) {
  const { db, clock, config } = deps;
  const settings = settingsFor(deps);

  /** Staff/env price for all models, or null (then each model's list price is used). */
  const pricing = async () => overridePrice(await settings.get('ai.pricing'));

  // ---------- Finance (TEST) ----------
  async function revenueBetween(from, to) {
    const r = await db.query(
      `select product_kind, count(*) filter (where status in ('approved', 'reversed', 'partially_reversed'))::int as paid,
              coalesce(sum(amount_minor) filter (where status in ('approved', 'reversed', 'partially_reversed')), 0)::bigint as gross,
              count(*)::int as checkouts
       from orders where created_at >= $1 and created_at < $2 group by product_kind`,
      [ts(from), ts(to)]
    );
    const refunds = await db.query(
      "select coalesce(sum(coalesce(reversal_amount, amount_minor)), 0)::bigint as refunded, count(*)::int as n from orders where status in ('reversed', 'partially_reversed') and coalesce(reversed_at, updated_at) >= $1 and coalesce(reversed_at, updated_at) < $2",
      [ts(from), ts(to)]
    );
    const byKind = Object.fromEntries(r.rows.map((x) => [x.product_kind, { paid: x.paid, grossMinor: Number(x.gross), checkouts: x.checkouts }]));
    const gross = r.rows.reduce((s, x) => s + Number(x.gross), 0);
    const checkouts = r.rows.reduce((s, x) => s + x.checkouts, 0);
    const paid = r.rows.reduce((s, x) => s + x.paid, 0);
    const refunded = Number(refunds.rows[0].refunded);
    return { byKind, grossMinor: gross, refundedMinor: refunded, refunds: refunds.rows[0].n, netMinor: gross - refunded, checkouts, paid, conversion: pct(paid, checkouts) };
  }

  async function finance(query) {
    const range = parseRange(query, clock.now());
    const from = dayMs(range.from);
    const to = dayMs(range.to) + DAY;
    const [current, previous] = await Promise.all([revenueBetween(from, to), revenueBetween(dayMs(range.prevFrom), dayMs(range.prevTo) + DAY)]);
    const daily = await db.query(
      `select (approved_at at time zone 'UTC')::date::text as day, product_kind, coalesce(sum(amount_minor), 0)::bigint as gross, count(*)::int as n
       from orders where status in ('approved', 'reversed', 'partially_reversed') and approved_at >= $1 and approved_at < $2 group by 1, 2`,
      [ts(from), ts(to)]
    );
    const byDay = {};
    for (const row of daily.rows) {
      byDay[row.day] ||= { day: row.day, professional: 0, plus: 0, art: 0, payments: 0 };
      byDay[row.day][row.product_kind] = (byDay[row.day][row.product_kind] || 0) + Number(row.gross);
      byDay[row.day].payments += row.n;
    }
    const series = fillDays(range, Object.values(byDay), (r) => ({ professional: r?.professional || 0, plus: r?.plus || 0, art: r?.art || 0, payments: r?.payments || 0 }));
    // Memberships: current states, renewals and churn in the range.
    const pro = professionalsFor(deps);
    const approvedPros = await db.query("select * from professional_profiles where status in ('approved', 'expired', 'suspended')");
    const states = {};
    for (const p of approvedPros.rows) {
      const s = await pro.membership.state(db, p, clock.now());
      states[s.state] = (states[s.state] || 0) + 1;
    }
    const renewals = await db.query(
      `select count(*)::int as n from professional_memberships m where m.kind = 'paid' and m.revoked_at is null and m.created_at >= $1 and m.created_at < $2
         and exists (select 1 from professional_memberships e where e.professional_id = m.professional_id and e.kind = 'paid' and e.id <> m.id and e.created_at < m.created_at)`,
      [ts(from), ts(to)]
    );
    const churned = await db.query(
      `select count(distinct m.professional_id)::int as n from professional_memberships m where m.revoked_at is null and m.ends_at >= $1 and m.ends_at < $2 and m.ends_at <= $3
         and not exists (select 1 from professional_memberships n where n.professional_id = m.professional_id and n.revoked_at is null and n.ends_at > m.ends_at)`,
      [ts(from), ts(to), ts(clock.now())]
    );
    const grants = await db.query('select count(*)::int as n, coalesce(sum(days), 0)::int as days from entitlement_grants where created_at >= $1 and created_at < $2 and revoked_at is null', [ts(from), ts(to)]);
    const proGrants = await db.query("select count(*)::int as n from professional_memberships where kind = 'grant' and created_at >= $1 and created_at < $2", [ts(from), ts(to)]);
    return {
      mode: 'test',
      label: 'Flitt TEST (sandbox) transactions. Not real income.',
      currency: 'GEL',
      commission: '0% of sessions: BeHappy does not take payment for sessions.',
      range,
      current,
      previous,
      changes: { netMinor: change(current.netMinor, previous.netMinor), paid: change(current.paid, previous.paid) },
      daily: series,
      memberships: { states, renewals: renewals.rows[0].n, churned: churned.rows[0].n, priceMinor: config.professional?.amountMinor ?? null, durationDays: config.professional?.durationDays ?? null },
      complimentary: { plusGrants: grants.rows[0].n, plusDays: grants.rows[0].days, membershipGrants: proGrants.rows[0].n, note: 'Not revenue.' },
    };
  }

  // ---------- AI ----------
  async function aiOverview(query) {
    const range = parseRange(query, clock.now());
    const from = ts(dayMs(range.from));
    const to = ts(dayMs(range.to) + DAY);
    const [dailyByModel, byFeature, featureModels, byModel, today] = await Promise.all([
      // Per day and model: each model has its own price.
      db.query(
        `select (created_at at time zone 'UTC')::date::text as day, model, count(*)::int as calls, count(*) filter (where status = 'error')::int as errors,
                coalesce(sum(input_tokens), 0)::bigint as input, coalesce(sum(output_tokens), 0)::bigint as output
         from ai_usage where created_at >= $1 and created_at < $2 group by 1, 2`,
        [from, to]
      ),
      db.query(
        `select feature, count(*)::int as calls, count(*) filter (where status = 'error')::int as errors, coalesce(sum(input_tokens), 0)::bigint as input, coalesce(sum(output_tokens), 0)::bigint as output,
                round(avg(latency_ms))::int as avg_ms, percentile_cont(0.95) within group (order by latency_ms) as p95_ms
         from ai_usage where created_at >= $1 and created_at < $2 group by feature order by calls desc`,
        [from, to]
      ),
      db.query('select feature, model, coalesce(sum(input_tokens), 0)::bigint as input, coalesce(sum(output_tokens), 0)::bigint as output from ai_usage where created_at >= $1 and created_at < $2 group by feature, model', [from, to]),
      db.query('select model, count(*)::int as calls, coalesce(sum(input_tokens), 0)::bigint as input, coalesce(sum(output_tokens), 0)::bigint as output from ai_usage where created_at >= $1 and created_at < $2 group by model', [from, to]),
      db.query('select model, coalesce(sum(input_tokens), 0)::bigint as input, coalesce(sum(output_tokens), 0)::bigint as output, count(*)::int as calls from ai_usage where created_at >= $1 group by model', [ts(dayMs(isoDay(clock.now())))]),
    ]);
    const price = await pricing();
    const days = new Map();
    for (const r of dailyByModel.rows) {
      const d = days.get(r.day) || { day: r.day, calls: 0, errors: 0, input: 0, output: 0, models: [] };
      d.calls += r.calls;
      d.errors += r.errors;
      d.input += Number(r.input);
      d.output += Number(r.output);
      d.models.push(r);
      days.set(r.day, d);
    }
    const anyPrice = Boolean(price) || byModel.rows.some((m) => priceFor(m.model, price));
    const series = fillDays(range, [...days.values()], (r) => ({ calls: r?.calls || 0, errors: r?.errors || 0, tokens: r ? r.input + r.output : 0, costUsd: r ? costOf(r.models, price) : anyPrice ? 0 : null }));
    return {
      range,
      // null: each model's list price (server/aiPricing.mjs); otherwise one staff-set price for all.
      pricing: price ? { ...price, currency: 'USD' } : null,
      modelPrices: MODEL_PRICES,
      daily: series,
      byFeature: byFeature.rows.map((f) => ({ feature: f.feature, calls: f.calls, errors: f.errors, errorRate: pct(f.errors, f.calls), inputTokens: Number(f.input), outputTokens: Number(f.output), costUsd: costOf(featureModels.rows.filter((m) => m.feature === f.feature), price), avgLatencyMs: f.avg_ms, p95LatencyMs: f.p95_ms === null ? null : Math.round(Number(f.p95_ms)) })),
      byModel: byModel.rows.map((m) => ({ model: m.model, calls: m.calls, costUsd: costOf([m], price) })),
      today: { calls: today.rows.reduce((s, r) => s + r.calls, 0), costUsd: costOf(today.rows, price), budgetUsd: await settings.get('ai.dailyBudgetUsd') },
      switches: await settings.get('ai.features'),
      serverModelNote: 'The server chooses the model; apps cannot change it.',
    };
  }

  async function recordPromptVersions() {
    const now = ts(clock.now());
    for (const [key, p] of Object.entries(SERVER_PROMPTS)) {
      const hash = crypto.createHash('sha256').update(p.instructions).digest('hex').slice(0, 16);
      await db.query('insert into prompt_versions (prompt_key, content_hash, set_version, first_seen_at, last_seen_at) values ($1, $2, $3, $4, $4) on conflict (prompt_key, content_hash) do update set last_seen_at = excluded.last_seen_at', [key, hash, PROMPT_SET_VERSION, now]);
    }
  }

  async function prompts(viewer) {
    const r = await db.query('select * from prompt_versions order by prompt_key, first_seen_at desc');
    const full = permissionsFor(viewer.roles).has('ai.manage');
    return {
      setVersion: PROMPT_SET_VERSION,
      changeProcess: 'The instructions ship with the server. Changes go through code review and a deploy; rolling back means deploying the previous reviewed version.',
      prompts: Object.entries(SERVER_PROMPTS).map(([key, p]) => {
        const hash = crypto.createHash('sha256').update(p.instructions).digest('hex').slice(0, 16);
        return {
          key,
          currentHash: hash,
          characters: p.instructions.length,
          text: full ? p.instructions : null,
          history: r.rows.filter((x) => x.prompt_key === key).map((x) => ({ hash: x.content_hash, setVersion: x.set_version, firstSeenAt: ms(x.first_seen_at), lastSeenAt: ms(x.last_seen_at), current: x.content_hash === hash })),
        };
      }),
    };
  }

  // ---------- Security ----------
  async function security(viewer) {
    const now = clock.now();
    const contact = permissionsFor(viewer.roles).has('users.contact');
    const [daily, recent, locked, failing, staff, mfa] = await Promise.all([
      db.query("select (created_at at time zone 'UTC')::date::text as day, kind, count(*)::int as n from auth_events where created_at >= $1 group by 1, 2 order by 1", [ts(now - 30 * DAY)]),
      db.query('select e.id, e.kind, e.account_id, e.ip_hash, e.metadata, e.created_at, a.email from auth_events e left join accounts a on a.id = e.account_id order by e.id desc limit 100'),
      db.query('select id, email, locked_until from accounts where locked_until > $1 order by locked_until desc limit 50', [ts(now)]),
      db.query("select e.account_id, a.email, count(*)::int as n from auth_events e left join accounts a on a.id = e.account_id where e.kind in ('login_failed', 'account_locked', 'step_up_failed', 'mfa_failed') and e.created_at >= $1 and e.account_id is not null group by 1, 2 order by n desc limit 10", [ts(now - DAY)]),
      db.query('select roles, staff_suspended_at from accounts where cardinality(roles) > 0'),
      db.query('select account_id from staff_mfa where enabled_at is not null'),
    ]);
    const withMfa = new Set(mfa.rows.map((x) => x.account_id));
    const staffRows = staff.rows;
    const byRole = Object.fromEntries(STAFF_ROLES.map((r) => [r, staffRows.filter((s) => s.roles.includes(r)).length]));
    const problems = productionProblems(config);
    const mail = (e) => (contact ? e || null : maskEmail(e));
    return {
      eventsPerDay: daily.rows,
      recent: recent.rows.map((e) => ({ id: Number(e.id), kind: e.kind, accountId: e.account_id, email: mail(e.email), ipHash: e.ip_hash, metadata: e.metadata, at: ms(e.created_at) })),
      locked: locked.rows.map((a) => ({ id: a.id, email: mail(a.email), until: ms(a.locked_until) })),
      mostFailures24h: failing.rows.map((x) => ({ accountId: x.account_id, email: mail(x.email), failures: x.n })),
      staff: { byRole, total: staffRows.length, suspended: staffRows.filter((s) => s.staff_suspended_at).length, withoutTwoStep: (await db.query('select id from accounts where cardinality(roles) > 0')).rows.filter((a) => !withMfa.has(a.id)).length },
      config: {
        production: Boolean(config.isProduction),
        blocking: problems.blocking,
        warnings: problems.warnings,
        leakedRootKeyStillInEnvFile: LEAKED_ROOT_KEY_PRESENT,
        devTools: Boolean(config.devTools),
        adminTokenSet: Boolean(config.adminToken),
        encryptionKeys: { documents: Boolean(config.encryption?.documentsKey), messages: Boolean(config.encryption?.messagesKey), identifiers: Boolean(config.encryption?.identifierSalt) },
        email: Boolean(deps.mailer?.available),
        payments: 'flitt-test',
        twoStepRequired: Boolean(await settings.get('staff.mfaRequired')),
      },
    };
  }

  async function unlock(actor, id, reason) {
    const why = String(reason || '').trim();
    if (why.length < 3) fail(400, 'reason_required');
    const r = await db.query('update accounts set failed_logins = 0, locked_until = null where id = $1 returning id', [id]);
    if (!r.rowCount) fail(404, 'not_found');
    await audit(db, { actorId: actor.id, actorRole: primaryRole(actor.roles), action: 'account.unlocked', targetType: 'account', targetId: id, metadata: { reason: why.slice(0, 300) } });
    return { ok: true };
  }

  // ---------- KPI overview ----------
  async function dashboard(viewer, query) {
    const perms = permissionsFor(viewer.roles);
    const range = parseRange(query, clock.now());
    const from = dayMs(range.from);
    const to = dayMs(range.to) + DAY;
    const pFrom = dayMs(range.prevFrom);
    const pTo = dayMs(range.prevTo) + DAY;
    const count = async (sql, params) => (await db.query(sql, params)).rows[0].n;
    const pair = async (sql) => {
      const [c, p] = await Promise.all([count(sql, [ts(from), ts(to)]), count(sql, [ts(pFrom), ts(pTo)])]);
      return { value: c, previous: p, change: change(c, p) };
    };
    const kpis = {
      newAccounts: await pair('select count(*)::int as n from accounts where created_at >= $1 and created_at < $2'),
      registrations: await pair('select count(*)::int as n from accounts where email_verified_at >= $1 and email_verified_at < $2 and password_hash is not null'),
      communityMessages: await pair("select count(*)::int as n from community_messages where created_at >= $1 and created_at < $2 and author_kind = 'member'"),
      bookingRequests: await pair('select count(*)::int as n from bookings where created_at >= $1 and created_at < $2'),
      applications: await pair('select count(*)::int as n from verification_events where to_status = \'submitted\' and created_at >= $1 and created_at < $2'),
      aiCalls: await pair('select count(*)::int as n from ai_usage where created_at >= $1 and created_at < $2'),
    };
    const totals = (await db.query("select count(*)::int as accounts, count(*) filter (where email_verified_at is not null and password_hash is not null)::int as registered from accounts")).rows[0];
    // Urgent reports become cases before they are counted.
    await safetyFor(deps).sync();
    const queues = {
      applications: await count("select count(*)::int as n from professional_profiles where status in ('submitted', 'under_review')"),
      reports: await count("select count(*)::int as n from reports where status in ('open', 'in_review')"),
      urgentReports: await count("select count(*)::int as n from reports where status in ('open', 'in_review') and priority >= 3"),
      appeals: await count("select count(*)::int as n from appeals where status = 'open'"),
      safetyCases: await count("select count(*)::int as n from safety_incidents where status in ('open', 'in_progress', 'escalated')"),
      supportWaiting: await count("select count(*)::int as n from support_tickets where status in ('open', 'waiting_on_staff')"),
    };
    const out = { range, generatedAt: clock.now(), totals, kpis, queues };
    if (perms.has('analytics.view')) {
      const a = await analyticsFor(deps).overview(query);
      out.engagement = { activeNow: a.activeNow, current: a.current, previous: a.previous, daily: a.daily, collecting: a.collecting };
    }
    if (perms.has('finance.view')) {
      const f = await finance(query);
      out.finance = { mode: 'test', label: f.label, netMinor: f.current.netMinor, previousNetMinor: f.previous.netMinor, change: f.changes.netMinor, paid: f.current.paid, currency: f.currency, daily: f.daily };
    }
    return out;
  }

  // ---------- Global search ----------
  async function search(viewer, q) {
    const text = String(q || '').trim().slice(0, 80);
    if (text.length < 2) return { results: [] };
    const perms = permissionsFor(viewer.roles);
    const like = `%${text.split('%').join('').split('_').join('')}%`;
    const results = [];
    if (perms.has('users.view')) {
      const r = await db.query('select a.id, a.email, p.pseudonym from accounts a left join community_profiles p on p.account_id = a.id where a.id = $1 or a.email ilike $2 or p.pseudonym ilike $2 order by a.created_at desc limit 8', [text, like]);
      for (const x of r.rows) results.push({ type: 'user', id: x.id, title: x.pseudonym || (perms.has('users.contact') ? x.email : maskEmail(x.email)) || x.id, subtitle: x.id });
    }
    if (perms.has('professionals.view')) {
      const r = await db.query('select id, public_name, status, city from professional_profiles where id = $1 or public_name ilike $2 or legal_name ilike $2 limit 8', [text, like]);
      for (const x of r.rows) results.push({ type: 'professional', id: x.id, title: x.public_name || x.id, subtitle: [x.status, x.city].filter(Boolean).join(' · ') });
    }
    if (perms.has('appointments.view')) {
      const r = await db.query('select id, status, starts_at from bookings where id = $1 limit 1', [text]);
      for (const x of r.rows) results.push({ type: 'appointment', id: x.id, title: x.id, subtitle: `${x.status} · ${isoDay(ms(x.starts_at))}` });
    }
    if (perms.has('support.view')) {
      const r = await db.query('select id, category, status from support_tickets where id = $1 limit 1', [text]);
      for (const x of r.rows) results.push({ type: 'ticket', id: x.id, title: x.id, subtitle: `${x.category} · ${x.status}` });
    }
    if (perms.has('community.view')) {
      const r = await db.query('select id from community_rooms where id ilike $1 limit 5', [like]);
      for (const x of r.rows) results.push({ type: 'room', id: x.id, title: x.id, subtitle: '' });
    }
    return { results };
  }

  return { finance, aiOverview, recordPromptVersions, prompts, security, unlock, dashboard, search };
}

export function mountInsights(app, deps) {
  const i = createInsights(deps);
  i.recordPromptVersions().catch((e) => console.error('[ai] prompt versions', e?.message));
  const staff = staffFor(deps);
  const settings = settingsFor(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '16kb' });
  const can = (p, opts) => [json, auth, staff.guard(p, opts)];
  const r = express.Router();
  r.get('/dashboard', ...can('dashboard.view'), handle((req) => i.dashboard(req.account, req.query)));
  r.get('/search', ...can('dashboard.view'), handle((req) => i.search(req.account, req.query.q)));
  r.get('/finance', ...can('finance.view'), handle((req) => i.finance(req.query)));
  r.get('/ai', ...can('ai.view'), handle((req) => i.aiOverview(req.query)));
  r.get('/ai/prompts', ...can('ai.view'), handle((req) => i.prompts(req.account)));
  // AI switches, budget and prices: the AI lead changes them (with a fresh confirmation), audited like any setting.
  r.put('/ai/settings/:key', ...can('ai.manage', { stepUp: true }), handle((req) => {
    if (!['ai.features', 'ai.dailyBudgetUsd', 'ai.pricing'].includes(req.params.key)) fail(404, 'unknown_setting');
    return settings.set(req.account, req.params.key, req.body?.value, req.body?.reason);
  }));
  r.get('/security', ...can('security.view'), handle((req) => i.security(req.account)));
  r.post('/security/accounts/:id/unlock', ...can('security.manage'), handle((req) => i.unlock(req.account, req.params.id, req.body?.reason)));
  app.use('/api/admin', r);
}
