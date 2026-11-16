/**
 * My Programs: four gentle seven-day self-care programs built from the tools
 * BeHappy already has (breathing, Calm now, grounding, meditation, Sound Lab,
 * the Sleep companion, the journal, My Steps). Pure logic, no storage.
 *
 * Self-paced and kind (docs/ETHICS.md):
 * - one day at a time: the next day opens the calendar day after the last
 *   one was done, and a missed day simply waits; nothing breaks or resets;
 * - a day is done by a verified event from the day's main activity (a
 *   finished breathing session, a saved journal entry…) or by the person
 *   saying "I did this", for things done away from the app;
 * - nothing here is a diagnosis, a score or a treatment; the content is
 *   self-care education and is marked for clinical review before release.
 *
 * Every main activity works without AI. The only AI tool (picture cards) is
 * an optional extra and asks for AI consent on its own screen.
 */
import { addDays, daysBetween, dayKey } from './dates';
import type { EventType, WellbeingEvent } from './events';

export const PROGRAM_IDS = ['sleep', 'calm', 'reflection', 'habits'] as const;
export type ProgramId = (typeof PROGRAM_IDS)[number];
export const PROGRAM_DAYS = 7;

/** One thing to do, reusing an existing tool. */
export type ActivityKind =
  | 'calmMinute'
  | 'breathing'
  | 'grounding'
  | 'meditation'
  | 'sound'
  | 'windDown'
  | 'sleepCheckIn'
  | 'journal'
  | 'gratitude'
  | 'checkIn'
  | 'stepCreate'
  | 'stepDo'
  | 'stepReview'
  | 'cards'
  | 'offline';

interface ActivityInfo {
  icon: string;
  /** Where to do it in the app (none: done away from the app). */
  route?: string;
  /** Verified events that complete it (none: "I did this"). */
  completes?: { types: EventType[]; when?: (e: WellbeingEvent) => boolean }[];
  /** Uses AI (asks for consent on its own screen). Never a main activity. */
  ai?: boolean;
}

export const ACTIVITIES: Record<ActivityKind, ActivityInfo> = {
  calmMinute: { icon: 'water-outline', route: '/calm?start=breathe', completes: [{ types: ['calm.used'] }, { types: ['breathing.completed'] }] },
  breathing: { icon: 'leaf-outline', route: '/breathing', completes: [{ types: ['breathing.completed'] }, { types: ['calm.used'], when: (e) => e.data?.kind === 'breathe' }] },
  grounding: { icon: 'hand-left-outline', route: '/grounding', completes: [{ types: ['grounding.completed'] }] },
  meditation: { icon: 'flower-outline', route: '/meditation', completes: [{ types: ['meditation.completed'] }] },
  sound: { icon: 'musical-notes-outline', route: '/sound', completes: [{ types: ['sound.session'] }] },
  windDown: { icon: 'moon-outline', route: '/sleep', completes: [{ types: ['sleep.bedtime'] }] },
  sleepCheckIn: { icon: 'sunny-outline', route: '/sleep?morning=1', completes: [{ types: ['sleep.checkin'] }] },
  journal: { icon: 'create-outline', route: '/journal/editor', completes: [{ types: ['journal.saved'] }] },
  gratitude: { icon: 'sunny-outline', route: '/journal/editor?prompt=gratitude', completes: [{ types: ['journal.saved'], when: (e) => e.data?.prompt === 'gratitude' }] },
  checkIn: { icon: 'happy-outline', route: '/', completes: [{ types: ['mood.checkin'] }] },
  stepCreate: { icon: 'footsteps-outline', route: '/steps?add=1', completes: [{ types: ['step.created'] }] },
  stepDo: { icon: 'checkmark-circle-outline', route: '/steps', completes: [{ types: ['step.done'] }] },
  stepReview: { icon: 'calendar-outline', route: '/steps' },
  cards: { icon: 'albums-outline', route: '/cards', completes: [{ types: ['cards.completed'] }], ai: true },
  offline: { icon: 'walk-outline' },
};

export interface ProgramDay {
  n: number;
  main: ActivityKind;
  /** A journal prompt (content/journalPrompts.ts) for journal days. */
  prompt?: string;
  supports: ActivityKind[];
}

export interface ProgramDef {
  id: ProgramId;
  icon: string;
  tone: 'primary' | 'peach' | 'lavender' | 'gold' | 'sage';
  /** About how long a day takes. */
  minutes: number;
  /** Default reminder time ("HH:MM"), only used if the person turns reminders on. */
  reminderTime: string;
  days: ProgramDay[];
  /**
   * Self-care education, not treatment. Every program needs review by a
   * qualified clinician before a public release (docs/BEHAPPY_PROGRAMS.md).
   */
  review: 'needs_clinical_review';
}

