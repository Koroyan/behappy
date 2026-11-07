// First-party usage analytics.
//
// What is collected: allowlisted event names with enum or bounded-number
// properties only (EVENTS below): sessions, which part of the app is open and
// for how long, and a fixed list of actions such as "journal entry saved". No
// free text is accepted anywhere, so journal entries, conversations,
// assessment answers or scores can't end up here. Staff screens are not
// counted. People can switch analytics off in Profile → Privacy (which also
// deletes what was kept for them); the owner can switch it off for everyone.
// Raw events are deleted after analytics.retentionDays; per-day totals stay.
//
// Aggregates shown to staff hide any group smaller than ANALYTICS_MIN_COHORT
// (default 5) people.

import express from 'express';

import { settingsFor } from '../admin/settings.mjs';
import { handle, staffFor } from '../admin/staff.mjs';
import { requireAccount } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const FEATURES = [
  'today', 'journal', 'anulia', 'art', 'cards', 'breathing', 'meditation', 'grounding', 'assessments', 'insights', 'goals', 'explore',
  'safety', 'community', 'specialists', 'appointments', 'messages', 'pro', 'membership', 'notifications', 'profile', 'account', 'onboarding', 'quiz', 'about', 'other',
];

/** The only actions that can be recorded, per feature. */
export const ACTIONS = {
  today: ['card_opened'],
  journal: ['entry_saved', 'reflection_requested'],
  anulia: ['conversation_started', 'message_sent'],
  art: ['session_started', 'photo_uploaded', 'session_completed'],
  cards: ['card_drawn', 'conversation_started'],
  breathing: ['exercise_completed'],
  meditation: ['session_completed'],
  grounding: ['exercise_completed'],
  assessments: ['assessment_completed'],
  safety: ['opened', 'plan_saved', 'contact_opened'],
  community: ['room_joined', 'message_sent', 'reaction_added', 'report_sent'],
  specialists: ['profile_viewed', 'booking_requested'],
  messages: ['message_sent'],
  membership: ['plan_viewed', 'checkout_started'],
  onboarding: ['completed'],
  account: ['registered', 'signed_in'],
  pro: ['application_started', 'application_submitted'],
};

export const EVENTS = {
  session_start: { feature: 'optional', props: { kind: ['cold', 'resume'] } },
  screen_view: { feature: 'required', props: {} },
  engagement: { feature: 'required', props: { seconds: { int: [1, 300] } } },
  action: { feature: 'required', props: { kind: 'action' } },
  error: { feature: 'optional', props: { kind: ['network', 'server', 'render'] } },
};

const ID = /^[A-Za-z0-9_-]{8,64}$/;
const PLATFORMS = ['web', 'ios', 'android'];

/** Returns a clean event or null. Anything not on the allowlist is dropped. */
export function sanitizeEvent(e, now) {
  if (!e || typeof e !== 'object') return null;
  const spec = EVENTS[e.name];
  if (!spec) return null;
  if (typeof e.id !== 'string' || !ID.test(e.id)) return null;
  if (typeof e.session !== 'string' || !ID.test(e.session)) return null;
  const at = Number(e.at);
  if (!Number.isFinite(at) || at > now + 5 * MINUTE || at < now - 7 * DAY) return null;
  let feature = null;
  if (e.feature !== undefined && e.feature !== null) {
    if (!FEATURES.includes(e.feature)) return null;
    feature = e.feature;
  }
  if (spec.feature === 'required' && !feature) return null;
  const props = {};
  for (const [key, rule] of Object.entries(spec.props)) {
    const v = e.props?.[key];
    if (rule === 'action') {
      if (!(ACTIONS[feature] || []).includes(v)) return null;
      props[key] = v;
    } else if (Array.isArray(rule)) {
      if (v === undefined) continue;
      if (!rule.includes(v)) return null;
      props[key] = v;
    } else if (rule.int) {
      if (!Number.isInteger(v) || v < rule.int[0] || v > rule.int[1]) return null;
      props[key] = v;
    }
  }
  return { id: e.id, name: e.name, session: e.session, at, feature, props };
}

