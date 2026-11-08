/**
 * One record of what the person actually did, shared by Steps, badges,
 * challenges, the daily recap, Insights and (with consent) Anulia.
 *
 * Events are versioned and deduplicated: each has a stable id built from what
 * it records (the journal entry's id, the breathing session's end time…), so
 * importing the same thing twice, or two screens reporting it, never counts
 * it twice. Nothing here is a score.
 */
import { dayKey } from './dates';

export const EVENT_VERSION = 1;
/** Older events are dropped (aggregates stay in the stores that own them). */
export const MAX_EVENTS = 6000;
export const MAX_AGE_DAYS = 400;

export type EventType =
  | 'journal.saved'
  | 'mood.checkin'
  | 'breathing.completed'
  | 'meditation.completed'
  | 'grounding.completed'
  | 'calm.used'
  | 'art.completed'
  | 'cards.completed'
  | 'sound.session'
  | 'focus.completed'
  | 'sleep.bedtime'
  | 'sleep.checkin'
  | 'step.done'
  | 'step.skipped'
  | 'goal.completed'
  | 'challenge.completed';

export type EventData = Record<string, string | number | boolean | null>;

export interface WellbeingEvent {
  id: string;
  v: number;
  type: EventType;
  at: number;
  /** Local calendar day of `at`. */
  day: string;
  data?: EventData;
}

export function makeEvent(type: EventType, key: string | number, at: number, data?: EventData): WellbeingEvent {
  return { id: `${type}:${key}`, v: EVENT_VERSION, type, at, day: dayKey(at), ...(data ? { data } : {}) };
}

/** Adds what is new (by id), keeps the list sorted and bounded. */
export function mergeEvents(existing: WellbeingEvent[], incoming: WellbeingEvent[], now = Date.now()): { list: WellbeingEvent[]; added: WellbeingEvent[] } {
  const seen = new Set(existing.map((e) => e.id));
  const added: WellbeingEvent[] = [];
  for (const e of incoming) {
    if (!e || !e.id || seen.has(e.id) || !Number.isFinite(e.at)) continue;
    seen.add(e.id);
    added.push(e);
  }
  if (!added.length) return { list: existing, added };
  const cutoff = now - MAX_AGE_DAYS * 86400000;
  const list = [...existing, ...added]
    .filter((e) => e.at >= cutoff)
    .sort((a, b) => a.at - b.at)
    .slice(-MAX_EVENTS);
  return { list, added: added.filter((e) => e.at >= cutoff) };
}

export const ofType = (list: WellbeingEvent[], ...types: EventType[]) => list.filter((e) => types.includes(e.type));
export const onDay = (list: WellbeingEvent[], day: string) => list.filter((e) => e.day === day);
export const betweenDays = (list: WellbeingEvent[], from: string, to: string) => list.filter((e) => e.day >= from && e.day <= to);

/** Calm practices (counted together in badges, challenges and Insights). */
export const CALM_TYPES: EventType[] = ['breathing.completed', 'meditation.completed', 'grounding.completed', 'calm.used'];

/** What the older stores already hold, as events (deterministic ids: safe to import again). */
export interface LegacyActivity {
  journal: { id: string; timestamp: number; mood?: number; promptId?: string }[];
  checkIns: { id: string; at: number; mood: number; feelings?: string[] }[];
  breathing: { at: number; minutes?: number; pattern?: string }[];
  meditation: { at: number; minutes?: number; session?: string }[];
  art: { sessionId: number; completedAt: number }[];
  cards: { id: string; completedAt: number }[];
}

export function legacyEvents(a: LegacyActivity): WellbeingEvent[] {
  return [
    ...a.journal.filter((e) => e.id && e.timestamp).map((e) => makeEvent('journal.saved', e.id, e.timestamp, { ...(typeof e.mood === 'number' ? { mood: e.mood } : {}), ...(e.promptId ? { prompt: e.promptId } : {}) })),
    ...a.checkIns.filter((c) => c.id && c.at).map((c) => makeEvent('mood.checkin', c.id, c.at, { mood: c.mood, ...(c.feelings?.length ? { feelings: c.feelings.slice(0, 8).join(',') } : {}) })),
    ...a.breathing.filter((b) => b.at).map((b) => makeEvent('breathing.completed', b.at, b.at, { minutes: b.minutes ?? null, ...(b.pattern ? { pattern: b.pattern } : {}) })),
    ...a.meditation.filter((m) => m.at).map((m) => makeEvent('meditation.completed', `${m.session || 'm'}:${m.at}`, m.at, { minutes: m.minutes ?? null })),
    ...a.art.filter((s) => s.sessionId && s.completedAt).map((s) => makeEvent('art.completed', s.sessionId, s.completedAt, { session: s.sessionId })),
    ...a.cards.filter((c) => c.completedAt).map((c) => makeEvent('cards.completed', c.id || c.completedAt, c.completedAt)),
  ];
}

/** Distinct days in [from, to] with at least one event of these types. */
export function activeDays(list: WellbeingEvent[], types: EventType[], from: string, to: string, filter?: (e: WellbeingEvent) => boolean): Set<string> {
  const out = new Set<string>();
  for (const e of list) if (e.day >= from && e.day <= to && types.includes(e.type) && (!filter || filter(e))) out.add(e.day);
  return out;
}

export const minutesOf = (list: WellbeingEvent[]) => list.reduce((s, e) => s + (Number(e.data?.minutes) || 0), 0);
