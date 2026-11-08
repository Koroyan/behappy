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

describe('Admin operations', () => {
  let t;
  const call = (u, path, method = 'GET', body) => t.api(path, { token: u?.token, method, body });
  const people = {};
  const stepUp = (u) => call(u, '/api/admin/step-up', 'POST', { password: u.password });
  let ROLE_PERMISSIONS;

  before(async () => {
    const { FEATURE_MODULES } = await import('../features.mjs');
    ({ ROLE_PERMISSIONS } = await import('../admin/permissions.mjs'));
    const { makeOpenAiFetch } = await import('./helpers.mjs');
    t = await startTestServer({ extend: FEATURE_MODULES, openai: makeOpenAiFetch() });
    for (const role of ['owner', 'admin', 'verifier', 'moderator', 'finance', 'support', 'analyst']) {
      people[role] = await t.registered(`${role}-${Math.random().toString(36).slice(2, 7)}@example.org`);
      await t.grantRole(people[role].accountId, role);
    }
    people.member = await t.registered(`member-${Math.random().toString(36).slice(2, 7)}@example.org`);
  });
  after(() => t.stop());

  test('authorization matrix: every role reaches exactly what its permissions allow, on every endpoint', async () => {
    const endpoints = [
      ['/api/admin/dashboard', 'dashboard.view'],
      ['/api/admin/users', 'users.view'],
      ['/api/admin/professionals', 'professionals.view'],
      ['/api/admin/pros', 'professionals.view'],
      ['/api/admin/policies', 'professionals.view'],
      ['/api/admin/memberships', 'memberships.view'],
      ['/api/admin/finance', 'finance.view'],
      ['/api/admin/appointments', 'appointments.view'],
      ['/api/admin/community/rooms', 'community.view'],
      ['/api/admin/community/stats', 'community.view'],
      ['/api/admin/moderation/stats', 'moderation.act'],
      ['/api/moderation/summary', 'moderation.act'],
      ['/api/moderation/appeals', 'moderation.appeals'],
      ['/api/admin/safety/incidents', 'safety.view'],
      ['/api/admin/support/tickets', 'support.view'],
      ['/api/admin/ai', 'ai.view'],
      ['/api/admin/ai/prompts', 'ai.view'],
      ['/api/admin/security', 'security.view'],
      ['/api/admin/staff', 'staff.view'],
      ['/api/admin/settings', 'settings.view'],
      ['/api/admin/audit', 'audit.view'],
      ['/api/admin/health', 'system.view'],
      ['/api/admin/analytics/overview', 'analytics.view'],
    ];
    const problems = [];
    for (const [role, u] of Object.entries(people)) {
      const allowed = new Set(ROLE_PERMISSIONS[role] || []);
      for (const [path, perm] of endpoints) {
        const r = await call(u, path);
        const expect = allowed.has(perm) ? 200 : 403;
        if (r.status !== expect) problems.push(`${role} ${path}: ${r.status} (expected ${expect}) ${JSON.stringify(r.json).slice(0, 80)}`);
      }
    }
    // No token at all, and a staff account on a device session.
    for (const [path] of endpoints) if ((await t.api(path)).status !== 401) problems.push(`anonymous ${path} not 401`);
    const device = await call({ token: people.owner.deviceToken }, '/api/admin/users');
    assert.equal(device.json.error, 'password_session_required');
    assert.deepEqual(problems, []);
  });

  test('accounts: masked contact details, no private content, reasons and confirmations for every action', async () => {
    const { support, admin, owner } = people;
    const person = await t.registered(`person-${Date.now()}@example.org`);
    const bySupport = await call(support, `/api/admin/users?q=${encodeURIComponent(person.email)}`);
    assert.equal(bySupport.json.users[0].email.includes('***'), true, 'support sees masked emails');
    const byAdmin = await call(admin, `/api/admin/users?q=${encodeURIComponent(person.email)}`);
    assert.equal(byAdmin.json.users[0].email, person.email);
    const detail = await call(support, `/api/admin/users/${person.accountId}`);
    assert.equal(detail.status, 200);
    assert.match(detail.json.privacyNote, /not available here/);
    for (const k of ['journal', 'assessments', 'safetyPlan', 'conversations']) assert.equal(detail.json[k], undefined);

    // Suspension needs a reason and blocks the community; nobody acts on themselves.
    assert.equal((await call(admin, `/api/admin/users/${person.accountId}/suspend`, 'POST', {})).json.error, 'reason_required');
    assert.equal((await call(admin, `/api/admin/users/${admin.accountId}/suspend`, 'POST', { reason: 'test' })).json.error, 'not_on_yourself');
    assert.equal((await call(admin, `/api/admin/users/${person.accountId}/suspend`, 'POST', { reason: 'spam wave' })).status, 200);
    assert.equal((await call(person, '/api/community/profile', 'PUT', { pseudonym: 'Quiet Person', acceptGuidelines: true })).status, 200);
    assert.equal((await call(person, '/api/community/rooms/sleep:en/join', 'POST')).json.error, 'account_suspended');
    assert.equal((await call(admin, `/api/admin/users/${person.accountId}/reinstate`, 'POST', { reason: 'appeal accepted' })).status, 200);

    // A password-reset email goes to the person; staff never see the code.
    const reset = await call(support, `/api/admin/users/${person.accountId}/password-reset`, 'POST', { reason: 'user asked by email' });
    assert.equal(reset.status, 200);
    assert.ok(!JSON.stringify(reset.json).match(/[0-9]{6}/), 'no code in the response');
    assert.ok(t.mailer.lastTo(person.email).text.match(/[0-9]{6}/));

    // Complimentary Plus: a confirmation, a reason; it is not a payment.
    assert.equal((await call(admin, `/api/admin/users/${person.accountId}/grants`, 'POST', { days: 30, reason: 'service outage' })).json.error, 'step_up_required');
    await stepUp(admin);
    const grant = await call(admin, `/api/admin/users/${person.accountId}/grants`, 'POST', { days: 30, reason: 'service outage' });
    assert.equal(grant.json.entitlements.plus.active, true);
    assert.equal((await call(person, '/api/account/me')).json.entitlements.tier, 'plus');
    const orders = await t.db.query('select count(*)::int as n from orders where account_id = $1', [person.accountId]);
    assert.equal(orders.rows[0].n, 0, 'no fake order');
    assert.equal((await call(admin, `/api/admin/users/${person.accountId}/grants/${grant.json.grantId}/revoke`, 'POST', { reason: 'given by mistake' })).json.entitlements.tier, 'free');

    // Ending sessions signs the person out everywhere.
    assert.equal((await call(support, `/api/admin/users/${person.accountId}/sessions/revoke`, 'POST', { reason: 'lost phone' })).status, 200);
    assert.equal((await call(person, '/api/account/me')).status, 401);

    // Deleting needs the typed email and is refused for staff accounts.
    await stepUp(owner);
    assert.equal((await call(owner, `/api/admin/users/${admin.accountId}/delete`, 'POST', { reason: 'user asked by email twice', confirmEmail: admin.email })).json.error, 'staff_account');
    assert.equal((await call(owner, `/api/admin/users/${person.accountId}/delete`, 'POST', { reason: 'user asked by email twice', confirmEmail: 'wrong@example.org' })).json.error, 'confirmation_mismatch');
    assert.equal((await call(owner, `/api/admin/users/${person.accountId}/delete`, 'POST', { reason: 'user asked by email twice', confirmEmail: person.email })).status, 200);
    assert.equal((await t.db.query('select count(*)::int as n from accounts where id = $1', [person.accountId])).rows[0].n, 0);
    const trail = await t.db.query("select count(*)::int as n from audit_log where action in ('account.suspended', 'account.reinstated', 'account.password_reset_email', 'entitlement.granted', 'entitlement.revoked', 'account.sessions_revoked', 'account.deleted_by_staff')");
    assert.ok(trail.rows[0].n >= 7);
  });

  test('community and safety: room pause and notices, report context is logged, urgent reports become safety cases', async () => {
    const { moderator, admin, analyst } = people;
    const member = async (name) => {
      const u = await t.registered(`${name}-${Math.random().toString(36).slice(2, 7)}@example.org`);
      await call(u, '/api/community/profile', 'PUT', { pseudonym: `${name} ${Math.random().toString(36).slice(2, 5)}`, acceptGuidelines: true });
      await call(u, '/api/community/rooms/anxiety:en/join', 'POST');
      return u;
    };
    const a = await member('Lela');
    const b = await member('Gio');
    assert.equal((await call(a, '/api/community/rooms/anxiety:en/messages', 'POST', { body: 'Breathing exercises help me a lot in the evenings.' })).status, 200);
    t.clock.advance(31000);
    const risky = await call(b, '/api/community/rooms/anxiety:en/messages', 'POST', { body: 'I want to end my life, I cannot go on.' });
    assert.equal(risky.json.safetyNotice, true);

    // The automatic urgent report opens a safety case.
    const cases = await call(moderator, '/api/admin/safety/incidents?status=active');
    const c = cases.json.incidents.find((x) => x.roomId === 'anxiety:en');
    assert.ok(c, 'case opened');
    assert.equal(c.source, 'automatic');
    assert.equal((await call(analyst, '/api/admin/safety/incidents')).json.error, 'forbidden');
    assert.equal((await call(moderator, `/api/admin/safety/incidents/${c.id}/assign`, 'POST', {})).status, 200);
    assert.equal((await call(moderator, `/api/admin/safety/incidents/${c.id}/notes`, 'POST', { body: 'Sent the crisis resources privately.' })).status, 200);
    const stored = await t.db.query('select body_ciphertext from safety_incident_notes where incident_id = $1 and body_ciphertext is not null', [c.id]);
    assert.ok(!Buffer.from(stored.rows[0].body_ciphertext).toString('latin1').includes('crisis'), 'notes encrypted');
    assert.equal((await call(moderator, `/api/admin/safety/incidents/${c.id}/resolve`, 'POST', { resolution: 'diagnosed' })).json.error, 'bad_resolution');
    assert.equal((await call(moderator, `/api/admin/safety/incidents/${c.id}/resolve`, 'POST', { resolution: 'resources_shared' })).status, 200);

    // Report context: a few messages from that room, logged.
    const reports = (await call(moderator, '/api/moderation/reports')).json.reports;
    const rep = reports.find((r) => r.roomId === 'anxiety:en');
    const ctx = await call(moderator, `/api/admin/moderation/reports/${rep.id}/context`);
    assert.equal(ctx.status, 200);
    assert.ok(ctx.json.messages.length >= 2 && ctx.json.messages.length <= 11);
    assert.equal((await t.db.query("select count(*)::int as n from audit_log where action = 'moderation.context_viewed'")).rows[0].n, 1);
    assert.equal((await call(analyst, `/api/admin/moderation/reports/${rep.id}/context`)).json.error, 'forbidden');

    // Pause and an official notice.
    assert.equal((await call(moderator, '/api/admin/community/rooms/anxiety:en/state', 'POST', { action: 'pause', reason: 'cooling down' })).json.error, 'forbidden');
    assert.equal((await call(admin, '/api/admin/community/rooms/anxiety:en/state', 'POST', { action: 'pause', reason: 'cooling down after a heated thread' })).status, 200);
    t.clock.advance(31000);
    assert.equal((await call(a, '/api/community/rooms/anxiety:en/messages', 'POST', { body: 'Hello again' })).json.error, 'room_paused');
    assert.equal((await call(admin, '/api/admin/community/rooms/anxiety:en/notice', 'POST', { body: 'This room is paused for a short while. Get help now is always open.' })).status, 200);
    const msgs = (await call(a, '/api/community/rooms/anxiety:en/messages')).json.messages;
    assert.equal(msgs.at(-1).author.kind, 'system');
    await call(admin, '/api/admin/community/rooms/anxiety:en/state', 'POST', { action: 'resume', reason: 'calm again' });
    const rooms = (await call(analyst, '/api/admin/community/rooms?lang=en')).json.rooms;
    assert.equal(rooms.find((r) => r.id === 'anxiety:en').members, null, 'fewer than 5 members: hidden');
  });

  test('support requests are private and encrypted; a safety request opens a case', async () => {
    const { support, analyst } = people;
    const person = await t.registered(`help-${Date.now()}@example.org`);
    const other = await t.registered(`other-${Date.now()}@example.org`);
    const created = await call(person, '/api/support/tickets', 'POST', { category: 'payment', subject: 'Charged twice for Plus', body: 'I think my card was charged twice yesterday.' });
    assert.equal(created.status, 201);
    const id = created.json.ticket.id;
    const raw = await t.db.query('select subject_ciphertext from support_tickets where id = $1', [id]);
    assert.ok(!Buffer.from(raw.rows[0].subject_ciphertext).toString('latin1').includes('Charged'), 'subject encrypted');
    assert.equal((await call(other, `/api/support/tickets/${id}`)).status, 404, 'nobody else can read it');
    assert.equal((await call(analyst, '/api/admin/support/tickets')).json.error, 'forbidden');
    const queue = await call(support, '/api/admin/support/tickets?status=active');
    assert.ok(queue.json.tickets.find((x) => x.id === id && x.subject === 'Charged twice for Plus'));
    assert.equal((await call(support, `/api/admin/support/tickets/${id}/reply`, 'POST', { body: 'We checked: it was a TEST payment and nothing was charged.' })).status, 200);
    const mine = await call(person, `/api/support/tickets/${id}`);
    assert.equal(mine.json.ticket.status, 'waiting_on_user');
    assert.equal(mine.json.ticket.messages.length, 2);
    assert.ok((await call(person, '/api/notifications')).json.notifications.some((n) => n.kind === 'support_reply'));
    const safety = await call(person, '/api/support/tickets', 'POST', { category: 'safety', subject: 'Worried about a friend', body: 'A friend in a room wrote something that scared me.' });
    assert.equal(safety.status, 201);
    const cases = (await call(people.moderator, '/api/admin/safety/incidents?status=active')).json.incidents;
    assert.ok(cases.some((x) => x.source === 'support'));
  });


  test('AI switches and the daily budget stop calls before the provider; finance is labelled TEST', async () => {
    const { owner, finance, analyst } = people;
    const user = await t.newAccount();
    const ask = () => t.api('/api/ai/chat', { token: user.token, method: 'POST', headers: { 'X-BeHappy-Feature': 'journal' }, body: { messages: [{ role: 'user', content: 'Today was calm.' }] } });
    await stepUp(owner);
    const switches = { anulia: true, journal: false, cards: true, art: true, community: true };
    assert.equal((await call(analyst, '/api/admin/ai/settings/ai.features', 'PUT', { value: switches, reason: 'pause journal' })).json.error, 'forbidden');
    assert.equal((await call(owner, '/api/admin/ai/settings/ai.features', 'PUT', { value: switches, reason: 'pause journal reflections' })).status, 200);
    t.clock.advance(6000);
    const paused = await ask();
    assert.equal(paused.status, 503);
    assert.equal(paused.json.error, 'ai_paused');
    await call(owner, '/api/admin/ai/settings/ai.features', 'PUT', { value: { ...switches, journal: true }, reason: 'back on' });
    t.clock.advance(6000);
    const ai = await call(analyst, '/api/admin/ai');
    assert.equal(ai.status, 200);
    assert.ok(Array.isArray(ai.json.byFeature));
    // Costs use each model's list price when staff set none (before: "—", and the budget never applied).
    const now = new Date(t.clock.now()).toISOString();
    await t.db.query("insert into ai_usage (feature, model, input_tokens, output_tokens, status, created_at) values ('art', 'gpt-6.1-sol', 1000000, 100000, 'ok', $1), ('anulia', 'gpt-5.4-mini', 1000000, 0, 'ok', $1), ('speech', 'tts-1', 500, 0, 'ok', $1)", [now]);
    const priced = (await call(analyst, '/api/admin/ai')).json;
    assert.equal(priced.pricing, null, 'no staff price: list prices per model');
    assert.equal(priced.byModel.find((m) => m.model === 'gpt-6.1-sol').costUsd, 3, '1M in × $2 + 0.1M out × $10');
    assert.equal(priced.byModel.find((m) => m.model === 'gpt-5.4-mini').costUsd, 0.75);
    assert.equal(priced.byModel.find((m) => m.model === 'tts-1').costUsd, null, 'unknown model: no guess');
    assert.ok(priced.today.costUsd >= 3.75);
    // The daily budget now pauses AI on these estimates.
    await call(owner, '/api/admin/settings/ai.dailyBudgetUsd', 'PUT', { value: 3, reason: 'budget test' });
    t.clock.advance(61000);
    const capped = await ask();
    assert.equal(capped.status, 503);
    assert.equal(capped.json.error, 'ai_budget_reached');
    await call(owner, '/api/admin/settings/ai.dailyBudgetUsd', 'PUT', { value: null, reason: 'budget test done' });
    t.clock.advance(61000);
    const fin = await call(finance, '/api/admin/finance');
    assert.equal(fin.json.mode, 'test');
    assert.match(fin.json.label, /TEST/);
    assert.match(fin.json.label, /Not real income/);
    const sec = await call(owner, '/api/admin/security');
    assert.equal(sec.status, 200);
    assert.equal(typeof sec.json.config.adminTokenSet, 'boolean');
    assert.ok(!JSON.stringify(sec.json).includes('admin-secret'), 'no secret values');
    // Search returns only what the viewer may open.
    const s = await call(analyst, `/api/admin/search?q=${encodeURIComponent('example.org')}`);
    assert.ok(s.json.results.every((r) => r.type !== 'user'));
  });
});

