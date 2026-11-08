// Run: node --test server/test/push.test.mjs
// Phone notifications: devices, preferences, and the rules that keep pushes
// helpful (only unread, not while reading, one per burst, quiet hours).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { mountCommunity, startCommunityRealtime } from '../community/index.mjs';
import { backoffMs, cleanPrefs, createPush, inQuietHours, localMinutes, quietEndsAt } from '../notify/push.mjs';
import { pushText } from '../notify/pushText.mjs';
import { mountPush } from '../notify/routes.mjs';
import { mountProfessionals } from '../professional/index.mjs';
import { startTestServer } from './helpers.mjs';

const HOUR = 60 * 60 * 1000;
const ROOM = 'sleep:en';
let seq = 0;
const token = () => `ExponentPushToken[test${(seq += 1)}abcdefgh]`;

describe('Push rules (pure)', () => {
  test('quiet hours cross midnight and follow the phone’s time zone', () => {
    const prefs = cleanPrefs({ quiet: true, quietFrom: 22 * 60, quietTo: 8 * 60 });
    const at = (iso) => Date.parse(iso);
    assert.equal(inQuietHours(prefs, at('2026-11-08T23:30:00Z'), 'UTC'), true);
    assert.equal(inQuietHours(prefs, at('2026-11-08T07:59:00Z'), 'UTC'), true);
    assert.equal(inQuietHours(prefs, at('2026-11-08T08:00:00Z'), 'UTC'), false);
    // 18:30 UTC is 22:30 in Tbilisi (UTC+4).
    assert.equal(inQuietHours(prefs, at('2026-11-08T18:30:00Z'), 'Asia/Tbilisi'), true);
    assert.equal(localMinutes(at('2026-11-08T18:30:00Z'), 'Asia/Tbilisi'), 22 * 60 + 30);
    assert.equal(inQuietHours({ ...prefs, quiet: false }, at('2026-11-08T23:30:00Z'), 'UTC'), false);
    assert.equal(localMinutes(at('2026-11-08T10:15:00Z'), 'Not/AZone'), 10 * 60 + 15, 'unknown zones fall back to UTC');
  });

  test('preferences keep only known keys with valid values', () => {
    const p = cleanPrefs({ community: false, previews: 'yes', quietFrom: 9999, evil: true });
    assert.equal(p.community, false);
    assert.equal(p.previews, false);
    assert.equal(p.quietFrom, 22 * 60);
    assert.equal('evil' in p, false);
  });

  test('push text never contains message content and names people only with previews on', () => {
    const n = { kind: 'community_reply', data: { pseudonym: 'Nino', body: 'secret words' } };
    assert.deepEqual(pushText('en', [n]), { title: 'BeHappy', body: 'You have a new message' });
    assert.equal(pushText('en', [n], { previews: true }).body, 'Nino replied to you');
    assert.equal(pushText('ka', [n], { previews: true }).body, 'Nino-მა გიპასუხა');
    assert.equal(pushText('en', [n, n, n]).body, 'New notifications: 3');
    assert.equal(pushText('xx', [n]).body, 'You have a new message', 'unknown languages use English');
    for (const lang of ['en', 'ka', 'ru', 'ar', 'ja']) assert.ok(!JSON.stringify(pushText(lang, [n], { previews: true })).includes('secret'));
  });
});

