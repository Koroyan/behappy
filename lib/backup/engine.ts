/**
 * Encrypted backup on this device: turning it on, backing up, restoring and
 * merging with what other devices backed up (lib/backup/merge.ts), and
 * deleting it. Off by default; without it nothing here touches the network.
 *
 * Order of a sync (each step can fail safely; nothing is lost):
 *  1. read this device's stores → records (collections.ts);
 *  2. if the backup has a newer revision: download its parts, check the
 *     checksum, decrypt (a wrong key or a changed byte stops everything);
 *  3. merge record by record with the last-sync base; write what changed
 *     here in one multiSet; bring back missing artwork;
 *  4. encrypt the merged snapshot, upload it in parts (an interrupted part is
 *     sent again), commit it on top of the revision it was based on — if
 *     another device committed meanwhile, start again from 2 (merge first);
 *  5. remember the new base.
 * Data leaves the device only as sealed boxes. Keys, recovery keys and
 * contents are never logged, never in analytics or error reports.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { trackAction } from '@/lib/analytics';
import { ApiError, apiJson, NetworkError } from '@/lib/api/client';
import { artworkDataUrl, deleteArtwork, importArtwork, listArtworks } from '@/lib/media/artworkStore';
import { publish } from '@/lib/storage/json';

import { ALL_COLLECTIONS, ARTWORK_COLLECTION, COLLECTIONS } from './collections';
import { aad, BackupCryptoError, fromBase64, fromHex, KeyEnvelope, newDataKey, newRecoveryKey, open, openText, parseRecoveryKey, seal, sealText, sha256Hex, toBase64, toHex, unwrapDataKey, wrapDataKey } from './crypto';
import { forgetDataKey, loadDataKey, saveDataKey } from './keyStore';
import { Base, baseFrom, deviceValues, localState, makeSnapshot, merge, readSnapshot, Replaced, State } from './merge';
import { randomBytes } from './random';

const STATE_KEY = '@behappy_backup_state_v1';
export const BACKUP_TOPIC = 'backup';
const MAX_REPLACED = 50;
const REPLACED_DAYS = 90;

export interface BackupLocal {
  /** Turned on for this device (the key is here). */
  enabled: boolean;
  /** Back up automatically (when the app goes to the background, at most every few hours). */
  auto: boolean;
  accountId: string | null;
  device: string;
  base: Base | null;
  lastBackupAt: number | null;
  lastError: string | null;
  lastErrorAt: number | null;
  /** Images already in the backup: artwork id → fingerprint of the image. */
  artworkShas: Record<string, string>;
  /** Versions that lost a conflict, kept so the person can bring them back. */
  replaced: Replaced[];
  lastStats?: { fromBackup: number; kept: number; copies: number; deleted: number; joined: number } | null;
}

export interface ServerStatus {
  enabled: boolean;
  revision: number;
  keyId: string | null;
  keyEnvelope: KeyEnvelope | null;
  size: number;
  sha256: string | null;
  updatedAt: number | null;
  blobs: { id: string; size: number; sha256: string }[];
  quota: { snapshotMax: number; blobMax: number; blobsMax: number; blobsUsed: number };
  partSize: number;
}

export type BackupPhase = 'preparing' | 'downloading' | 'merging' | 'restoring' | 'uploading' | 'images' | 'done';
export type Progress = (p: { phase: BackupPhase; done: number; total: number }) => void;

export class BackupError extends Error {
  constructor(public code: 'offline' | 'locked' | 'wrong_key' | 'recovery_typo' | 'bad_recovery_key' | 'damaged' | 'quota' | 'registration_required' | 'no_backup' | 'busy' | 'newer_app' | 'server') {
    super(code);
  }
}

const fresh = (): BackupLocal => ({ enabled: false, auto: true, accountId: null, device: toHex(randomBytes(8)), base: null, lastBackupAt: null, lastError: null, lastErrorAt: null, artworkShas: {}, replaced: [] });

export async function loadBackupLocal(): Promise<BackupLocal> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return fresh();
    return { ...fresh(), ...JSON.parse(raw) };
  } catch {
    return fresh();
  }
}

async function saveLocal(s: BackupLocal) {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(s));
  publish(BACKUP_TOPIC);
}

