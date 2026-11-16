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
//
// Consent: accounts created since migration 018 send nothing until the person
// says yes (the app asks once, after their first activity; until then events
// wait on the device and are dropped if the answer is no). Accounts from before
// keep the setting they had. Details that could say something sensitive about
// one person (which first-launch option or program they chose, which sound they
// played) are never stored with the account: they only add to anonymous daily
// totals (analytics_aggregates), see DIMS.

import express from 'express';

import { settingsFor } from '../admin/settings.mjs';
import { handle, staffFor } from '../admin/staff.mjs';
import { requireAccount } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { onOrderStatusChange } from '../payments.mjs';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const FEATURES = [
  'today', 'journal', 'anulia', 'art', 'cards', 'breathing', 'meditation', 'grounding', 'assessments', 'insights', 'goals', 'explore',
  'safety', 'community', 'specialists', 'appointments', 'messages', 'pro', 'membership', 'notifications', 'profile', 'account', 'onboarding', 'quiz', 'about', 'other',
  'steps', 'sound', 'sleep', 'calm', 'reflection', 'programs', 'badges', 'backup',
];

/** The only actions that can be recorded, per feature. */
export const ACTIONS = {
  today: ['card_opened', 'checkin_saved', 'next_step_opened'],
  journal: ['entry_saved', 'reflection_requested'],
  anulia: ['conversation_started', 'message_sent'],
  art: ['session_started', 'photo_uploaded', 'session_completed'],
  cards: ['card_drawn', 'conversation_started', 'conversation_completed'],
  breathing: ['exercise_started', 'exercise_completed'],
  meditation: ['session_started', 'session_completed'],
  grounding: ['exercise_completed'],
  calm: ['exercise_started', 'exercise_completed'],
  sound: ['catalog_opened', 'playback_started', 'playback_completed', 'playback_stopped'],
  sleep: ['routine_started', 'routine_completed', 'checkin_saved'],
  steps: ['created', 'completed', 'skipped'],
  reflection: ['opened', 'completed'],
  programs: ['started', 'day_completed', 'paused', 'resumed', 'completed', 'stopped'],
  badges: ['earned', 'challenge_completed'],
  assessments: ['assessment_completed'],
  safety: ['opened', 'plan_saved', 'contact_opened'],
  community: ['room_joined', 'message_sent', 'reaction_added', 'report_sent', 'discover_opened', 'starter_used', 'event_interest'],
  specialists: ['profile_viewed', 'booking_requested'],
  messages: ['message_sent'],
  // purchase_confirmed and payment_failed come only from the server (Flitt's verified status), never from the app.
  membership: ['plan_viewed', 'checkout_started', 'purchase_confirmed', 'payment_failed'],
  onboarding: ['started', 'option_selected', 'completed', 'exited'],
  account: ['registered', 'verified', 'signed_in'],
  pro: ['application_started', 'application_submitted'],
  backup: ['enabled', 'backup_completed', 'restore_completed', 'disabled'],
};

/** Recorded by the server itself; refused when an app sends them. */
export const SERVER_ONLY = new Set(['membership:purchase_confirmed', 'membership:payment_failed', 'account:verified']);

const PROGRAM_IDS = ['sleep', 'calm', 'reflection', 'habits'];
const CHOICES = ['stress', 'sleep', 'bea', 'wellbeing', 'psychologist', 'explore'];
const SOUND_MODES = ['focus', 'sleep', 'relax', 'headache', 'mix'];
const DAY_NUMBER = /^[1-7]$/;
const CATALOG_ID = /^[a-z0-9-]{2,40}$/;
const BADGE_ID = /^[A-Za-z0-9]{2,32}$/;

/**
 * Details of an action that only ever add to anonymous daily totals
 * (analytics_aggregates, no account id). Per "feature:kind", the allowed
 * details and what each may be. Anything else is dropped.
 */
export const DIMS = {
  'onboarding:option_selected': { choice: CHOICES },
  'programs:started': { program: PROGRAM_IDS },
  'programs:day_completed': { program: PROGRAM_IDS, day: DAY_NUMBER },
  'programs:completed': { program: PROGRAM_IDS },
  'sound:playback_started': { mode: SOUND_MODES, track: CATALOG_ID },
  'sound:playback_completed': { mode: SOUND_MODES, track: CATALOG_ID },
  'sound:catalog_opened': { category: CATALOG_ID },
  'calm:exercise_started': { exercise: ['breathe', 'silence', 'ground'] },
  'calm:exercise_completed': { exercise: ['breathe', 'silence', 'ground'] },
  'badges:earned': { badge: BADGE_ID },
};