describe('Push notifications', () => {
  let t;
  let push;
  const member = async (name) => {
    const u = await t.registered(`${name.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}@example.org`);
    const p = await t.api('/api/community/profile', { token: u.token, method: 'PUT', body: { pseudonym: name, acceptGuidelines: true } });
    assert.equal(p.status, 200, JSON.stringify(p.json));
    await t.api(`/api/community/rooms/${ROOM}/join`, { token: u.token, method: 'POST' });
    return { ...u, name };
  };
  const phone = async (u, extra = {}) => {
    const tok = token();
    const r = await t.api('/api/push/devices', { token: u.token, method: 'POST', body: { token: tok, platform: 'ios', language: 'en', tz: 'UTC', ...extra } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    return tok;
  };
  const say = (u, body, extra = {}) => t.api(`/api/community/rooms/${ROOM}/messages`, { token: u.token, method: 'POST', body: { body, ...extra } });
  const prefs = (u, p) => t.api('/api/push/prefs', { token: u.token, method: 'PUT', body: { prefs: p } });
  const sentTo = (tok) => push.outbox.filter((m) => m.to === tok);
  // Each flush is "later" than the last, so the once-a-minute limit never hides a result by accident.
  let clockAt = Date.now();
  const flush = (later = 2 * 60 * 1000) => push.flush((clockAt += later));
  const awake = { quiet: false };

  before(async () => {
    t = await startTestServer({ extend: [mountCommunity, mountProfessionals, mountPush], services: [startCommunityRealtime], config: { push: { driver: 'log' }, quietPushLog: true } });
    push = t.app.locals.deps.push;
  });
  after(() => t.stop());

  test('devices: valid Expo tokens only; preferences default to discreet', async () => {
    const u = await member('Dato');
    const bad = await t.api('/api/push/devices', { token: u.token, method: 'POST', body: { token: 'not-a-token', platform: 'ios' } });
    assert.equal(bad.status, 400);
    const badPlatform = await t.api('/api/push/devices', { token: u.token, method: 'POST', body: { token: token(), platform: 'web' } });
    assert.equal(badPlatform.status, 400);
    await phone(u);
    const p = await t.api('/api/push/prefs', { token: u.token });
    assert.equal(p.json.prefs.previews, false);
    assert.equal(p.json.prefs.quiet, true);
    assert.equal((await t.api('/api/push/prefs')).status, 401);
  });

  test('a reply is pushed once, discreetly, with the badge and where to open it', async () => {
    const nino = await member('Nino');
    const luka = await member('Luka');
    const tok = await phone(luka);
    await prefs(luka, awake);
    const first = await say(luka, 'Does anyone else wake up at 4?');
    const reply = await say(nino, 'Every night, honestly.', { replyToId: first.json.message.id });
    assert.equal(reply.status, 200, JSON.stringify(reply.json));
    await flush();
    const msgs = sentTo(tok);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].body, 'You have a new message');
    assert.equal(msgs[0].data.url, `/community/${ROOM}`);
    assert.ok(msgs[0].badge >= 1);
    assert.ok(!JSON.stringify(msgs[0]).includes('Every night'), 'message text never leaves in a push');
    await flush();
    assert.equal(sentTo(tok).length, 1, 'never pushed twice');
  });

  test('with "show who wrote" on, the push names the person', async () => {
    const nino = await member('Nina');
    const mari = await member('Mari');
    const tok = await phone(mari);
    await prefs(mari, { ...awake, previews: true });
    const first = await say(mari, 'Hello room');
    await say(nino, 'Hi Mari', { replyToId: first.json.message.id });
    await flush();
    assert.equal(sentTo(tok)[0]?.body, 'Nina replied to you');
  });

  test('already read in the room, or reading it right now: no push', async () => {
    const nino = await member('Nika');
    const ana = await member('Ana');
    const tok = await phone(ana);
    await prefs(ana, awake);
    const first = await say(ana, 'Anyone around?');
    const reply = await say(nino, 'Here', { replyToId: first.json.message.id });
    // Ana reads the room before the push goes out.
    await t.api(`/api/community/rooms/${ROOM}/read`, { token: ana.token, method: 'POST', body: { messageId: reply.json.message.id } });
    await flush();
    assert.equal(sentTo(tok).length, 0);
    const bell = await t.api('/api/notifications', { token: ana.token });
    assert.equal(bell.json.unread, 0, 'reading the room settles its notifications');
  });

  test('"Every message" in a room: one notification per unread burst, a new one after reading', async () => {
    const writer = await member('Levan');
    const follower = await member('Salome');
    const tok = await phone(follower);
    await prefs(follower, awake);
    assert.equal((await t.api(`/api/community/rooms/${ROOM}/notify`, { token: follower.token, method: 'POST', body: { notify: 'all' } })).status, 200);
    await say(writer, 'one');
    const second = await say(writer, 'two');
    await say(writer, 'three');
    const list = await t.api('/api/notifications', { token: follower.token });
    assert.equal(list.json.notifications.filter((n) => n.kind === 'community_activity').length, 1);
    await flush();
    assert.equal(sentTo(tok).length, 1);
    const unread = await t.api('/api/unread', { token: follower.token });
    assert.ok(unread.json.community.messages >= 3, JSON.stringify(unread.json));
    assert.ok(unread.json.community.byRoom[ROOM] >= 3);
    await t.api(`/api/community/rooms/${ROOM}/read`, { token: follower.token, method: 'POST', body: { messageId: second.json.message.id + 1 } });
    await say(writer, 'four');
    const again = await t.api('/api/notifications', { token: follower.token });
    assert.equal(again.json.notifications.filter((n) => n.kind === 'community_activity').length, 2);
  });

  test('quiet hours hold pushes; afterwards one summary of what is still unread', async () => {
    const nino = await member('Tamar');
    const gio = await member('Gio');
    const tok = await phone(gio);
    const m = new Date(clockAt + 2 * 60 * 1000).getUTCHours() * 60;
    await prefs(gio, { quiet: true, quietFrom: m, quietTo: (m + 60) % 1440 });
    const first = await say(gio, 'Quiet evening');
    await say(nino, 'reply 1', { replyToId: first.json.message.id });
    await say(nino, 'reply 2', { replyToId: first.json.message.id });
    await flush();
    assert.equal(sentTo(tok).length, 0, 'nothing during quiet hours');
    await flush(2 * HOUR);
    const msgs = sentTo(tok);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].body, 'New notifications: 2');
    assert.equal(msgs[0].data.url, '/notifications');
  });

  test('live badges: room members elsewhere in the app hear about new messages; someone reading the room is not pushed', async () => {
    const { io: connect } = await import('socket.io-client');
    const writer = await member('Elene');
    const reader = await member('Sandro');
    const tok = await phone(reader);
    await prefs(reader, awake);
    const socket = connect(t.base, { path: '/socket.io', auth: { token: reader.token }, transports: ['websocket'] });
    try {
      await new Promise((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
      });
      const activity = new Promise((resolve) => socket.once('room:activity', resolve));
      await say(writer, 'hello from elsewhere');
      assert.deepEqual(await activity, { roomId: ROOM });

      // Now Sandro opens the room: a reply to him arrives live, not as a push.
      const joined = await new Promise((resolve) => socket.emit('room:join', { roomId: ROOM }, resolve));
      assert.equal(joined.ok, true, JSON.stringify(joined));
      const mine = await say(reader, 'I am here');
      await say(writer, 'hi Sandro', { replyToId: mine.json.message.id });
      await flush();
      assert.equal(sentTo(tok).length, 0, 'reading the room: no push');
    } finally {
      socket.disconnect();
    }
  });

  test('categories turned off are not pushed, and signing out stops pushes to that phone', async () => {
    const nino = await member('Irakli');
    const keti = await member('Keti');
    const tok = await phone(keti);
    await prefs(keti, { ...awake, community: false });
    const first = await say(keti, 'hi');
    await say(nino, 'hey', { replyToId: first.json.message.id });
    await flush();
    assert.equal(sentTo(tok).length, 0);

    await prefs(keti, { ...awake, community: true });
    await t.api('/api/auth/logout', { token: keti.token, method: 'POST', body: {} });
    await say(nino, 'are you there?', { replyToId: first.json.message.id });
    await flush();
    assert.equal(sentTo(tok).length, 0, 'the session behind the phone ended');
  });
});