const asError = (e: unknown): BackupError => {
  if (e instanceof BackupError) return e;
  if (e instanceof NetworkError) return new BackupError('offline');
  if (e instanceof BackupCryptoError) return new BackupError(e.code === 'wrong_key' ? 'wrong_key' : e.code === 'recovery_typo' ? 'recovery_typo' : e.code === 'bad_recovery_key' ? 'bad_recovery_key' : 'damaged');
  if (e instanceof ApiError) {
    if (e.code === 'registration_required') return new BackupError('registration_required');
    if (e.code === 'too_large' || e.code === 'quota_exceeded') return new BackupError('quota');
    if (e.code === 'no_backup' || e.code === 'no_snapshot') return new BackupError('no_backup');
    return new BackupError('server');
  }
  if (e instanceof Error && (e.message === 'newer_format' || e.message === 'not_a_backup')) return new BackupError(e.message === 'newer_format' ? 'newer_app' : 'damaged');
  return new BackupError('server');
};

export const getServerStatus = () => apiJson<ServerStatus>('/api/backup');

/** The data key on this device, for this account. */
async function dataKey(accountId: string): Promise<Uint8Array> {
  const k = await loadDataKey();
  if (!k || k.accountId !== accountId) throw new BackupError('locked');
  return fromHex(k.dek);
}

// ---------- Turning on, unlocking, deleting ----------

/**
 * Turns backup on: a new data key and recovery key are made here; the
 * server gets only the wrapped key. Returns the recovery key to show once.
 */
export async function enableBackup(accountId: string, { replace = false }: { replace?: boolean } = {}): Promise<string> {
  const dek = newDataKey(randomBytes);
  const rk = newRecoveryKey(randomBytes);
  const envelope = wrapDataKey(dek, rk.entropy, accountId, randomBytes);
  try {
    await apiJson('/api/backup/key', { method: 'PUT', body: { envelope, replace } });
  } catch (e) {
    throw asError(e);
  }
  await saveDataKey({ accountId, keyId: envelope.keyId, dek: toHex(dek) });
  const s = await loadBackupLocal();
  await saveLocal({ ...s, enabled: true, accountId, base: null, lastError: null, artworkShas: {}, lastBackupAt: null });
  trackAction('backup', 'enabled');
  return rk.text;
}

/** A new device (or a cleared browser): the recovery key opens the backup's data key. */
export async function unlockBackup(accountId: string, recoveryKey: string): Promise<void> {
  let entropy: Uint8Array;
  try {
    entropy = parseRecoveryKey(recoveryKey);
  } catch (e) {
    throw asError(e);
  }
  let status: ServerStatus;
  try {
    status = await getServerStatus();
  } catch (e) {
    throw asError(e);
  }
  if (!status.enabled || !status.keyEnvelope) throw new BackupError('no_backup');
  let dek: Uint8Array;
  try {
    dek = unwrapDataKey(status.keyEnvelope, entropy, accountId);
  } catch (e) {
    throw asError(e);
  }
  await saveDataKey({ accountId, keyId: status.keyEnvelope.keyId, dek: toHex(dek) });
  const s = await loadBackupLocal();
  // A device joining a backup starts without a base: its own untimed data counts as older (merge.ts).
  await saveLocal({ ...s, enabled: true, accountId, base: null, lastError: null, artworkShas: {} });
}

/** Deletes the backup on the server (this device's data stays) and forgets the key here. */
export async function deleteBackup(): Promise<void> {
  try {
    await apiJson('/api/backup', { method: 'DELETE' });
  } catch (e) {
    throw asError(e);
  }
  await forgetDataKey();
  const s = await loadBackupLocal();
  await saveLocal({ ...fresh(), device: s.device, auto: s.auto });
  trackAction('backup', 'disabled');
}

/** Stops backing up on this device (the backup on the server stays until deleted). */
export async function turnOffOnThisDevice(): Promise<void> {
  await forgetDataKey();
  const s = await loadBackupLocal();
  await saveLocal({ ...s, enabled: false, base: null });
  trackAction('backup', 'disabled');
}

export async function setAutoBackup(auto: boolean) {
  const s = await loadBackupLocal();
  await saveLocal({ ...s, auto });
}