class Budget {
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;
    this.map = new Map();
  }
  take(key, n, now) {
    const s = this.map.get(key);
    if (!s || now - s.start > this.windowMs) {
      this.map.set(key, { start: now, used: n });
      return n <= this.max;
    }
    if (s.used + n > this.max) return false;
    s.used += n;
    return true;
  }
}

const isoDay = (msTime) => new Date(msTime).toISOString().slice(0, 10);
const dayMs = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** Parses ?from=&to= (YYYY-MM-DD or ms). Default: the last 30 days. At most 366 days. */
export function parseRange(query, now) {
  const parse = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    if (Number.isFinite(n) && n > 1e11) return n;
    const d = Date.parse(`${String(v).slice(0, 10)}T00:00:00Z`);
    return Number.isFinite(d) ? d : null;
  };
  const to = isoDay(parse(query.to) ?? now);
  let from = isoDay(parse(query.from) ?? dayMs(to) - 29 * DAY);
  if (dayMs(from) > dayMs(to)) from = to;
  if (dayMs(to) - dayMs(from) > 365 * DAY) from = isoDay(dayMs(to) - 365 * DAY);
  const days = Math.round((dayMs(to) - dayMs(from)) / DAY) + 1;
  const prevTo = isoDay(dayMs(from) - DAY);
  const prevFrom = isoDay(dayMs(from) - days * DAY);
  return { from, to, days, prevFrom, prevTo };
}

