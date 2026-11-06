// Run: node --test server/test/platform.test.mjs
// 3.0 platform: PostgreSQL migrations, email + password accounts, sessions,
// staff roles, transactional account deletion and the 2.0 data import.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import { createDatabase } from '../db/index.mjs';
import { importJsonStore } from '../db/import-json.mjs';
import { migrate } from '../db/migrate.mjs';
import { hashPassword, passwordProblem, verifyPassword } from '../identity.mjs';
import { registerAccountDeletionHook } from '../lifecycle.mjs';
import { startTestServer } from './helpers.mjs';

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');

describe('Database', () => {
  test('migrations apply once and are idempotent', async () => {
    const db = await createDatabase({ memory: true });
    const first = await migrate(db);
    assert.ok(first.includes('001_core'));
    assert.deepEqual(await migrate(db), []);
    await db.close();
  });

  test('a failing transaction leaves nothing behind', async () => {
    const db = await createDatabase({ memory: true });
    await migrate(db);
    await assert.rejects(
      db.tx(async (t) => {
        await t.query("insert into accounts (id) values ('acc_tx')");
        throw new Error('boom');
      })
    );
    assert.equal((await db.query("select count(*)::int as n from accounts where id = 'acc_tx'")).rows[0].n, 0);
    await db.close();
  });
});

describe('Passwords', () => {
  test('scrypt hashes verify, and wrong passwords fail', async () => {
    const h = await hashPassword('calm-river-stone-42');
    assert.match(h, /^scrypt\$32768\$8\$1\$/);
    assert.equal(await verifyPassword('calm-river-stone-42', h), true);
    assert.equal(await verifyPassword('calm-river-stone-43', h), false);
  });

  test('weak passwords are refused', () => {
    assert.equal(passwordProblem('short'), 'password_too_short');
    assert.equal(passwordProblem('aaaaaaaaaaaa'), 'password_too_simple');
    assert.equal(passwordProblem('password123'), 'password_too_common');
    assert.equal(passwordProblem('ninonino-2026', 'ninonino@example.org'), 'password_contains_email');
    assert.equal(passwordProblem('calm-river-stone-42'), null);
  });
});

