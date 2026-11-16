// Activation analytics (consent, anonymous totals, server-confirmed events,
// dashboards) and community discovery (real activity, scheduled discussions
// with real hosts, honest moderation notes).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { mountAdmin } from '../admin/routes.mjs';
import { mountCommunityAdmin } from '../admin/community.mjs';
import { mountAnalytics, sanitizeEvent } from '../analytics/index.mjs';
import { mountCommunity } from '../community/index.mjs';
import { activityLevel } from '../community/discovery.mjs';
import { applyFlittUpdate } from '../payments.mjs';
import { mountProfessionals } from '../professional/index.mjs';
import { runAllJobs } from '../scheduler.mjs';
import { sign } from '../flitt.mjs';
import { startTestServer } from './helpers.mjs';

const DAY = 24 * 60 * 60 * 1000;

describe('Usage statistics: consent and privacy', () => {
  let t;
  let seq = 0;
  const call = (u, path, method = 'GET', body) => t.api(path, { token: u?.token, method, body });
  const ev = (name, extra = {}) => ({ id: `jv${Date.now().toString(36)}${(seq += 1).toString().padStart(5, '0')}`, session: 'sess_journey_1', at: t.clock.now(), name, ...extra });
  const send = (u, events) => call(u, '/api/events', 'POST', { events, platform: 'web', appVersion: '4.0.0' });

  before(async () => {
    t = await startTestServer({ extend: [mountCommunity, mountProfessionals, mountAnalytics, mountAdmin] });
  });
  after(() => t.stop());

  test('a new account sends nothing until the person says yes; no keeps it off and deletes nothing to delete', async () => {
    const u = await t.newAccount();
    const me = await call(u, '/api/account/me');
    assert.equal(me.json.identity.analytics, false);
    assert.equal(me.json.identity.analyticsChoice, null, 'never asked');
    const r = await send(u, [ev('screen_view', { feature: 'today' })]);
    assert.equal(r.json.disabled, 'pending');
    assert.equal((await t.db.query('select count(*)::int as n from analytics_events where account_id = $1', [u.accountId])).rows[0].n, 0, 'nothing stored before the answer');
    // Yes: collection starts.
    assert.deepEqual((await call(u, '/api/account/privacy', 'PUT', { analytics: true })).json, { analytics: true, choice: 'on' });
    assert.equal((await send(u, [ev('screen_view', { feature: 'programs' })])).json.accepted, 1);
    assert.equal((await call(u, '/api/account/me')).json.identity.analyticsChoice, 'on');
    // No later: opted out (not "pending" again).
    await call(u, '/api/account/privacy', 'PUT', { analytics: false });
    assert.equal((await send(u, [ev('screen_view', { feature: 'today' })])).json.disabled, 'opted_out');
    assert.equal((await call(u, '/api/account/privacy')).json.choice, 'off');
  });

  test('which option or program someone chose never stays with their account: only anonymous daily totals', async () => {
    const u = await t.newAccount();
    await call(u, '/api/account/privacy', 'PUT', { analytics: true });
    const res = await send(u, [
      ev('action', { feature: 'onboarding', props: { kind: 'option_selected', choice: 'sleep' } }),
      ev('action', { feature: 'programs', props: { kind: 'started', program: 'calm' } }),
      ev('action', { feature: 'programs', props: { kind: 'day_completed', program: 'calm', day: 3 } }),
      ev('action', { feature: 'sound', props: { kind: 'playback_started', mode: 'sleep', track: 'rain-piano' } }),
      ev('action', { feature: 'programs', props: { kind: 'started', program: 'not-a-program' } }),
      ev('action', { feature: 'onboarding', props: { kind: 'option_selected', choice: 'I feel anxious' } }),
    ]);
    assert.equal(res.json.accepted, 6, 'unknown details are dropped, the action itself is kept');
    const rows = await t.db.query("select props::text as p from analytics_events where account_id = $1 and name = 'action' order by id", [u.accountId]);
    for (const r of rows.rows) assert.ok(!/sleep|calm|rain|anxious|choice|program|track|mode/.test(r.p), `no detail with the account: ${r.p}`);
    const agg = await t.db.query('select feature, kind, dim, value, n from analytics_aggregates order by feature, kind, dim, value');
    const find = (f, k, d, v) => agg.rows.find((x) => x.feature === f && x.kind === k && x.dim === d && x.value === v)?.n || 0;
    assert.equal(find('onboarding', 'option_selected', 'choice', 'sleep'), 1);
    assert.equal(find('programs', 'started', 'program', 'calm'), 1);
    assert.equal(find('programs', 'day_completed', 'day', '3'), 1);
    assert.equal(find('sound', 'playback_started', 'track', 'rain-piano'), 1);
    assert.ok(!agg.rows.some((x) => /anxious|not-a-program/.test(x.value)), 'free text never becomes a total');
    assert.ok(!Object.keys(agg.rows[0]).includes('account_id'), 'totals have no account column');
    // The same event sent twice counts once (also in the totals).
    const again = ev('action', { feature: 'programs', props: { kind: 'completed', program: 'sleep' } });
    await send(u, [again]);
    await send(u, [again]);
    assert.equal((await t.db.query("select n from analytics_aggregates where feature = 'programs' and kind = 'completed' and value = 'sleep'")).rows[0].n, 1);
  });

  test('purchases and failed payments come only from Flitt-verified status, never from the app', async () => {
    assert.equal(sanitizeEvent({ id: 'evx00001', session: 'sess_0001', at: Date.now(), name: 'action', feature: 'membership', props: { kind: 'purchase_confirmed' } }, Date.now()), null);
    const u = await t.newAccount();
    await call(u, '/api/account/privacy', 'PUT', { analytics: true });
    assert.equal((await send(u, [ev('action', { feature: 'membership', props: { kind: 'purchase_confirmed' } })])).json.accepted, 0);
    // A real (test-mode) checkout, approved by a signed Flitt callback.
    const co = await call(u, '/api/payments/checkout', 'POST', { productId: 'plus_30', lang: 'en' });
    assert.equal(co.status, 201);
    const order = co.json.order;
    const payload = { order_id: order.id, merchant_id: t.config.flitt.merchantId, order_status: 'approved', amount: order.amountMinor, currency: order.currency, payment_id: '7001' };
    payload.signature = sign(t.config.flitt.secretKey, payload);
    const applied = await applyFlittUpdate({ db: t.db, config: t.config, payload, via: 'callback', now: t.clock.now() });
    assert.equal(applied.ok, true);
    const rows = await t.db.query("select props ->> 'kind' as kind from analytics_events where account_id = $1 and feature = 'membership'", [u.accountId]);
    assert.deepEqual(rows.rows.map((r) => r.kind), ['purchase_confirmed']);
    // A second callback for the same order is not a second purchase.
    await applyFlittUpdate({ db: t.db, config: t.config, payload, via: 'callback', now: t.clock.now() });
    assert.equal((await t.db.query("select count(*)::int as n from analytics_events where account_id = $1 and feature = 'membership'", [u.accountId])).rows[0].n, 1);
    // Someone who said no: nothing is recorded, the payment still works.
    const v = await t.newAccount();
    const co2 = await call(v, '/api/payments/checkout', 'POST', { productId: 'plus_30', lang: 'en' });
    const p2 = { order_id: co2.json.order.id, merchant_id: t.config.flitt.merchantId, order_status: 'declined', amount: co2.json.order.amountMinor, currency: co2.json.order.currency };
    p2.signature = sign(t.config.flitt.secretKey, p2);
    assert.equal((await applyFlittUpdate({ db: t.db, config: t.config, payload: p2, via: 'callback', now: t.clock.now() })).ok, true);
    assert.equal((await t.db.query('select count(*)::int as n from analytics_events where account_id = $1', [v.accountId])).rows[0].n, 0);
  });

  test('dashboards: activation, D1/D7 retention, funnel, programs and choices hide small groups', async () => {
    const analyst = await t.registered(`an-j-${Date.now()}@example.org`);
    await t.grantRole(analyst.accountId, 'analyst');
    const people = [];
    for (let i = 0; i < 6; i += 1) {
      const p = await t.newAccount();
      await call(p, '/api/account/privacy', 'PUT', { analytics: true });
      people.push(p);
    }
    // Day 0: everyone opens BeHappy; five do something meaningful; five start the sleep program.
    for (const [i, p] of people.entries()) {
      const evs = [ev('session_start'), ev('screen_view', { feature: 'today' }), ev('action', { feature: 'onboarding', props: { kind: 'option_selected', choice: 'sleep' } })];
      if (i < 5) evs.push(ev('action', { feature: 'calm', props: { kind: 'exercise_completed', exercise: 'breathe' } }), ev('action', { feature: 'programs', props: { kind: 'started', program: 'sleep' } }));
      await send(p, evs);
    }
    // Day 1: five come back and view pricing.
    t.clock.advance(DAY);
    for (const p of people.slice(0, 5)) await send(p, [ev('session_start'), ev('screen_view', { feature: 'membership' })]);
    const q = { from: new Date(t.clock.now() - DAY).toISOString().slice(0, 10), to: new Date(t.clock.now()).toISOString().slice(0, 10) };
    const qs = `?from=${q.from}&to=${q.to}`;
    const act = (await call(analyst, `/api/admin/analytics/activation${qs}`)).json;
    assert.ok(act.newPeople >= 6);
    assert.ok(act.activatedFirstDay >= 5);
    assert.ok(act.rateFirstDay > 0 && act.rateFirstDay <= 100);
    const ret = (await call(analyst, `/api/admin/analytics/retention-days${qs}`)).json;
    const d1 = ret.days.find((d) => d.day === 1);
    assert.ok(d1.eligible >= 6);
    assert.ok(d1.rate >= 50);
    const fun = (await call(analyst, `/api/admin/analytics/funnel${qs}`)).json;
    const step = (k) => fun.steps.find((s) => s.step === k);
    assert.ok(step('visited').people >= 6);
    assert.ok(step('activity').people >= 5);
    assert.ok(step('returned').people >= 5);
    assert.ok(step('pricing').people >= 5);
    assert.equal(step('paid').people, null, 'fewer than five payers: hidden');
    const prog = (await call(analyst, `/api/admin/analytics/programs${qs}`)).json;
    const sleep = prog.programs.find((p) => p.program === 'sleep');
    assert.ok(sleep.started >= 5);
    assert.equal(prog.programs.find((p) => p.program === 'habits').suppressed, true);
    const ch = (await call(analyst, `/api/admin/analytics/choices${qs}`)).json;
    assert.ok(ch.onboarding.options.find((o) => o.value === 'sleep').n >= 6);
    assert.equal(ch.calmExercises.find((o) => o.value === 'breathe').n, 5);
    // Business numbers are finance information: analysts and finance only.
    const support = await t.registered(`sup-j-${Date.now()}@example.org`);
    await t.grantRole(support.accountId, 'support');
    assert.equal((await call(support, '/api/admin/analytics/business')).json.error, 'forbidden');
    const biz = (await call(analyst, `/api/admin/analytics/business${qs}`)).json;
    assert.equal(biz.mode, 'test');
    assert.ok(Array.isArray(biz.revenue));
    assert.ok('churnRate' in biz.plusChurn);
  });
});