export function createAnalytics({ db, clock, config, settings }) {
  const budget = new Budget(400, 10 * MINUTE);
  const minCohort = Math.max(1, Number(config.analytics?.minCohort) || 5);
  const hide = (n) => (n < minCohort ? null : n);

  async function ingest(account, body) {
    const now = clock.now();
    if (!(await settings.get('analytics.enabled'))) return { accepted: 0, disabled: 'platform' };
    const opt = await db.query('select analytics_opt_out from accounts where id = $1', [account.id]);
    if (opt.rows[0]?.analytics_opt_out) return { accepted: 0, disabled: 'opted_out' };
    const list = Array.isArray(body?.events) ? body.events.slice(0, 50) : [];
    if (!budget.take(account.id, list.length, now)) return { accepted: 0, error: 'rate_limited' };
    const platform = PLATFORMS.includes(body?.platform) ? body.platform : null;
    const version = String(body?.appVersion || '').replace(/[^0-9A-Za-z.+-]/g, '').slice(0, 20) || null;
    let accepted = 0;
    for (const raw of list) {
      const e = sanitizeEvent(raw, now);
      if (!e) continue;
      const ins = await db.query(
        `insert into analytics_events (account_id, session_id, name, feature, props, platform, app_version, occurred_at, received_at, dedupe_key)
         values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10) on conflict (dedupe_key) do nothing returning id`,
        [account.id, e.session, e.name, e.feature, JSON.stringify(e.props), platform, version, ts(e.at), ts(now), `${account.id}:${e.id}`]
      );
      if (!ins.rowCount) continue;
      accepted += 1;
      const seconds = e.name === 'engagement' ? e.props.seconds : 0;
      await db.query(
        `insert into analytics_daily (day, account_id, active_seconds, sessions, events, actions, features, platform)
         values ($1, $2, $3, $4, 1, $5, case when $6::text is null or $3 = 0 then '{}'::jsonb else jsonb_build_object($6::text, $3) end, $7)
         on conflict (day, account_id) do update set
           active_seconds = least(analytics_daily.active_seconds + excluded.active_seconds, 86400),
           sessions = analytics_daily.sessions + excluded.sessions,
           events = analytics_daily.events + 1,
           actions = analytics_daily.actions + excluded.actions,
           features = case when $6::text is null or $3 = 0 then analytics_daily.features
             else jsonb_set(analytics_daily.features, array[$6::text], to_jsonb(coalesce((analytics_daily.features ->> $6::text)::int, 0) + $3)) end,
           platform = coalesce(excluded.platform, analytics_daily.platform)`,
        [isoDay(e.at), account.id, seconds, e.name === 'session_start' ? 1 : 0, e.name === 'action' ? 1 : 0, e.feature, platform]
      );
    }
    return { accepted };
  }

  /** Off: no more collection, and what was kept for this person is deleted. */
  async function setOptOut(account, optOut) {
    await db.tx(async (t) => {
      await t.query('update accounts set analytics_opt_out = $2 where id = $1', [account.id, Boolean(optOut)]);
      if (optOut) {
        await t.query('delete from analytics_events where account_id = $1', [account.id]);
        await t.query('delete from analytics_daily where account_id = $1', [account.id]);
      }
    });
    return { analytics: !optOut };
  }

  async function periodStats(from, to) {
    const r = await db.query(
      `select count(distinct account_id)::int as active, coalesce(sum(active_seconds), 0)::bigint as seconds, coalesce(sum(sessions), 0)::int as sessions,
              count(*)::int as user_days, coalesce(sum(actions), 0)::int as actions
       from analytics_daily where day between $1 and $2`,
      [from, to]
    );
    const x = r.rows[0];
    const acc = await db.query(
      `select count(*) filter (where created_at >= $1 and created_at < $2)::int as new_accounts,
              count(*) filter (where email_verified_at >= $1 and email_verified_at < $2 and password_hash is not null)::int as registrations
       from accounts`,
      [ts(dayMs(from)), ts(dayMs(to) + DAY)]
    );
    const userDays = x.user_days || 0;
    return {
      activeUsers: x.active,
      sessions: x.sessions,
      actions: x.actions,
      avgSecondsPerActiveDay: userDays ? Math.round(Number(x.seconds) / userDays) : 0,
      sessionsPerActiveDay: userDays ? Math.round((x.sessions / userDays) * 10) / 10 : 0,
      newAccounts: acc.rows[0].new_accounts,
      registrations: acc.rows[0].registrations,
    };
  }

  async function distinctActive(from, to) {
    const r = await db.query('select count(distinct account_id)::int as n from analytics_daily where day between $1 and $2', [from, to]);
    return r.rows[0].n;
  }

  async function overview(query) {
    const now = clock.now();
    const range = parseRange(query, now);
    const [current, previous] = await Promise.all([periodStats(range.from, range.to), periodStats(range.prevFrom, range.prevTo)]);
    const series = await db.query(
      `select day::text as day, count(*)::int as users, coalesce(sum(active_seconds), 0)::bigint as seconds, coalesce(sum(sessions), 0)::int as sessions
       from analytics_daily where day between $1 and $2 group by day order by day`,
      [range.from, range.to]
    );
    const newPerDay = await db.query(
      `select (created_at at time zone 'UTC')::date::text as day, count(*)::int as n from accounts where created_at >= $1 and created_at < $2 group by 1`,
      [ts(dayMs(range.from)), ts(dayMs(range.to) + DAY)]
    );
    const byDay = new Map(series.rows.map((r) => [r.day, r]));
    const newByDay = new Map(newPerDay.rows.map((r) => [r.day, r.n]));
    const daily = [];
    for (let d = dayMs(range.from); d <= dayMs(range.to); d += DAY) {
      const key = isoDay(d);
      const row = byDay.get(key);
      daily.push({ day: key, activeUsers: row?.users || 0, minutes: row ? Math.round(Number(row.seconds) / 60) : 0, sessions: row?.sessions || 0, newAccounts: newByDay.get(key) || 0 });
    }
    const end = range.to;
    const [dau, wau, mau] = await Promise.all([distinctActive(end, end), distinctActive(isoDay(dayMs(end) - 6 * DAY), end), distinctActive(isoDay(dayMs(end) - 29 * DAY), end)]);
    const platforms = await db.query('select coalesce(platform, \'unknown\') as platform, count(distinct account_id)::int as n from analytics_daily where day between $1 and $2 group by 1', [range.from, range.to]);
    return {
      range,
      timezone: 'UTC',
      minCohort,
      current,
      previous,
      activeNow: { dau, wau, mau, stickiness: mau ? Math.round((dau / mau) * 1000) / 10 : 0 },
      daily,
      platforms: platforms.rows.map((p) => ({ platform: p.platform, users: hide(p.n), suppressed: p.n < minCohort })),
      collecting: Boolean(await settings.get('analytics.enabled')),
    };
  }

  async function features(query) {
    const range = parseRange(query, clock.now());
    const r = await db.query(
      `select f.key as feature, count(distinct d.account_id)::int as users, coalesce(sum((f.value)::int), 0)::bigint as seconds
       from analytics_daily d cross join lateral jsonb_each_text(d.features) f
       where d.day between $1 and $2 group by f.key`,
      [range.from, range.to]
    );
    const actions = await db.query(
      `select feature, props ->> 'kind' as kind, count(*)::int as n, count(distinct account_id)::int as users
       from analytics_events where name = 'action' and occurred_at >= $1 and occurred_at < $2 group by 1, 2`,
      [ts(dayMs(range.from)), ts(dayMs(range.to) + DAY)]
    );
    const views = await db.query(
      `select feature, count(*)::int as n, count(distinct account_id)::int as users from analytics_events where name = 'screen_view' and occurred_at >= $1 and occurred_at < $2 group by 1`,
      [ts(dayMs(range.from)), ts(dayMs(range.to) + DAY)]
    );
    const rows = new Map();
    const get = (f) => {
      if (!rows.has(f)) rows.set(f, { feature: f, users: 0, minutes: 0, views: 0, actions: [] });
      return rows.get(f);
    };
    for (const x of r.rows) Object.assign(get(x.feature), { users: x.users, minutes: Math.round(Number(x.seconds) / 60) });
    for (const x of views.rows) {
      const g = get(x.feature);
      g.views = x.n;
      g.users = Math.max(g.users, x.users);
    }
    for (const x of actions.rows) get(x.feature).actions.push({ kind: x.kind, count: x.users < minCohort ? null : x.n, people: hide(x.users) });
    const out = [...rows.values()].map((x) => {
      const small = x.users < minCohort;
      return {
        feature: x.feature,
        users: small ? null : x.users,
        minutes: small ? null : x.minutes,
        avgMinutesPerUser: small || !x.users ? null : Math.round((x.minutes / x.users) * 10) / 10,
        views: small ? null : x.views,
        actions: small ? [] : x.actions,
        suppressed: small,
      };
    });
    out.sort((a, b) => (b.minutes || 0) - (a.minutes || 0));
    return { range, minCohort, features: out };
  }

  async function retention(query) {
    const weeks = Math.max(2, Math.min(Number(query.weeks) || 8, 26));
    const now = clock.now();
    const start = new Date(now - weeks * 7 * DAY);
    const r = await db.query(
      `with firsts as (select account_id, min(day) as first_day from analytics_daily group by account_id),
       cohorts as (select account_id, date_trunc('week', first_day)::date as cohort from firsts where first_day >= $1::date),
       activity as (select distinct d.account_id, c.cohort, ((date_trunc('week', d.day)::date - c.cohort) / 7) as week
                    from analytics_daily d join cohorts c on c.account_id = d.account_id)
       select cohort::text as cohort, week::int as week, count(*)::int as n from activity group by cohort, week order by cohort, week`,
      [isoDay(start.getTime())]
    );
    const map = new Map();
    for (const row of r.rows) {
      if (!map.has(row.cohort)) map.set(row.cohort, new Map());
      map.get(row.cohort).set(row.week, row.n);
    }
    const cohorts = [...map.entries()].map(([cohort, w]) => {
      const size = w.get(0) || 0;
      const small = size < minCohort;
      const elapsed = Math.floor((now - Date.parse(`${cohort}T00:00:00Z`)) / (7 * DAY));
      const rates = [];
      for (let k = 1; k <= Math.min(elapsed, weeks); k += 1) rates.push(small ? null : Math.round(((w.get(k) || 0) / size) * 1000) / 10);
      return { cohort, size: small ? null : size, suppressed: small, weekly: rates };
    });
    return { weeks, minCohort, timezone: 'UTC', cohorts };
  }

  async function exportCsv(query) {
    const o = await overview(query);
    const lines = ['day,active_users,active_minutes,sessions,new_accounts'];
    for (const d of o.daily) lines.push([d.day, d.activeUsers, d.minutes, d.sessions, d.newAccounts].join(','));
    return { csv: `${lines.join('\n')}\n`, range: o.range };
  }

  /** One person's usage for the user detail page: totals by feature, no events or content. */
  async function usageFor(accountId, days = 30) {
    const now = clock.now();
    const from = isoDay(now - (days - 1) * DAY);
    const r = await db.query('select day::text as day, active_seconds, sessions, features from analytics_daily where account_id = $1 and day >= $2 order by day', [accountId, from]);
    const byFeature = {};
    let seconds = 0;
    let sessions = 0;
    for (const row of r.rows) {
      seconds += row.active_seconds;
      sessions += row.sessions;
      for (const [f, s] of Object.entries(row.features || {})) byFeature[f] = (byFeature[f] || 0) + Number(s);
    }
    const last = await db.query('select max(occurred_at) as at from analytics_events where account_id = $1', [accountId]);
    return {
      days,
      activeDays: r.rows.length,
      minutes: Math.round(seconds / 60),
      sessions,
      lastActiveAt: ms(last.rows[0]?.at),
      topFeatures: Object.entries(byFeature)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([feature, s]) => ({ feature, minutes: Math.round(s / 60) })),
    };
  }

  async function cleanup(now = clock.now()) {
    const days = Number(await settings.get('analytics.retentionDays')) || 395;
    const a = await db.query('delete from analytics_events where occurred_at < $1', [ts(now - days * DAY)]);
    const b = await db.query('delete from analytics_daily where day < $1', [isoDay(now - 760 * DAY)]);
    return a.rowCount + b.rowCount;
  }

  return { ingest, setOptOut, overview, features, retention, exportCsv, usageFor, cleanup, minCohort };
}