const day = (n: number, main: ActivityKind, supports: ActivityKind[] = [], prompt?: string): ProgramDay => ({ n, main, supports, ...(prompt ? { prompt } : {}) });

export const PROGRAMS: ProgramDef[] = [
  {
    id: 'sleep',
    icon: 'moon-outline',
    tone: 'lavender',
    minutes: 10,
    reminderTime: '21:30',
    review: 'needs_clinical_review',
    days: [day(1, 'windDown'), day(2, 'breathing', ['windDown']), day(3, 'offline', ['sound']), day(4, 'sleepCheckIn'), day(5, 'journal', ['windDown'], 'challenges'), day(6, 'offline', ['sleepCheckIn']), day(7, 'windDown', ['journal'])],
  },
  {
    id: 'calm',
    icon: 'water-outline',
    tone: 'sage',
    minutes: 5,
    reminderTime: '12:30',
    review: 'needs_clinical_review',
    days: [day(1, 'calmMinute'), day(2, 'grounding'), day(3, 'meditation', ['sound']), day(4, 'journal', ['calmMinute'], 'challenges'), day(5, 'sound'), day(6, 'breathing', ['grounding']), day(7, 'journal', [], 'free')],
  },
  {
    id: 'reflection',
    icon: 'sparkles-outline',
    tone: 'peach',
    minutes: 10,
    reminderTime: '20:30',
    review: 'needs_clinical_review',
    days: [day(1, 'checkIn'), day(2, 'gratitude'), day(3, 'journal', [], 'goals'), day(4, 'journal', ['cards'], 'emotions'), day(5, 'journal', [], 'free'), day(6, 'journal', [], 'reflection'), day(7, 'journal', ['checkIn'], 'goals')],
  },
  {
    id: 'habits',
    icon: 'footsteps-outline',
    tone: 'gold',
    minutes: 10,
    reminderTime: '09:00',
    review: 'needs_clinical_review',
    days: [day(1, 'stepCreate'), day(2, 'stepDo'), day(3, 'stepDo'), day(4, 'offline', ['stepDo']), day(5, 'stepDo'), day(6, 'offline', ['stepDo']), day(7, 'stepReview', ['journal'])],
  },
];

export const programById = (id: string) => PROGRAMS.find((p) => p.id === id);

export type RunStatus = 'active' | 'paused' | 'completed' | 'stopped';

export interface DayMark {
  doneAt: number;
  /** Local day it was done (the next day opens the day after). */
  doneDay: string;
  source: 'auto' | 'manual';
  eventId?: string;
}

export interface ProgramRun {
  runId: string;
  programId: ProgramId;
  startedAt: number;
  status: RunStatus;
  /** Days done, by day number (1–7). */
  days: Record<string, DayMark>;
  /** The person's own short reflections, by day number. Kept on this device (and in their encrypted backup). */
  notes: Record<string, { text: string; at: number }>;
  reminder: { enabled: boolean; time: string };
  pausedAt?: number;
  completedAt?: number;
  stoppedAt?: number;
  updatedAt: number;
}

export function newRun(def: ProgramDef, runId: string, now: number): ProgramRun {
  return { runId, programId: def.id, startedAt: now, status: 'active', days: {}, notes: {}, reminder: { enabled: false, time: def.reminderTime }, updatedAt: now };
}

export const doneCount = (run: ProgramRun) => Object.keys(run.days).filter((k) => Number(k) >= 1 && Number(k) <= PROGRAM_DAYS).length;

export interface RunState {
  /** The day to do next (null when all seven are done). */
  current: number | null;
  done: number;
  /** The current day can be done today. */
  openToday: boolean;
  /** When it isn't open yet: the local day it opens. */
  opensOn: string | null;
  /** Days since the last activity in this program (for a kind "welcome back", never a warning). */
  quietDays: number;
}

/**
 * Where a run stands today. Day 1 opens on the day the program starts; each
 * next day opens the calendar day after the previous one was done.
 */
export function runState(run: ProgramRun, today: string): RunState {
  const done = doneCount(run);
  let current: number | null = null;
  for (let n = 1; n <= PROGRAM_DAYS; n += 1) {
    if (!run.days[String(n)]) {
      current = n;
      break;
    }
  }
  const lastDone = Object.values(run.days).reduce<string | null>((max, m) => (!max || m.doneDay > max ? m.doneDay : max), null);
  const startDay = dayKey(run.startedAt);
  const opensOn = current === null ? null : current === 1 || !lastDone ? startDay : addDays(lastDone, 1);
  const openToday = current !== null && run.status === 'active' && !!opensOn && today >= opensOn;
  const quietDays = Math.max(0, daysBetween(lastDone || startDay, today));
  return { current, done, openToday, opensOn: openToday ? null : opensOn, quietDays };
}

