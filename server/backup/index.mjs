// Optional end-to-end encrypted backup: storage only.
//
// The app encrypts on the device (lib/backup/crypto.ts) and sends sealed
// boxes; this module stores them per account and hands them back. It never
// receives a usable key or any plaintext: it keeps the data key wrapped by a
// key derived from the person's recovery key, which never leaves their
// device. Nothing here is logged; staff can't read a backup, only see that one
// exists (and its size) through the database.
//
// Reliability: snapshots are uploaded in parts and committed atomically, so an
// interrupted upload continues where it stopped and a half-uploaded snapshot
// never replaces a whole one. Each commit names the revision it was based on;
// if another device committed in between, the commit is refused (409) and the
// app merges first (lib/backup/merge.ts), so nothing is overwritten blindly.

import crypto from 'node:crypto';

import express from 'express';

import { requireAccount } from '../auth.mjs';
import { ms, ts } from '../db/index.mjs';
import { createLimiter } from '../rateLimit.mjs';

const MB = 1024 * 1024;
const PART = MB; // one part, decoded
const ID = /^[A-Za-z0-9_-]{4,80}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const B64 = /^[A-Za-z0-9+/]*={0,2}$/;
const BOX_MIN = 1 + 24 + 16;

export class BackupError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
const fail = (status, code, extra) => {
  throw new BackupError(status, code, extra);
};

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const decode = (text, max) => {
  const s = String(text || '');
  if (!s || !B64.test(s) || s.length > Math.ceil(max / 3) * 4 + 4) fail(400, 'bad_data');
  const b = Buffer.from(s, 'base64');
  if (!b.length || b.length > max) fail(413, 'too_large');
  return b;
};
const looksSealed = (b) => b.length >= BOX_MIN && b[0] === 1;
const toBuf = (v) => (Buffer.isBuffer(v) ? v : Buffer.from(v));

export function validEnvelope(e) {
  return Boolean(
    e &&
      typeof e === 'object' &&
      e.v === 1 &&
      e.kdf === 'hkdf-sha256' &&
      e.aead === 'xchacha20poly1305' &&
      typeof e.salt === 'string' &&
      /^[0-9a-f]{32}$/.test(e.salt) &&
      typeof e.wrapped === 'string' &&
      B64.test(e.wrapped) &&
      e.wrapped.length >= 40 &&
      e.wrapped.length <= 200 &&
      typeof e.keyId === 'string' &&
      /^[0-9a-f]{16}$/.test(e.keyId)
  );
}

