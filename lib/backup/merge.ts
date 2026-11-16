/**
 * Merging a device with its encrypted backup, record by record (pure).
 *
 * Three-way: what this device has now, what the backup has, and what both
 * had at the last successful sync (the "base", kept on this device). Rules:
 * - a record changed on one side only: that side wins;
 * - changed on both sides: by the collection's policy — the newer one wins
 *   and the other is kept in the conflict list ("lww"), both are kept
 *   ("keepBoth": the older becomes a copy, nothing someone wrote is lost), Bea
 *   conversations are joined message by message ("conversation"), facts are
 *   joined ("union");
 * - deleting needs an explicit tombstone: a record that is simply missing on
 *   one side (a partial, older or damaged backup, a new device) is never
 *   deleted on the other. A tombstone loses to an edit made after it;
 * - on the very first sync of a device, its records that have no time of
 *   their own count as older than the backup (a fresh install must not
 *   overwrite what was backed up), and whatever they replace is listed.
 */
import { sha256Hex } from './crypto';
import { COLLECTIONS, ConflictPolicy, CollectionSpec } from './collections';

export const SNAPSHOT_FORMAT = 'behappy-backup';
export const SNAPSHOT_VERSION = 1;
/** Tombstones are kept this long, then forgotten. */
export const TOMBSTONE_DAYS = 180;
const DAY = 24 * 60 * 60 * 1000;

export interface Rec {
  /** Fingerprint of the data (sha-256 of canonical JSON, shortened). */
  h: string;
  /** Last change (ms): the record's own time, else when this device first saw the change. */
  t: number;
  d: unknown;
}

export interface CollectionState {
  records: Record<string, Rec>;
  tombstones: Record<string, number>;
}

export type State = Record<string, CollectionState>;

export interface Snapshot {
  format: typeof SNAPSHOT_FORMAT;
  v: number;
  createdAt: number;
  /** A random id of the device that wrote it (not linked to the person). */
  device: string;
  collections: State;
}

/** What this device knew at the last successful sync. */
export interface Base {
  revision: number;
  syncedAt: number;
  /** collection → id → fingerprint */
  records: Record<string, Record<string, string>>;
  /** collection → id → time used */
  stamps: Record<string, Record<string, number>>;
}

export interface Replaced {
  collection: string;
  id: string;
  /** The version that was replaced (kept so the person can bring it back). */
  data: unknown;
  side: 'device' | 'backup';
  at: number;
}

/** JSON with sorted keys, so the same data always has the same fingerprint. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value === undefined ? null : value);
  if (Array.isArray(value)) return `[${value.map((v) => canonical(v === undefined ? null : v)).join(',')}]`;
  const keys = Object.keys(value as object)
    .filter((k) => (value as any)[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as any)[k])}`).join(',')}}`;
}

export const fingerprint = (d: unknown) => sha256Hex(canonical(d)).slice(0, 24);

/**
 * This device's records with fingerprints and times. `values`: the stored
 * value per storage key (parsed JSON, or the raw string for raw docs).
 */
export function localState(values: Record<string, unknown>, base: Base | null, now: number, specs: CollectionSpec[] = COLLECTIONS): State {
  const first = !base;
  const out: State = {};
  for (const spec of specs) {
    const records: Record<string, Rec> = {};
    const known = base?.records[spec.name] || {};
    const stamps = base?.stamps[spec.name] || {};
    for (const [id, d] of Object.entries(spec.extract(values[spec.key]))) {
      const h = fingerprint(d);
      const own = spec.stamp?.(d) ?? null;
      let t: number;
      if (known[id] === h) t = stamps[id] ?? own ?? 0;
      else t = own ?? (first ? 0 : now);
      records[id] = { h, t, d };
    }
    // Gone since the last sync: deleted on this device.
    const tombstones: Record<string, number> = {};
    for (const id of Object.keys(known)) if (!records[id]) tombstones[id] = now;
    out[spec.name] = { records, tombstones };
  }
  return out;
}