describe('Accounts and sign-in', () => {
  let t;
  before(async () => {
    t = await startTestServer();
  });
  after(() => t.stop());

  test('an anonymous account upgrades in place: same id, purchases stay', async () => {
    const acct = await t.newAccount();
    const email = 'nino@example.org';
    const weak = await t.api('/api/auth/register', { token: acct.token, method: 'POST', body: { email, password: 'short' } });
    assert.equal(weak.status, 400);
    assert.equal(weak.json.error, 'password_too_short');
    const reg = await t.api('/api/auth/register', { token: acct.token, method: 'POST', body: { email, password: 'calm-river-stone-42' } });
    assert.equal(reg.status, 200);
    // Not registered (and the email not reserved) until the code is confirmed.
    assert.equal((await t.api('/api/account/me', { token: acct.token })).json.identity.registered, false);
    const code = /(\d{6})/.exec(t.mailer.lastTo(email).text)[1];
    const wrong = await t.api('/api/auth/verify-email', { token: acct.token, method: 'POST', body: { code: code === '000000' ? '111111' : '000000' } });
    assert.equal(wrong.status, 400);
    const ok = await t.api('/api/auth/verify-email', { token: acct.token, method: 'POST', body: { code } });
    assert.equal(ok.status, 200);
    const me = await t.api('/api/account/me', { token: acct.token });
    assert.equal(me.json.accountId, acct.accountId, 'same account id');
    assert.equal(me.json.identity.registered, true);
    assert.equal(me.json.identity.email, email);
    // A second account can't take the same email.
    const other = await t.newAccount();
    const taken = await t.api('/api/auth/register', { token: other.token, method: 'POST', body: { email: 'NINO@example.org', password: 'calm-river-stone-42' } });
    assert.equal(taken.status, 409);
    assert.equal(taken.json.error, 'email_in_use');
  });

  test('login gives a password session; five failures lock the account', async () => {
    const u = await t.registered('luka@example.org');
    assert.ok(u.token && u.token !== u.deviceToken);
    const me = await t.api('/api/account/me', { token: u.token });
    assert.equal(me.json.identity.sessionKind, 'password');
    for (let i = 0; i < 5; i += 1) assert.equal((await t.api('/api/auth/login', { method: 'POST', body: { email: u.email, password: 'wrong-password-123' } })).status, 401);
    const locked = await t.api('/api/auth/login', { method: 'POST', body: { email: u.email, password: u.password } });
    assert.equal(locked.status, 429);
    assert.equal(locked.json.error, 'account_locked');
    t.clock.advance(16 * 60 * 1000);
    assert.equal((await t.api('/api/auth/login', { method: 'POST', body: { email: u.email, password: u.password } })).status, 200);
    t.clock.setOffset(0);
    const unknown = await t.api('/api/auth/login', { method: 'POST', body: { email: 'nobody@example.org', password: 'whatever-123456' } });
    assert.equal(unknown.status, 401, 'unknown emails get the same answer');
  });

  test('password reset revokes every session; change keeps only the current one', async () => {
    const u = await t.registered('mari@example.org');
    const forgot = await t.api('/api/auth/password/forgot', { method: 'POST', body: { email: u.email } });
    assert.equal(forgot.status, 200);
    assert.equal((await t.api('/api/auth/password/forgot', { method: 'POST', body: { email: 'ghost@example.org' } })).status, 200, 'same answer for unknown emails');
    const code = /(\d{6})/.exec(t.mailer.lastTo(u.email).text)[1];
    const reset = await t.api('/api/auth/password/reset', { method: 'POST', body: { email: u.email, code, password: 'new-quiet-forest-77' } });
    assert.equal(reset.status, 200);
    assert.equal((await t.api('/api/account/me', { token: u.token })).status, 401, 'old password session revoked');
    assert.equal((await t.api('/api/account/me', { token: u.deviceToken })).status, 401, 'device session revoked too');
    const fresh = reset.json.token;
    assert.equal((await t.api('/api/account/me', { token: fresh })).status, 200);
    const second = (await t.api('/api/auth/login', { method: 'POST', body: { email: u.email, password: 'new-quiet-forest-77' } })).json.token;
    const changed = await t.api('/api/auth/password/change', { token: fresh, method: 'POST', body: { current: 'new-quiet-forest-77', password: 'third-gentle-hill-55' } });
    assert.equal(changed.status, 200);
    assert.equal((await t.api('/api/account/me', { token: second })).status, 401, 'other sessions signed out');
    assert.equal((await t.api('/api/account/me', { token: fresh })).status, 200, 'current session stays');
  });

  test('staff tools need the role AND a password session', async () => {
    const u = await t.registered('admin@example.org');
    assert.equal((await t.api('/api/admin/metrics', { token: u.token })).status, 403, 'no role yet');
    await t.grantRole(u.accountId, 'admin');
    assert.equal((await t.api('/api/admin/metrics', { token: u.token })).status, 200);
    const device = await t.api('/api/admin/metrics', { token: u.deviceToken });
    assert.equal(device.status, 403);
    assert.equal(device.json.error, 'password_session_required');
  });

  test('the owner token bootstraps the first admin; roles need a registered account', async () => {
    const u = await t.registered('first-admin@example.org');
    const anon = await t.newAccount();
    assert.equal((await t.api('/api/admin/roles', { method: 'POST', body: { email: u.email, role: 'admin' } })).status, 403, 'no token, no session');
    assert.equal((await t.api('/api/admin/roles', { token: anon.token, method: 'POST', body: { email: u.email, role: 'admin' } })).status, 403, 'a normal user cannot grant roles');
    const granted = await t.api('/api/admin/roles', { method: 'POST', headers: { 'x-admin-token': 'admin-secret' }, body: { email: u.email, role: 'admin' } });
    assert.equal(granted.status, 200);
    assert.equal((await t.api('/api/admin/roles', { method: 'POST', headers: { 'x-admin-token': 'admin-secret' }, body: { email: 'nobody@example.org', role: 'admin' } })).status, 404);
    assert.equal((await t.api('/api/admin/roles', { method: 'POST', headers: { 'x-admin-token': 'admin-secret' }, body: { email: u.email, role: 'superuser' } })).status, 400);
    const viaAdmin = await t.api('/api/admin/roles', { token: u.token, method: 'POST', body: { email: u.email, role: 'moderator' } });
    assert.equal(viaAdmin.status, 200, 'an admin (password session) can grant roles');
    const roles = (await t.db.query('select roles from accounts where id = $1', [u.accountId])).rows[0].roles;
    assert.deepEqual([...roles].sort(), ['admin', 'moderator']);
    const audit = await t.db.query("select count(*)::int as n from audit_log where action = 'role.granted' and target_id = $1", [u.accountId]);
    assert.equal(audit.rows[0].n, 2);
  });

  test('sessions can be listed and revoked by their owner only', async () => {
    const u = await t.registered('dato@example.org');
    const list = await t.api('/api/auth/sessions', { token: u.token });
    assert.equal(list.json.sessions.length, 2);
    const device = list.json.sessions.find((s) => !s.current);
    const other = await t.registered('eka@example.org');
    assert.equal((await t.api(`/api/auth/sessions/${device.id}`, { token: other.token, method: 'DELETE' })).status, 404);
    assert.equal((await t.api(`/api/auth/sessions/${device.id}`, { token: u.token, method: 'DELETE' })).status, 200);
    assert.equal((await t.api('/api/account/me', { token: u.deviceToken })).status, 401);
  });
});

