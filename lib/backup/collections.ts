/**
 * What goes into an encrypted backup, store by store (pure: no storage here).
 *
 * Each store on the device becomes a "collection" of records with stable ids,
 * so two devices can be merged record by record instead of one file
 * overwriting the other. `extract` turns the stored value into records,
 * `rebuild` turns merged records back into the stored value (keeping fields
 * that aren't records, like an event log's version).
 *
 * Never in a backup (and never changed by a restore): consent to AI, memory
 * permissions and usage statistics (each device asks for itself; a restore
 * can't widen what someone agreed to), the sign-in token, notification and
 * push registrations, queues and caches, payment state.
 */

export type ConflictPolicy =
  /** Newer wins (settings, small records). The losing version is kept in the conflict list. */
  | 'lww'
  /** Text someone wrote (journal entries…): both versions are kept, the older as a copy. */
  | 'keepBoth'
  /** Bea conversations: messages from both devices are joined by message id. */
  | 'conversation'
  /** Facts that never change once written (events, badges): union. */
  | 'union';

export interface CollectionSpec {
  /** Collection name in the backup (stable across versions). */
  name: string;
  /** The device storage key. */
  key: string;
  policy: ConflictPolicy;
  /** Records by id. `null`/missing value → no records. */
  extract: (value: unknown) => Record<string, unknown>;
  /** Back to the stored value. `previous`: what is stored now (or undefined). */
  rebuild: (records: Record<string, unknown>, previous: unknown) => unknown;
  /** The record's own last-change time (ms), when it has one. */
  stamp?: (record: any) => number | null;
  /** The stored value is a plain string (AsyncStorage without JSON). */
  raw?: boolean;
}

const asArray = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const byId = (list: any[], id: (r: any) => string) => {
  const out: Record<string, unknown> = {};
  for (const r of list) {
    if (!r || typeof r !== 'object') continue;
    const k = id(r);
    if (k) out[k] = r;
  }
  return out;
};
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v ? Date.parse(v) || null : null);
const maxOf = (...v: (number | null | undefined)[]) => {
  const f = v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return f.length ? Math.max(...f) : null;
};

/** An array of records with an id field. */
function list(name: string, key: string, policy: ConflictPolicy, opts: { id?: (r: any) => string; stamp?: (r: any) => number | null; sort?: (a: any, b: any) => number; cap?: number } = {}): CollectionSpec {
  const id = opts.id || ((r: any) => (typeof r.id === 'string' || typeof r.id === 'number' ? String(r.id) : ''));
  return {
    name,
    key,
    policy,
    extract: (v) => byId(asArray(v), id),
    rebuild: (records) => {
      const arr = Object.values(records) as any[];
      if (opts.sort) arr.sort(opts.sort);
      return opts.cap ? arr.slice(0, opts.cap) : arr;
    },
    stamp: opts.stamp,
  };
}

/** An array inside an object ({ v, events: [...] }); other fields are kept as they are on this device. */
function nested(name: string, key: string, field: string, policy: ConflictPolicy, opts: { id?: (r: any) => string; stamp?: (r: any) => number | null; sort?: (a: any, b: any) => number } = {}): CollectionSpec {
  const id = opts.id || ((r: any) => (typeof r.id === 'string' ? r.id : ''));
  return {
    name,
    key,
    policy,
    extract: (v) => byId(asArray((v as any)?.[field]), id),
    rebuild: (records, previous) => {
      const arr = Object.values(records) as any[];
      if (opts.sort) arr.sort(opts.sort);
      return { ...((previous && typeof previous === 'object' ? previous : {}) as object), [field]: arr };
    },
    stamp: opts.stamp,
  };
}

/** A whole stored value as one record (profile, safety plan, settings). */
function doc(name: string, key: string, opts: { raw?: boolean; stamp?: (d: any) => number | null } = {}): CollectionSpec {
  return {
    name,
    key,
    policy: 'lww',
    raw: opts.raw,
    extract: (v) => (v === undefined || v === null || v === '' ? {} : { doc: v }),
    rebuild: (records) => (records.doc === undefined ? undefined : records.doc),
    stamp: opts.stamp,
  };
}

/** An object keyed by id ({ "1": {...}, "2": {...} }): art therapy progress. */
function keyed(name: string, key: string, policy: ConflictPolicy, stamp?: (r: any) => number | null): CollectionSpec {
  return {
    name,
    key,
    policy,
    extract: (v) => (v && typeof v === 'object' && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {}),
    rebuild: (records) => ({ ...records }),
    stamp,
  };
}

const byAt = (a: any, b: any) => (a.at || 0) - (b.at || 0);