describe('Push delivery through Expo', () => {
  let t;
  before(async () => {
    t = await startTestServer({ extend: [mountCommunity, mountProfessionals, mountPush], services: [startCommunityRealtime], config: { push: { driver: 'expo' } } });
  });
  after(() => t.stop());

  test('phones Expo no longer knows are forgotten', async () => {
    const deps = t.app.locals.deps;
    const calls = [];
    deps.pushFetch = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ data: JSON.parse(init.body).map(() => ({ status: 'error', details: { error: 'DeviceNotRegistered' } })) }), { status: 200 });
    };
    const a = await t.registered();
    const b = await t.registered();
    for (const u of [a, b]) {
      await t.api('/api/community/profile', { token: u.token, method: 'PUT', body: { pseudonym: `P${Math.random().toString(36).slice(2, 7)}`, acceptGuidelines: true } });
      await t.api(`/api/community/rooms/${ROOM}/join`, { token: u.token, method: 'POST' });
    }
    const tok = token();
    await t.api('/api/push/devices', { token: b.token, method: 'POST', body: { token: tok, platform: 'android', language: 'en', tz: 'UTC' } });
    await t.api('/api/push/prefs', { token: b.token, method: 'PUT', body: { prefs: { quiet: false } } });
    const first = await t.api(`/api/community/rooms/${ROOM}/messages`, { token: b.token, method: 'POST', body: { body: 'hello' } });
    await t.api(`/api/community/rooms/${ROOM}/messages`, { token: a.token, method: 'POST', body: { body: 'hi', replyToId: first.json.message.id } });
    await deps.push.flush(Date.now() + 60 * 1000);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://exp.host/--/api/v2/push/send');
    assert.equal(calls[0].body[0].to, tok);
    const left = await t.db.query('select 1 from push_devices where token = $1', [tok]);
    assert.equal(left.rowCount, 0);
  });
});

