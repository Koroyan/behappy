// Run: node --test server/test/admin.test.mjs
// Admin control center: staff security (roles, step-up, two-step codes,
// suspension), settings, and the authorization matrix for every permission.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { mountAdmin } from '../admin/routes.mjs';
import { hotp, stepAt } from '../admin/totp.mjs';
import { mountCommunity } from '../community/index.mjs';
import { mountProfessionals } from '../professional/index.mjs';
import { startTestServer } from './helpers.mjs';

describe('Staff security', () => {
  let t;
  const staffMember = async (role, name = role) => {
    const u = await t.registered(`${name}-${Math.random().toString(36).slice(2, 7)}@example.org`);
    if (role) await t.grantRole(u.accountId, role);
    return u;
  };
  const call = (u, path, method = 'GET', body) => t.api(path, { token: u?.token, method, body });
  const stepUp = async (u, code) => {
    const r = await call(u, '/api/admin/step-up', 'POST', { password: u.password, ...(code ? { code } : {}) });
    assert.equal(r.status, 200, JSON.stringify(r.json));
  };

  before(async () => {
    t = await startTestServer({ extend: [mountCommunity, mountProfessionals, mountAdmin] });
  });
  after(() => t.stop());

  test('two-step codes: setup needs a confirmation, codes are checked, replays refused, new sessions enter a code', async () => {
    const owner = await staffMember('owner');
    const me = await call(owner, '/api/admin/me');
    assert.equal(me.status, 200);
    assert.equal(me.json.mfa.enabled, false);
    assert.ok(me.json.permissions.includes('staff.manage'));
    assert.equal((await call(owner, '/api/admin/mfa/setup', 'POST')).json.error, 'step_up_required');
    await stepUp(owner);
    const setup = await call(owner, '/api/admin/mfa/setup', 'POST');
    assert.equal(setup.status, 200);
    assert.match(setup.json.otpauthUrl, /^otpauth:[/][/]totp[/]/);
    const secret = setup.json.secret;
    const stored = await t.db.query('select secret_ciphertext from staff_mfa where account_id = $1', [owner.accountId]);
    assert.ok(!Buffer.from(stored.rows[0].secret_ciphertext).toString('latin1').includes(secret), 'the secret is stored encrypted');
    const code = () => hotp(secret, stepAt(t.clock.now()));
    const wrong = code() === '000000' ? '111111' : '000000';
    assert.equal((await call(owner, '/api/admin/mfa/enable', 'POST', { code: wrong })).json.error, 'code_wrong');
    const first = code();
    assert.equal((await call(owner, '/api/admin/mfa/enable', 'POST', { code: first })).status, 200);

    // A new sign-in must enter a code before any staff tool opens.
    const login = await t.api('/api/auth/login', { method: 'POST', body: { email: owner.email, password: owner.password } });
    const second = { ...owner, token: login.json.token };
    assert.equal((await call(second, '/api/admin/settings')).json.error, 'mfa_code_required');
    assert.equal((await call(second, '/api/admin/mfa/verify', 'POST', { code: first })).json.error, 'code_wrong', 'a used code is refused');
    t.clock.advance(30 * 1000);
    assert.equal((await call(second, '/api/admin/mfa/verify', 'POST', { code: code() })).status, 200);
    assert.equal((await call(second, '/api/admin/settings')).status, 200);
    // The confirmation for sensitive actions now needs the code as well.
    t.clock.advance(30 * 1000);
    assert.equal((await call(second, '/api/admin/step-up', 'POST', { password: owner.password })).json.error, 'code_wrong');
    await stepUp(second, code());
    const events = await t.db.query("select kind from auth_events where account_id = $1 order by id", [owner.accountId]);
    const kinds = events.rows.map((r) => r.kind);
    for (const k of ['step_up_ok', 'mfa_enabled', 'mfa_failed', 'mfa_ok', 'step_up_failed']) assert.ok(kinds.includes(k), `event ${k}`);
  });

  test('settings: owner-only switches, reasons, confirmation, validation and audit', async () => {
    const owner = await staffMember('owner');
    const admin = await staffMember('admin');
    const analyst = await staffMember('analyst');
    assert.equal((await call(analyst, '/api/admin/settings')).json.error, 'forbidden');
    const list = await call(admin, '/api/admin/settings');
    assert.equal(list.status, 200);
    assert.ok(list.json.settings.find((s) => s.key === 'features.sensitiveAccess' && s.value === false && s.ownerOnly));
    assert.equal((await call(admin, '/api/admin/settings/ai.dailyBudgetUsd', 'PUT', { value: 25, reason: 'pilot budget' })).json.error, 'step_up_required');
    await stepUp(admin);
    assert.equal((await call(admin, '/api/admin/settings/staff.mfaRequired', 'PUT', { value: true, reason: 'policy' })).json.error, 'owner_only');
    assert.equal((await call(admin, '/api/admin/settings/ai.dailyBudgetUsd', 'PUT', { value: 25 })).json.error, 'reason_required');
    assert.equal((await call(admin, '/api/admin/settings/ai.dailyBudgetUsd', 'PUT', { value: 'lots', reason: 'pilot budget' })).json.error, 'bad_value');
    assert.equal((await call(admin, '/api/admin/settings/ai.dailyBudgetUsd', 'PUT', { value: 25, reason: 'pilot budget' })).status, 200);
    const audit = await t.db.query("select metadata from audit_log where action = 'settings.changed' and target_id = 'ai.dailyBudgetUsd'");
    assert.equal(audit.rows[0].metadata.after, 25);
    assert.equal(audit.rows[0].metadata.reason, 'pilot budget');

    // An announcement reaches everyone through /api/account/me.
    const user = await t.newAccount();
    assert.equal((await t.api('/api/account/me', { token: user.token })).json.platform.announcement, null);
    const notice = { active: true, tone: 'info', title: { en: 'Maintenance tonight', ka: 'ტექნიკური სამუშაოები' }, body: { en: 'Rooms may pause for a few minutes.', ka: '' }, until: null };
    assert.equal((await call(admin, '/api/admin/settings/announcement', 'PUT', { value: notice, reason: 'planned maintenance' })).status, 200);
    t.clock.advance(6000);
    assert.equal((await t.api('/api/account/me', { token: user.token })).json.platform.announcement.title.en, 'Maintenance tonight');

    // The owner may require two-step codes for all staff, after enrolling themselves.
    await stepUp(owner);
    assert.equal((await call(owner, '/api/admin/settings/staff.mfaRequired', 'PUT', { value: true, reason: 'staff policy' })).json.error, 'enable_mfa_first');
    const setup = await call(owner, '/api/admin/mfa/setup', 'POST');
    assert.equal((await call(owner, '/api/admin/mfa/enable', 'POST', { code: hotp(setup.json.secret, stepAt(t.clock.now())) })).status, 200);
    assert.equal((await call(owner, '/api/admin/settings/staff.mfaRequired', 'PUT', { value: true, reason: 'staff policy' })).status, 200);
    t.clock.advance(6000);
    assert.equal((await call(analyst, '/api/admin/overview')).json.error, 'mfa_setup_required');
    assert.equal((await call(analyst, '/api/admin/me')).status, 200, 'enrolment stays reachable');
    assert.equal((await call(owner, '/api/admin/settings/staff.mfaRequired', 'PUT', { value: false, reason: 'test cleanup' })).status, 200);
    t.clock.advance(6000);
  });

  test('staff suspension, no self-changes, and session revocation by security staff', async () => {
    const owner = await staffMember('owner');
    const admin = await staffMember('admin');
    await stepUp(owner);
    assert.equal((await call(owner, `/api/admin/staff/${owner.accountId}/suspend`, 'POST', { reason: 'test' })).json.error, 'cannot_change_own_roles');
    assert.equal((await call(owner, `/api/admin/staff/${admin.accountId}/suspend`, 'POST', {})).json.error, 'reason_required');
    assert.equal((await call(owner, `/api/admin/staff/${admin.accountId}/suspend`, 'POST', { reason: 'laptop lost' })).status, 200);
    assert.equal((await call(admin, '/api/admin/me')).json.error, 'staff_suspended');
    assert.equal((await call(admin, '/api/moderation/summary')).json.error, 'staff_suspended');
    assert.equal((await t.api('/api/account/me', { token: admin.token })).json.identity.staffPermissions.length, 0);
    assert.equal((await call(owner, `/api/admin/staff/${admin.accountId}/reinstate`, 'POST', { reason: 'found it' })).status, 200);
    assert.equal((await call(admin, '/api/admin/me')).status, 200);
    const staff = await call(owner, '/api/admin/staff');
    assert.ok(staff.json.staff.find((s) => s.id === admin.accountId && s.primaryRole === 'admin'));
    // Ending every session of a staff member (incident response).
    assert.equal((await call(owner, `/api/admin/staff/${admin.accountId}/sessions/revoke`, 'POST', { reason: 'suspicious sign-in' })).status, 200);
    assert.equal((await call(admin, '/api/admin/me')).status, 401);
  });

  test('sign-in events are recorded without passwords; IPs only as keyed hashes', async () => {
    const u = await t.registered(`events-${Date.now()}@example.org`);
    await t.api('/api/auth/login', { method: 'POST', body: { email: u.email, password: 'not-the-password-1' } });
    await t.api('/api/auth/login', { method: 'POST', body: { email: 'nobody-here@example.org', password: 'whatever-123' } });
    const rows = await t.db.query("select kind, account_id, ip_hash, metadata::text as meta from auth_events where kind in ('login_failed', 'login_ok') order by id desc limit 10");
    const failed = rows.rows.find((r) => r.kind === 'login_failed' && r.account_id === u.accountId);
    assert.ok(failed);
    assert.ok(!failed.meta.includes('not-the-password-1'));
    assert.ok(failed.ip_hash && !failed.ip_hash.includes('127.0.0.1'));
    assert.ok(rows.rows.find((r) => r.kind === 'login_failed' && r.account_id === null));
  });
});