export function analyticsFor(deps) {
  deps.analytics ||= createAnalytics({ db: deps.db, clock: deps.clock, config: deps.config, settings: settingsFor(deps) });
  return deps.analytics;
}

export function mountAnalytics(app, deps) {
  const a = analyticsFor(deps);
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '32kb' });
  app.post('/api/events', json, auth, handle(async (req, res) => {
    const out = await a.ingest(req.account, req.body);
    if (out.error === 'rate_limited') res.status(429);
    return out;
  }));
  app.put('/api/account/privacy', json, auth, handle((req) => a.setOptOut(req.account, req.body?.analytics === false)));
  app.get('/api/account/privacy', auth, handle(async (req) => {
    const r = await deps.db.query('select analytics_opt_out from accounts where id = $1', [req.account.id]);
    return { analytics: !r.rows[0]?.analytics_opt_out };
  }));

  const staff = staffFor(deps);
  const r = express.Router();
  const can = (p) => [auth, staff.guard(p)];
  r.get('/analytics/overview', ...can('analytics.view'), handle((req) => a.overview(req.query)));
  r.get('/analytics/features', ...can('analytics.view'), handle((req) => a.features(req.query)));
  r.get('/analytics/retention', ...can('analytics.view'), handle((req) => a.retention(req.query)));
  r.get('/analytics/export', ...can('analytics.export'), handle(async (req, res) => {
    const out = await a.exportCsv(req.query);
    await deps.db.query("insert into audit_log (actor_account_id, actor_role, action, target_type, target_id, metadata) values ($1, $2, 'analytics.exported', 'analytics', 'daily', $3::jsonb)", [req.account.id, req.account.primaryRole, JSON.stringify(out.range)]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="behappy-usage-${out.range.from}-${out.range.to}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(out.csv);
  }));
  app.use('/api/admin', r);
}