/** Brings back a version that lost a conflict (and removes it from the list). */
export async function restoreReplaced(index: number): Promise<void> {
  const s = await loadBackupLocal();
  const item = s.replaced[index];
  if (!item) return;
  const spec = COLLECTIONS.find((c) => c.name === item.collection);
  if (spec) {
    const raw = await AsyncStorage.getItem(spec.key);
    const current = raw === null ? undefined : spec.raw ? raw : safeParse(raw);
    const records = spec.extract(current);
    records[item.id] = item.data;
    const value = spec.rebuild(records, current);
    if (value !== undefined) await AsyncStorage.setItem(spec.key, spec.raw ? String(value) : JSON.stringify(value));
  }
  await saveLocal({ ...s, replaced: s.replaced.filter((_, i) => i !== index) });
}

export async function dismissReplaced(index: number): Promise<void> {
  const s = await loadBackupLocal();
  await saveLocal({ ...s, replaced: s.replaced.filter((_, i) => i !== index) });
}

// ---------- Reading and writing this device ----------

const safeParse = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

async function readDevice(): Promise<Record<string, unknown>> {
  const keys = [...new Set(COLLECTIONS.map((c) => c.key))];
  const pairs = await AsyncStorage.multiGet(keys);
  const out: Record<string, unknown> = {};
  for (const [k, v] of pairs) {
    if (v === null) continue;
    const spec = COLLECTIONS.find((c) => c.key === k);
    out[k] = spec?.raw ? v : safeParse(v);
  }
  return out;
}

const dataUrlBytes = (url: string) => fromBase64(url.replace(/^data:[^;]+;base64,/, ''));

/** Artwork as records (the image itself is a separate encrypted box). */
async function readArtworks(s: BackupLocal): Promise<{ records: Record<string, unknown>; shas: Record<string, string> }> {
  const list = await listArtworks().catch(() => []);
  const records: Record<string, unknown> = {};
  const shas: Record<string, string> = {};
  for (const a of list) {
    let sha = s.artworkShas[a.id];
    if (!sha) {
      const url = await artworkDataUrl(a.id).catch(() => null);
      if (!url) continue;
      sha = sha256Hex(dataUrlBytes(url)).slice(0, 32);
    }
    shas[a.id] = sha;
    records[a.id] = { id: a.id, sessionId: a.sessionId, createdAt: a.createdAt, ...(a.note ? { note: a.note } : {}), blob: `art_${a.id.replace(/[^A-Za-z0-9_-]/g, '')}`, sha };
  }
  return { records, shas };
}

async function writeDevice(merged: State, changed: string[], current: Record<string, unknown>) {
  const values = deviceValues(merged, changed.filter((c) => c !== ARTWORK_COLLECTION), current);
  const pairs: [string, string][] = [];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const spec = COLLECTIONS.find((c) => c.key === key);
    pairs.push([key, spec?.raw ? String(value) : JSON.stringify(value)]);
  }
  // One write for everything that changed (an interrupted restore never leaves half a store).
  if (pairs.length) await AsyncStorage.multiSet(pairs);
  // Every screen reads its store again.
  for (const topic of ['journal', 'anulia', 'cards', 'checkins', 'wellbeing-events', 'steps', 'programs', 'progress', 'reflection', 'goals', 'sound', 'artworks']) publish(topic);
}

// ---------- Talking to the server ----------

async function downloadSnapshot(accountId: string, dek: Uint8Array, onProgress?: Progress) {
  const first = await apiJson<{ revision: number; size: number; sha256: string; parts: number; data: string }>('/api/backup/snapshot?part=0');
  const parts: Uint8Array[] = [fromBase64(first.data)];
  onProgress?.({ phase: 'downloading', done: 1, total: first.parts });
  for (let i = 1; i < first.parts; i += 1) {
    const p = await retry(() => apiJson<{ revision: number; data: string }>(`/api/backup/snapshot?part=${i}`));
    if (p.revision !== first.revision) throw new BackupError('busy');
    parts.push(fromBase64(p.data));
    onProgress?.({ phase: 'downloading', done: i + 1, total: first.parts });
  }
  const box = concat(parts);
  if (box.length !== first.size || sha256Hex(box) !== first.sha256) throw new BackupError('damaged');
  const json = openText(dek, box, aad(accountId, 'snapshot', 'current'));
  return { revision: first.revision, snapshot: readSnapshot(json) };
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Network hiccups: a few tries with a pause (server errors that mean "no" are not retried). */
async function retry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (e instanceof ApiError && e.status < 500 && e.status !== 429) throw e;
      await wait(400 * 2 ** i);
    }
  }
  throw last;
}

