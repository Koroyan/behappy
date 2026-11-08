/**
 * Gentle reminders: which ones to schedule for the next days, and when.
 *
 * Pure (no React Native imports), so it is unit-tested in plain Node
 * (planner.test.mjs). The rules follow docs/ETHICS.md — no streaks, no
 * guilt, no nagging:
 *
 *  - At most one reminder per activity per day, at most two a day in total,
 *    at least three hours apart, never in quiet hours (22:00–08:00).
 *  - Nothing for something already done that day.
 *  - Smart timing: after a few entries the journal reminder moves to the
 *    time the person usually writes (the same for art and cards).
 *  - Easing off: when nothing is recorded for a while, reminders thin out
 *    (daily → every other day → weekly) and stop after three quiet weeks.
 *    Opening the app plans again from scratch, so coming back is never
 *    "behind".
 *  - Art: an unfinished session gets an invitation to continue it.
 *  - A heavy check-in lately: the next journal reminders use softer words
 *    (which never mention the mood: lock screens are visible to others).
 */

export type ReminderKind = 'journal' | 'art' | 'cards' | 'step' | 'reflection' | 'sleep';
export type ReminderVariant = 'default' | 'soft' | 'continue';

export interface ReminderPrefs {
  enabled: boolean;
  journal: boolean;
  art: boolean;
  cards: boolean;
  /** Minutes after local midnight. */
  journalTime: number;
  /** Learn the usual time from the person's own entries. */
  smart: boolean;
  quietFrom: number;
  quietTo: number;
  /** When reminders were turned on (counts as activity for easing off). */
  enabledAt?: number;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  enabled: false,
  journal: true,
  art: true,
  cards: true,
  journalTime: 20 * 60 + 30,
  smart: true,
  quietFrom: 22 * 60,
  quietTo: 8 * 60,
};

export interface ActivitySnapshot {
  journal: number[];
  art: number[];
  /** Most recent art session started and not finished. */
  artUnfinished?: { id: number; at: number } | null;
  cards: number[];
  checkIns: { at: number; mood: number }[];
  /** Other recorded activity (breathing, meditation, Anulia) — only for easing off. */
  other?: number[];
}