const dimOk = (rule, v) => (Array.isArray(rule) ? rule.includes(v) : (typeof v === 'string' || typeof v === 'number') && rule.test(String(v)));

/** Meaningful activities (activation and the funnel). */
export const MEANINGFUL = [
  ['journal', 'entry_saved'], ['anulia', 'message_sent'], ['art', 'session_completed'], ['cards', 'conversation_started'], ['cards', 'conversation_completed'],
  ['breathing', 'exercise_completed'], ['meditation', 'session_completed'], ['grounding', 'exercise_completed'], ['calm', 'exercise_completed'],
  ['sound', 'playback_completed'], ['sleep', 'routine_started'], ['sleep', 'checkin_saved'], ['steps', 'created'], ['steps', 'completed'],
  ['programs', 'started'], ['programs', 'day_completed'], ['reflection', 'completed'], ['today', 'checkin_saved'], ['community', 'message_sent'],
  ['specialists', 'booking_requested'], ['assessments', 'assessment_completed'], ['safety', 'plan_saved'],
];
const MEANINGFUL_SQL = `(${MEANINGFUL.map(([f, k]) => `(e.feature = '${f}' and e.props ->> 'kind' = '${k}')`).join(' or ')})`;

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
  const dims = {};
  for (const [key, rule] of Object.entries(spec.props)) {
    const v = e.props?.[key];
    if (rule === 'action') {
      if (!(ACTIONS[feature] || []).includes(v)) return null;
      if (SERVER_ONLY.has(`${feature}:${v}`) && !e.server) return null;
      props[key] = v;
      for (const [dk, drule] of Object.entries(DIMS[`${feature}:${v}`] || {})) {
        const dv = e.props?.[dk];
        if (dv !== undefined && dimOk(drule, dv)) dims[dk] = String(dv);
      }
    } else if (Array.isArray(rule)) {
      if (v === undefined) continue;
      if (!rule.includes(v)) return null;
      props[key] = v;
    } else if (rule.int) {
      if (!Number.isInteger(v) || v < rule.int[0] || v > rule.int[1]) return null;
      props[key] = v;
    }
  }
  return { id: e.id, name: e.name, session: e.session, at, feature, props, dims };
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

/** Anonymous daily totals for the details in DIMS (no account id). */
async function addAggregates(db, e) {
  for (const [dim, value] of Object.entries(e.dims || {})) {
    await db.query(
      `insert into analytics_aggregates (day, feature, kind, dim, value, n) values ($1, $2, $3, $4, $5, 1)
       on conflict (day, feature, kind, dim, value) do update set n = analytics_aggregates.n + 1`,
      [isoDay(e.at), e.feature, e.props.kind, dim, value]
    );
  }
}