export function createBackup({ db, clock = { now: () => Date.now() }, config = {} }) {
  const limits = {
    snapshot: Math.max(1, Number(config.backup?.maxSnapshotMb) || 25) * MB,
    blob: Math.max(1, Number(config.backup?.maxBlobMb) || 8) * MB,
    blobs: Math.max(1, Number(config.backup?.maxBlobsMb) || 200) * MB,
  };
  const uploadsLimit = createLimiter(db, { name: 'backup-uploads', limit: 40, windowMs: 60 * 60 * 1000 });
  const blobLimit = createLimiter(db, { name: 'backup-blobs', limit: 600, windowMs: 60 * 60 * 1000 });

  const member = (account) => {
    // Restoring on a new device means signing in again: a backup needs an email account.
    if (!account?.registered) fail(403, 'registration_required');
  };

  async function vault(q, accountId, lock = false) {
    const r = await q.query(`select * from backup_vaults where account_id = $1${lock ? ' for update' : ''}`, [accountId]);
    return r.rows[0] || null;
  }

  async function status(account) {
    member(account);
    const v = await vault(db, account.id);
    const blobs = await db.query('select blob_id, size, sha256 from backup_blobs where account_id = $1 order by blob_id', [account.id]);
    const used = blobs.rows.reduce((s, b) => s + b.size, 0);
    return {
      enabled: Boolean(v),
      revision: v?.revision ?? 0,
      keyId: v?.key_id ?? null,
      keyEnvelope: v?.key_envelope ?? null,
      size: v?.snapshot_size ?? 0,
      sha256: v?.snapshot_sha256 ?? null,
      createdAt: ms(v?.created_at),
      updatedAt: v?.revision ? ms(v.updated_at) : null,
      blobs: blobs.rows.map((b) => ({ id: b.blob_id, size: b.size, sha256: b.sha256 })),
      quota: { snapshotMax: limits.snapshot, blobMax: limits.blob, blobsMax: limits.blobs, blobsUsed: used },
      partSize: PART,
    };
  }

  /** Turns backup on with a wrapped key. Replacing a key (a lost recovery key) deletes the old, now unreadable, data. */
  async function setKey(account, { envelope, replace } = {}) {
    member(account);
    if (!validEnvelope(envelope)) fail(400, 'bad_envelope');
    const now = clock.now();
    return db.tx(async (t) => {
      const v = await vault(t, account.id, true);
      if (v && !replace) fail(409, 'backup_exists', { keyId: v.key_id });
      if (v) {
        await t.query('delete from backup_snapshots where account_id = $1', [account.id]);
        await t.query('delete from backup_blobs where account_id = $1', [account.id]);
        await t.query('delete from backup_uploads where account_id = $1', [account.id]);
        await t.query('delete from backup_vaults where account_id = $1', [account.id]);
      }
      const clean = { v: 1, kdf: envelope.kdf, aead: envelope.aead, salt: envelope.salt, wrapped: envelope.wrapped, keyId: envelope.keyId };
      await t.query('insert into backup_vaults (account_id, key_envelope, key_id, created_at, updated_at) values ($1, $2::jsonb, $3, $4, $4)', [account.id, JSON.stringify(clean), envelope.keyId, ts(now)]);
      return { enabled: true, revision: 0, keyId: envelope.keyId };
    });
  }

  async function startUpload(account, { baseRevision, parts, size, sha256 } = {}) {
    member(account);
    const now = clock.now();
    if (!(await uploadsLimit.allow(account.id, now))) fail(429, 'slow_down');
    if (!(await vault(db, account.id))) fail(404, 'no_backup');
    const n = Number(parts);
    const bytes = Number(size);
    if (!Number.isInteger(n) || n < 1 || n > 64) fail(400, 'bad_parts');
    if (!Number.isInteger(bytes) || bytes < BOX_MIN) fail(400, 'bad_size');
    if (bytes > limits.snapshot) fail(413, 'too_large', { max: limits.snapshot });
    if (Math.ceil(bytes / PART) !== n) fail(400, 'bad_parts');
    if (!HEX64.test(String(sha256 || ''))) fail(400, 'bad_checksum');
    // Old or abandoned uploads go (a day, or more than three open).
    await db.query('delete from backup_uploads where account_id = $1 and created_at < $2', [account.id, ts(now - 24 * 60 * 60 * 1000)]);
    const open = await db.query('select id from backup_uploads where account_id = $1 order by created_at desc', [account.id]);
    for (const old of open.rows.slice(2)) await db.query('delete from backup_uploads where id = $1', [old.id]);
    const id = `up_${crypto.randomBytes(12).toString('hex')}`;
    await db.query('insert into backup_uploads (id, account_id, base_revision, parts, size, sha256, created_at) values ($1, $2, $3, $4, $5, $6, $7)', [id, account.id, Number(baseRevision) || 0, n, bytes, sha256, ts(now)]);
    return { uploadId: id, partSize: PART };
  }

  async function ownUpload(account, id) {
    member(account);
    const r = await db.query('select * from backup_uploads where id = $1 and account_id = $2', [String(id || ''), account.id]);
    if (!r.rowCount) fail(404, 'no_upload');
    return r.rows[0];
  }

  async function putPart(account, id, n, data) {
    const up = await ownUpload(account, id);
    const i = Number(n);
    if (!Number.isInteger(i) || i < 0 || i >= up.parts) fail(400, 'bad_part');
    const b = decode(data, PART);
    const expected = i === up.parts - 1 ? up.size - PART * (up.parts - 1) : PART;
    if (b.length !== expected) fail(400, 'bad_part_size', { expected });
    await db.query('insert into backup_upload_chunks (upload_id, n, data) values ($1, $2, $3) on conflict (upload_id, n) do update set data = excluded.data', [up.id, i, b]);
    return { ok: true };
  }

  async function uploadStatus(account, id) {
    const up = await ownUpload(account, id);
    const r = await db.query('select n from backup_upload_chunks where upload_id = $1 order by n', [up.id]);
    return { uploadId: up.id, parts: up.parts, received: r.rows.map((x) => x.n) };
  }

  /** Puts the parts together, checks them, and makes them the current snapshot, unless another device got there first. */
  async function commit(account, id) {
    const up = await ownUpload(account, id);
    const now = clock.now();
    const rows = await db.query('select n, data from backup_upload_chunks where upload_id = $1 order by n', [up.id]);
    const have = new Set(rows.rows.map((x) => x.n));
    const missing = [];
    for (let i = 0; i < up.parts; i += 1) if (!have.has(i)) missing.push(i);
    if (missing.length) fail(409, 'incomplete', { missing });
    const data = Buffer.concat(rows.rows.map((x) => toBuf(x.data)));
    if (data.length !== up.size || sha(data) !== up.sha256 || !looksSealed(data)) {
      await db.query('delete from backup_uploads where id = $1', [up.id]);
      fail(400, 'corrupt_upload');
    }
    return db.tx(async (t) => {
      const v = await vault(t, account.id, true);
      if (!v) fail(404, 'no_backup');
      if (v.revision !== up.base_revision) fail(409, 'conflict', { revision: v.revision });
      const revision = v.revision + 1;
      await t.query('insert into backup_snapshots (account_id, revision, data, created_at) values ($1, $2, $3, $4) on conflict (account_id) do update set revision = excluded.revision, data = excluded.data, created_at = excluded.created_at', [account.id, revision, data, ts(now)]);
      await t.query('update backup_vaults set revision = $2, snapshot_size = $3, snapshot_sha256 = $4, updated_at = $5 where account_id = $1', [account.id, revision, data.length, up.sha256, ts(now)]);
      await t.query('delete from backup_uploads where id = $1', [up.id]);
      return { revision, size: data.length, updatedAt: now };
    });
  }

  /** The current snapshot, one part at a time (resumable downloads). */
  async function snapshotPart(account, part) {
    member(account);
    const r = await db.query('select revision, data from backup_snapshots where account_id = $1', [account.id]);
    if (!r.rowCount) fail(404, 'no_snapshot');
    const data = toBuf(r.rows[0].data);
    const parts = Math.max(1, Math.ceil(data.length / PART));
    const i = Number(part) || 0;
    if (!Number.isInteger(i) || i < 0 || i >= parts) fail(400, 'bad_part');
    return { revision: r.rows[0].revision, size: data.length, sha256: sha(data), parts, part: i, data: data.subarray(i * PART, (i + 1) * PART).toString('base64') };
  }

  async function putBlob(account, blobId, { data, sha256 } = {}) {
    member(account);
    const now = clock.now();
    if (!ID.test(String(blobId || ''))) fail(400, 'bad_id');
    if (!(await blobLimit.allow(account.id, now))) fail(429, 'slow_down');
    if (!(await vault(db, account.id))) fail(404, 'no_backup');
    const b = decode(data, limits.blob);
    if (!looksSealed(b)) fail(400, 'bad_data');
    if (sha(b) !== String(sha256 || '')) fail(400, 'bad_checksum');
    const used = await db.query('select coalesce(sum(size), 0)::bigint as n from backup_blobs where account_id = $1 and blob_id <> $2', [account.id, blobId]);
    if (Number(used.rows[0].n) + b.length > limits.blobs) fail(413, 'quota_exceeded', { max: limits.blobs });
    await db.query(
      'insert into backup_blobs (account_id, blob_id, size, sha256, data, created_at) values ($1, $2, $3, $4, $5, $6) on conflict (account_id, blob_id) do update set size = excluded.size, sha256 = excluded.sha256, data = excluded.data, created_at = excluded.created_at',
      [account.id, blobId, b.length, sha256, b, ts(now)]
    );
    return { ok: true, size: b.length };
  }

  async function getBlob(account, blobId) {
    member(account);
    const r = await db.query('select data, sha256 from backup_blobs where account_id = $1 and blob_id = $2', [account.id, String(blobId || '')]);
    if (!r.rowCount) fail(404, 'no_blob');
    return { data: toBuf(r.rows[0].data).toString('base64'), sha256: r.rows[0].sha256 };
  }

  async function deleteBlob(account, blobId) {
    member(account);
    await db.query('delete from backup_blobs where account_id = $1 and blob_id = $2', [account.id, String(blobId || '')]);
    return { ok: true };
  }

  /** Deletes the whole backup (the data on the person's devices stays). */
  async function remove(account) {
    member(account);
    await db.tx(async (t) => {
      for (const table of ['backup_uploads', 'backup_blobs', 'backup_snapshots', 'backup_vaults']) await t.query(`delete from ${table} where account_id = $1`, [account.id]);
    });
    return { ok: true, enabled: false };
  }

  return { status, setKey, startUpload, putPart, uploadStatus, commit, snapshotPart, putBlob, getBlob, deleteBlob, remove, limits };
}

