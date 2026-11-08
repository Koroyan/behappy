// Run: node --test server/test/push.test.mjs
// Phone notifications: devices, preferences, and the rules that keep pushes
// helpful (only unread, not while reading, one per burst, quiet hours).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { mountCommunity, startCommunityRealtime } from '../community/index.mjs';
import { cleanPrefs, inQuietHours, localMinutes } from '../notify/push.mjs';
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