const msgKey = (m: any, i: number) => (m && typeof m === 'object' && (typeof m.id === 'string' || typeof m.id === 'number') ? `id:${m.id}` : `i:${i}:${fingerprint(m)}`);
const msgTime = (m: any) => {
  const v = m?.timestamp ?? m?.at ?? m?.createdAt;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};

/** Two versions of one Bea conversation: every message from both, in time order; other fields from the newer. */
export function mergeConversation(a: Rec, b: Rec): unknown {
  const newer = (b.t > a.t || (b.t === a.t && b.h > a.h) ? b : a).d as any;
  const older = (newer === b.d ? a.d : b.d) as any;
  const seen = new Map<string, any>();
  for (const src of [older, newer]) (Array.isArray(src?.messages) ? src.messages : []).forEach((m: any, i: number) => seen.set(msgKey(m, i), m));
  const messages = [...seen.values()].sort((x, y) => msgTime(x) - msgTime(y));
  return { ...older, ...newer, messages };
}

const wins = (a: Rec, b: Rec) => a.t > b.t || (a.t === b.t && a.h >= b.h);

function copyOf(spec: CollectionSpec, id: string, rec: Rec): [string, Rec] | null {
  const d = rec.d as any;
  if (!d || typeof d !== 'object' || Array.isArray(d) || String(d.id) !== id) return null;
  const copyId = `${id}~${rec.h.slice(0, 8)}`;
  const data = { ...d, id: copyId, conflictOf: id };
  return [copyId, { h: fingerprint(data), t: rec.t, d: data }];
}

export interface MergeResult {
  merged: State;
  /** Collections whose records on this device change. */
  deviceChanged: string[];
  /** Versions that lost a conflict (kept for "bring it back"). */
  replaced: Replaced[];
  stats: { fromBackup: number; kept: number; copies: number; deleted: number; joined: number };
}

/** Merges this device with the backup. `remote` null: there is no backup yet. */
export function merge(local: State, remote: State | null, base: Base | null, now: number, specs: CollectionSpec[] = COLLECTIONS): MergeResult {
  const merged: State = {};
  const deviceChanged = new Set<string>();
  const replaced: Replaced[] = [];
  const stats = { fromBackup: 0, kept: 0, copies: 0, deleted: 0, joined: 0 };
  const cutoff = now - TOMBSTONE_DAYS * DAY;

  for (const spec of specs) {
    const policy: ConflictPolicy = spec.policy;
    const L = local[spec.name] || { records: {}, tombstones: {} };
    const R = remote?.[spec.name] || { records: {}, tombstones: {} };
    const B = base?.records[spec.name] || {};
    const records: Record<string, Rec> = {};
    const tombstones: Record<string, number> = {};
    for (const [id, at] of [...Object.entries(R.tombstones || {}), ...Object.entries(L.tombstones || {})]) if (at >= cutoff) tombstones[id] = Math.max(tombstones[id] || 0, at);

    const ids = new Set([...Object.keys(L.records), ...Object.keys(R.records || {})]);
    for (const id of ids) {
      const l = L.records[id];
      const r = R.records?.[id];
      if (l && r) {
        if (l.h === r.h) {
          records[id] = l.t >= r.t ? l : r;
          continue;
        }
        const lChanged = B[id] !== l.h;
        const rChanged = B[id] !== r.h;
        if (!lChanged && rChanged) {
          records[id] = r;
          deviceChanged.add(spec.name);
          stats.fromBackup += 1;
          continue;
        }
        if (lChanged && !rChanged) {
          records[id] = l;
          stats.kept += 1;
          continue;
        }
        // Changed on both sides (or no common base).
        if (policy === 'conversation') {
          const d = mergeConversation(l, r);
          records[id] = { h: fingerprint(d), t: Math.max(l.t, r.t), d };
          deviceChanged.add(spec.name);
          stats.joined += 1;
          continue;
        }
        const winner = wins(l, r) ? l : r;
        const loser = winner === l ? r : l;
        records[id] = winner;
        if (winner === r) deviceChanged.add(spec.name);
        if (policy === 'keepBoth') {
          const copy = copyOf(spec, id, loser);
          if (copy && !records[copy[0]]) {
            records[copy[0]] = copy[1];
            deviceChanged.add(spec.name);
            stats.copies += 1;
            continue;
          }
        }
        replaced.push({ collection: spec.name, id, data: loser.d, side: loser === l ? 'device' : 'backup', at: now });
        continue;
      }
      if (l) {
        // Deleted on another device: unless it was edited here after that.
        if (R.tombstones?.[id] && !(l.h !== B[id] && l.t > R.tombstones[id])) {
          deviceChanged.add(spec.name);
          stats.deleted += 1;
          continue;
        }
        // New here, or missing from the backup without a tombstone (an older or damaged backup): kept, and backed up again.
        records[id] = l;
        continue;
      }
      if (r) {
        // Deleted here since the last sync: unless the backup has a newer edit.
        if (L.tombstones?.[id] && !(r.h !== B[id] && r.t > L.tombstones[id])) {
          stats.deleted += 1;
          continue;
        }
        records[id] = r;
        deviceChanged.add(spec.name);
        stats.fromBackup += 1;
      }
    }
    // A record that exists after merging has no tombstone.
    for (const id of Object.keys(records)) delete tombstones[id];
    merged[spec.name] = { records, tombstones };
  }
  return { merged, deviceChanged: [...deviceChanged], replaced, stats };
}