export interface PlannedReminder {
  id: string;
  kind: ReminderKind;
  at: number;
  variant: ReminderVariant;
  /** Rotates the wording day by day. */
  copyIndex: number;
  url: string;
  /** Step reminders: which step (the wording uses its name). */
  stepTemplate?: string;
  stepTitle?: string;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const DEFAULT_ART_TIME = 18 * 60;
const DEFAULT_CARDS_TIME = 13 * 60;
const MIN_GAP = 3 * HOUR;
const EVERY = { art: 3, cards: 3 } as const;

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const addDays = (t: number, n: number) => {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
};
const atMinute = (dayStart: number, minute: number) => {
  const d = new Date(dayStart);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return d.getTime();
};
const minuteOf = (t: number) => {
  const d = new Date(t);
  return d.getHours() * 60 + d.getMinutes();
};
/** Whole local days between two moments (calendar days, not 24-hour blocks). */
const daysBetween = (a: number, b: number) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

export const formatMinute = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export function inQuiet(minute: number, from: number, to: number): boolean {
  if (from === to) return false;
  return from < to ? minute >= from && minute < to : minute >= from || minute < to;
}

/** Moves a time out of quiet hours: to half an hour before they start. */
export function outOfQuiet(minute: number, prefs: Pick<ReminderPrefs, 'quietFrom' | 'quietTo'>): number {
  if (!inQuiet(minute, prefs.quietFrom, prefs.quietTo)) return minute;
  return (prefs.quietFrom - 30 + 24 * 60) % (24 * 60);
}

/**
 * The time someone usually does something: the median time of day of the
 * last 45 days (at least 3 times), rounded to a quarter hour. Days are
 * counted from 04:00 so a late-night habit is not split across midnight.
 */
export function usualMinute(times: number[], now: number, fallback: number): number {
  const recent = times.filter((t) => t <= now && now - t < 45 * DAY);
  if (recent.length < 3) return fallback;
  const SHIFT = 4 * 60;
  const shifted = recent.map((t) => (minuteOf(t) - SHIFT + 24 * 60) % (24 * 60)).sort((a, b) => a - b);
  const mid = shifted.length >> 1;
  const median = shifted.length % 2 ? shifted[mid] : Math.round((shifted[mid - 1] + shifted[mid]) / 2);
  const back = (median + SHIFT) % (24 * 60);
  return (Math.round(back / 15) * 15) % (24 * 60);
}

/** Easing off: is a reminder welcome after `silentDays` days with nothing recorded? */
export function welcomeAfter(silentDays: number): boolean {
  if (silentDays < 3) return true;
  if (silentDays < 7) return silentDays % 2 === 0;
  if (silentDays < 21) return silentDays % 7 === 0;
  return false;
}

export function planReminders(activity: ActivitySnapshot, prefs: ReminderPrefs, now: number, { days = 7 }: { days?: number } = {}): PlannedReminder[] {
  if (!prefs.enabled) return [];
  const today = startOfDay(now);
  const doneOn = (list: number[]) => new Set(list.map(dayKey));
  const journalDays = doneOn(activity.journal);
  const artDays = doneOn(activity.art);
  const cardDays = doneOn(activity.cards);

  const everything = [...activity.journal, ...activity.art, ...activity.cards, ...activity.checkIns.map((c) => c.at), ...(activity.other || []), prefs.enabledAt || 0].filter((t) => t > 0 && t <= now);
  const lastActive = everything.length ? Math.max(...everything) : now;
  const silentBefore = Math.max(0, daysBetween(lastActive, now));

  const journalAt = outOfQuiet(prefs.smart ? usualMinute(activity.journal, now, prefs.journalTime) : prefs.journalTime, prefs);
  const artAt = outOfQuiet(prefs.smart ? usualMinute([...activity.art, ...(activity.artUnfinished ? [activity.artUnfinished.at] : [])], now, DEFAULT_ART_TIME) : DEFAULT_ART_TIME, prefs);
  const cardsAt = outOfQuiet(prefs.smart ? usualMinute(activity.cards, now, DEFAULT_CARDS_TIME) : DEFAULT_CARDS_TIME, prefs);

  const heavy = activity.checkIns.some((c) => c.mood <= 1 && now - c.at < 36 * HOUR && c.at <= now);
  const unfinished = activity.artUnfinished && now - activity.artUnfinished.at < 14 * DAY ? activity.artUnfinished : null;

  const lastOf = (list: number[]) => (list.length ? Math.max(...list.filter((t) => t <= now), 0) : 0);
  /** Days (from today) when an every-N-days activity is due, within the horizon. */
  const dueDays = (last: number, every: number) => {
    const out: number[] = [];
    const first = last ? Math.max(0, every - daysBetween(last, now)) : 0;
    for (let d = first; d < days; d += every) out.push(d);
    return out;
  };

  const plan: PlannedReminder[] = [];
  const dayNumber = (d: number) => Math.floor(addDays(today, d) / DAY);
  const push = (kind: ReminderKind, d: number, minute: number, variant: ReminderVariant, url: string) => {
    const at = atMinute(addDays(today, d), minute);
    if (at <= now + 5 * MINUTE) return;
    plan.push({ id: `${kind}-${dayKey(at)}`, kind, at, variant, copyIndex: dayNumber(d), url });
  };

  for (let d = 0; d < days; d += 1) {
    if (!welcomeAfter(silentBefore + d)) continue;
    const key = dayKey(addDays(today, d));
    if (prefs.journal && !journalDays.has(key)) push('journal', d, journalAt, heavy && d <= 1 ? 'soft' : 'default', '/journal/editor');
  }
  if (prefs.art) {
    for (const d of dueDays(lastOf([...activity.art, ...(unfinished ? [unfinished.at] : [])]), EVERY.art)) {
      if (!welcomeAfter(silentBefore + d) || artDays.has(dayKey(addDays(today, d)))) continue;
      push('art', d, artAt, unfinished ? 'continue' : 'default', unfinished ? `/art/session?sessionId=${unfinished.id}` : '/art');
    }
  }
  if (prefs.cards) {
    for (const d0 of dueDays(lastOf(activity.cards), EVERY.cards)) {
      // Not on an art day: one creative invitation a day is plenty.
      const d = plan.some((p) => p.kind === 'art' && dayKey(p.at) === dayKey(addDays(today, d0))) ? d0 + 1 : d0;
      if (d >= days || !welcomeAfter(silentBefore + d) || cardDays.has(dayKey(addDays(today, d)))) continue;
      push('cards', d, cardsAt, 'default', '/cards');
    }
  }

  // At most two a day, three hours apart; the journal keeps its place.
  const rank: Record<ReminderKind, number> = { journal: 0, art: 1, cards: 2, step: 3, reflection: 4, sleep: 5 };
  const kept: PlannedReminder[] = [];
  for (const r of [...plan].sort((a, b) => rank[a.kind] - rank[b.kind] || a.at - b.at)) {
    const sameDay = kept.filter((k) => dayKey(k.at) === dayKey(r.at));
    if (sameDay.length >= 2) continue;
    let at = r.at;
    const clash = () => sameDay.some((k) => Math.abs(k.at - at) < MIN_GAP);
    if (clash()) {
      // Try earlier in the day, still outside quiet hours and in the future.
      at = Math.min(...sameDay.map((k) => k.at)) - MIN_GAP;
      if (inQuiet(minuteOf(at), prefs.quietFrom, prefs.quietTo) || at <= now + 5 * MINUTE || dayKey(at) !== dayKey(r.at) || clash()) continue;
    }
    kept.push({ ...r, at });
  }
  return kept.sort((a, b) => a.at - b.at);
}

// ---------- My Steps, daily reflection, morning sleep question ----------
// Asked for by the person (a Step's "remind me", the reflection time, "ask how
// I slept"), so not part of the two-a-day gentle limit, but still: never in
// quiet hours, never for what is already done, at most three Step reminders a day.

export interface StepForReminder {
  id: string;
  template: string;
  title?: string;
  days: number[];
  time: string | null;
  reminder: boolean;
  paused: boolean;
  archived?: boolean;
  createdAt: number;
}

const parseHm = (hm: string | null) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || ''));
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const MAX_STEP_REMINDERS_PER_DAY = 3;

