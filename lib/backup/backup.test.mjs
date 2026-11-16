// Run: npm run test:unit
// Encrypted backup: the cryptography (wrong keys, tampering, account and
// object binding, typos in recovery keys) and the record-by-record merge
// (concurrent edits, deletions, older or damaged backups, first restore).
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import { fromRoot, loadTs } from '../../scripts/qa/load-ts.mjs';

const C = loadTs(fromRoot('lib/backup/crypto.ts'));
const M = loadTs(fromRoot('lib/backup/merge.ts'));
const K = loadTs(fromRoot('lib/backup/collections.ts'));
const rnd = (n) => new Uint8Array(randomBytes(n));

test('a payload is sealed and opened only with the same key, account and object', () => {
  const dek = C.newDataKey(rnd);
  const box = C.sealText(dek, 'Dear diary: a private line', C.aad('acc_A', 'snapshot', 'current'), rnd);
  assert.ok(!Buffer.from(box).toString('utf8').includes('diary'), 'ciphertext does not contain the text');
  assert.equal(C.openText(dek, box, C.aad('acc_A', 'snapshot', 'current')), 'Dear diary: a private line');
  // Wrong key.
  assert.throws(() => C.openText(C.newDataKey(rnd), box, C.aad('acc_A', 'snapshot', 'current')), (e) => e.code === 'tampered');
  // Another account or another object (a box moved by the server) does not open.
  assert.throws(() => C.openText(dek, box, C.aad('acc_B', 'snapshot', 'current')), (e) => e.code === 'tampered');
  assert.throws(() => C.openText(dek, box, C.aad('acc_A', 'blob', 'current')), (e) => e.code === 'tampered');
  // Any changed byte is caught.
  for (const i of [0, 5, 30, box.length - 1]) {
    const bad = box.slice();
    bad[i] ^= 1;
    assert.throws(() => C.openText(dek, bad, C.aad('acc_A', 'snapshot', 'current')), (e) => e.code === 'tampered' || e.code === 'bad_format');
  }
  assert.throws(() => C.open(dek, box.slice(0, 20), C.aad('acc_A', 'snapshot', 'current')), (e) => e.code === 'bad_format');
  // Two seals of the same text differ (random nonce).
  assert.notDeepEqual(C.sealText(dek, 'x', C.aad('a', 'blob', 'b'), rnd), C.sealText(dek, 'x', C.aad('a', 'blob', 'b'), rnd));
});

test('the recovery key unwraps the data key; a wrong key or a typo does not', () => {
  const dek = C.newDataKey(rnd);
  const rk = C.newRecoveryKey(rnd);
  assert.match(rk.text, /^([0-9A-HJKMNP-TV-Z]{4}-){8}[0-9A-HJKMNP-TV-Z]{4}$/);
  const env = C.wrapDataKey(dek, rk.entropy, 'acc_A', rnd);
  assert.ok(!JSON.stringify(env).includes(C.toHex(dek)), 'the envelope does not contain the key');
  assert.deepEqual(C.unwrapDataKey(env, C.parseRecoveryKey(rk.text), 'acc_A'), dek);
  // Typed loosely: lower case, spaces, O for 0.
  const loose = rk.text.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o');
  assert.deepEqual(C.unwrapDataKey(env, C.parseRecoveryKey(loose), 'acc_A'), dek);
  // Another recovery key: authentication fails.
  assert.throws(() => C.unwrapDataKey(env, C.newRecoveryKey(rnd).entropy, 'acc_A'), (e) => e.code === 'wrong_key');
  // The envelope of another account doesn't open here.
  assert.throws(() => C.unwrapDataKey(env, rk.entropy, 'acc_B'), (e) => e.code === 'wrong_key');
  // One wrong character is a typo (checksum), not a silent wrong key.
  const chars = rk.text.replace(/-/g, '').split('');
  chars[3] = chars[3] === 'A' ? 'B' : 'A';
  assert.throws(() => C.parseRecoveryKey(chars.join('')), (e) => e.code === 'recovery_typo' || e.code === 'bad_recovery_key');
  assert.throws(() => C.parseRecoveryKey('too-short'), (e) => e.code === 'bad_recovery_key');
});

test('base64 and hex round-trip any bytes', () => {
  for (const n of [0, 1, 2, 3, 4, 5, 255, 1000]) {
    const b = rnd(n);
    assert.deepEqual(C.fromBase64(C.toBase64(b)), b);
    assert.equal(C.toBase64(b), Buffer.from(b).toString('base64'));
    assert.deepEqual(C.fromHex(C.toHex(b)), b);
  }
  assert.throws(() => C.fromBase64('ab$c'), (e) => e.code === 'bad_format');
});

// ---------- Merge ----------