export function createAnalytics({ db, clock, config, settings }) {
  const budget = new Budget(400, 10 * MINUTE);
  const minCohort = Math.max(1, Number(config.analytics?.minCohort) || 5);
  const hide = (n) => (n < minCohort ? null : n);

  async function ingest(account, body) {
    const now = clock.now();
    if (!(await settings.get('analytics.enabled'))) return { accepted: 0, disabled: 'platform' };
    const opt = await db.query('select analytics_opt_out, analytics_choice_at from accounts where id = $1', [account.id]);
    // Not asked yet (accounts since migration 018): nothing is kept; the app holds its events until the answer.
    if (opt.rows[0]?.analytics_opt_out) return { accepted: 0, disabled: opt.rows[0].analytics_choice_at ? 'opted_out' : 'pending' };
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
      await addAggregates(db, e);
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

  /** Off: no more collection, and what was kept for this person is deleted. Either way it is now their choice. */
  async function setOptOut(account, optOut) {
    await db.tx(async (t) => {
      await t.query('update accounts set analytics_opt_out = $2, analytics_choice_at = $3 where id = $1', [account.id, Boolean(optOut), ts(clock.now())]);
      if (optOut) {
        await t.query('delete from analytics_events where account_id = $1', [account.id]);
        await t.query('delete from analytics_daily where account_id = $1', [account.id]);
      }
    });
    return { analytics: !optOut, choice: optOut ? 'off' : 'on' };
  }

  /**
   * An action the server itself confirms (a payment Flitt verified, a verified
   * email), for people who allow statistics. `ref` makes it count once (the
   * order id…). Never throws: statistics must not break a payment.
   */
  async function recordServerAction(accountId, feature, kind, ref, dims = {}) {
    try {
      if (!accountId || !(await settings.get('analytics.enabled'))) return false;
      const now = clock.now();
      const safeRef = String(ref || now).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 48) || String(now);
      const e = sanitizeEvent({ id: `srv_${safeRef}`.padEnd(8, '0').slice(0, 64), session: 'server_0', at: now, name: 'action', feature, props: { kind, ...dims }, server: true }, now);
      if (!e) return false;
      const opt = await db.query('select analytics_opt_out from accounts where id = $1', [accountId]);
      if (!opt.rowCount || opt.rows[0].analytics_opt_out) return false;
      const ins = await db.query(
        `insert into analytics_events (account_id, session_id, name, feature, props, platform, app_version, occurred_at, received_at, dedupe_key)
         values ($1, $2, 'action', $3, $4::jsonb, null, null, $5, $5, $6) on conflict (dedupe_key) do nothing returning id`,
        [accountId, e.session, feature, JSON.stringify(e.props), ts(now), `${accountId}:server:${feature}:${kind}:${safeRef}`]
      );
      if (!ins.rowCount) return false;
      await db.query(
        `insert into analytics_daily (day, account_id, events, actions) values ($1, $2, 1, 1)
         on conflict (day, account_id) do update set events = analytics_daily.events + 1, actions = analytics_daily.actions + 1`,
        [isoDay(now), accountId]
      );
      await addAggregates(db, e);
      return true;
    } catch {
      return false;
    }
  }

  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
  const range = (query) => parseRange(query, clock.now());
  const tsRange = (r) => [ts(dayMs(r.from)), ts(dayMs(r.to) + DAY)];

  /**
   * Activation: of the people first seen in the period, how many did one
   * meaningful thing (MEANINGFUL) on their first day, and within 7 days.
   */
  async function activation(query) {
    const r = range(query);
    const q = await db.query(
      `with firsts as (select account_id, min(day) as first_day from analytics_daily group by account_id),
       cohort as (select account_id, first_day from firsts where first_day between $1 and $2),
       acts as (select c.account_id, min((e.occurred_at at time zone 'UTC')::date) as first_act
                from cohort c join analytics_events e on e.account_id = c.account_id and e.name = 'action' and ${MEANINGFUL_SQL}
                group by c.account_id)
       select count(*)::int as cohort,
              count(*) filter (where a.first_act is not null and a.first_act <= c.first_day)::int as day0,
              count(*) filter (where a.first_act is not null and a.first_act <= c.first_day + 6)::int as week1
       from cohort c left join acts a on a.account_id = c.account_id`,
      [r.from, r.to]
    );
    const x = q.rows[0];
    const small = x.cohort < minCohort;
    const firstActions = await db.query(
      `with firsts as (select account_id, min(day) as first_day from analytics_daily group by account_id),
       cohort as (select account_id from firsts where first_day between $1 and $2),
       ranked as (select e.account_id, e.feature, e.props ->> 'kind' as kind, row_number() over (partition by e.account_id order by e.occurred_at, e.id) as rn
                  from analytics_events e join cohort c on c.account_id = e.account_id where e.name = 'action' and ${MEANINGFUL_SQL})
       select feature, kind, count(*)::int as n from ranked where rn = 1 group by 1, 2 order by n desc`,
      [r.from, r.to]
    );
    return {
      range: r,
      minCohort,
      newPeople: hide(x.cohort),
      suppressed: small,
      activatedFirstDay: small ? null : x.day0,
      activatedFirstWeek: small ? null : x.week1,
      rateFirstDay: small ? null : pct(x.day0, x.cohort),
      rateFirstWeek: small ? null : pct(x.week1, x.cohort),
      // Which meaningful thing people did first (groups under the threshold hidden).
      firstActions: firstActions.rows.filter((a) => a.n >= minCohort).map((a) => ({ feature: a.feature, kind: a.kind, people: a.n })),
    };
  }

  /** Day-N retention (D1, D7, D14, D30) of people first seen in the period: active again exactly N days later. */
  async function retentionDays(query) {
    const r = range(query);
    const today = isoDay(clock.now());
    const out = [];
    for (const n of [1, 7, 14, 30]) {
      const q = await db.query(
        `with firsts as (select account_id, min(day) as first_day from analytics_daily group by account_id),
         cohort as (select account_id, first_day from firsts where first_day between $1 and $2 and first_day + $3::int <= $4::date)
         select count(*)::int as eligible,
                count(*) filter (where exists (select 1 from analytics_daily d where d.account_id = c.account_id and d.day = c.first_day + $3::int))::int as back,
                count(*) filter (where exists (select 1 from analytics_daily d where d.account_id = c.account_id and d.day >= c.first_day + $3::int))::int as back_later
         from cohort c`,
        [r.from, r.to, n, today]
      );
      const x = q.rows[0];
      const small = x.eligible < minCohort;
      out.push({ day: n, eligible: hide(x.eligible), rate: small ? null : pct(x.back, x.eligible), rateOnOrAfter: small ? null : pct(x.back_later, x.eligible), suppressed: small });
    }
    return { range: r, minCohort, timezone: 'UTC', days: out };
  }

  /**
   * Journey of people first seen in the period: first visit → first
   * meaningful activity → a return visit on another day → pricing → checkout
   * → a payment Flitt confirmed (orders table, the authoritative record).
   */
  async function funnel(query) {
    const r = range(query);
    const q = await db.query(
      `with firsts as (select account_id, min(day) as first_day from analytics_daily group by account_id),
       cohort as (select account_id, first_day from firsts where first_day between $1 and $2)
       select count(*)::int as visited,
         count(*) filter (where exists (select 1 from analytics_events e where e.account_id = c.account_id and e.name = 'action' and ${MEANINGFUL_SQL}))::int as activity,
         count(*) filter (where exists (select 1 from analytics_daily d where d.account_id = c.account_id and d.day > c.first_day))::int as returned,
         count(*) filter (where exists (select 1 from analytics_events e where e.account_id = c.account_id and ((e.name = 'screen_view' and e.feature = 'membership') or (e.name = 'action' and e.feature = 'membership' and e.props ->> 'kind' = 'plan_viewed'))))::int as pricing,
         count(*) filter (where exists (select 1 from analytics_events e where e.account_id = c.account_id and e.name = 'action' and e.feature = 'membership' and e.props ->> 'kind' = 'checkout_started')
                           or exists (select 1 from orders o where o.account_id = c.account_id and o.product_kind in ('plus', 'art')))::int as checkout,
         count(*) filter (where exists (select 1 from orders o where o.account_id = c.account_id and o.product_kind in ('plus', 'art') and o.approved_at is not null))::int as paid
       from cohort c`,
      [r.from, r.to]
    );
    const x = q.rows[0];
    const steps = ['visited', 'activity', 'returned', 'pricing', 'checkout', 'paid'].map((key) => ({ step: key, people: hide(x[key]), rateOfStart: x.visited >= minCohort && x[key] >= minCohort ? pct(x[key], x.visited) : null }));
    return { range: r, minCohort, steps, suppressed: x.visited < minCohort };
  }

  /** Anonymous totals over the period for one action's details (DIMS), small groups hidden. */
  async function aggregateTotals(r, feature, kind, dim) {
    const q = await db.query('select value, sum(n)::int as n from analytics_aggregates where day between $1 and $2 and feature = $3 and kind = $4 and dim = $5 group by value', [r.from, r.to, feature, kind, dim]);
    return Object.fromEntries(q.rows.map((x) => [x.value, x.n]));
  }

  /** My Programs: enrollment, progress and completion, per program from anonymous totals. */
  async function programs(query) {
    const r = range(query);
    const [started, completed, daysDone, byDayNumber] = await Promise.all([
      aggregateTotals(r, 'programs', 'started', 'program'),
      aggregateTotals(r, 'programs', 'completed', 'program'),
      aggregateTotals(r, 'programs', 'day_completed', 'program'),
      aggregateTotals(r, 'programs', 'day_completed', 'day'),
    ]);
    const people = await db.query(
      `select count(distinct account_id) filter (where props ->> 'kind' = 'started')::int as enrolled,
              count(distinct account_id) filter (where props ->> 'kind' = 'day_completed')::int as active,
              count(distinct account_id) filter (where props ->> 'kind' = 'completed')::int as finished,
              count(*) filter (where props ->> 'kind' = 'paused')::int as pauses
       from analytics_events where name = 'action' and feature = 'programs' and occurred_at >= $1 and occurred_at < $2`,
      tsRange(r)
    );
    const p = people.rows[0];
    const list = PROGRAM_IDS.map((id) => {
      const s = started[id] || 0;
      const c = completed[id] || 0;
      const small = s < minCohort;
      return { program: id, started: hide(s), completed: small ? null : hide(c), completionRate: small ? null : pct(c, s), daysCompleted: small ? null : daysDone[id] || 0, avgDaysPerStart: small ? null : Math.round(((daysDone[id] || 0) / s) * 10) / 10, suppressed: small };
    });
    // How far people get: completions of day 1…7 across all programs (small numbers hidden).
    const progress = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ day: n, completions: hide(byDayNumber[String(n)] || 0) }));
    return { range: r, minCohort, programs: list, progress, people: { enrolled: hide(p.enrolled), activeInPrograms: hide(p.active), finished: hide(p.finished), completionRate: p.enrolled >= minCohort ? pct(p.finished, p.enrolled) : null, pauses: p.enrolled >= minCohort ? p.pauses : null } };
  }

  /** What people chose (first-launch option, sound modes and tracks, calm exercises, badges): anonymous totals only. */
  async function choices(query) {
    const r = range(query);
    const shape = (o) => Object.entries(o).map(([value, n]) => ({ value, n: hide(n) })).sort((a, b) => (b.n || 0) - (a.n || 0));
    const [options, modes, tracks, exercises, badges] = await Promise.all([
      aggregateTotals(r, 'onboarding', 'option_selected', 'choice'),
      aggregateTotals(r, 'sound', 'playback_started', 'mode'),
      aggregateTotals(r, 'sound', 'playback_started', 'track'),
      aggregateTotals(r, 'calm', 'exercise_completed', 'exercise'),
      aggregateTotals(r, 'badges', 'earned', 'badge'),
    ]);
    const onboarding = await db.query(
      `select count(distinct account_id) filter (where props ->> 'kind' = 'started')::int as started,
              count(distinct account_id) filter (where props ->> 'kind' = 'option_selected')::int as chose,
              count(distinct account_id) filter (where props ->> 'kind' = 'completed')::int as completed,
              count(distinct account_id) filter (where props ->> 'kind' = 'exited')::int as exited
       from analytics_events where name = 'action' and feature = 'onboarding' and occurred_at >= $1 and occurred_at < $2`,
      tsRange(r)
    );
    const o = onboarding.rows[0];
    return {
      range: r,
      minCohort,
      onboarding: { started: hide(o.started), choseOption: hide(o.chose), firstActivity: hide(o.completed), leftWithoutChoosing: hide(o.exited), options: shape(options) },
      sound: { modes: shape(modes), tracks: shape(tracks).slice(0, 12) },
      calmExercises: shape(exercises),
      badges: shape(badges),
    };
  }

  /**
   * Community: active rooms, participation, per language. From the community
   * tables, counted over the period; per-language groups with fewer than
   * minCohort writers are hidden (no single person's activity shows).
   */
  async function communityStats(query) {
    const r = range(query);
    const [from, to] = tsRange(r);
    const totals = await db.query(
      `select count(distinct room_id)::int as active_rooms, count(*)::int as messages, count(distinct author_account_id)::int as writers
       from community_messages where author_kind = 'member' and status in ('visible', 'removed', 'deleted') and created_at >= $1 and created_at < $2`,
      [from, to]
    );
    const byLang = await db.query(
      `select r.language, count(distinct m.room_id)::int as active_rooms, count(*)::int as messages, count(distinct m.author_account_id)::int as writers
       from community_messages m join community_rooms r on r.id = m.room_id
       where m.author_kind = 'member' and m.created_at >= $1 and m.created_at < $2 group by r.language`,
      [from, to]
    );
    const joins = await db.query('select count(*)::int as n from room_memberships where joined_at >= $1 and joined_at < $2', [from, to]);
    const reports = await db.query(
      `select r2.language, count(*)::int as reports, count(*) filter (where rp.status = 'open')::int as open,
              avg(extract(epoch from (rp.resolved_at - rp.created_at)) / 3600) filter (where rp.resolved_at is not null) as hours
       from reports rp left join community_rooms r2 on r2.id = rp.room_id where rp.created_at >= $1 and rp.created_at < $2 group by r2.language`,
      [from, to]
    ).catch(() => ({ rows: [] }));
    const rep = new Map(reports.rows.map((x) => [x.language, x]));
    const t = totals.rows[0];
    return {
      range: r,
      minCohort,
      activeRooms: t.active_rooms,
      totalRooms: (await db.query('select count(*)::int as n from community_rooms where not is_archived')).rows[0].n,
      messages: t.writers >= minCohort ? t.messages : null,
      writers: hide(t.writers),
      joins: joins.rows[0].n,
      languages: byLang.rows
        .map((x) => {
          const small = x.writers < minCohort;
          const rp = rep.get(x.language);
          return { language: x.language, activeRooms: x.active_rooms, messages: small ? null : x.messages, writers: hide(x.writers), suppressed: small, reports: rp?.reports ?? 0, openReports: rp?.open ?? 0, avgHoursToResolve: rp?.hours == null ? null : Math.round(Number(rp.hours) * 10) / 10 };
        })
        .sort((a, b) => b.activeRooms - a.activeRooms),
    };
  }

  /**
   * Business, from the payment records (Flitt-verified orders) of the period:
   * paid conversions, revenue, professional trial → paid, and Plus churn
   * (periods that ended in the range and were not renewed within 7 days).
   */
  async function business(query) {
    const r = range(query);
    const [from, to] = tsRange(r);
    const now = clock.now();
    const paid = await db.query(
      `select count(*)::int as orders, count(distinct account_id)::int as payers, coalesce(sum(amount_minor), 0)::bigint as minor, currency
       from orders where approved_at >= $1 and approved_at < $2 and status in ('approved', 'partially_reversed') and product_kind in ('plus', 'art') group by currency`,
      [from, to]
    );
    const firstTime = await db.query(
      `with firsts as (select account_id, min(approved_at) as first_paid from orders where approved_at is not null and product_kind in ('plus', 'art') and account_id is not null group by account_id)
       select count(*)::int as n from firsts where first_paid >= $1 and first_paid < $2`,
      [from, to]
    );
    const newAccounts = await db.query('select count(*)::int as n from accounts where created_at >= $1 and created_at < $2', [from, to]);
    const convertedNew = await db.query(
      `select count(distinct a.id)::int as n from accounts a join orders o on o.account_id = a.id
       where a.created_at >= $1 and a.created_at < $2 and o.approved_at is not null and o.product_kind in ('plus', 'art')`,
      [from, to]
    );
    const refunds = await db.query("select count(*)::int as n from orders where status in ('reversed', 'partially_reversed') and updated_at >= $1 and updated_at < $2", [from, to]);
    const failed = await db.query("select count(*)::int as n from orders where status in ('declined', 'expired', 'error') and updated_at >= $1 and updated_at < $2 and product_kind in ('plus', 'art')", [from, to]);
    // Plus coverage periods per account (renewals extend from the current end, like entitlements.mjs).
    const plus = await db.query("select account_id, approved_at, duration_days from orders where product_kind = 'plus' and status = 'approved' and approved_at is not null and account_id is not null order by account_id, approved_at");
    let ended = 0;
    let renewed = 0;
    const GRACE = 7 * DAY;
    const byAccount = new Map();
    for (const o of plus.rows) {
      if (!byAccount.has(o.account_id)) byAccount.set(o.account_id, []);
      byAccount.get(o.account_id).push({ at: ms(o.approved_at), days: Number(o.duration_days) || 0 });
    }
    for (const list of byAccount.values()) {
      let end = 0;
      const ends = [];
      for (const o of list) {
        if (end && o.at > end + GRACE) ends.push({ end, renewed: false });
        else if (end && o.at > end) ends.push({ end, renewed: true });
        end = Math.max(end, o.at) + o.days * DAY;
      }
      ends.push({ end, renewed: false, last: true });
      for (const e of ends) {
        if (e.end < dayMs(r.from) || e.end >= dayMs(r.to) + DAY || e.end > now) continue;
        if (e.last && now < e.end + GRACE) continue; // still inside the renewal window
        ended += 1;
        if (e.renewed) renewed += 1;
      }
    }
    const trials = await db.query(
      `select count(*)::int as ended,
              count(*) filter (where exists (select 1 from professional_memberships p2 where p2.professional_id = t.professional_id and p2.kind = 'paid' and p2.starts_at >= t.starts_at and p2.created_at <= t.ends_at + interval '14 days'))::int as converted
       from professional_memberships t where t.kind = 'trial' and t.ends_at >= $1 and t.ends_at < $2 and t.ends_at <= $3`,
      [from, to, ts(now)]
    ).catch(() => ({ rows: [{ ended: 0, converted: 0 }] }));
    const tr = trials.rows[0];
    return {
      range: r,
      mode: 'test',
      revenue: paid.rows.map((x) => ({ currency: x.currency, minor: Number(x.minor), orders: x.orders, payers: x.payers })),
      firstTimePayers: firstTime.rows[0].n,
      newAccounts: newAccounts.rows[0].n,
      newAccountsWhoPaid: convertedNew.rows[0].n,
      paidConversionRate: pct(convertedNew.rows[0].n, newAccounts.rows[0].n),
      refunds: refunds.rows[0].n,
      failedOrExpiredPayments: failed.rows[0].n,
      plusChurn: { periodsEnded: ended, renewed, churned: ended - renewed, churnRate: ended ? pct(ended - renewed, ended) : null },
      // Consumers have no free trial (Plus is prepaid, renewed by hand); the professional membership does.
      professionalTrials: { ended: tr.ended, convertedToPaid: tr.converted, conversionRate: tr.ended ? pct(tr.converted, tr.ended) : null },
    };
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

  return { ingest, setOptOut, recordServerAction, overview, features, retention, retentionDays, activation, funnel, programs, choices, communityStats, business, exportCsv, usageFor, cleanup, minCohort };
}