describe('Account deletion', () => {
  let t;
  before(async () => {
    t = await startTestServer();
  });
  after(() => t.stop());

  test('deletes everything in one transaction and keeps orders detached for accounting', async () => {
    const acct = await t.newAccount();
    const { json } = await t.api('/api/payments/checkout', { token: acct.token, method: 'POST', body: { productId: 'plus_30' } });
    const del = await t.api('/api/account', { token: acct.token, method: 'DELETE' });
    assert.equal(del.status, 200);
    assert.equal((await t.api('/api/account/me', { token: acct.token })).status, 401);
    const order = (await t.db.query('select account_id, account_deleted from orders where id = $1', [json.order.id])).rows[0];
    assert.equal(order.account_id, null);
    assert.equal(order.account_deleted, true);
    assert.equal((await t.db.query('select count(*)::int as n from sessions where account_id = $1', [acct.accountId])).rows[0].n, 0);
    const audit = await t.db.query("select target_id from audit_log where action = 'account.deleted'");
    assert.ok(audit.rows.length >= 1);
    assert.ok(!audit.rows.some((r) => r.target_id === acct.accountId), 'the audit log keeps only a hash');
  });

  test('if any part fails, nothing is deleted and the app is told', async () => {
    const acct = await t.newAccount();
    let fail = true;
    registerAccountDeletionHook('test-failure', async () => {
      if (fail) throw new Error('simulated failure');
    });
    const del = await t.api('/api/account', { token: acct.token, method: 'DELETE' });
    assert.equal(del.status, 500, 'a failure is reported, not hidden');
    assert.equal((await t.api('/api/account/me', { token: acct.token })).status, 200, 'the account still exists');
    fail = false;
    assert.equal((await t.api('/api/account', { token: acct.token, method: 'DELETE' })).status, 200);
  });
});

describe('Importing the 2.0 JSON store', () => {
  test('existing devices stay signed in, recovery codes and purchases carry over', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-import-'));
    const token = 'legacy-device-token-0123456789abcdef';
    const now = Date.now();
    fs.writeFileSync(
      path.join(dir, 'db.json'),
      JSON.stringify({
        version: 1,
        accounts: { acc_legacy: { id: 'acc_legacy', tokenHash: sha256(token), recoveryHash: sha256('ABCDE12345FGHJK67890'), createdAt: now - 10 * 86400000, lastSeenAt: now - 86400000 } },
        orders: {
          'bh-old-1': { id: 'bh-old-1', accountId: 'acc_legacy', productId: 'plus_30', productKind: 'plus', durationDays: 30, amountMinor: 5100, currency: 'GEL', mode: 'test', status: 'approved', createdAt: now - 86400000, updatedAt: now - 86400000, approvedAt: now - 86400000, history: [{ at: now, status: 'approved' }] },
          'bh-old-2': { id: 'bh-old-2', accountId: 'deleted', productId: 'art_program', productKind: 'art', amountMinor: 5000, currency: 'GEL', mode: 'test', status: 'approved', createdAt: now, updatedAt: now, approvedAt: now, history: [] },
        },
        // With an active Plus pass the Anulia allowance is per day, so the counter uses today's key.
        usage: { acc_legacy: { counters: { [`anulia:${new Date(now).toISOString().slice(0, 10)}`]: 4 }, conversations: { '2026-11:conv1': { count: 4, grace: 0 } }, artSessions: { 1: { count: 3, startedAt: now } } } },
        responseOwners: { resp_legacy: { accountId: 'acc_legacy', at: now } },
        paymentEvents: { 'bh-old-1:777:approved:': { at: now, via: 'callback' } },
      })
    );
    const t = await startTestServer();
    try {
    const result = await importJsonStore(t.db, dir);
    assert.equal(result.imported, true);
    assert.equal(result.counts.accounts, 1);
    assert.equal((await importJsonStore(t.db, dir)).imported, false, 'runs once');
    const me = await t.api('/api/account/me', { token });
    assert.equal(me.status, 200, 'the 2.0 device token still works');
    assert.equal(me.json.accountId, 'acc_legacy');
    assert.equal(me.json.entitlements.plus.active, true, 'the Plus pass carried over');
    assert.equal(me.json.usage.anulia.used, 4);
    const restored = await t.api('/api/account/restore', { method: 'POST', body: { recoveryCode: 'ABCDE-12345-FGHJK-67890' } });
    assert.equal(restored.json.accountId, 'acc_legacy');
    const detached = (await t.db.query("select account_id, account_deleted from orders where id = 'bh-old-2'")).rows[0];
    assert.deepEqual(detached, { account_id: null, account_deleted: true });
    } finally {
      await t.stop();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
