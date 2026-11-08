/**
 * The daily recap: facts from what the person recorded that day, in the
 * categories they allowed. Each fact has a stable id so an AI reflection can
 * cite it, and the server can check that every pattern points at real facts.
 * The factual recap (no AI) is built from the same list, so it always works:
 * offline, without credits, without AI consent.
 */
import { addDays } from './dates';
import { CALM_TYPES, minutesOf, onDay, WellbeingEvent } from './events';
import { consistency, Step, StepMark, stepsForDay } from './steps';
import { CHALLENGES, ChallengeRun, challengeState } from './badges';

export type RecapCategory = 'steps' | 'mood' | 'journal' | 'calm' | 'art' | 'cards' | 'sound' | 'challenges' | 'goals' | 'sleep';
export const RECAP_CATEGORIES: RecapCategory[] = ['steps', 'mood', 'journal', 'calm', 'sound', 'sleep', 'art', 'cards', 'challenges', 'goals'];

export interface RecapFact {
  /** Stable id, e.g. "steps.done" — cited by AI patterns. */
  id: string;
  category: RecapCategory;
  values: Record<string, string | number>;
}

export interface RecapInput {
  day: string;
  events: WellbeingEvent[];
  steps?: { steps: Step[]; marks: StepMark[] };
  goals?: { id: string; title: string; status: string; completedAt?: number }[];
  challenges?: ChallengeRun[];
  categories: Partial<Record<RecapCategory, boolean>>;
}

export function dayFacts(input: RecapInput): RecapFact[] {
  const { day, events } = input;
  const on = (c: RecapCategory) => input.categories[c] !== false;
  const today = onDay(events, day);
  const facts: RecapFact[] = [];
  const push = (category: RecapCategory, key: string, values: Record<string, string | number>) => facts.push({ id: `${category}.${key}`, category, values });

  if (on('steps') && input.steps) {
    const list = stepsForDay(input.steps.steps, input.steps.marks, day);
    if (list.length) {
      const done = list.filter((x) => x.state === 'done');
      push('steps', 'today', { done: done.length, planned: list.length, names: done.map((x) => x.step.title || x.step.template).join(', ') });
      const week = consistency(input.steps.steps, input.steps.marks, day, 7);
      if (week.planned >= 3) push('steps', 'week', { done: week.done, planned: week.planned });
    }
  }
  if (on('mood')) {
    const checks = today.filter((e) => e.type === 'mood.checkin');
    if (checks.length) {
      const moods = checks.map((e) => Number(e.data?.mood ?? 0));
      const feelings = [...new Set(checks.flatMap((e) => String(e.data?.feelings || '').split(',').filter(Boolean)))];
      push('mood', 'checkins', { count: checks.length, last: moods[moods.length - 1], feelings: feelings.join(',') });
    }
  }
  if (on('journal')) {
    const n = today.filter((e) => e.type === 'journal.saved').length;
    if (n) push('journal', 'entries', { count: n });
  }
  if (on('calm')) {
    const calm = today.filter((e) => CALM_TYPES.includes(e.type));
    if (calm.length) {
      push('calm', 'practices', {
        count: calm.length,
        minutes: minutesOf(calm),
        breathing: calm.filter((e) => e.type === 'breathing.completed').length,
        meditation: calm.filter((e) => e.type === 'meditation.completed').length,
        grounding: calm.filter((e) => e.type === 'grounding.completed').length,
      });
    }
  }
  if (on('sound')) {
    const s = today.filter((e) => e.type === 'sound.session');
    const f = today.filter((e) => e.type === 'focus.completed');
    if (s.length) push('sound', 'minutes', { minutes: minutesOf(s), sessions: s.length });
    if (f.length) push('sound', 'focus', { count: f.length, minutes: minutesOf(f) });
  }
  if (on('sleep')) {
    const c = today.filter((e) => e.type === 'sleep.checkin').pop();
    if (c) push('sleep', 'checkin', { quality: Number(c.data?.quality ?? 0), ...(c.data?.hours ? { hours: Number(c.data.hours) } : {}) });
    const bed = onDay(events, addDays(day, -1)).some((e) => e.type === 'sleep.bedtime') || today.some((e) => e.type === 'sleep.bedtime');
    if (bed) push('sleep', 'bedtime', { done: 1 });
  }
  if (on('art')) {
    const a = today.filter((e) => e.type === 'art.completed');
    if (a.length) push('art', 'sessions', { count: a.length, sessions: a.map((e) => e.data?.session).filter(Boolean).join(', ') });
  }
  if (on('cards')) {
    const c = today.filter((e) => e.type === 'cards.completed').length;
    if (c) push('cards', 'reflections', { count: c });
  }
  if (on('challenges') && input.challenges?.length) {
    for (const run of input.challenges.filter((r) => r.status === 'active' || (r.status === 'completed' && r.completedAt && new Date(r.completedAt).toISOString().slice(0, 10) >= addDays(day, -1)))) {
      const def = CHALLENGES.find((c) => c.id === run.id);
      if (!def) continue;
      const st = challengeState(def, run, events, day);
      push('challenges', run.id, { challenge: run.id, progress: st.progress, target: st.target, day: st.dayNumber, days: def.days });
    }
  }
  if (on('goals') && input.goals?.length) {
    const active = input.goals.filter((g) => g.status === 'active').length;
    const finished = input.goals.filter((g) => g.status === 'completed' && g.completedAt && new Date(g.completedAt).toDateString() === new Date(`${day}T12:00:00`).toDateString()).length;
    if (active || finished) push('goals', 'status', { active, finished });
  }
  return facts;
}

/**
 * Facts → the compact JSON the reflection model receives: ids, values and,
 * when given, the line the person sees in their own language (so the text
 * names things the way the app does, never by internal ids).
 */
export const factsForModel = (facts: RecapFact[], describe?: (f: RecapFact) => string) =>
  facts.map((f) => ({ id: f.id, ...f.values, ...(describe ? { text: describe(f).slice(0, 120) } : {}) }));