describe('Push reliability', () => {
  let t;
  let deps;
  let expo;
  // A fake Expo: each send answers from `plan` (ok, a temporary or a final error); receipts from `receipts`.
  let plan = [];
  let receipts = {};
  const sends = [];
  before(async () => {
    t = await startTestServer({ extend: [mountCommunity, mountProfessionals, mountPush], services: [startCommunityRealtime], config: { push: { driver: 'expo' } } });
    deps = t.app.locals.deps;
    let ticket = 0;
    deps.pushFetch = async (url, init) => {
      const body = JSON.parse(init.body);
      if (String(url).endsWith('/getReceipts')) return new Response(JSON.stringify({ data: Object.fromEntries(body.ids.map((id) => [id, receipts[id] || { status: 'ok' }])) }), { status: 200 });
      const step = plan.length ? plan.shift() : 'ok';
      sends.push({ body, step });
      if (step === 'network') throw new Error('ECONNRESET');
      if (step === '500') return new Response('oops', { status: 500 });
      return new Response(JSON.stringify({ data: body.map(() => (step === 'ok' ? { status: 'ok', id: `tkt-${(ticket += 1)}` } : { status: 'error', message: step, details: { error: step } })) }), { status: 200 });
    };
    expo = deps.push;
  });
  after(() => t.stop());

  let clockAt = Date.now() + 10 * 60 * 1000;
  const at = (later = 2 * 60 * 1000) => (clockAt += later);
  const member = async (name) => {
    const u = await t.registered(`${name.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}@example.org`);
    await t.api('/api/community/profile', { token: u.token, method: 'PUT', body: { pseudonym: `${name}${Math.random().toString(36).slice(2, 5)}`, acceptGuidelines: true } });
    await t.api(`/api/community/rooms/${ROOM}/join`, { token: u.token, method: 'POST' });
    return u;
  };
  const phone = async (u, tz = 'UTC', awake = true) => {
    const tok = token();
    await t.api('/api/push/devices', { token: u.token, method: 'POST', body: { token: tok, platform: 'ios', language: 'en', tz } });
    if (awake) await t.api('/api/push/prefs', { token: u.token, method: 'PUT', body: { prefs: { quiet: false } } });
    return tok;
  };
  const replyTo = async (from, to, text = `hello ${Math.random().toString(36).slice(2, 8)}`) => {
    const first = await t.api(`/api/community/rooms/${ROOM}/messages`, { token: to.token, method: 'POST', body: { body: `${text} (start)` } });
    await t.api(`/api/community/rooms/${ROOM}/messages`, { token: from.token, method: 'POST', body: { body: text, replyToId: first.json.message.id } });
  };
  const deliveries = async (tok) => (await t.db.query('select status, attempts, ticket_id, receipt_status, last_error from push_deliveries where token = $1 order by id', [tok])).rows;
  const sentTo = (tok) => sends.filter((s) => s.step === 'ok' && s.body.some((m) => m.to === tok));

  test('a temporary failure is retried with backoff; the in-app notification is never lost', async () => {
    const a = await member('Ana');
    const b = await member('Beka');
    const tok = await phone(b);
    await replyTo(a, b);
    plan = ['500'];
    await expo.flushOnce(at());
    let d = await deliveries(tok);
    assert.deepEqual([d[0].status, d[0].attempts, d[0].last_error], ['pending', 1, 'http_5xx'], 'not marked sent: Expo did not accept it');
    assert.equal((await t.api('/api/notifications', { token: b.token })).json.unread, 1, 'still in the app');
    await expo.flushOnce(clockAt + 10 * 1000);
    assert.equal((await deliveries(tok))[0].attempts, 1, 'not before the backoff');
    plan = ['network'];
    await expo.flushOnce(at(backoffMs(1) + 1000));
    d = await deliveries(tok);
    assert.deepEqual([d[0].status, d[0].attempts, d[0].last_error], ['pending', 2, 'network']);
    plan = ['ok'];
    await expo.flushOnce(at(backoffMs(2) + 1000));
    d = await deliveries(tok);
    assert.equal(d[0].status, 'sent');
    assert.match(d[0].ticket_id, /^tkt-/);
    assert.equal(sentTo(tok).length, 1, 'sent exactly once');
    await expo.flushOnce(at());
    assert.equal(sentTo(tok).length, 1, 'never twice');
  });

  test('a failure that keeps coming stops after 5 attempts; a final error stops at once', async () => {
    const a = await member('Ceko');
    const b = await member('Dali');
    const tok = await phone(b);
    await replyTo(a, b);
    for (let i = 1; i <= 5; i += 1) {
      plan = ['MessageRateExceeded'];
      await expo.flushOnce(at(backoffMs(i) + 1000));
    }
    const d = await deliveries(tok);
    assert.deepEqual([d[0].status, d[0].attempts], ['failed', 5]);
    const c = await member('Eka');
    const tok2 = await phone(c);
    await replyTo(a, c);
    plan = ['InvalidCredentials'];
    await expo.flushOnce(at());
    assert.deepEqual((await deliveries(tok2)).map((x) => [x.status, x.attempts]), [['failed', 1]]);
  });

  test('quiet hours are kept per phone: Tbilisi awake, New York asleep', async () => {
    // 12:00 UTC is 16:00 in Tbilisi (awake) and 07:00 in New York (quiet until 08:00).
    const day = 24 * 3600 * 1000;
    const now = Date.parse('2026-11-09T12:00:00Z') + day * Math.max(0, Math.ceil((clockAt - Date.parse('2026-11-09T12:00:00Z')) / day));
    const a = await member('Gela');
    const b = await member('Hana');
    const tbilisi = await phone(b, 'Asia/Tbilisi', false);
    const newYork = await phone(b, 'America/New_York', false);
    await replyTo(a, b);
    await t.db.query('update notifications set created_at = $1 where account_id = $2', [new Date(now - 30000), b.accountId]);
    await expo.flushOnce(now);
    assert.equal(sentTo(tbilisi).length, 1, 'the awake phone gets it');
    assert.equal(sentTo(newYork).length, 0, 'the phone in its night does not');
    assert.equal((await deliveries(newYork))[0].status, 'pending');
    assert.equal(quietEndsAt(cleanPrefs({}), now, 'America/New_York'), now + 60 * 60 * 1000 + 1000);
    await expo.flushOnce(now + 61 * 60 * 1000);
    assert.equal(sentTo(newYork).length, 1, 'after 08:00 New York time');
    assert.equal(sentTo(tbilisi).length, 1, 'and Tbilisi is not pushed twice');
  });

  test('receipts: what Apple/Google answered is recorded; a phone that no longer exists is removed', async () => {
    const a = await member('Ia');
    const b = await member('Jano');
    const tok = await phone(b);
    await replyTo(a, b);
    plan = ['ok'];
    await expo.flushOnce(at());
    const [{ ticket_id: ticket }] = await deliveries(tok);
    receipts = { [ticket]: { status: 'error', details: { error: 'DeviceNotRegistered' } } };
    await expo.checkReceipts(at(20 * 60 * 1000));
    const d = await deliveries(tok);
    assert.deepEqual([d[0].status, d[0].receipt_status, d[0].last_error], ['sent', 'error', 'DeviceNotRegistered']);
    assert.equal((await t.db.query('select 1 from push_devices where token = $1', [tok])).rowCount, 0);
  });

  test('a delivery left "sending" by a crashed worker is taken back; two workers never send the same one', async () => {
    const a = await member('Keti');
    const b = await member('Lado');
    const tok = await phone(b);
    await replyTo(a, b);
    plan = ['500'];
    await expo.flushOnce(at());
    // A worker claimed it and died 6 minutes ago.
    await t.db.query("update push_deliveries set status = 'sending', claimed_at = $2 where token = $1", [tok, new Date(clockAt - 6 * 60 * 1000)]);
    plan = ['ok'];
    await expo.flushOnce(at(backoffMs(1) + 1000));
    assert.equal((await deliveries(tok))[0].status, 'sent', 'taken back and sent');
    const second = createPush(deps);
    await replyTo(a, b, 'again');
    const moment = at();
    const count = sends.length;
    await Promise.all([expo.flushOnce(moment), second.flushOnce(moment)]);
    assert.equal(sends.slice(count).filter((s) => s.body.some((m) => m.to === tok)).length, 1, 'one send for one delivery');
  });
});
