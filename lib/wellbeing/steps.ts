/**
 * My Steps: small routines the person chooses (gratitude, a walk, breathing…)
 * on the days and at the time they choose.
 *
 * Gentle by design (docs/ETHICS.md): progress is "5 of 7 planned" over a
 * window, never a chain that breaks. Skipping is a valid choice, not a failure.
 * A Step that belongs to an in-app tool completes only from a verified event
 * (a saved journal entry, a finished breathing session…), never from opening
 * a screen.
 */
import { addDays, dayKey, dayRange, parseTime, weekday } from './dates';
import type { EventType, WellbeingEvent } from './events';

export type StepTemplate = 'gratitude' | 'reading' | 'walking' | 'breathing' | 'meditation' | 'focus' | 'kindness' | 'bedtime' | 'journal' | 'custom';

export interface Step {
  id: string;
  template: StepTemplate;
  /** Own title (custom steps, or a renamed template). */
  title?: string;
  /** Weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** "HH:MM" or null (any time of the day). */
  time: string | null;
  minutes: number | null;
  reminder: boolean;
  paused: boolean;
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
  /** Optional link to a goal in @behappy_goals_v1 (the goal itself is not changed). */
  goalId?: string | null;
}

export type MarkStatus = 'done' | 'skipped';

export interface StepMark {
  stepId: string;
  day: string;
  status: MarkStatus;
  at: number;
  source: 'manual' | 'auto';
  /** The event that completed it (auto marks). */
  eventId?: string;
}

interface TemplateInfo {
  icon: string;
  minutes: number | null;
  time: string | null;
  /** Route to do it in the app (optional). */
  route?: string;
  /** Verified events that complete it. */
  completes?: { type: EventType; when?: (e: WellbeingEvent) => boolean }[];
}

export const TEMPLATES: Record<StepTemplate, TemplateInfo> = {
  gratitude: { icon: 'sunny-outline', minutes: 3, time: '21:00', route: '/journal/editor?prompt=gratitude', completes: [{ type: 'journal.saved', when: (e) => e.data?.prompt === 'gratitude' }] },
  reading: { icon: 'book-outline', minutes: 15, time: '21:30' },
  walking: { icon: 'walk-outline', minutes: 20, time: '18:00' },
  breathing: { icon: 'leaf-outline', minutes: 3, time: '09:00', route: '/breathing', completes: [{ type: 'breathing.completed' }] },
  meditation: { icon: 'flower-outline', minutes: 5, time: '08:30', route: '/meditation', completes: [{ type: 'meditation.completed' }] },
  focus: { icon: 'timer-outline', minutes: 25, time: '10:00', route: '/sound?mode=focus', completes: [{ type: 'focus.completed' }] },
  kindness: { icon: 'heart-outline', minutes: null, time: null },
  bedtime: { icon: 'moon-outline', minutes: 10, time: '22:30', route: '/sleep', completes: [{ type: 'sleep.bedtime' }] },
  journal: { icon: 'create-outline', minutes: 5, time: '20:30', route: '/journal/editor', completes: [{ type: 'journal.saved' }] },
  custom: { icon: 'checkmark-circle-outline', minutes: null, time: null },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as StepTemplate[];

export function newStep(template: StepTemplate, id: string, now: number, patch: Partial<Step> = {}): Step {
  const t = TEMPLATES[template];
  return { id, template, days: [0, 1, 2, 3, 4, 5, 6], time: t.time, minutes: t.minutes, reminder: false, paused: false, createdAt: now, updatedAt: now, goalId: null, ...patch };
}

/** Planned for that day: active, not paused, that weekday, not before it was created. */
export function isScheduled(step: Step, day: string): boolean {
  return !step.paused && !step.archived && step.days.includes(weekday(day)) && day >= dayKey(step.createdAt);
}

export const markOf = (marks: StepMark[], stepId: string, day: string) => marks.find((m) => m.stepId === stepId && m.day === day);

export type StepDayState = 'due' | 'done' | 'skipped';

export function stepsForDay(steps: Step[], marks: StepMark[], day: string): { step: Step; state: StepDayState; mark?: StepMark }[] {
  return steps
    .filter((s) => isScheduled(s, day) || markOf(marks, s.id, day)?.status === 'done')
    .map((step) => {
      const mark = markOf(marks, step.id, day);
      return { step, state: (mark?.status ?? 'due') as StepDayState, mark };
    })
    .sort((a, b) => (parseTime(a.step.time) ?? 24 * 60) - (parseTime(b.step.time) ?? 24 * 60));
}

/** Sets or replaces the mark for a step on a day (one mark per step and day). */
export function setMark(marks: StepMark[], mark: StepMark): StepMark[] {
  return [...marks.filter((m) => !(m.stepId === mark.stepId && m.day === mark.day)), mark];
}

export const clearMark = (marks: StepMark[], stepId: string, day: string) => marks.filter((m) => !(m.stepId === stepId && m.day === day));

/** Which steps a new event completes: that tool, a planned day, not already done. */
export function autoMarksFor(steps: Step[], marks: StepMark[], event: WellbeingEvent): StepMark[] {
  const out: StepMark[] = [];
  for (const step of steps) {
    const rules = TEMPLATES[step.template]?.completes;
    if (!rules?.some((r) => r.type === event.type && (!r.when || r.when(event)))) continue;
    if (!isScheduled(step, event.day)) continue;
    if (markOf(marks, step.id, event.day)?.status === 'done') continue;
    out.push({ stepId: step.id, day: event.day, status: 'done', at: event.at, source: 'auto', eventId: event.id });
  }
  return out;
}

/**
 * Gentle consistency: how many planned step-days in the window were done.
 * Skipped days leave the count (a chosen rest is not a miss); today counts only
 * once it is done, so the morning never looks like a failure.
 */
export function consistency(steps: Step[], marks: StepMark[], today: string, windowDays = 7, stepId?: string): { done: number; planned: number } {
  let done = 0;
  let planned = 0;
  for (const day of dayRange(addDays(today, -(windowDays - 1)), today)) {
    for (const step of steps) {
      if (stepId && step.id !== stepId) continue;
      const mark = markOf(marks, step.id, day);
      if (mark?.status === 'done') {
        done += 1;
        planned += 1;
      } else if (isScheduled(step, day) && mark?.status !== 'skipped' && day !== today) planned += 1;
    }
  }
  return { done, planned };
}

/**
 * Classic streak (planned days in a row that were done). Off unless the owner
 * switches the ethics flag on AND the person opts in; skipped days don't break it.
 */
export function classicStreak(step: Step, marks: StepMark[], today: string): number {
  let count = 0;
  for (let i = 0, day = today; i < 730; i += 1, day = addDays(day, -1)) {
    const mark = markOf(marks, step.id, day);
    if (mark?.status === 'done') count += 1;
    else if (mark?.status === 'skipped' || !isScheduled(step, day)) {
      if (day < dayKey(step.createdAt)) break;
      continue;
    } else if (day === today) continue;
    else break;
  }
  return count;
}

/** A month for the calendar: per day, how many planned and done. */
export function monthGrid(steps: Step[], marks: StepMark[], year: number, month: number): { day: string; planned: number; done: number; skipped: number }[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const days: string[] = [];
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) days.push(d);
  return days.map((day) => {
    let planned = 0;
    let done = 0;
    let skipped = 0;
    for (const s of steps) {
      const m = markOf(marks, s.id, day);
      if (m?.status === 'done') done += 1;
      else if (m?.status === 'skipped') skipped += 1;
      if (isScheduled(s, day) || m) planned += 1;
    }
    return { day, planned, done, skipped };
  });
}
