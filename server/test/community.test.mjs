// Run: node --test server/test/community.test.mjs
// Community rooms, real-time messaging, moderation and Anulia in rooms.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { io as connect } from 'socket.io-client';

import { mountCommunity, startCommunityRealtime } from '../community/index.mjs';
import { makeOpenAiFetch, startTestServer } from './helpers.mjs';

const SECOND = 1000;
const waitFor = async (fn, ms = 3000) => {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > ms) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 40));
  }
};
const once = (socket, event, ms = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event}`)), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

describe('Community', () => {
  let t;
  let anuliaCalls = 0;
  const openai = makeOpenAiFetch({
    reply: (body) => {
      if (String(body.instructions || '').includes('peer-support room')) {
        anuliaCalls += 1;
        return JSON.stringify({ response_text: 'Panic peaks and passes. Try breathing in for 4, out for 6, a few times. Visit https://example.com', risk_level: 'low' });
      }
      return '{"response_text":"hi"}';
    },
  });
  const member = async (name) => {
    const u = await t.registered(`${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}@example.org`);
    const p = await t.api('/api/community/profile', { token: u.token, method: 'PUT', body: { pseudonym: name, acceptGuidelines: true } });
    assert.equal(p.status, 200, JSON.stringify(p.json));
    return { ...u, ref: p.json.profile.ref, name };
  };
  // Reading and writing need membership: these helpers join first (joining twice is harmless).
  const joinRoom = (u, roomId) => t.api(`/api/community/rooms/${roomId}/join`, { token: u.token, method: 'POST' });
  const say = async (u, roomId, body, extra = {}) => {
    await joinRoom(u, roomId);
    return t.api(`/api/community/rooms/${roomId}/messages`, { token: u.token, method: 'POST', body: { body, ...extra } });
  };
  const read = async (u, roomId, q = '') => {
    await joinRoom(u, roomId);
    return t.api(`/api/community/rooms/${roomId}/messages${q}`, { token: u.token });
  };

  let nino;
  let luka;
  let mari;
  let mod;
  let mod2;

  before(async () => {
    t = await startTestServer({ extend: [mountCommunity], services: [startCommunityRealtime], openai });
    nino = await member('Nino');
    luka = await member('Luka');
    mari = await member('Mari');
    mod = await member('Gentle Owl');
    await t.grantRole(mod.accountId, 'moderator');
    mod2 = await member('Quiet Fox');
    await t.grantRole(mod2.accountId, 'moderator');
  });
  after(() => t.stop());

  test('every topic has a room in each of the 19 languages, and rooms are listed per language', async () => {
    const count = await t.db.query('select count(*)::int as n from community_rooms');
    assert.equal(count.rows[0].n, 13 * 19);
    const ka = await t.api('/api/community/rooms?lang=ka', { token: nino.token });
    assert.equal(ka.json.rooms.length, 13);
    assert.ok(ka.json.rooms.every((r) => r.language === 'ka'));
    assert.ok(ka.json.rooms.some((r) => r.id === 'panic:ka'));
  });

  test('a community profile needs a registered account, accepted guidelines and a fair pseudonym', async () => {
    const anon = await t.newAccount();
    assert.equal((await t.api('/api/community/profile', { token: anon.token, method: 'PUT', body: { pseudonym: 'Quiet River', acceptGuidelines: true } })).json.error, 'registration_required');
    const u = await t.registered();
    const put = (pseudonym, acceptGuidelines = true) => t.api('/api/community/profile', { token: u.token, method: 'PUT', body: { pseudonym, acceptGuidelines } });
    assert.equal((await put('Quiet River', false)).json.error, 'guidelines_required');
    assert.equal((await put('Dr. Quiet')).json.error, 'pseudonym_title', 'no professional titles');
    assert.equal((await put('ფსიქოლოგი ნინო')).json.error, 'pseudonym_title');
    assert.equal((await put('Anulia helper')).json.error, 'pseudonym_reserved');
    assert.equal((await put('NINO')).json.error, 'pseudonym_taken', 'pseudonyms are unique ignoring case');
    const ok = await put('Quiet River');
    assert.equal(ok.status, 200);
    assert.match(ok.json.profile.ref, /^m_[0-9a-f]{16}$/);
    const me = await t.api('/api/account/me', { token: u.token });
    assert.equal(me.json.community.profile.pseudonym, 'Quiet River');
  });

  test('language rooms are isolated, join starts read, unread counts and read markers work', async () => {
    await t.api('/api/community/rooms/sleep:en/join', { token: luka.token, method: 'POST' });
    assert.equal((await say(nino, 'sleep:ka', 'ღამე ვერ ვიძინებ')).status, 200);
    const en = await read(luka, 'sleep:en');
    assert.ok(!en.json.messages.some((m) => m.body.includes('ვიძინებ')), 'Georgian room messages stay in the Georgian room');
    await t.api('/api/community/rooms/sleep:ka/join', { token: luka.token, method: 'POST' });
    let rooms = (await t.api('/api/community/rooms?lang=ka', { token: luka.token })).json.rooms;
    assert.equal(rooms.find((r) => r.id === 'sleep:ka').unread, 0, 'joining does not dump history as unread');
    const posted = await say(nino, 'sleep:ka', 'ვინმეს გაქვთ მსგავსი?');
    rooms = (await t.api('/api/community/rooms?lang=ka', { token: luka.token })).json.rooms;
    assert.equal(rooms.find((r) => r.id === 'sleep:ka').unread, 1);
    await t.api('/api/community/rooms/sleep:ka/read', { token: luka.token, method: 'POST', body: { messageId: posted.json.message.id } });
    rooms = (await t.api('/api/community/rooms?lang=ka', { token: luka.token })).json.rooms;
    assert.equal(rooms.find((r) => r.id === 'sleep:ka').unread, 0);
    const mine = (await t.api('/api/community/my-rooms', { token: luka.token })).json.rooms.map((r) => r.id);
    assert.deepEqual(mine.sort(), ['sleep:en', 'sleep:ka']);
  });

  test('sending is idempotent per nonce, duplicates and floods are refused', async () => {
    t.clock.advance(60 * SECOND);
    const a = await say(mari, 'stress:en', 'Work has been a lot this week.', { nonce: 'n-1' });
    const b = await say(mari, 'stress:en', 'Work has been a lot this week.', { nonce: 'n-1' });
    assert.equal(b.json.duplicate, true);
    assert.equal(b.json.message.id, a.json.message.id, 'a retried send returns the same message');
    assert.equal((await say(mari, 'stress:en', 'Work has been a lot this week.')).json.error, 'duplicate_message');
    assert.equal((await say(mari, 'stress:en', 'x'.repeat(2001))).json.error, 'message_too_long');
    for (let i = 0; i < 4; i += 1) await say(mari, 'stress:en', `note ${i}`);
    assert.equal((await say(mari, 'stress:en', 'one more')).status, 429, 'more than 5 in 30 seconds slows down');
    t.clock.advance(31 * SECOND);
    assert.equal((await say(mari, 'stress:en', 'one more')).status, 200);
  });

  test('history pages backwards with a cursor', async () => {
    for (let i = 0; i < 45; i += 1) {
      if (i % 5 === 0) t.clock.advance(31 * SECOND);
      assert.equal((await say(luka, 'growth:en', `step ${i}`)).status, 200);
    }
    const first = await read(nino, 'growth:en', '?limit=40');
    assert.equal(first.json.messages.length, 40);
    assert.equal(first.json.hasMore, true);
    assert.equal(first.json.messages.at(-1).body, 'step 44', 'oldest → newest within a page');
    const older = await read(nino, 'growth:en', `?before=${first.json.messages[0].id}&limit=40`);
    assert.equal(older.json.messages.length, 5);
    assert.equal(older.json.hasMore, false);
    assert.equal(older.json.messages[0].body, 'step 0');
  });

  test('replies notify the author, reactions count, and nothing exposes account ids', async () => {
    t.clock.advance(31 * SECOND);
    const q = await say(nino, 'anxiety:en', 'Does anyone else feel worse in the mornings?');
    const r = await say(luka, 'anxiety:en', 'Yes, mornings are hard for me too.', { replyToId: q.json.message.id });
    assert.equal(r.json.message.replyTo.id, q.json.message.id);
    assert.equal(r.json.message.replyTo.pseudonym, 'Nino');
    const notes = await t.api('/api/notifications', { token: nino.token });
    assert.ok(notes.json.notifications.some((n) => n.kind === 'community_reply' && n.data.messageId === r.json.message.id));
    const react = await t.api(`/api/community/messages/${r.json.message.id}/reactions`, { token: nino.token, method: 'POST', body: { reaction: 'hug' } });
    assert.deepEqual(react.json.reactions, { hug: 1 });
    assert.deepEqual(react.json.myReactions, ['hug']);
    assert.equal((await t.api(`/api/community/messages/${r.json.message.id}/reactions`, { token: nino.token, method: 'POST', body: { reaction: 'like' } })).status, 400);
    const text = JSON.stringify((await read(mari, 'anxiety:en')).json);
    for (const u of [nino, luka]) assert.ok(!text.includes(u.accountId), 'no account ids in room data');
  });

  test('blocking hides a member everywhere for the blocker; muting collapses them', async () => {
    t.clock.advance(31 * SECOND);
    await say(luka, 'loneliness:en', 'Evenings feel empty lately.');
    await t.api(`/api/community/members/${luka.ref}/block`, { token: mari.token, method: 'POST' });
    assert.ok(!(await read(mari, 'loneliness:en')).json.messages.some((m) => m.author.pseudonym === 'Luka'));
    await say(luka, 'loneliness:en', '@Mari are you around?');
    const notes = (await t.api('/api/notifications', { token: mari.token })).json.notifications;
    assert.ok(!notes.some((n) => n.kind === 'community_mention'), 'a blocked member cannot notify you');
    await t.api(`/api/community/members/${luka.ref}/block`, { token: mari.token, method: 'DELETE' });
    assert.ok((await read(mari, 'loneliness:en')).json.messages.some((m) => m.author.pseudonym === 'Luka'));
    await t.api(`/api/community/members/${luka.ref}/mute`, { token: nino.token, method: 'POST' });
    const muted = (await read(nino, 'loneliness:en')).json.messages.find((m) => m.author.pseudonym === 'Luka');
    assert.equal(muted.mutedAuthor, true);
    const rel = await t.api('/api/community/relations', { token: nino.token });
    assert.equal(rel.json.muted[0].pseudonym, 'Luka');
  });

  test('contact details and professional claims wait for a moderator; others never see them', async () => {
    t.clock.advance(31 * SECOND);
    const held = await say(mari, 'relationships:en', 'Message me on telegram @mari_k');
    assert.equal(held.json.held, true);
    assert.equal(held.json.message.status, 'held');
    assert.ok((await read(mari, 'relationships:en')).json.messages.some((m) => m.id === held.json.message.id), 'the author sees it, marked as waiting');
    assert.ok(!(await read(nino, 'relationships:en')).json.messages.some((m) => m.id === held.json.message.id), 'nobody else does');
    const claim = await say(luka, 'relationships:en', 'As a psychologist I can tell you that you have an anxiety disorder.');
    assert.equal(claim.json.held, true, 'professional claims in peer rooms wait for review');
    const queue = await t.api('/api/moderation/reports', { token: mod.token });
    assert.ok(queue.json.reports.some((r) => r.targetId === String(held.json.message.id) && r.reason === 'privacy'));
    const claimReport = queue.json.reports.find((r) => r.targetId === String(claim.json.message.id));
    assert.equal(claimReport.reason, 'impersonation');
    assert.equal((await t.api(`/api/moderation/reports/${claimReport.id}/resolve`, { token: mod.token, method: 'POST', body: { action: 'approve_message', note: 'context ok' } })).status, 200);
    assert.ok((await read(nino, 'relationships:en')).json.messages.some((m) => m.id === claim.json.message.id), 'approved messages become visible');
  });

  test('possible risk stays visible, raises an urgent report and a private safety notice', async () => {
    t.clock.advance(31 * SECOND);
    const r = await say(nino, 'depression:en', 'Some nights I want to die.');
    assert.equal(r.json.held, false);
    assert.equal(r.json.safetyNotice, true);
    const queue = (await t.api('/api/moderation/reports', { token: mod.token })).json.reports;
    const urgent = queue.find((x) => x.targetId === String(r.json.message.id));
    assert.equal(urgent.reason, 'self_harm_risk');
    assert.equal(urgent.priority, 3);
    assert.equal(queue[0].priority, 3, 'urgent reports come first');
  });

  test('moderation needs the role and a password session', async () => {
    assert.equal((await t.api('/api/moderation/reports', { token: nino.token })).status, 403);
    assert.equal((await t.api('/api/moderation/reports', { token: mod.deviceToken })).json.error, 'password_session_required');
    assert.equal((await t.api('/api/moderation/reports', { token: mod.token })).status, 200);
  });

  test('reports, removal, suspension, appeal and the audit history', async () => {
    t.clock.advance(31 * SECOND);
    const bad = await say(luka, 'general:en', 'You are all pathetic.');
    assert.equal((await t.api(`/api/community/messages/${bad.json.message.id}/report`, { token: luka.token, method: 'POST', body: { reason: 'harassment' } })).json.error, 'cannot_report_self');
    await joinRoom(nino, 'general:en');
    const rep = await t.api(`/api/community/messages/${bad.json.message.id}/report`, { token: nino.token, method: 'POST', body: { reason: 'harassment', details: 'insulting' } });
    assert.equal(rep.status, 200);
    assert.equal((await t.api(`/api/community/messages/${bad.json.message.id}/report`, { token: nino.token, method: 'POST', body: { reason: 'harassment' } })).json.alreadyReported, true);
    const reportId = rep.json.reportId;
    assert.equal((await t.api(`/api/moderation/reports/${reportId}/resolve`, { token: mod.token, method: 'POST', body: { action: 'remove_message', note: 'harassment' } })).status, 200);
    const seen = (await read(mari, 'general:en')).json.messages.find((m) => m.id === bad.json.message.id);
    assert.equal(seen.status, 'removed');
    assert.equal(seen.body, '', 'removed text is not served');
    const lukaNotes = (await t.api('/api/notifications', { token: luka.token })).json.notifications;
    assert.ok(lukaNotes.some((n) => n.kind === 'moderation_removed'));

    const susp = await t.api(`/api/moderation/members/${luka.ref}/suspend`, { token: mod.token, method: 'POST', body: { kind: 'temporary', hours: 24, reason: 'harassment' } });
    assert.equal(susp.status, 200);
    const blocked = await say(luka, 'general:en', 'hello again');
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.error, 'suspended');
    const appeal = await t.api('/api/community/appeals', { token: luka.token, method: 'POST', body: { suspensionId: susp.json.suspensionId, body: 'I was upset and I am sorry. It will not happen again.' } });
    assert.equal(appeal.status, 200);
    const appeals = (await t.api('/api/moderation/appeals', { token: mod.token })).json.appeals;
    assert.equal(appeals[0].pseudonym, 'Luka');
    const own = await t.api(`/api/moderation/appeals/${appeal.json.appealId}/decide`, { token: mod.token, method: 'POST', body: { decision: 'upheld' } });
    assert.equal(own.status, 409, 'the moderator who suspended cannot decide the review');
    assert.equal(own.json.error, 'own_decision');
    assert.equal((await t.api(`/api/moderation/appeals/${appeal.json.appealId}/decide`, { token: mod2.token, method: 'POST', body: { decision: 'overturned', note: 'apology accepted' } })).status, 200);
    t.clock.advance(31 * SECOND);
    assert.equal((await say(luka, 'general:en', 'Thank you for the second chance.')).status, 200);
    const hist = await t.api(`/api/moderation/history?member=${luka.ref}`, { token: mod.token });
    const actions = hist.json.actions.map((a) => a.action);
    for (const a of ['remove_message', 'suspend', 'appeal_overturned']) assert.ok(actions.includes(a), `history has ${a}`);
    const audit = await t.db.query("select count(*)::int as n from audit_log where action like 'moderation.%'");
    assert.ok(audit.rows[0].n >= 3);
    // A permanent ban blocks posting until lifted.
    const ban = await t.api(`/api/moderation/members/${luka.ref}/suspend`, { token: mod.token, method: 'POST', body: { kind: 'permanent', reason: 'repeated harassment' } });
    // Two months later (sign-in sessions stay valid, they slide forward with use).
    t.clock.advance(60 * 24 * 3600 * SECOND);
    assert.equal((await say(luka, 'general:en', 'still here?')).json.error, 'suspended', 'permanent means no end date');
    assert.equal((await t.db.query('select ends_at from suspensions where id = $1', [ban.json.suspensionId])).rows[0].ends_at, null);
    await t.api(`/api/moderation/suspensions/${ban.json.suspensionId}/lift`, { token: mod.token, method: 'POST', body: { note: 'test cleanup' } });
  });

  test('search finds visible messages in the room', async () => {
    t.clock.advance(31 * SECOND);
    await say(mari, 'burnout:en', 'Taking a short walk after lunch helps my burnout.');
    await joinRoom(nino, 'burnout:en');
    const res = await t.api(`/api/community/rooms/burnout:en/search?q=${encodeURIComponent('short walk')}`, { token: nino.token });
    assert.equal(res.json.results.length, 1);
    assert.equal((await t.api('/api/community/rooms/burnout:en/search?q=a', { token: nino.token })).status, 400);
  });

  test('Anulia answers when asked, as a clearly marked AI reply built only from public room text', async () => {
    t.clock.advance(31 * SECOND);
    const before = anuliaCalls;
    const ask = await say(nino, 'panic:en', '@Anulia my heart races at night, what can I do?');
    assert.equal(ask.json.message.asksAnulia, true);
    const reply = await waitFor(async () => (await read(mari, 'panic:en')).json.messages.find((m) => m.author.kind === 'anulia' && m.replyTo?.id === ask.json.message.id));
    assert.equal(reply.author.pseudonym, 'Bea');
    assert.equal(reply.author.ref, null);
    assert.doesNotMatch(reply.body, /https?:\/\//, 'no links from the AI in public rooms');
    assert.equal(anuliaCalls, before + 1);
    const call = openai.calls.filter((c) => String(c.body).includes('peer-support room')).at(-1);
    const sent = JSON.parse(call.body);
    assert.match(sent.instructions, /not a therapist, psychologist/);
    assert.ok(!call.body.includes(nino.email), 'no private account data in the AI context');
    // The free allowance is 5 asks per day, then Anulia stays quiet for that member.
    for (let i = 0; i < 4; i += 1) {
      t.clock.advance(31 * SECOND);
      await say(nino, 'panic:en', `@Anulia question ${i}`, { askAnulia: true });
    }
    await waitFor(async () => anuliaCalls === before + 5);
    t.clock.advance(31 * SECOND);
    await say(nino, 'panic:en', '@Anulia one more?');
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(anuliaCalls, before + 5, 'no AI call past the daily allowance');
  });

  test('real time: live delivery, per-recipient block filtering, reconnect catch-up, auth required', async () => {
    const base = t.base;
    const opts = (token) => ({ path: '/socket.io', auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
    const anon = connect(base, opts('not-a-real-token-1234567890'));
    const err = await once(anon, 'connect_error');
    assert.match(err.message, /unauthorized/);
    anon.close();

    const a = connect(base, opts(nino.token));
    const b = connect(base, opts(luka.token));
    const c = connect(base, opts(mari.token));
    await Promise.all([once(a, 'connect'), once(b, 'connect'), once(c, 'connect')]);
    for (const u of [nino, luka, mari]) await joinRoom(u, 'grief:en');
    for (const s of [a, b, c]) assert.equal((await emit(s, 'room:join', { roomId: 'grief:en' })).ok, true);
    await t.api(`/api/community/members/${luka.ref}/block`, { token: mari.token, method: 'POST' });
    await emit(c, 'relations:refresh', {});
    let cGotLuka = false;
    c.on('message:new', (m) => {
      if (m.author.pseudonym === 'Luka') cGotLuka = true;
    });
    t.clock.advance(31 * SECOND);
    const gotA = once(a, 'message:new');
    const sent = await emit(b, 'message:send', { roomId: 'grief:en', body: 'Thinking of my grandmother today.', nonce: 'rt-1' });
    assert.equal(sent.ok, true);
    const live = await gotA;
    assert.equal(live.body, 'Thinking of my grandmother today.');
    assert.equal(live.author.pseudonym, 'Luka');
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(cGotLuka, false, 'a member who blocked the author never receives it');
    await t.api(`/api/community/members/${luka.ref}/block`, { token: mari.token, method: 'DELETE' });

    // Reconnect: A drops, B sends two messages, A comes back and syncs from its last id.
    const lastSeen = live.id;
    a.close();
    t.clock.advance(31 * SECOND);
    await emit(b, 'message:send', { roomId: 'grief:en', body: 'It still feels unreal.', nonce: 'rt-2' });
    await emit(b, 'message:send', { roomId: 'grief:en', body: 'Thank you for reading.', nonce: 'rt-3' });
    const a2 = connect(base, opts(nino.token));
    await once(a2, 'connect');
    const sync = await emit(a2, 'room:sync', { roomId: 'grief:en', afterId: lastSeen });
    assert.deepEqual(sync.messages.map((m) => m.body), ['It still feels unreal.', 'Thank you for reading.']);
    // A suspended member can't send over the socket either.
    for (const s of [a2, b, c]) s.close();
  });

  test('access control: only joined members read or subscribe; a room id alone is never enough', async () => {
    const base = t.base;
    const opts = (token) => ({ path: '/socket.io', auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
    const ROOM = 'loneliness:en';
    const OTHER = 'stress:en';
    const raw = (u, roomId, q = '') => t.api(`/api/community/rooms/${roomId}/messages${q}`, { token: u.token });
    const insider = await member('Inside Voice');
    const outsider = await member('Outside Voice');
    t.clock.advance(31 * SECOND);
    const first = await say(insider, ROOM, 'Evenings are the hardest for me lately.');
    assert.equal(first.status, 200, JSON.stringify(first.json));
    await t.db.query('update community_rooms set pinned_message_id = $2 where id = $1', [ROOM, first.json.message.id]);

    // Anonymous device account and a registered account without a community profile.
    const anon = await t.newAccount();
    assert.equal((await raw(anon, ROOM)).json.error, 'registration_required');
    const noProfile = await t.registered();
    assert.equal((await raw(noProfile, ROOM)).json.error, 'profile_required');

    // A member who has not joined: room details yes, content no.
    const info = await t.api(`/api/community/rooms/${ROOM}`, { token: outsider.token });
    assert.equal(info.status, 200);
    assert.equal(info.json.room.joined, false);
    assert.equal(info.json.room.pinned, undefined, 'the pinned message is for members only');
    const notMember = await raw(outsider, ROOM);
    assert.equal(notMember.status, 403);
    assert.equal(notMember.json.error, 'not_a_member');
    assert.equal((await t.api(`/api/community/rooms/${ROOM}/search?q=evenings`, { token: outsider.token })).json.error, 'not_a_member');
    assert.equal((await t.api(`/api/community/rooms/${ROOM}/messages`, { token: outsider.token, method: 'POST', body: { body: 'Hello there' } })).json.error, 'not_a_member');
    assert.equal((await t.api(`/api/community/messages/${first.json.message.id}/reactions`, { token: outsider.token, method: 'POST', body: { reaction: 'support' } })).json.error, 'not_a_member');
    assert.equal((await t.api(`/api/community/messages/${first.json.message.id}/report`, { token: outsider.token, method: 'POST', body: { reason: 'spam' } })).status, 404);

    // The same rules over the live connection.
    const sOut = connect(base, opts(outsider.token));
    const sIn = connect(base, opts(insider.token));
    await Promise.all([once(sOut, 'connect'), once(sIn, 'connect')]);
    const refusedJoin = await emit(sOut, 'room:join', { roomId: ROOM });
    assert.equal(refusedJoin.ok, false);
    assert.equal(refusedJoin.error, 'not_a_member');
    assert.equal((await emit(sOut, 'room:sync', { roomId: ROOM, afterId: 0 })).error, 'not_a_member');
    assert.equal((await emit(sOut, 'message:send', { roomId: ROOM, body: 'Sneaking in', nonce: 'ac-1' })).error, 'not_a_member');
    let outsiderGot = 0;
    sOut.on('message:new', (m) => {
      if (m.roomId === ROOM) outsiderGot += 1;
    });
    assert.equal((await emit(sIn, 'room:join', { roomId: ROOM })).ok, true);
    t.clock.advance(31 * SECOND);
    await emit(sIn, 'message:send', { roomId: ROOM, body: 'Anyone else up late tonight?', nonce: 'ac-2' });
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(outsiderGot, 0, 'a refused socket receives nothing from the room');

    // Cross-room: membership of one room opens only that room.
    await joinRoom(outsider, OTHER);
    assert.equal((await raw(outsider, OTHER)).status, 200);
    assert.equal((await raw(outsider, ROOM)).json.error, 'not_a_member');

    // Joining opens it; leaving closes it again, on HTTP and on every open socket.
    await joinRoom(outsider, ROOM);
    assert.equal((await raw(outsider, ROOM)).status, 200);
    const joinedInfo = await t.api(`/api/community/rooms/${ROOM}`, { token: outsider.token });
    assert.equal(joinedInfo.json.room.pinned.id, first.json.message.id);
    assert.equal((await emit(sOut, 'room:join', { roomId: ROOM })).ok, true);
    const live = once(sOut, 'message:new');
    t.clock.advance(31 * SECOND);
    await emit(sIn, 'message:send', { roomId: ROOM, body: 'Glad you are here.', nonce: 'ac-3' });
    assert.equal((await live).body, 'Glad you are here.');
    await t.api(`/api/community/rooms/${ROOM}/leave`, { token: outsider.token, method: 'POST' });
    assert.equal((await raw(outsider, ROOM)).json.error, 'not_a_member');
    await new Promise((r) => setTimeout(r, 100));
    outsiderGot = 0;
    t.clock.advance(31 * SECOND);
    await emit(sIn, 'message:send', { roomId: ROOM, body: 'Still here if anyone needs.', nonce: 'ac-4' });
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(outsiderGot, 0, 'after leaving, the live stream stops');
    assert.equal((await emit(sOut, 'room:sync', { roomId: ROOM, afterId: 0 })).error, 'not_a_member');

    // A community suspension stops writing, not reading; a platform-wide one stops both.
    const now = t.clock.now();
    const susp = await t.db.query("insert into suspensions (account_id, scope, kind, reason, starts_at, ends_at, created_by) values ($1, 'community', 'temporary', 'test', $2, $3, 'test') returning id", [
      insider.accountId,
      new Date(now - 1000),
      new Date(now + 86400000),
    ]);
    assert.equal((await raw(insider, ROOM)).status, 200);
    t.clock.advance(31 * SECOND);
    const blocked = await t.api(`/api/community/rooms/${ROOM}/messages`, { token: insider.token, method: 'POST', body: { body: 'Can I still write?' } });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.error, 'suspended');
    await t.db.query("update suspensions set scope = 'platform' where id = $1", [susp.rows[0].id]);
    assert.equal((await raw(insider, ROOM)).json.error, 'suspended');
    await t.db.query('update suspensions set lifted_at = $2 where id = $1', [susp.rows[0].id, new Date(t.clock.now())]);
    assert.equal((await raw(insider, ROOM)).status, 200);

    // A paused room: members keep reading, nobody posts or reacts.
    await t.db.query('update community_rooms set is_paused = true where id = $1', [ROOM]);
    assert.equal((await raw(insider, ROOM)).status, 200);
    assert.equal((await t.api(`/api/community/rooms/${ROOM}`, { token: insider.token })).json.room.paused, true);
    t.clock.advance(31 * SECOND);
    const paused = await t.api(`/api/community/rooms/${ROOM}/messages`, { token: insider.token, method: 'POST', body: { body: 'Is anyone around?' } });
    assert.equal(paused.status, 423);
    assert.equal(paused.json.error, 'room_paused');
    await t.db.query('update community_rooms set is_paused = false where id = $1', [ROOM]);

    // Signing out closes that session's open live connections at once.
    const closed = once(sIn, 'disconnect');
    await t.api('/api/auth/logout', { token: insider.token, method: 'POST' });
    await closed;
    const again = connect(base, opts(insider.token));
    assert.match((await once(again, 'connect_error')).message, /unauthorized/);
    for (const s of [sOut, again]) s.close();
  });

  test('deleting an account empties its messages and shows a former member', async () => {
    const temp = await member('Brief Visitor');
    t.clock.advance(31 * SECOND);
    const m = await say(temp, 'general:en', 'Just passing through, take care everyone.');
    assert.equal((await t.api('/api/account', { token: temp.token, method: 'DELETE' })).status, 200);
    const seen = (await read(nino, 'general:en')).json.messages.find((x) => x.id === m.json.message.id);
    assert.equal(seen.body, '');
    assert.equal(seen.status, 'deleted');
    assert.equal(seen.author.formerMember, true);
    assert.equal(seen.author.pseudonym, null);
  });
});
