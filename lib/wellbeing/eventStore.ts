/**
 * The event log on this device (AsyncStorage). Local-first: nothing here is
 * sent anywhere unless the person allows it (daily reflection, Anulia memory).
 */
import { loadCheckIns } from '@/lib/storage/checkins';
import { loadEntries } from '@/lib/storage/journal';
import { publish, readJson, writeJson } from '@/lib/storage/json';

import { EventData, EventType, legacyEvents, makeEvent, mergeEvents, WellbeingEvent } from './events';

const KEY = '@behappy_events_v1';
export const EVENTS_TOPIC = 'wellbeing-events';

type Listener = (added: WellbeingEvent[]) => void | Promise<void>;
const listeners = new Set<Listener>();

/** Steps, badges and challenges react to new events (registered by WellbeingBridge). */
export function onNewEvents(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let cache: WellbeingEvent[] | null = null;
let queue: Promise<unknown> = Promise.resolve();
/** Writes are serialized so two quick events never overwrite each other. */
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
};

export async function loadEvents(): Promise<WellbeingEvent[]> {
  if (cache) return cache;
  const raw = await readJson<{ v?: number; events?: WellbeingEvent[] }>(KEY, {});
  cache = Array.isArray(raw.events) ? raw.events : [];
  return cache;
}

async function addEvents(incoming: WellbeingEvent[]): Promise<WellbeingEvent[]> {
  const added = await serial(async () => {
    const { list, added: fresh } = mergeEvents(await loadEvents(), incoming);
    if (!fresh.length) return fresh;
    cache = list;
    await writeJson(KEY, { v: 1, events: list });
    return fresh;
  });
  if (added.length) {
    publish(EVENTS_TOPIC);
    for (const fn of listeners) await Promise.resolve(fn(added)).catch(() => {});
  }
  return added;
}

/** Records one thing the person did. `key` makes it unique (same key = same event). */
export async function recordEvent(type: EventType, key: string | number, data?: EventData, at = Date.now()): Promise<WellbeingEvent | null> {
  const [added] = await addEvents([makeEvent(type, key, at, data)]);
  return added || null;
}

/** Removes events (undoing a Step, deleting a journal entry). */
export async function removeEvents(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await serial(async () => {
    const list = (await loadEvents()).filter((e) => !ids.includes(e.id));
    cache = list;
    await writeJson(KEY, { v: 1, events: list });
  });
  publish(EVENTS_TOPIC);
}

const BREATHING_KEY = '@behappy_breathing_progress';
const MEDITATION_KEY = '@behappy_meditation_log_v1';
const ART_KEY = '@behappy_art_therapy_progress';
const CARDS_DONE_KEY = 'card_therapy_completed_sessions';

/**
 * Imports what the older stores hold (journal, check-ins, breathing,
 * meditation, art therapy, cards). Safe to run on every start: ids are
 * deterministic. Art therapy and cards are read, never changed.
 */
export async function syncLegacyEvents(): Promise<number> {
  const [journal, checkIns, breathing, meditation, art, cards] = await Promise.all([
    loadEntries().catch(() => []),
    loadCheckIns().catch(() => []),
    readJson<{ completedSessions?: { patternId?: string; completedAt?: string; durationMinutes?: number }[] }>(BREATHING_KEY, {}),
    readJson<{ sessionId?: string; at?: number; minutes?: number }[]>(MEDITATION_KEY, []),
    readJson<Record<string, any>>(ART_KEY, {}),
    readJson<any[]>(CARDS_DONE_KEY, []),
  ]);
  const events = legacyEvents({
    journal: journal.map((e) => ({ id: e.id, timestamp: e.timestamp, mood: e.mood, promptId: (e as any).promptId })),
    checkIns: checkIns.map((c) => ({ id: c.id, at: c.at, mood: c.mood, feelings: c.feelings as string[] | undefined })),
    breathing: (breathing.completedSessions || []).map((s) => ({ at: Date.parse(s.completedAt || '') || 0, minutes: s.durationMinutes, pattern: s.patternId })),
    meditation: (Array.isArray(meditation) ? meditation : []).map((m) => ({ at: Number(m.at) || 0, minutes: m.minutes, session: m.sessionId })),
    art: Object.values(art || {})
      .filter((r: any) => r && r.completed && r.completedAt)
      .map((r: any) => ({ sessionId: Number(r.sessionId), completedAt: Date.parse(r.completedAt) || 0 })),
    cards: (Array.isArray(cards) ? cards : []).map((c) => ({ id: String(c?.id || ''), completedAt: Number(c?.completedAt) || 0 })),
  });
  return (await addEvents(events)).length;
}

/** For tests and "delete all data" (AsyncStorage.clear also removes the key). */
export function resetEventCache() {
  cache = null;
}