/** `marked`: "stepId:YYYY-MM-DD" for steps already done or skipped that day. */
export function planStepReminders(steps: StepForReminder[], marked: Set<string>, prefs: Pick<ReminderPrefs, 'quietFrom' | 'quietTo'>, now: number, { days = 7 }: { days?: number } = {}): PlannedReminder[] {
  const today = startOfDay(now);
  const out: PlannedReminder[] = [];
  for (let d = 0; d < days; d += 1) {
    const dayStart = addDays(today, d);
    const key = dayKey(dayStart);
    const weekday = new Date(dayStart).getDay();
    const todays: PlannedReminder[] = [];
    for (const s of steps) {
      const minute = parseHm(s.time);
      if (!s.reminder || s.paused || s.archived || minute === null || !s.days.includes(weekday)) continue;
      if (dayKey(s.createdAt) > key || marked.has(`${s.id}:${key}`)) continue;
      const at = atMinute(dayStart, outOfQuiet(minute, prefs));
      if (at <= now + 5 * MINUTE) continue;
      todays.push({ id: `step-${s.id}-${key}`, kind: 'step', at, variant: 'default', copyIndex: Math.floor(dayStart / DAY), url: '/steps', stepTemplate: s.template, stepTitle: s.title });
    }
    out.push(...todays.sort((a, b) => a.at - b.at).slice(0, MAX_STEP_REMINDERS_PER_DAY));
  }
  return out;
}

/** The daily reflection reminder for today (if not made yet) and tomorrow. */
export function planReflectionReminders(settings: { enabled: boolean; time: string }, doneToday: boolean, prefs: Pick<ReminderPrefs, 'quietFrom' | 'quietTo'>, now: number): PlannedReminder[] {
  const minute = parseHm(settings.time);
  if (!settings.enabled || minute === null) return [];
  const out: PlannedReminder[] = [];
  for (let d = 0; d < 2; d += 1) {
    if (d === 0 && doneToday) continue;
    const dayStart = addDays(startOfDay(now), d);
    const at = atMinute(dayStart, outOfQuiet(minute, prefs));
    if (at > now + 5 * MINUTE) out.push({ id: `reflection-${dayKey(dayStart)}`, kind: 'reflection', at, variant: 'default', copyIndex: Math.floor(dayStart / DAY), url: '/reflection?auto=1' });
  }
  return out;
}

/** After a sleep sound session: one question the next morning, after quiet hours (and not before 08:30). */
export function planSleepCheckIn(lastBedtime: number | null, checkedInDays: Set<string>, enabled: boolean, prefs: Pick<ReminderPrefs, 'quietFrom' | 'quietTo'>, now: number): PlannedReminder[] {
  if (!enabled || !lastBedtime || now - lastBedtime > 20 * HOUR) return [];
  // The morning after: bedtime before 06:00 belongs to that same morning.
  const morning = new Date(lastBedtime).getHours() < 6 ? startOfDay(lastBedtime) : addDays(startOfDay(lastBedtime), 1);
  if (checkedInDays.has(dayKey(morning))) return [];
  const minute = Math.max(prefs.quietTo + 30, 8 * 60 + 30) % (24 * 60);
  const at = atMinute(morning, minute);
  return at > now + 5 * MINUTE ? [{ id: `sleep-${dayKey(morning)}`, kind: 'sleep', at, variant: 'default', copyIndex: Math.floor(morning / DAY), url: '/sleep?morning=1' }] : [];
}
