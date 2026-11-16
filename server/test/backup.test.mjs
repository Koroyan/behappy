// Encrypted backup storage: the server keeps only sealed boxes (made here with
// the app's own lib/backup/crypto.ts), per account, in resumable parts with
// atomic commits and revision checks; quotas; deletion with the account.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, describe, test } from 'node:test';

import { fromRoot, loadTs } from '../../scripts/qa/load-ts.mjs';
import { mountBackup } from '../backup/index.mjs';
import { startTestServer } from './helpers.mjs';

const C = loadTs(fromRoot('lib/backup/crypto.ts'));
const M = loadTs(fromRoot('lib/backup/merge.ts'));
const rnd = (n) => new Uint8Array(randomBytes(n));
const MB = 1024 * 1024;

describe('Encrypted backup', () => {
  let t;
  const call = (u, path, method = 'GET', body) => t.api(path, { token: u?.token, method, body });

  before(async () => {
    t = await startTestServer({ extend: [mountBackup], config: { backup: { maxSnapshotMb: 3, maxBlobMb: 6, maxBlobsMb: 8 } } });
  });
  after(() => t.stop());

  /** What the app does: a data key, a recovery key, the wrapped key to the server. */
  async function turnOn(u) {
    const dek = C.newDataKey(rnd);
    const rk = C.newRecoveryKey(rnd);
    const envelope = C.wrapDataKey(dek, rk.entropy, u.accountId, rnd);
    const r = await call(u, '/api/backup/key', 'PUT', { envelope });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    return { dek, rk, envelope };
  }

  async function upload(u, box, baseRevision, { stopAfter = Infinity } = {}) {
    const partSize = MB;
    const parts = Math.max(1, Math.ceil(box.length / partSize));
    const start = await call(u, '/api/backup/uploads', 'POST', { baseRevision, parts, size: box.length, sha256: C.sha256Hex(box) });
    assert.equal(start.status, 200, JSON.stringify(start.json));
    for (let i = 0; i < parts && i < stopAfter; i += 1) {
      const r = await call(u, `/api/backup/uploads/${start.json.uploadId}/parts/${i}`, 'PUT', { data: C.toBase64(box.subarray(i * partSize, (i + 1) * partSize)) });
      assert.equal(r.status, 200, JSON.stringify(r.json));
    }
    return start.json.uploadId;
  }

  async function download(u) {
    const first = (await call(u, '/api/backup/snapshot?part=0')).json;
    const parts = [C.fromBase64(first.data)];
    for (let i = 1; i < first.parts; i += 1) parts.push(C.fromBase64((await call(u, `/api/backup/snapshot?part=${i}`)).json.data));
    const box = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let o = 0;
    for (const p of parts) {
      box.set(p, o);
      o += p.length;
    }
    assert.equal(C.sha256Hex(box), first.sha256);
    return { box, revision: first.revision };
  }

  const snapshotBox = (u, dek, text) => C.sealText(dek, JSON.stringify(M.makeSnapshot({ journal: { records: { j1: { h: M.fingerprint({ id: 'j1', content: text }), t: 1, d: { id: 'j1', content: text } } }, tombstones: {} } }, 'dev1', Date.now())), C.aad(u.accountId, 'snapshot', 'current'), rnd);

  test('a backup needs an email account; it is off until turned on', async () => {
    const anon = await t.newAccount();
    assert.equal((await call(anon, '/api/backup')).json.error, 'registration_required');
    const u = await t.registered();
    const s = (await call(u, '/api/backup')).json;
    assert.equal(s.enabled, false);
    assert.equal(s.keyEnvelope, null);
    // A wrapped key that isn't one is refused.
    assert.equal((await call(u, '/api/backup/key', 'PUT', { envelope: { v: 1, kdf: 'none', wrapped: 'plain' } })).json.error, 'bad_envelope');
  });

  test('the server stores only what it cannot read; the recovery key opens it on a new device', async () => {
    const u = await t.registered();
    const { dek, rk } = await turnOn(u);
    const box = snapshotBox(u, dek, 'my private journal line');
    const id = await upload(u, box, 0);
    const done = await call(u, `/api/backup/uploads/${id}/commit`, 'POST', {});
    assert.equal(done.json.revision, 1);
    // Nothing readable on the server: not in the snapshot, not in the vault.
    const rows = await t.db.query('select encode(s.data, \'escape\') as data, v.key_envelope::text as env from backup_snapshots s join backup_vaults v using (account_id) where s.account_id = $1', [u.accountId]);
    assert.ok(!rows.rows[0].data.includes('private journal'));
    assert.ok(!rows.rows[0].env.includes(C.toHex(dek)));
    // A new device: sign in, get the envelope, open it with the recovery key, decrypt.
    const status = (await call(u, '/api/backup')).json;
    assert.equal(status.revision, 1);
    const key = C.unwrapDataKey(status.keyEnvelope, C.parseRecoveryKey(rk.text), u.accountId);
    const { box: got } = await download(u);
    const snap = M.readSnapshot(C.openText(key, got, C.aad(u.accountId, 'snapshot', 'current')));
    assert.equal(snap.collections.journal.records.j1.d.content, 'my private journal line');
    // A wrong recovery key fails.
    assert.throws(() => C.unwrapDataKey(status.keyEnvelope, C.newRecoveryKey(rnd).entropy, u.accountId), (e) => e.code === 'wrong_key');
  });

  test('accounts are isolated: one person can never read or touch another person’s backup', async () => {
    const a = await t.registered();
    const b = await t.registered();
    const ka = await turnOn(a);
    const id = await upload(a, snapshotBox(a, ka.dek, 'A only'), 0);
    await call(a, `/api/backup/uploads/${id}/commit`, 'POST', {});
    // B has no backup and can't see A's.
    assert.equal((await call(b, '/api/backup')).json.enabled, false);
    assert.equal((await call(b, '/api/backup/snapshot?part=0')).json.error, 'no_snapshot');
    // B can't use A's upload id, nor read A's images.
    const idA = await upload(a, snapshotBox(a, ka.dek, 'A again'), 1, { stopAfter: 0 });
    assert.equal((await call(b, `/api/backup/uploads/${idA}`)).json.error, 'no_upload');
    assert.equal((await call(b, `/api/backup/uploads/${idA}/parts/0`, 'PUT', { data: 'AAAA' })).json.error, 'no_upload');
    // Even if A's sealed box were copied to B, B's account-bound check fails: it can't be opened as B's.
    const { box } = await download(a);
    assert.throws(() => C.openText(ka.dek, box, C.aad(b.accountId, 'snapshot', 'current')), (e) => e.code === 'tampered');
  });

  test('an interrupted upload continues where it stopped; a half upload never replaces a whole one', async () => {
    const u = await t.registered();
    const { dek } = await turnOn(u);
    const big = C.sealText(dek, 'x'.repeat(2.5 * MB), C.aad(u.accountId, 'snapshot', 'current'), rnd); // 3 parts
    const id = await upload(u, big, 0, { stopAfter: 1 });
    // Committing now is refused and lists what is missing.
    const early = await call(u, `/api/backup/uploads/${id}/commit`, 'POST', {});
    assert.equal(early.status, 409);
    assert.deepEqual(early.json.missing, [1, 2]);
    assert.equal((await call(u, '/api/backup')).json.revision, 0, 'nothing replaced');
    // Resume: the server says which parts it has; only the rest is sent.
    assert.deepEqual((await call(u, `/api/backup/uploads/${id}`)).json.received, [0]);
    for (const i of [1, 2]) await call(u, `/api/backup/uploads/${id}/parts/${i}`, 'PUT', { data: C.toBase64(big.subarray(i * MB, (i + 1) * MB)) });
    assert.equal((await call(u, `/api/backup/uploads/${id}/commit`, 'POST', {})).json.revision, 1);
    // A part of the wrong size, or a damaged upload (checksum), is refused.
    const id2 = await upload(u, big, 1, { stopAfter: 0 });
    assert.equal((await call(u, `/api/backup/uploads/${id2}/parts/0`, 'PUT', { data: C.toBase64(big.subarray(0, 100)) })).json.error, 'bad_part_size');
    const bad = big.slice();
    bad[bad.length - 1] ^= 1;
    for (let i = 0; i < 3; i += 1) await call(u, `/api/backup/uploads/${id2}/parts/${i}`, 'PUT', { data: C.toBase64(bad.subarray(i * MB, (i + 1) * MB)) });
    assert.equal((await call(u, `/api/backup/uploads/${id2}/commit`, 'POST', {})).json.error, 'corrupt_upload');
    assert.equal((await call(u, '/api/backup')).json.revision, 1);
  });

  test('two devices: a commit based on an old revision is refused (the app merges first)', async () => {
    const u = await t.registered();
    const { dek } = await turnOn(u);
    const one = await upload(u, snapshotBox(u, dek, 'device A'), 0);
    const two = await upload(u, snapshotBox(u, dek, 'device B'), 0);
    assert.equal((await call(u, `/api/backup/uploads/${one}/commit`, 'POST', {})).json.revision, 1);
    const late = await call(u, `/api/backup/uploads/${two}/commit`, 'POST', {});
    assert.equal(late.status, 409);
    assert.equal(late.json.error, 'conflict');
    assert.equal(late.json.revision, 1);
    // What A committed is what is stored.
    const { box } = await download(u);
    assert.match(C.openText(dek, box, C.aad(u.accountId, 'snapshot', 'current')), /device A/);
  });

  test('large images: encrypted one by one, checked, and within the storage quota', async () => {
    const u = await t.registered();
    const { dek } = await turnOn(u);
    const image = rnd(5 * MB);
    const box = C.seal(dek, image, C.aad(u.accountId, 'blob', 'art_big'), rnd);
    const put = await call(u, '/api/backup/blobs/art_big', 'PUT', { data: C.toBase64(box), sha256: C.sha256Hex(box) });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    const got = (await call(u, '/api/backup/blobs/art_big')).json;
    assert.deepEqual(C.open(dek, C.fromBase64(got.data), C.aad(u.accountId, 'blob', 'art_big')), image);
    // The image can't be passed off as another image.
    assert.throws(() => C.open(dek, C.fromBase64(got.data), C.aad(u.accountId, 'blob', 'art_other')), (e) => e.code === 'tampered');
    // A wrong checksum, plain data, or more than the quota (8 MB here) is refused.
    assert.equal((await call(u, '/api/backup/blobs/art_x', 'PUT', { data: C.toBase64(box), sha256: '0'.repeat(64) })).json.error, 'bad_checksum');
    assert.equal((await call(u, '/api/backup/blobs/art_y', 'PUT', { data: C.toBase64(new TextEncoder().encode('just a plain text image here, not sealed')), sha256: C.sha256Hex(new TextEncoder().encode('just a plain text image here, not sealed')) })).json.error, 'bad_data');
    const box2 = C.seal(dek, rnd(4 * MB), C.aad(u.accountId, 'blob', 'art_two'), rnd);
    const over = await call(u, '/api/backup/blobs/art_two', 'PUT', { data: C.toBase64(box2), sha256: C.sha256Hex(box2) });
    assert.equal(over.status, 413);
    assert.equal(over.json.error, 'quota_exceeded');
    const s = (await call(u, '/api/backup')).json;
    assert.equal(s.blobs.length, 1);
    assert.ok(s.quota.blobsUsed > 5 * MB);
    // A snapshot over its limit (3 MB here) can't even start.
    assert.equal((await call(u, '/api/backup/uploads', 'POST', { baseRevision: s.revision, parts: 4, size: 3.5 * MB, sha256: '0'.repeat(64) })).json.error, 'too_large');
  });

  test('deleting the backup, a new recovery key, and deleting the account remove everything', async () => {
    const u = await t.registered();
    const first = await turnOn(u);
    const id = await upload(u, snapshotBox(u, first.dek, 'old'), 0);
    await call(u, `/api/backup/uploads/${id}/commit`, 'POST', {});
    const blob = C.seal(first.dek, rnd(100), C.aad(u.accountId, 'blob', 'art_1'), rnd);
    await call(u, '/api/backup/blobs/art_1', 'PUT', { data: C.toBase64(blob), sha256: C.sha256Hex(blob) });
    // Turning on again needs an explicit "replace" (a lost recovery key): the old, unreadable data goes.
    const env2 = C.wrapDataKey(C.newDataKey(rnd), C.newRecoveryKey(rnd).entropy, u.accountId, rnd);
    assert.equal((await call(u, '/api/backup/key', 'PUT', { envelope: env2 })).json.error, 'backup_exists');
    assert.equal((await call(u, '/api/backup/key', 'PUT', { envelope: env2, replace: true })).status, 200);
    const s = (await call(u, '/api/backup')).json;
    assert.equal(s.revision, 0);
    assert.equal(s.blobs.length, 0);
    assert.equal(s.keyId, env2.keyId);
    // Delete the backup.
    assert.equal((await call(u, '/api/backup', 'DELETE')).json.enabled, false);
    assert.equal((await call(u, '/api/backup')).json.enabled, false);
    // Deleting the account deletes any backup too.
    await turnOn(u);
    await call(u, '/api/account', 'DELETE');
    for (const table of ['backup_vaults', 'backup_snapshots', 'backup_blobs', 'backup_uploads']) {
      assert.equal((await t.db.query(`select count(*)::int as n from ${table} where account_id = $1`, [u.accountId])).rows[0].n, 0, table);
    }
  });
});