const T0 = Date.parse('2026-11-01T10:00:00Z');
const entry = (id, content, at, updatedAt) => ({ id, timestamp: at, content, ...(updatedAt ? { updatedAt } : {}) });
const values = (o) => o;
const sync = (local, remote, base, now) => {
  const l = M.localState(local, base, now);
  return M.merge(l, remote, base, now);
};
const journalOf = (state) => Object.values(state.journal.records).map((r) => r.d);

test('first backup, then a restore on a new device brings everything back', () => {
  const deviceA = values({ journal_entries: [entry('j1', 'one', T0), entry('j2', 'two', T0 + 1000)], '@behappy_user_profile': { name: 'Nino' } });
  const first = sync(deviceA, null, null, T0 + 5000);
  assert.equal(journalOf(first.merged).length, 2);
  const backup = first.merged;
  // A brand-new phone: nothing there yet, except a default it saved itself.
  const fresh = values({ '@behappy_user_profile': { name: '' } });
  const restored = sync(fresh, backup, null, T0 + 9000);
  assert.deepEqual(journalOf(restored.merged).map((e) => e.id).sort(), ['j1', 'j2']);
  // The fresh install's untimed profile counts as older than the backup; what it replaced is listed.
  assert.equal(restored.merged.profile.records.doc.d.name, 'Nino');
  assert.equal(restored.replaced.length, 1);
  assert.equal(restored.replaced[0].side, 'device');
  const out = M.deviceValues(restored.merged, restored.deviceChanged, fresh);
  assert.equal(out.journal_entries.length, 2);
  assert.equal(out['@behappy_user_profile'].name, 'Nino');
});

test('an edit on one device wins over the unchanged copy; never the other way round', () => {
  const start = values({ journal_entries: [entry('j1', 'first draft', T0)] });
  const s1 = sync(start, null, null, T0 + 10);
  const base = M.baseFrom(s1.merged, 1, T0 + 10);
  // Device B edits j1 and syncs.
  const b = sync(values({ journal_entries: [entry('j1', 'edited on B', T0, T0 + 60000)] }), s1.merged, base, T0 + 60000);
  const backupAfterB = b.merged;
  // Device A did not touch j1: it takes B's edit.
  const a = sync(start, backupAfterB, base, T0 + 120000);
  assert.equal(journalOf(a.merged)[0].content, 'edited on B');
  assert.deepEqual(a.deviceChanged, ['journal']);
  // An older backup (still s1) never overwrites A's newer local edit.
  const aEdited = values({ journal_entries: [entry('j1', 'edited on A', T0, T0 + 200000)] });
  const older = sync(aEdited, s1.merged, base, T0 + 300000);
  assert.equal(journalOf(older.merged)[0].content, 'edited on A');
  assert.equal(older.deviceChanged.length, 0);
});

test('the same entry edited on two devices: both versions are kept', () => {
  const s1 = sync(values({ journal_entries: [entry('j1', 'original', T0)] }), null, null, T0 + 1);
  const base = M.baseFrom(s1.merged, 1, T0 + 1);
  const remote = sync(values({ journal_entries: [entry('j1', 'B wrote this', T0, T0 + 5000)] }), s1.merged, base, T0 + 5000).merged;
  const a = sync(values({ journal_entries: [entry('j1', 'A wrote this', T0, T0 + 7000)] }), remote, base, T0 + 9000);
  const texts = journalOf(a.merged).map((e) => e.content).sort();
  assert.deepEqual(texts, ['A wrote this', 'B wrote this']);
  const copy = journalOf(a.merged).find((e) => e.conflictOf === 'j1');
  assert.equal(copy.content, 'B wrote this', 'the older edit is the copy');
  assert.equal(a.stats.copies, 1);
});

test('Bea conversations continued on two devices keep every message', () => {
  const conv = (msgs) => ({ id: 'c1', startTime: '2026-11-01T10:00:00Z', messages: msgs, insights: [], emotions: [] });
  const m = (id, min, text) => ({ id, type: 'user', content: text, timestamp: new Date(T0 + min * 60000).toISOString() });
  const s1 = sync(values({ therapy_sessions: [conv([m('m1', 0, 'hi')])] }), null, null, T0 + 1);
  const base = M.baseFrom(s1.merged, 1, T0 + 1);
  const remote = sync(values({ therapy_sessions: [conv([m('m1', 0, 'hi'), m('m2', 5, 'from B')])] }), s1.merged, base, T0 + 6 * 60000).merged;
  const a = sync(values({ therapy_sessions: [conv([m('m1', 0, 'hi'), m('m3', 7, 'from A')])] }), remote, base, T0 + 8 * 60000);
  const msgs = Object.values(a.merged.bea.records)[0].d.messages.map((x) => x.id);
  assert.deepEqual(msgs, ['m1', 'm2', 'm3']);
});

