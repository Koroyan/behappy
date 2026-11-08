/**
 * The event log on this device (AsyncStorage). Local-first: nothing here is
 * sent anywhere unless the person allows it (daily reflection, Anulia memory).
 */
import { publish, readJson, writeJson } from '@/lib/storage/json';

import { EventData, EventType, makeEvent, mergeEvents, WellbeingEvent } from './events';

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

export async function addEvents(incoming: WellbeingEvent[]): Promise<WellbeingEvent[]> {
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

/** For tests and "delete all data" (AsyncStorage.clear also removes the key). */
export function resetEventCache() {
  cache = null;
}