describe('Moderation 2.0 and the account 360° view', () => {
  let t;
  const call = (u, path, method = 'GET', body) => t.api(path, { token: u?.token, method, body });
  const people = {};
  const SECOND = 1000;
  const member = async (name, room = 'stress:en') => {
    const u = await t.registered(`${name}-${Math.random().toString(36).slice(2, 7)}@example.org`);
    const p = await call(u, '/api/community/profile', 'PUT', { pseudonym: `${name} ${Math.random().toString(36).slice(2, 5)}`, acceptGuidelines: true });
    await call(u, `/api/community/rooms/${room}/join`, 'POST');
    return { ...u, ref: p.json.profile.ref, pseudonym: p.json.profile.pseudonym };
  };
  const say = async (u, body, room = 'stress:en') => {
    t.clock.advance(31 * SECOND);
    const r = await call(u, `/api/community/rooms/${room}/messages`, 'POST', { body });
    return r.json.message;
  };

  before(async () => {
    const { FEATURE_MODULES } = await import('../features.mjs');
    t = await startTestServer({ extend: FEATURE_MODULES });
    for (const role of ['owner', 'admin', 'moderator', 'support', 'finance', 'analyst']) {
      people[role] = await t.registered(`${role}-${Math.random().toString(36).slice(2, 7)}@example.org`);
      await t.grantRole(people[role].accountId, role);
    }
    people.moderator2 = await t.registered(`mod2-${Math.random().toString(36).slice(2, 7)}@example.org`);
    await t.grantRole(people.moderator2.accountId, 'moderator');
  });
  after(() => t.stop());

  test('report detail, exact message in context (highlighted, bounded), scoped member profile without identity', async () => {
    const { moderator, admin, support } = people;
    const a = await member('Tamta');
    const b = await member('Irakli');
    const before = [];
    for (let i = 0; i < 7; i += 1) before.push(await say(i % 2 ? a : b, `Earlier message number ${i + 1} about work stress.`));
    const bad = await say(b, 'You are all pathetic and weak.');
    for (let i = 0; i < 7; i += 1) await say(i % 2 ? a : b, `Later message number ${i + 1}, trying to stay calm.`);
    const rep = await call(a, `/api/community/messages/${bad.id}/report`, 'POST', { reason: 'harassment', details: 'insulting everyone' });
    assert.equal(rep.status, 200);
    const reportId = rep.json.reportId;

    // Queue views and counts.
    const q = await call(moderator, '/api/admin/moderation/queue?view=unassigned');
    assert.ok(q.json.reports.some((r) => r.id === reportId));
    assert.ok(q.json.counts.open >= 1);
    assert.equal((await call(support, '/api/admin/moderation/queue')).json.error, 'forbidden');
    assert.equal((await t.api('/api/admin/moderation/queue')).status, 401);

    // Detail: evidence and current state, member by community name only.
    const d = await call(moderator, `/api/admin/moderation/reports/${reportId}`);
    assert.equal(d.status, 200);
    assert.equal(d.json.evidence.body, 'You are all pathetic and weak.');
    assert.equal(d.json.current.messageId, bad.id);
    assert.equal(d.json.current.status, 'visible');
    assert.equal(d.json.current.room.language, 'en');
    assert.equal(d.json.member.ref, b.ref);
    const text = JSON.stringify(d.json);
    assert.ok(!text.includes(b.accountId) && !text.includes(b.email), 'no account id or email in the report');

    // Context: the exact message, highlighted, 5 before and 5 after by default, at most 10 each.
    const ctx = await call(moderator, `/api/admin/moderation/reports/${reportId}/context`);
    assert.equal(ctx.json.focusMessageId, bad.id);
    assert.equal(ctx.json.messages.length, 11);
    assert.equal(ctx.json.messages.filter((m) => m.isFocus).length, 1);
    assert.equal(ctx.json.messages[5].id, bad.id);
    const wide = await call(moderator, `/api/admin/moderation/reports/${reportId}/context?before=50&after=50`);
    assert.ok(wide.json.messages.length <= 21, 'bounded window');
    assert.ok(!wide.json.messages.some((m) => m.roomId !== 'stress:en'), 'only that room');
    assert.equal((await call(moderator, '/api/admin/moderation/reports/999999/context')).status, 404, 'a report is required');
    assert.equal((await call(a, `/api/admin/moderation/reports/${reportId}/context`)).status, 403, 'members cannot');
    const views = await t.db.query("select count(*)::int as n from audit_log where action = 'moderation.context_viewed' and target_id = $1", [String(reportId)]);
    assert.equal(views.rows[0].n, 2);

    // Member profile: standing and history, no identity for moderators; admins may link to the account.
    const prof = await call(moderator, `/api/admin/moderation/members/${b.ref}`);
    assert.equal(prof.status, 200);
    assert.equal(prof.json.member.pseudonym, b.pseudonym);
    assert.equal(prof.json.member.reportsAgainst, 1);
    assert.equal(prof.json.accountId, undefined);
    assert.ok(!JSON.stringify(prof.json).includes(b.email));
    assert.equal((await call(admin, `/api/admin/moderation/members/${b.ref}`)).json.accountId, b.accountId);
    assert.equal((await call(support, `/api/admin/moderation/members/${b.ref}`)).json.error, 'forbidden');
    // A moderator can't open the account profile.
    assert.equal((await call(moderator, `/api/admin/users/${b.accountId}`)).json.error, 'forbidden');

    // Remove, then put back with a reason (linked to the report); staff list for reassigning.
    const removed = await call(moderator, `/api/admin/moderation/reports/${reportId}/decide`, 'POST', { action: 'remove_message', reason: 'Insulting the room.' });
    assert.equal(removed.json.status, 'resolved');
    assert.equal((await call(moderator, `/api/admin/moderation/reports/${reportId}/restore`, 'POST', {})).json.error, 'reason_required');
    assert.equal((await call(moderator, `/api/admin/moderation/reports/${reportId}/restore`, 'POST', { reason: 'Context shows it was a quote.' })).status, 200);
    const back = await call(moderator, `/api/admin/moderation/reports/${reportId}`);
    assert.equal(back.json.current.status, 'visible');
    assert.ok(back.json.history.some((h) => h.action === 'restore_message' && h.reason === 'Context shows it was a quote.'));
    const mods = await call(moderator, '/api/admin/moderation/moderators');
    assert.ok(mods.json.moderators.some((x) => x.me));
    assert.ok(!mods.json.moderators.some((x) => x.id === a.accountId), 'members are not listed');
    // Removed and deleted messages: the evidence stays, the current state says what happened.
    await call(b, `/api/community/messages/${before[0].id}`, 'DELETE');
    const rep2 = await call(a, `/api/community/messages/${before[1].id}/report`, 'POST', { reason: 'spam' });
    assert.equal(rep2.json.error, 'cannot_report_self');
    const rep3 = await call(b, `/api/community/messages/${before[1].id}/report`, 'POST', { reason: 'spam' });
    await call(a, `/api/community/messages/${before[1].id}`, 'DELETE');
    const d3 = await call(moderator, `/api/admin/moderation/reports/${rep3.json.reportId}`);
    assert.equal(d3.json.current.status, 'deleted');
    assert.equal(d3.json.current.body, '');
    assert.ok(d3.json.evidence.body.includes('Earlier message number 2'));
  });

  test('actions: claim, reassign, encrypted notes, second review by someone else, restriction with notification, escalation, audit', async () => {
    const { moderator, moderator2, admin } = people;
    const a = await member('Nana', 'grief:en');
    const b = await member('Gela', 'grief:en');
    const bad = await say(b, 'Nobody cares about your loss, stop whining.', 'grief:en');
    const rep = await call(a, `/api/community/messages/${bad.id}/report`, 'POST', { reason: 'harassment' });
    const id = rep.json.reportId;
    assert.equal((await call(moderator, `/api/admin/moderation/reports/${id}/assign`, 'POST', {})).status, 200);
    assert.equal((await call(moderator, `/api/admin/moderation/reports/${id}/assign`, 'POST', { assigneeId: a.accountId })).json.error, 'bad_assignee', 'only moderators');
    assert.equal((await call(moderator, `/api/admin/moderation/reports/${id}/notes`, 'POST', { body: 'Second message in this tone today.' })).status, 200);
    const raw = await t.db.query('select body_ciphertext from moderation_report_notes where report_id = $1', [id]);
    assert.ok(!Buffer.from(raw.rows[0].body_ciphertext).toString('latin1').includes('tone today'), 'notes encrypted');
    assert.equal((await call(moderator, `/api/admin/moderation/reports/${id}/second-review`, 'POST', { reason: 'Unsure whether this is harassment or venting.' })).status, 200);
    assert.equal((await call(moderator, `/api/admin/moderation/reports/${id}/decide`, 'POST', { action: 'restrict_24h', reason: 'harassment' })).json.error, 'second_reviewer_required');
    assert.equal((await call(moderator2, `/api/admin/moderation/reports/${id}/decide`, 'POST', { action: 'restrict_24h' })).json.error, 'reason_required');
    const done = await call(moderator2, `/api/admin/moderation/reports/${id}/decide`, 'POST', { action: 'restrict_24h', reason: 'Harassment of a grieving member.' });
    assert.equal(done.json.status, 'resolved');
    const kinds = (await call(b, '/api/notifications')).json.notifications.map((n) => n.kind);
    assert.ok(kinds.includes('moderation_suspended'), 'the member is told');
    t.clock.advance(31 * SECOND);
    assert.equal((await call(b, '/api/community/rooms/grief:en/messages', 'POST', { body: 'Can I still post?' })).json.error, 'suspended');
    const settled = await t.db.query("select metadata from audit_log where action = 'moderation.report_settled' and target_id = $1", [String(id)]);
    assert.equal(settled.rows[0].metadata.from, 'in_review');
    assert.equal(settled.rows[0].metadata.to, 'resolved');
    assert.equal(settled.rows[0].metadata.reason, 'Harassment of a grieving member.');
    const detail = await call(moderator, `/api/admin/moderation/reports/${id}`);
    assert.ok(detail.json.history.some((h) => h.action === 'suspend'));
    assert.equal(detail.json.notes.length, 1);
    // Lift needs a reason; the member profile shows the restriction history.
    const prof = await call(moderator, `/api/admin/moderation/members/${b.ref}`);
    assert.equal(prof.json.member.standing, 'restricted');
    assert.equal((await call(moderator, `/api/admin/moderation/restrictions/${prof.json.member.activeRestriction.id}/lift`, 'POST', {})).json.error, 'reason_required');
    assert.equal((await call(moderator, `/api/admin/moderation/restrictions/${prof.json.member.activeRestriction.id}/lift`, 'POST', { note: 'Apologised in an appeal.' })).status, 200);
    // Escalation to the safety team opens (or escalates) a case.
    const worry = await say(a, 'I am thinking about ending it all tonight.', 'grief:en');
    const reps = (await call(moderator, '/api/admin/moderation/queue?view=urgent')).json.reports;
    const urgent = reps.find((r) => r.messageId === worry.id);
    const esc = await call(moderator, `/api/admin/moderation/reports/${urgent.id}/escalate`, 'POST', { note: 'Member may be at risk tonight; resources sent.' });
    assert.equal(esc.status, 200);
    const inc = await call(admin, `/api/admin/safety/incidents/${esc.json.incidentId}`);
    assert.equal(inc.json.incident.status, 'escalated');
  });

  test('account 360°: tabs by permission, transactions belong to the account, TEST labels, opt-out respected', async () => {
    const { admin, support, finance, analyst } = people;
    const person = await member('Lika');
    const other = await t.registered(`other-${Date.now()}@example.org`);
    const now = t.clock.now();
    const order = (id, accountId, status = 'approved') =>
      t.db.query("insert into orders (id, account_id, product_id, product_kind, duration_days, amount_minor, currency, status, created_at, updated_at, approved_at, payment_id, masked_card) values ($1, $2, 'plus-30', 'plus', 30, 1900, 'GEL', $3, $4, $4, $4, '88001', '444455XXXXXX6666')", [id, accountId, status, new Date(now)]);
    await order('ord_qa_person', person.accountId);
    await order('ord_qa_other', other.accountId);
    await t.db.query("update orders set history = '[{\"status\":\"created\"},{\"status\":\"approved\",\"via\":\"callback\"}]'::jsonb where id = 'ord_qa_person'");

    // Overview tabs follow permissions.
    const asAdmin = await call(admin, `/api/admin/users/${person.accountId}`);
    assert.deepEqual(Object.entries(asAdmin.json.tabs).filter(([, v]) => !v).map(([k]) => k), []);
    const asSupport = await call(support, `/api/admin/users/${person.accountId}`);
    assert.equal(asSupport.json.tabs.activity, false);
    assert.equal(asSupport.json.tabs.community, false);
    assert.equal(asSupport.json.usage30d, null);
    assert.equal(asSupport.json.restrictions.community, undefined);
    assert.equal((await call(support, `/api/admin/users/${person.accountId}/activity`)).json.error, 'forbidden', 'support: no usage analytics');
    assert.equal((await call(support, `/api/admin/users/${person.accountId}/community`)).json.error, 'forbidden', 'support: no community link');
    assert.equal((await call(analyst, `/api/admin/users/${person.accountId}`)).json.error, 'forbidden', 'analyst: no individual accounts');

    // Transactions: belong to the account; TEST; masked card; detail with history and entitlement.
    const tx = await call(support, `/api/admin/users/${person.accountId}/transactions`);
    assert.equal(tx.json.mode, 'test');
    assert.deepEqual(tx.json.orders.map((o) => o.id), ['ord_qa_person']);
    assert.equal(tx.json.subscription.periods[0].kind, 'paid');
    assert.equal((await call(support, `/api/admin/users/${person.accountId}/transactions/ord_qa_other`)).status, 404, 'another account’s order');
    const one = await call(finance, '/api/admin/transactions/ord_qa_person');
    assert.equal(one.status, 200);
    assert.equal(one.json.order.mode, 'test');
    assert.match(one.json.note, /TEST/);
    assert.equal(one.json.order.card, '444455XXXXXX6666');
    assert.ok(one.json.entitlement && one.json.entitlement.kind === 'paid');
    assert.equal(one.json.history.length, 2);
    assert.equal(one.json.order.accountId, undefined, 'finance without users.view: no account link');
    assert.equal((await call(finance, `/api/admin/users/${person.accountId}`)).json.error, 'forbidden');

    // Complimentary days appear as complimentary, never as revenue.
    await call(admin, '/api/admin/step-up', 'POST', { password: admin.password });
    await call(admin, `/api/admin/users/${person.accountId}/grants`, 'POST', { days: 10, reason: 'goodwill for an outage' });
    const tx2 = await call(admin, `/api/admin/users/${person.accountId}/transactions`);
    assert.ok(tx2.json.subscription.periods.some((p) => p.kind === 'complimentary'));
    assert.equal(tx2.json.orders.length, 1, 'no order for complimentary days');

    // Activity: server records; usage only when the person allows it.
    const act = await call(admin, `/api/admin/users/${person.accountId}/activity`);
    assert.ok(act.json.events.some((e) => e.type === 'payment_completed' && e.ref.id === 'ord_qa_person'));
    assert.ok(act.json.events.some((e) => e.type === 'community_room_joined'));
    assert.ok(!JSON.stringify(act.json).includes('stress:en'), 'which room is not shown');
    await call(person, '/api/account/privacy', 'PUT', { analytics: false });
    assert.equal((await call(admin, `/api/admin/users/${person.accountId}/activity`)).json.usage.optedOut, true);
    assert.equal((await call(admin, `/api/admin/users/${person.accountId}`)).json.usage30d, null);
    // Community tab (admin): the community name and reports; security tab (support).
    assert.equal((await call(admin, `/api/admin/users/${person.accountId}/community`)).json.profile.ref, person.ref);
    assert.ok(Array.isArray((await call(support, `/api/admin/users/${person.accountId}/security`)).json.events));
    assert.ok(Array.isArray((await call(support, `/api/admin/users/${person.accountId}/appointments`)).json.appointments));
  });
});