test('deleting: an explicit delete travels; a backup that merely lacks a record deletes nothing', () => {
  const both = values({ journal_entries: [entry('j1', 'keep', T0), entry('j2', 'delete me', T0 + 1)] });
  const s1 = sync(both, null, null, T0 + 2);
  const base = M.baseFrom(s1.merged, 1, T0 + 2);
  // Device B deletes j2: a tombstone in the backup.
  const b = sync(values({ journal_entries: [entry('j1', 'keep', T0)] }), s1.merged, base, T0 + 1000);
  assert.ok(b.merged.journal.tombstones.j2);
  // Device A, unchanged, receives the delete.
  const a = sync(both, b.merged, base, T0 + 2000);
  assert.deepEqual(journalOf(a.merged).map((e) => e.id), ['j1']);
  // A damaged or partial backup (no journal at all, no tombstones): A keeps everything.
  const partial = { ...s1.merged, journal: { records: {}, tombstones: {} } };
  const safe = sync(both, partial, base, T0 + 3000);
  assert.deepEqual(journalOf(safe.merged).map((e) => e.id).sort(), ['j1', 'j2']);
  assert.equal(safe.deviceChanged.includes('journal'), false);
  // A delete loses to an edit made after it.
  const editedLater = values({ journal_entries: [entry('j1', 'keep', T0), entry('j2', 'rewritten later', T0 + 1, T0 + 5000)] });
  const kept = sync(editedLater, b.merged, base, T0 + 6000);
  assert.equal(journalOf(kept.merged).find((e) => e.id === 'j2').content, 'rewritten later');
});

test('events and badges are joined; duplicates count once', () => {
  const ev = (id, at) => ({ id, v: 1, type: 'breathing.completed', at, day: '2026-11-01' });
  const s1 = sync(values({ '@behappy_events_v1': { v: 1, events: [ev('e1', T0)] } }), null, null, T0 + 1);
  const base = M.baseFrom(s1.merged, 1, T0 + 1);
  const remote = sync(values({ '@behappy_events_v1': { v: 1, events: [ev('e1', T0), ev('e2', T0 + 10)] } }), s1.merged, base, T0 + 20).merged;
  const a = sync(values({ '@behappy_events_v1': { v: 1, events: [ev('e1', T0), ev('e3', T0 + 15)] } }), remote, base, T0 + 30);
  const out = M.deviceValues(a.merged, a.deviceChanged, {});
  assert.deepEqual(out['@behappy_events_v1'].events.map((e) => e.id), ['e1', 'e2', 'e3']);
  assert.equal(out['@behappy_events_v1'].v, undefined, 'other fields come from this device (none given here)');
});

test('collections that share one storage key are rebuilt together', () => {
  const steps = { v: 1, steps: [{ id: 's1', template: 'walking', updatedAt: T0, createdAt: T0 }], marks: [{ stepId: 's1', day: '2026-11-01', status: 'done', at: T0 }], showStreaks: true };
  const s = sync(values({ '@behappy_steps_v1': steps }), null, null, T0 + 1);
  const fresh = sync(values({}), s.merged, null, T0 + 2);
  const out = M.deviceValues(fresh.merged, fresh.deviceChanged, {});
  assert.equal(out['@behappy_steps_v1'].steps.length, 1);
  assert.equal(out['@behappy_steps_v1'].marks.length, 1);
});

test('consent and sign-in are never part of a backup', () => {
  const keys = K.COLLECTIONS.map((c) => c.key);
  for (const k of ['@behappy_ai_consent_v1', '@behappy_memory_consent_v1', '@behappy_ai_personalize_v1', '@behappy_account_v1', '@behappy_analytics_queue_v1']) {
    assert.ok(!keys.includes(k), `${k} must not be backed up`);
    assert.ok(K.NEVER_BACKED_UP.includes(k));
  }
  const s = sync(values({ '@behappy_ai_consent_v1': { ai: true }, journal_entries: [] }), null, null, T0);
  assert.ok(!JSON.stringify(s.merged).includes('"ai":true'));
});

test('snapshots of an unknown format or a newer version are refused, not half-read', () => {
  assert.throws(() => M.readSnapshot('{"format":"other"}'), /not_a_backup/);
  assert.throws(() => M.readSnapshot(JSON.stringify({ format: 'behappy-backup', v: 99, collections: {} })), /newer_format/);
  const ok = M.readSnapshot(JSON.stringify(M.makeSnapshot({ journal: { records: { a: { h: 'x', t: 1, d: { id: 'a' } }, bad: { nope: 1 } }, tombstones: { z: 5, y: 'no' } } }, 'dev1', T0)));
  assert.deepEqual(Object.keys(ok.collections.journal.records), ['a']);
  assert.deepEqual(ok.collections.journal.tombstones, { z: 5 });
});

test('the same data always has the same fingerprint (key order does not matter)', () => {
  assert.equal(M.fingerprint({ a: 1, b: { c: [1, 2], d: 'x' } }), M.fingerprint({ b: { d: 'x', c: [1, 2] }, a: 1 }));
  assert.notEqual(M.fingerprint({ a: 1 }), M.fingerprint({ a: 2 }));
});