/** Uploads a sealed snapshot in parts; parts the server already has are not sent again. */
async function uploadSnapshot(box: Uint8Array, baseRevision: number, partSize: number, onProgress?: Progress): Promise<{ revision: number } | 'conflict'> {
  const parts = Math.max(1, Math.ceil(box.length / partSize));
  const sha256 = sha256Hex(box);
  const { uploadId } = await apiJson<{ uploadId: string }>('/api/backup/uploads', { method: 'POST', body: { baseRevision, parts, size: box.length, sha256 } });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const have = new Set((await retry(() => apiJson<{ received: number[] }>(`/api/backup/uploads/${uploadId}`))).received);
    for (let i = 0; i < parts; i += 1) {
      if (have.has(i)) continue;
      const data = toBase64(box.subarray(i * partSize, (i + 1) * partSize));
      await retry(() => apiJson(`/api/backup/uploads/${uploadId}/parts/${i}`, { method: 'PUT', body: { data } }));
      onProgress?.({ phase: 'uploading', done: i + 1, total: parts });
    }
    try {
      return await apiJson<{ revision: number }>(`/api/backup/uploads/${uploadId}/commit`, { method: 'POST', body: {} });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'conflict') return 'conflict';
      if (e instanceof ApiError && e.code === 'incomplete') continue; // send what is missing, then commit again
      throw e;
    }
  }
  throw new BackupError('server');
}

async function syncImages(accountId: string, dek: Uint8Array, merged: State, status: ServerStatus, local: Record<string, unknown>, onProgress?: Progress): Promise<Record<string, string>> {
  const onServer = new Map(status.blobs.map((b) => [b.id, b]));
  const records = merged[ARTWORK_COLLECTION]?.records || {};
  const ids = Object.keys(records);
  const shas: Record<string, string> = {};
  let done = 0;
  for (const id of ids) {
    const meta = records[id].d as { id: string; sessionId: number; createdAt: number; note?: string; blob: string; sha: string };
    shas[id] = meta.sha;
    if (!local[id]) {
      // In the backup, not here: bring the image back.
      const b = await retry(() => apiJson<{ data: string }>(`/api/backup/blobs/${encodeURIComponent(meta.blob)}`)).catch(() => null);
      if (b) {
        const bytes = open(dek, fromBase64(b.data), aad(accountId, 'blob', meta.blob));
        await importArtwork(meta, `data:image/jpeg;base64,${toBase64(bytes)}`);
      }
    } else if (!onServer.has(meta.blob)) {
      // Here, not in the backup yet: encrypt and send the image.
      const url = await artworkDataUrl(id).catch(() => null);
      if (url) {
        const box = seal(dek, dataUrlBytes(url), aad(accountId, 'blob', meta.blob), randomBytes);
        await retry(() => apiJson(`/api/backup/blobs/${encodeURIComponent(meta.blob)}`, { method: 'PUT', body: { data: toBase64(box), sha256: sha256Hex(box) } }));
      }
    }
    done += 1;
    onProgress?.({ phase: 'images', done, total: ids.length });
  }
  // Artwork deleted (here or on another device): its image leaves the backup and this device too.
  for (const id of Object.keys(local)) if (!records[id]) await deleteArtwork(id).catch(() => {});
  const keep = new Set(Object.values(records).map((r) => (r.d as { blob: string }).blob));
  for (const b of status.blobs) if (!keep.has(b.id)) await apiJson(`/api/backup/blobs/${encodeURIComponent(b.id)}`, { method: 'DELETE' }).catch(() => {});
  return shas;
}

let running: Promise<SyncResult> | null = null;