/** The new base after a successful sync. */
export function baseFrom(state: State, revision: number, now: number): Base {
  const records: Base['records'] = {};
  const stamps: Base['stamps'] = {};
  for (const [name, c] of Object.entries(state)) {
    records[name] = {};
    stamps[name] = {};
    for (const [id, r] of Object.entries(c.records)) {
      records[name][id] = r.h;
      stamps[name][id] = r.t;
    }
  }
  return { revision, syncedAt: now, records, stamps };
}

/** Stored values for the keys whose collections changed (several collections can share one key). */
export function deviceValues(merged: State, changed: string[], current: Record<string, unknown>, specs: CollectionSpec[] = COLLECTIONS): Record<string, unknown> {
  const keys = new Set(specs.filter((s) => changed.includes(s.name)).map((s) => s.key));
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    let value: unknown = current[key];
    for (const spec of specs.filter((s) => s.key === key)) {
      const recs = Object.fromEntries(Object.entries(merged[spec.name]?.records || {}).map(([id, r]) => [id, r.d]));
      value = spec.rebuild(recs, value);
    }
    out[key] = value;
  }
  return out;
}

export function makeSnapshot(state: State, device: string, now: number): Snapshot {
  return { format: SNAPSHOT_FORMAT, v: SNAPSHOT_VERSION, createdAt: now, device, collections: state };
}

/**
 * Reads a decrypted snapshot of any known version (migrations go here). An
 * unknown or newer format is refused rather than half-read.
 */
export function readSnapshot(json: string): Snapshot {
  const s = JSON.parse(json);
  if (!s || s.format !== SNAPSHOT_FORMAT || typeof s.v !== 'number') throw new Error('not_a_backup');
  if (s.v > SNAPSHOT_VERSION) throw new Error('newer_format');
  const collections: State = {};
  for (const [name, c] of Object.entries((s.collections || {}) as Record<string, any>)) {
    if (!c || typeof c !== 'object') continue;
    const records: Record<string, Rec> = {};
    for (const [id, r] of Object.entries((c.records || {}) as Record<string, any>)) {
      if (r && typeof r.h === 'string' && typeof r.t === 'number') records[id] = { h: r.h, t: r.t, d: r.d };
    }
    const tombstones: Record<string, number> = {};
    for (const [id, at] of Object.entries((c.tombstones || {}) as Record<string, any>)) if (typeof at === 'number') tombstones[id] = at;
    collections[name] = { records, tombstones };
  }
  return { format: SNAPSHOT_FORMAT, v: s.v, createdAt: Number(s.createdAt) || 0, device: String(s.device || ''), collections };
}