describe('Community discovery', () => {
  let t;
  const call = (u, path, method = 'GET', body) => t.api(path, { token: u?.token, method, body });
  const member = async (name) => {
    const u = await t.registered(`${name}-${Date.now()}@example.org`);
    assert.equal((await call(u, '/api/community/profile', 'PUT', { pseudonym: `${name}${Math.floor(Math.random() * 1000)}`, acceptGuidelines: true })).status, 200);
    return u;
  };

  before(async () => {
    t = await startTestServer({ extend: [mountCommunity, mountProfessionals, mountAdmin, mountCommunityAdmin] });
  });
  after(() => t.stop());

  test('activity levels come from real member messages: today, this week, quiet', () => {
    const now = Date.now();
    assert.equal(activityLevel(null, now), 'quiet');
    assert.equal(activityLevel(now - 3600000, now), 'today');
    assert.equal(activityLevel(now - 3 * DAY, now), 'week');
    assert.equal(activityLevel(now - 8 * DAY, now), 'quiet');
  });

  test('rooms with real messages come first; quiet ones are folded, not hidden or faked', async () => {
    const a = await member('Nino');
    // Nothing written yet: every Georgian room is quiet; nothing is invented.
    const empty = (await call(a, '/api/community/discover?lang=ka&topic=sleep')).json;
    assert.equal(empty.active.length, 0);
    assert.equal(empty.topicRoom.id, 'sleep:ka');
    assert.equal(empty.topicRoom.activity, 'quiet');
    assert.equal(empty.quiet.length, 12, 'all other topics stay available');
    assert.equal(empty.moderation.coverage, 'limited', 'no moderator reads Georgian yet: said honestly');
    // A real message makes a room active (Bea's replies and notices would not).
    await call(a, '/api/community/rooms/stress:ka/join', 'POST', {});
    assert.equal((await call(a, '/api/community/rooms/stress:ka/messages', 'POST', { body: 'დღეს ძალიან დაძაბული დღე მქონდა', nonce: 'n-disc-1' })).status, 200);
    const after1 = (await call(a, '/api/community/discover?lang=ka')).json;
    assert.deepEqual(after1.active.map((r) => r.id), ['stress:ka']);
    assert.equal(after1.active[0].activity, 'today');
    assert.equal(after1.active[0].joined, true);
    assert.ok(!JSON.stringify(after1).includes('დაძაბული'), 'no message text in discovery');
    assert.ok(!('writers' in after1.active[0]) && !('messages' in after1.active[0]), 'no counts of people or messages');
    // A week later it is quiet again.
    t.clock.advance(8 * DAY);
    assert.equal((await call(a, '/api/community/discover?lang=ka')).json.active.length, 0);
    t.clock.advance(-8 * DAY);
  });

  test('the same topic in other languages: only rooms with real activity, nothing translated', async () => {
    const b = await member('Anna');
    await call(b, '/api/community/rooms/sleep:en/join', 'POST', {});
    await call(b, '/api/community/rooms/sleep:en/messages', 'POST', { body: 'I keep waking up at 4am', nonce: 'n-disc-2' });
    const rel = (await call(b, '/api/community/related?topic=sleep&exclude=ka')).json;
    assert.deepEqual(rel.rooms.map((r) => r.id), ['sleep:en']);
    assert.ok(!JSON.stringify(rel).includes('4am'));
    assert.equal((await call(b, '/api/community/related?topic=nope')).status, 400);
  });

  test('moderators who read a language make its coverage "staffed"', async () => {
    const mod = await t.registered(`mod-d-${Date.now()}@example.org`);
    await t.grantRole(mod.accountId, 'moderator');
    await t.db.query("insert into moderator_languages (account_id, language) values ($1, 'ka')", [mod.accountId]);
    const u = await member('Levan');
    assert.equal((await call(u, '/api/community/discover?lang=ka')).json.moderation.coverage, 'staffed');
  });

  test('scheduled discussions: real hosts only, interest is private, a reminder before the start', async () => {
    const admin = await t.registered(`adm-ev-${Date.now()}@example.org`);
    await t.grantRole(admin.accountId, 'admin');
    await call(admin, '/api/admin/step-up', 'POST', { password: admin.password });
    const startsAt = t.clock.now() + 2 * 60 * 60 * 1000;
    const base = { roomId: 'sleep:en', title: 'Sleep and evening worries', description: 'An hour together, led by a moderator.', startsAt, minutes: 60, hostRole: 'moderator' };
    // The AI can't host.
    assert.equal((await call(admin, '/api/admin/community/events', 'POST', { ...base, hostName: 'Bea' })).json.error, 'host_must_be_a_person');
    const created = await call(admin, '/api/admin/community/events', 'POST', { ...base, hostName: 'Mariam (moderator)' });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    const id = created.json.id;
    // Members only, and nobody sees who: the count shows only from three people up.
    const people = [await member('Gio'), await member('Ana'), await member('Dato')];
    const anon = await t.newAccount();
    assert.equal((await call(anon, `/api/community/events/${id}/interest`, 'POST', { on: true })).json.error, 'registration_required');
    assert.equal((await call(people[0], `/api/community/events/${id}/interest`, 'POST', { on: true })).json.interestCount, null);
    await call(people[1], `/api/community/events/${id}/interest`, 'POST', { on: true });
    const third = await call(people[2], `/api/community/events/${id}/interest`, 'POST', { on: true });
    assert.equal(third.json.interestCount, 3);
    const seen = (await call(people[0], '/api/community/discover?lang=en')).json.events.find((e) => e.id === id);
    assert.equal(seen.interested, true);
    assert.equal(seen.host.role, 'moderator');
    assert.ok(!JSON.stringify(seen).includes(people[1].accountId));
    // ~15 minutes before: one reminder to each interested person (once).
    t.clock.advance(2 * 60 * 60 * 1000 - 10 * 60 * 1000);
    await runAllJobs(t.app.locals.deps, t.clock.now());
    await runAllJobs(t.app.locals.deps, t.clock.now());
    const notes = await t.db.query("select account_id from notifications where kind = 'community_event'");
    assert.equal(notes.rowCount, 3);
    // Cancelling tells the interested people.
    const later = await call(admin, '/api/admin/community/events', 'POST', { ...base, startsAt: t.clock.now() + 3 * DAY, hostName: 'Mariam (moderator)' });
    await call(people[0], `/api/community/events/${later.json.id}/interest`, 'POST', { on: true });
    assert.equal((await call(admin, `/api/admin/community/events/${later.json.id}/cancel`, 'POST', { reason: 'host is ill' })).status, 200);
    const cancelled = await t.db.query("select data from notifications where kind = 'community_event' and account_id = $1 order by id desc limit 1", [people[0].accountId]);
    assert.equal(cancelled.rows[0].data.cancelled, true);
    // Staff actions are audited; members can't create discussions.
    assert.equal((await t.db.query("select count(*)::int as n from audit_log where action in ('community.event_created', 'community.event_cancelled')")).rows[0].n, 3);
    assert.equal((await call(people[0], '/api/admin/community/events', 'POST', { ...base, hostName: 'Me' })).status, 403);
  });
});