export interface SyncResult {
  revision: number;
  at: number;
  stats: NonNullable<BackupLocal['lastStats']>;
  replaced: number;
}

/** Backs up now (merging with other devices first). One at a time; offline fails cleanly. */
export function syncNow(onProgress?: Progress): Promise<SyncResult> {
  if (running) return running;
  running = doSync(onProgress).finally(() => {
    running = null;
  });
  return running;
}

async function doSync(onProgress?: Progress): Promise<SyncResult> {
  const s = await loadBackupLocal();
  try {
    if (!s.enabled || !s.accountId) throw new BackupError('locked');
    const accountId = s.accountId;
    const dek = await dataKey(accountId);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      onProgress?.({ phase: 'preparing', done: 0, total: 1 });
      const status = await getServerStatus();
      if (!status.enabled) throw new BackupError('no_backup');
      const known = await loadDataKey();
      if (known && status.keyId && known.keyId !== status.keyId) throw new BackupError('locked'); // re-keyed elsewhere: needs the new recovery key
      const current = await readDevice();
      const art = await readArtworks(s);
      const now = Date.now();
      const local = localState({ ...current, '@@artworks': Object.values(art.records) }, s.base, now, ALL_COLLECTIONS);
      let remote: State | null = null;
      let revision = status.revision;
      if (status.revision > 0) {
        const got = await downloadSnapshot(accountId, dek, onProgress);
        remote = got.snapshot.collections;
        revision = got.revision;
      }
      onProgress?.({ phase: 'merging', done: 0, total: 1 });
      const m = merge(local, remote, s.base, now, ALL_COLLECTIONS);
      if (m.deviceChanged.length) {
        onProgress?.({ phase: 'restoring', done: 0, total: 1 });
        await writeDevice(m.merged, m.deviceChanged, current);
      }
      const shas = await syncImages(accountId, dek, m.merged, status, art.records, onProgress);
      const box = sealText(dek, JSON.stringify(makeSnapshot(m.merged, s.device, now)), aad(accountId, 'snapshot', 'current'), randomBytes);
      if (box.length > status.quota.snapshotMax) throw new BackupError('quota');
      const up = await uploadSnapshot(box, revision, status.partSize || 1024 * 1024, onProgress);
      if (up === 'conflict') continue; // another device backed up meanwhile: merge with that first
      const cutoff = now - REPLACED_DAYS * 24 * 60 * 60 * 1000;
      const replaced = [...m.replaced.filter((r) => r.side === 'device'), ...s.replaced].filter((r) => r.at >= cutoff).slice(0, MAX_REPLACED);
      const next: BackupLocal = { ...s, base: baseFrom(m.merged, up.revision, now), lastBackupAt: now, lastError: null, lastErrorAt: null, artworkShas: shas, replaced, lastStats: m.stats };
      await saveLocal(next);
      onProgress?.({ phase: 'done', done: 1, total: 1 });
      trackAction('backup', !s.base && remote ? 'restore_completed' : 'backup_completed');
      return { revision: up.revision, at: now, stats: m.stats, replaced: m.replaced.length };
    }
    throw new BackupError('busy');
  } catch (e) {
    const err = asError(e);
    const latest = await loadBackupLocal();
    await saveLocal({ ...latest, lastError: err.code, lastErrorAt: Date.now() });
    throw err;
  }
}

/** For the automatic backup: due when on, unlocked and the last one is older than `everyMs`. */
export async function autoBackupDue(everyMs = 6 * 60 * 60 * 1000): Promise<boolean> {
  const s = await loadBackupLocal();
  if (!s.enabled || !s.auto || !s.accountId) return false;
  if (!(await loadDataKey())) return false;
  const lastTry = Math.max(s.lastBackupAt || 0, s.lastError ? s.lastErrorAt || 0 : 0);
  // After a failure, wait a little longer before trying again (offline, server busy).
  return Date.now() - lastTry > (s.lastError ? Math.min(everyMs, 30 * 60 * 1000) : everyMs);
}

/** "Delete everything on this device": the backup state and key go too (the server copy is deleted with the account). */
export async function forgetBackupOnThisDevice(): Promise<void> {
  await forgetDataKey();
  await AsyncStorage.removeItem(STATE_KEY).catch(() => {});
}