export const COLLECTIONS: CollectionSpec[] = [
  // Journal: the person's own words; concurrent edits keep both versions.
  list('journal', 'journal_entries', 'keepBoth', { stamp: (e) => maxOf(num(e.updatedAt), num(e.aiRespondedAt), num(e.timestamp)), sort: (a, b) => (b.timestamp || 0) - (a.timestamp || 0) }),
  doc('journalDraft', '@behappy_journal_draft_v1', { stamp: (d) => num(d?.savedAt) }),
  // Private conversations with Bea (stored on the device; messages joined across devices).
  list('bea', 'therapy_sessions', 'conversation', { stamp: (c) => maxOf(num(c.endTime), num(c.startTime), ...asArray(c.messages).map((m: any) => num(m.timestamp))) }),
  // Reflection cards.
  list('cardsOngoing', 'card_therapy_ongoing_sessions', 'keepBoth', { stamp: (s) => num(s.lastUpdatedAt), cap: 20 }),
  list('cardsDone', 'card_therapy_completed_sessions', 'keepBoth', { stamp: (s) => maxOf(num(s.completedAt), num(s.lastUpdatedAt)), sort: (a, b) => (b.completedAt || 0) - (a.completedAt || 0), cap: 50 }),
  // Art program progress (read and written as it is; the art therapy itself is not changed).
  keyed('artProgress', '@behappy_art_therapy_progress', 'lww', (r) => maxOf(num(r?.completedAt), num(r?.updatedAt), num(r?.startedAt), num(r?.lastActivityAt))),
  // Mood, sleep (events), Steps, programs, goals, badges.
  list('checkIns', '@behappy_mood_checkins_v1', 'lww', { stamp: (c) => maxOf(num(c.updatedAt), num(c.at)), sort: (a, b) => (b.at || 0) - (a.at || 0) }),
  nested('events', '@behappy_events_v1', 'events', 'union', { stamp: (e) => num(e.at), sort: byAt }),
  nested('steps', '@behappy_steps_v1', 'steps', 'lww', { stamp: (s) => maxOf(num(s.updatedAt), num(s.createdAt)) }),
  nested('stepMarks', '@behappy_steps_v1', 'marks', 'lww', { id: (m) => (m.stepId && m.day ? `${m.stepId}:${m.day}` : ''), stamp: (m) => num(m.at) }),
  nested('programs', '@behappy_programs_v1', 'runs', 'lww', { id: (r) => r.runId || '', stamp: (r) => num(r.updatedAt) }),
  list('goals', '@behappy_goals_v1', 'lww', { stamp: (g) => maxOf(num(g.updatedAt), num(g.completedAt), num(g.createdAt)) }),
  nested('badges', '@behappy_progress_v1', 'badges', 'union', { stamp: (b) => num(b.earnedAt) }),
  nested('challenges', '@behappy_progress_v1', 'challenges', 'lww', { id: (c) => c.runId || '', stamp: (c) => maxOf(num(c.completedAt), num(c.startedAt)) }),
  nested('reflections', '@behappy_reflection_v1', 'history', 'lww', { id: (h) => h.day || '', stamp: (h) => num(h.at ?? h.createdAt) }),
  list('assessments', '@behappy_assessments_v1', 'keepBoth', { stamp: (a) => maxOf(num(a.completedAt), num(a.at)) }),
  list('meditationLog', '@behappy_meditation_log_v1', 'union', { id: (m) => (m.at ? `${m.sessionId || 'm'}:${m.at}` : ''), stamp: (m) => num(m.at) }),
  nested('breathingLog', '@behappy_breathing_progress', 'completedSessions', 'union', { id: (s) => (s.completedAt ? String(s.completedAt) : ''), stamp: (s) => num(s.completedAt) }),
  nested('soundFavorites', '@behappy_sound_v1', 'favorites', 'lww', { stamp: (f) => num(f.createdAt) }),
  nested('soundHistory', '@behappy_sound_v1', 'history', 'union', { stamp: (h) => num(h.startedAt) }),
  // Personal details and settings the person chose (not consent).
  doc('profile', '@behappy_user_profile'),
  doc('safetyPlan', '@behappy_safety_plan_v1', { stamp: (d) => num(d?.updatedAt) }),
  doc('reminderPrefs', '@behappy_reminders_v1'),
  doc('language', '@behappy_language', { raw: true }),
  doc('focusAreas', '@behappy_focus_areas'),
  doc('start', '@behappy_start_v1'),
  doc('communityTopic', '@behappy_community_topic_v1'),
  doc('safetyCountry', '@behappy_safety_country', { raw: true }),
];

/**
 * Keys that are never backed up nor overwritten by a restore. Anything not in
 * COLLECTIONS is left alone anyway; this list documents the deliberate ones.
 */
export const NEVER_BACKED_UP = [
  '@behappy_ai_consent_v1',
  '@behappy_ai_personalize_v1',
  '@behappy_memory_consent_v1',
  '@behappy_account_v1',
  '@behappy_me_cache_v1',
  '@behappy_analytics_queue_v1',
  '@behappy_push_v1',
  '@behappy_webpush_v1',
  '@behappy_web_notify_v1',
  '@behappy_notify_prompt_v1',
  '@behappy_reminders_plan_v1',
  '@behappy_pending_order',
  '@behappy_backup_state_v1',
  '@behappy_backup_key_v1',
];

/**
 * Attachments: saved artwork. The record is the artwork's details plus the id
 * and fingerprint of its encrypted image, which is uploaded separately (one
 * box per image). `@@artworks` is not a storage key: the backup engine reads
 * and writes artwork through the artwork store (files / IndexedDB).
 */
export const ARTWORK_COLLECTION = 'artworks';
export const ARTWORK_SPEC: CollectionSpec = list(ARTWORK_COLLECTION, '@@artworks', 'union', { stamp: (a) => num(a.createdAt) });
export const ALL_COLLECTIONS: CollectionSpec[] = [...COLLECTIONS, ARTWORK_SPEC];