const matches = (kind: ActivityKind, e: WellbeingEvent) => (ACTIVITIES[kind].completes || []).some((r) => r.types.includes(e.type) && (!r.when || r.when(e)));

/**
 * The day this event completes in an active run, if any: the current day's
 * main activity, done on a day that day was open, after the program started.
 */
export function autoMarkFor(run: ProgramRun, event: WellbeingEvent): { n: number; mark: DayMark } | null {
  if (run.status !== 'active' || event.at < run.startedAt) return null;
  const def = programById(run.programId);
  if (!def) return null;
  const st = runState(run, event.day);
  if (!st.openToday || st.current === null) return null;
  const d = def.days[st.current - 1];
  if (!d || !matches(d.main, event)) return null;
  return { n: st.current, mark: { doneAt: event.at, doneDay: event.day, source: 'auto', eventId: event.id } };
}

/** Marks a day done ("I did this", or automatically). Only the current, open day. */
export function markDay(run: ProgramRun, n: number, mark: DayMark): ProgramRun {
  const st = runState(run, mark.doneDay);
  if (st.current !== n || !st.openToday) return run;
  const days = { ...run.days, [String(n)]: mark };
  const complete = Object.keys(days).length >= PROGRAM_DAYS;
  return { ...run, days, status: complete ? 'completed' : run.status, completedAt: complete ? mark.doneAt : run.completedAt, updatedAt: mark.doneAt };
}

export function setNote(run: ProgramRun, n: number, text: string, now: number): ProgramRun {
  const clean = text.replace(/\r\n/g, '\n').slice(0, 2000);
  const notes = { ...run.notes };
  if (clean.trim()) notes[String(n)] = { text: clean, at: now };
  else delete notes[String(n)];
  return { ...run, notes, updatedAt: now };
}

/**
 * The program that fits what the person chose themselves (the first-launch
 * question, or the earlier focus areas). Never inferred from usage or notes.
 */
export const GOAL_PROGRAM: Record<string, ProgramId> = {
  stress: 'calm',
  anxiety: 'calm',
  calm: 'calm',
  sleep: 'sleep',
  bea: 'reflection',
  reflect: 'reflection',
  mood: 'reflection',
  selfworth: 'reflection',
  relationships: 'reflection',
  creativity: 'reflection',
  wellbeing: 'habits',
  curiosity: 'habits',
};

export function recommendProgram(goals: string[]): { id: ProgramId; because: string } | null {
  for (const g of goals) if (GOAL_PROGRAM[g]) return { id: GOAL_PROGRAM[g], because: g };
  return null;
}

export interface RunSummary {
  daysDone: number;
  /** Minutes of calm practice, sound and wind-down during the run (from events). */
  calmMinutes: number;
  journalEntries: number;
  notesWritten: number;
  /** Calendar days from start to finish (or today). */
  spanDays: number;
}

const CALM: EventType[] = ['breathing.completed', 'meditation.completed', 'grounding.completed', 'calm.used', 'sound.session'];

export function runSummary(run: ProgramRun, events: WellbeingEvent[], today: string): RunSummary {
  const end = run.completedAt ?? run.stoppedAt ?? Number.MAX_SAFE_INTEGER;
  const inRun = events.filter((e) => e.at >= run.startedAt && e.at <= end);
  return {
    daysDone: doneCount(run),
    calmMinutes: inRun.filter((e) => CALM.includes(e.type)).reduce((s, e) => s + (Number(e.data?.minutes) || 0), 0),
    journalEntries: inRun.filter((e) => e.type === 'journal.saved').length,
    notesWritten: Object.values(run.notes).filter((x) => x.text.trim()).length,
    spanDays: daysBetween(dayKey(run.startedAt), run.completedAt ? dayKey(run.completedAt) : today) + 1,
  };
}

/** What to suggest after a finished program (another one, never pressure). */
export function nextProgramAfter(id: ProgramId, finished: ProgramId[]): ProgramId | null {
  const order: Record<ProgramId, ProgramId[]> = { sleep: ['calm', 'habits', 'reflection'], calm: ['sleep', 'reflection', 'habits'], reflection: ['habits', 'calm', 'sleep'], habits: ['reflection', 'calm', 'sleep'] };
  return order[id].find((p) => !finished.includes(p)) ?? null;
}
