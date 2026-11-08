/**
 * Badges and challenges. Deterministic: the same history always earns the
 * same badges, dated by the event that reached the threshold. Permanent: once
 * earned, a badge stays even if later days are quiet. No leaderboards, no
 * comparisons, no "you lost it" (docs/ETHICS.md).
 */
import { addDays, daysBetween } from './dates';
import { activeDays, CALM_TYPES, EventType, WellbeingEvent } from './events';

export interface BadgeDef {
  id: string;
  icon: string;
  tone: 'primary' | 'peach' | 'lavender' | 'gold' | 'sage';
  /** Events that count, and how many are needed. */
  types: EventType[];
  count: number;
  /** Only events matching this (e.g. a Step template). */
  when?: (e: WellbeingEvent) => boolean;
}

const tpl = (name: string) => (e: WellbeingEvent) => e.data?.template === name;

export const BADGES: BadgeDef[] = [
  { id: 'firstStep', icon: 'footsteps-outline', tone: 'primary', types: ['step.done'], count: 1 },
  { id: 'steps10', icon: 'footsteps-outline', tone: 'sage', types: ['step.done'], count: 10 },
  { id: 'steps50', icon: 'trail-sign-outline', tone: 'gold', types: ['step.done'], count: 50 },
  { id: 'steps150', icon: 'ribbon-outline', tone: 'lavender', types: ['step.done'], count: 150 },
  { id: 'firstJournal', icon: 'book-outline', tone: 'lavender', types: ['journal.saved'], count: 1 },
  { id: 'journal20', icon: 'library-outline', tone: 'lavender', types: ['journal.saved'], count: 20 },
  { id: 'calm5', icon: 'leaf-outline', tone: 'sage', types: CALM_TYPES, count: 5 },
  { id: 'calm30', icon: 'flower-outline', tone: 'sage', types: CALM_TYPES, count: 30 },
  { id: 'focusFirst', icon: 'timer-outline', tone: 'primary', types: ['focus.completed'], count: 1 },
  { id: 'focus10', icon: 'hourglass-outline', tone: 'primary', types: ['focus.completed'], count: 10 },
  { id: 'soundFirst', icon: 'musical-notes-outline', tone: 'peach', types: ['sound.session'], count: 1 },
  { id: 'sleepCare', icon: 'moon-outline', tone: 'lavender', types: ['sleep.bedtime', 'sleep.checkin'], count: 5 },
  { id: 'artFirst', icon: 'color-palette-outline', tone: 'peach', types: ['art.completed'], count: 1 },
  { id: 'cardsFirst', icon: 'albums-outline', tone: 'gold', types: ['cards.completed'], count: 1 },
  { id: 'kindness7', icon: 'heart-outline', tone: 'peach', types: ['step.done'], count: 7, when: tpl('kindness') },
  { id: 'gratitude7', icon: 'sunny-outline', tone: 'gold', types: ['step.done'], count: 7, when: tpl('gratitude') },
  { id: 'checkIn10', icon: 'happy-outline', tone: 'primary', types: ['mood.checkin'], count: 10 },
  { id: 'challenge', icon: 'trophy-outline', tone: 'gold', types: ['challenge.completed'], count: 1 },
];

export interface EarnedBadge {
  id: string;
  earnedAt: number;
}

/** Badges reached by these events that aren't in `earned` yet (with the date they were reached). */
export function newBadges(events: WellbeingEvent[], earned: EarnedBadge[]): EarnedBadge[] {
  const have = new Set(earned.map((b) => b.id));
  const sorted = [...events].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  const out: EarnedBadge[] = [];
  for (const def of BADGES) {
    if (have.has(def.id)) continue;
    const hits = sorted.filter((e) => def.types.includes(e.type) && (!def.when || def.when(e)));
    if (hits.length >= def.count) out.push({ id: def.id, earnedAt: hits[def.count - 1].at });
  }
  return out;
}

/** Progress towards a badge not earned yet (for "next up"). */
export function badgeProgress(def: BadgeDef, events: WellbeingEvent[]): { have: number; need: number } {
  return { have: Math.min(def.count, events.filter((e) => def.types.includes(e.type) && (!def.when || def.when(e))).length), need: def.count };
}

// ---------- Challenges ----------

export interface ChallengeDef {
  id: string;
  icon: string;
  /** Length of the challenge in days. */
  days: 7 | 14 | 30;
  /** Days with the activity needed (gentle: not every day). */
  target: number;
  types: EventType[];
  when?: (e: WellbeingEvent) => boolean;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'gratitude7', icon: 'sunny-outline', days: 7, target: 5, types: ['step.done', 'journal.saved'], when: (e) => e.data?.template === 'gratitude' || e.data?.prompt === 'gratitude' },
  { id: 'calm14', icon: 'leaf-outline', days: 14, target: 10, types: CALM_TYPES },
  { id: 'walk30', icon: 'walk-outline', days: 30, target: 20, types: ['step.done'], when: tpl('walking') },
  { id: 'focus7', icon: 'timer-outline', days: 7, target: 5, types: ['focus.completed'] },
  { id: 'sleep14', icon: 'moon-outline', days: 14, target: 10, types: ['sleep.bedtime', 'sleep.checkin'] },
  { id: 'journal30', icon: 'book-outline', days: 30, target: 15, types: ['journal.saved'] },
];

export interface ChallengeRun {
  id: string;
  /** Instance id (a challenge can be taken again). */
  runId: string;
  startDay: string;
  status: 'active' | 'completed' | 'ended';
  completedAt?: number;
}

export function challengeState(def: ChallengeDef, run: ChallengeRun, events: WellbeingEvent[], today: string) {
  const endDay = addDays(run.startDay, def.days - 1);
  const days = activeDays(events, def.types, run.startDay, endDay, def.when);
  const progress = days.size;
  const dayNumber = Math.min(def.days, Math.max(1, daysBetween(run.startDay, today) + 1));
  const finished = today > endDay;
  const status: ChallengeRun['status'] = progress >= def.target ? 'completed' : finished ? 'ended' : 'active';
  // The date the target was reached (deterministic): the target-th active day.
  const reachedDay = progress >= def.target ? [...days].sort()[def.target - 1] : null;
  return { progress, target: def.target, dayNumber, endDay, status, reachedDay };
}