export function analyticsFor(deps) {
  deps.analytics ||= createAnalytics({ db: deps.db, clock: deps.clock, config: deps.config, settings: settingsFor(deps) });
  return deps.analytics;
}

export function mountAnalytics(app, deps) {
  const a = analyticsFor(deps);
  // Server-confirmed payments (Flitt's verified status), never what the app says.
  onOrderStatusChange(async (order) => {
    if (!order?.accountId) return;
    if (order.status === 'approved') await a.recordServerAction(order.accountId, 'membership', 'purchase_confirmed', order.id);
    else if (['declined', 'expired', 'error'].includes(order.status)) await a.recordServerAction(order.accountId, 'membership', 'payment_failed', order.id);
  });
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const json = express.json({ limit: '32kb' });
  app.post('/api/events', json, auth, handle(async (req, res) => {
    const out = await a.ingest(req.account, req.body);
    if (out.error === 'rate_limited') res.status(429);
    return out;
  }));
  app.put('/api/account/privacy', json, auth, handle((req) => a.setOptOut(req.account, req.body?.analytics === false)));
  app.get('/api/account/privacy', auth, handle(async (req) => {
    const r = await deps.db.query('select analytics_opt_out, analytics_choice_at from accounts where id = $1', [req.account.id]);
    const row = r.rows[0] || {};
    return { analytics: !row.analytics_opt_out, choice: row.analytics_choice_at ? (row.analytics_opt_out ? 'off' : 'on') : row.analytics_opt_out ? null : 'on' };
  }));

  const staff = staffFor(deps);
  const r = express.Router();
  const can = (p) => [auth, staff.guard(p)];
  r.get('/analytics/overview', ...can('analytics.view'), handle((req) => a.overview(req.query)));
  r.get('/analytics/features', ...can('analytics.view'), handle((req) => a.features(req.query)));
  r.get('/analytics/retention', ...can('analytics.view'), handle((req) => a.retention(req.query)));
  r.get('/analytics/retention-days', ...can('analytics.view'), handle((req) => a.retentionDays(req.query)));
  r.get('/analytics/activation', ...can('analytics.view'), handle((req) => a.activation(req.query)));
  r.get('/analytics/funnel', ...can('analytics.view'), handle((req) => a.funnel(req.query)));
  r.get('/analytics/programs', ...can('analytics.view'), handle((req) => a.programs(req.query)));
  r.get('/analytics/choices', ...can('analytics.view'), handle((req) => a.choices(req.query)));
  r.get('/analytics/community', ...can('community.view'), handle((req) => a.communityStats(req.query)));
  // Revenue is finance information (the analyst and finance roles have it).
  r.get('/analytics/business', ...can('finance.view'), handle((req) => a.business(req.query)));
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