const wrap = (fn) => async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await fn(req, res));
  } catch (e) {
    if (e instanceof BackupError) return res.status(e.status).json({ error: e.code, ...e.extra });
    // Never echo a body or an internal message: it could contain encrypted data.
    console.error('[backup] request failed:', e?.code || e?.name || 'error');
    res.status(500).json({ error: 'backup_failed' });
  }
};

export function mountBackup(app, deps) {
  deps.backup ||= createBackup({ db: deps.db, clock: deps.clock, config: deps.config });
  const b = deps.backup;
  const auth = requireAccount(deps.db, { clock: deps.clock });
  const small = express.json({ limit: '16kb' });
  const part = express.json({ limit: '1600kb' });
  const blob = express.json({ limit: `${Math.ceil((b.limits.blob * 4) / 3 / MB) + 1}mb` });
  const r = express.Router();
  r.get('/', auth, wrap((req) => b.status(req.account)));
  r.put('/key', small, auth, wrap((req) => b.setKey(req.account, { envelope: req.body?.envelope, replace: req.body?.replace === true })));
  r.post('/uploads', small, auth, wrap((req) => b.startUpload(req.account, req.body || {})));
  r.get('/uploads/:id', auth, wrap((req) => b.uploadStatus(req.account, req.params.id)));
  r.put('/uploads/:id/parts/:n', part, auth, wrap((req) => b.putPart(req.account, req.params.id, req.params.n, req.body?.data)));
  r.post('/uploads/:id/commit', small, auth, wrap((req) => b.commit(req.account, req.params.id)));
  r.get('/snapshot', auth, wrap((req) => b.snapshotPart(req.account, req.query.part)));
  r.put('/blobs/:id', blob, auth, wrap((req) => b.putBlob(req.account, req.params.id, req.body || {})));
  r.get('/blobs/:id', auth, wrap((req) => b.getBlob(req.account, req.params.id)));
  r.delete('/blobs/:id', auth, wrap((req) => b.deleteBlob(req.account, req.params.id)));
  r.delete('/', auth, wrap((req) => b.remove(req.account)));
  app.use('/api/backup', r);
}