describe('Analytics', () => {
  let t;
  const call = (u, path, method = 'GET', body) => t.api(path, { token: u?.token, method, body });
  let seq = 0;
  const ev = (name, extra = {}) => ({ id: `ev${Date.now().toString(36)}${(seq += 1).toString().padStart(4, '0')}`, session: 'sess_test_0001', at: t.clock.now(), name, ...extra });
  const send = (u, events, platform = 'web') => call(u, '/api/events', 'POST', { events, platform, appVersion: '3.1.0' });

  before(async () => {
    const { mountAnalytics } = await import('../analytics/index.mjs');
    t = await startTestServer({ extend: [mountCommunity, mountProfessionals, mountAnalytics, mountAdmin] });
  });
  after(() => t.stop());

  test('only allowlisted events with enum or number fields are kept; free text never is', async () => {
    const u = await t.newAccount();
    const res = await send(u, [
      ev('session_start', { props: { kind: 'cold' } }),
      ev('engagement', { feature: 'journal', props: { seconds: 60 } }),
      ev('action', { feature: 'journal', props: { kind: 'entry_saved', text: 'my private thoughts' } }),
      ev('action', { feature: 'journal', props: { kind: 'I felt sad today' } }),
      ev('journal_text', { feature: 'journal', props: { body: 'secret' } }),
      ev('screen_view', { feature: 'admin' }),
      ev('engagement', { feature: 'anulia', props: { seconds: 99999 } }),
      ev('screen_view', { feature: 'today', at: t.clock.now() - 30 * 86400000 }),
      { name: 'screen_view', feature: 'today', id: 'x', session: 'sess_test_0001', at: t.clock.now() },
    ]);
    assert.equal(res.status, 200);
    assert.equal(res.json.accepted, 3);
    const rows = await t.db.query('select name, feature, props::text as props from analytics_events where account_id = $1 order by id', [u.accountId]);
    assert.deepEqual(rows.rows.map((r) => r.name), ['session_start', 'engagement', 'action']);
    for (const r of rows.rows) assert.ok(!/private|sad|secret/.test(r.props), 'no free text stored');
    assert.equal(rows.rows[2].props, '{"kind": "entry_saved"}');
    // The same event id twice is counted once.
    const dup = ev('screen_view', { feature: 'today' });
    await send(u, [dup]);
    assert.equal((await send(u, [dup])).json.accepted, 0);
    const daily = await t.db.query('select active_seconds, sessions, actions, events, features from analytics_daily where account_id = $1', [u.accountId]);
    assert.equal(daily.rows[0].active_seconds, 60);
    assert.equal(daily.rows[0].sessions, 1);
    assert.equal(daily.rows[0].actions, 1);
    assert.deepEqual(daily.rows[0].features, { journal: 60 });
  });

  test('aggregates hide small groups; analysts see them, support does not; exports are confirmed and logged', async () => {
    const people = [];
    for (let i = 0; i < 6; i += 1) people.push(await t.newAccount());
    for (const p of people) await send(p, [ev('session_start'), ev('engagement', { feature: 'community', props: { seconds: 120 } }), ev('action', { feature: 'community', props: { kind: 'room_joined' } })], 'android');
    for (const p of people.slice(0, 2)) await send(p, [ev('engagement', { feature: 'art', props: { seconds: 300 } })], 'android');
    const analyst = await t.registered(`analyst-${Date.now()}@example.org`);
    await t.grantRole(analyst.accountId, 'analyst');
    const support = await t.registered(`support-${Date.now()}@example.org`);
    await t.grantRole(support.accountId, 'support');
    assert.equal((await call(support, '/api/admin/analytics/overview')).json.error, 'forbidden');
    const o = await call(analyst, '/api/admin/analytics/overview');
    assert.equal(o.status, 200);
    assert.ok(o.json.current.activeUsers >= 6);
    assert.ok(o.json.activeNow.dau >= 6);
    assert.equal(o.json.daily.length, 30);
    const f = await call(analyst, '/api/admin/analytics/features');
    const community = f.json.features.find((x) => x.feature === 'community');
    assert.equal(community.users, 6);
    assert.equal(community.minutes, 12);
    assert.equal(community.actions.find((a) => a.kind === 'room_joined').people, 6);
    const art = f.json.features.find((x) => x.feature === 'art');
    assert.equal(art.suppressed, true, 'fewer than 5 people: hidden');
    assert.equal(art.users, null);
    const ret = await call(analyst, '/api/admin/analytics/retention');
    assert.equal(ret.status, 200);
    assert.ok(Array.isArray(ret.json.cohorts));
    // Export: aggregated rows only, a fresh confirmation, an audit entry.
    assert.equal((await call(analyst, '/api/admin/analytics/export')).json.error, 'step_up_required');
    await call(analyst, '/api/admin/step-up', 'POST', { password: analyst.password });
    const csv = await fetch(`${t.base}/api/admin/analytics/export`, { headers: { Authorization: `Bearer ${analyst.token}` } });
    const text = await csv.text();
    assert.match(text, /^day,active_users,active_minutes,sessions,new_accounts/);
    assert.ok(!text.includes('acc_'), 'no account ids in exports');
    assert.equal((await t.db.query("select count(*)::int as n from audit_log where action = 'analytics.exported' and actor_account_id = $1", [analyst.accountId])).rows[0].n, 1);
  });

  test('switching analytics off stops collection and deletes what was kept; the owner can stop it for everyone', async () => {
    const u = await t.newAccount();
    await send(u, [ev('engagement', { feature: 'breathing', props: { seconds: 90 } })]);
    assert.equal((await t.db.query('select count(*)::int as n from analytics_events where account_id = $1', [u.accountId])).rows[0].n, 1);
    assert.equal((await call(u, '/api/account/privacy', 'PUT', { analytics: false })).json.analytics, false);
    assert.equal((await t.db.query('select count(*)::int as n from analytics_events where account_id = $1', [u.accountId])).rows[0].n, 0);
    assert.equal((await t.db.query('select count(*)::int as n from analytics_daily where account_id = $1', [u.accountId])).rows[0].n, 0);
    assert.equal((await send(u, [ev('screen_view', { feature: 'today' })])).json.disabled, 'opted_out');
    assert.equal((await call(u, '/api/account/me')).json.identity.analytics, false);
    assert.equal((await call(u, '/api/account/privacy', 'PUT', { analytics: true })).json.analytics, true);

    const owner = await t.registered(`owner-an-${Date.now()}@example.org`);
    await t.grantRole(owner.accountId, 'owner');
    await call(owner, '/api/admin/step-up', 'POST', { password: owner.password });
    assert.equal((await call(owner, '/api/admin/settings/analytics.enabled', 'PUT', { value: false, reason: 'privacy review' })).status, 200);
    t.clock.advance(6000);
    assert.equal((await send(u, [ev('screen_view', { feature: 'today' })])).json.disabled, 'platform');
    await call(owner, '/api/admin/settings/analytics.enabled', 'PUT', { value: true, reason: 'review done' });
    t.clock.advance(6000);
  });
});
