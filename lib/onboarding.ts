import AsyncStorage from '@react-native-async-storage/async-storage';

import { trackAction } from '@/lib/analytics';

const KEY = '@behappy_onboarding_v2';
const START_KEY = '@behappy_start_v1';
const FOCUS_KEY = '@behappy_focus_areas';

/**
 * People who used BeHappy before 2.0 already know it: if any of their data
 * exists, onboarding is skipped instead of greeting them as new users.
 */
const LEGACY_SIGNALS = ['@behappy_user_profile', 'journal_entries', 'therapy_sessions', '@behappy_art_therapy_progress', 'onboardingCompleted'];

export async function isOnboardingDone(): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(KEY)) === 'done') return true;
    const legacy = await AsyncStorage.multiGet(LEGACY_SIGNALS);
    if (legacy.some(([, v]) => v && v !== '[]' && v !== '{}')) {
      await AsyncStorage.setItem(KEY, 'done');
      return true;
    }
  } catch {
    return true; // never trap someone in onboarding because storage failed
  }
  return false;
}

export async function completeOnboarding(focusAreas: string[] = []) {
  await AsyncStorage.multiSet([
    [KEY, 'done'],
    [FOCUS_KEY, JSON.stringify(focusAreas)],
  ]);
}

export async function getFocusAreas(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FOCUS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ---------- First launch: "What would you like help with today?" ----------

/** The first-launch options. Each leads straight to one useful thing. */
export const START_GOALS = ['stress', 'sleep', 'bea', 'wellbeing', 'psychologist', 'explore'] as const;
export type StartGoal = (typeof START_GOALS)[number];

/** Where each option leads first (no account needed for any of them). */
export const START_ROUTES: Record<StartGoal, string> = {
  stress: '/calm?start=breathe&from=start',
  sleep: '/sleep?from=start',
  bea: '/onboarding?step=bea',
  wellbeing: '/programs/habits?from=start',
  psychologist: '/specialists?from=start',
  explore: '/',
};

export interface StartState {
  goal: StartGoal | null;
  chosenAt: number | null;
  /** The first useful thing done after choosing (a finished practice, a saved entry…). */
  firstActionAt: number | null;
  firstAction?: string;
  /** "Next step" card on Today closed by the person. */
  nextStepDoneAt?: number;
  /** The one-time question about usage statistics was answered or closed. */
  statsAskedAt?: number;
  /** For "started" / "left without choosing" counts (once per install). */
  welcomeSeenAt?: number;
  exitedAt?: number;
}

const EMPTY: StartState = { goal: null, chosenAt: null, firstActionAt: null };

export async function loadStart(): Promise<StartState> {
  try {
    const raw = await AsyncStorage.getItem(START_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

type Listener = (s: StartState) => void;
const listeners = new Set<Listener>();
export function onStartChange(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let queue: Promise<unknown> = Promise.resolve();
async function updateStart(fn: (s: StartState) => StartState): Promise<StartState> {
  const run = queue.then(async () => {
    const next = fn(await loadStart());
    await AsyncStorage.setItem(START_KEY, JSON.stringify(next)).catch(() => {});
    listeners.forEach((l) => l(next));
    return next;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** The welcome screen was shown (counted once per install). */
export async function noteWelcomeSeen() {
  const s = await loadStart();
  if (s.welcomeSeenAt) return;
  await updateStart((x) => ({ ...x, welcomeSeenAt: Date.now() }));
  trackAction('onboarding', 'started');
}

/** Left the welcome screen without choosing (app closed or sent to the background), once. */
export async function noteWelcomeExit() {
  const s = await loadStart();
  if (s.goal || s.exitedAt) return;
  await updateStart((x) => ({ ...x, exitedAt: Date.now() }));
  trackAction('onboarding', 'exited');
}

/**
 * The person chose what they want help with. Onboarding is done right away
 * (nobody is kept on a welcome screen); the choice only shapes suggestions,
 * stays on this device and can be changed in Programs at any time.
 */
export async function chooseStartGoal(goal: StartGoal): Promise<string> {
  await updateStart((s) => ({ ...s, goal, chosenAt: Date.now() }));
  await completeOnboarding(goal === 'explore' ? [] : [goal]);
  // The option itself only adds to an anonymous total (never stored with the account).
  trackAction('onboarding', 'option_selected', { choice: goal });
  return START_ROUTES[goal];
}

/** The first useful thing done after the welcome screen (once). */
export async function noteFirstActivity(kind: string) {
  const s = await loadStart();
  if (!s.chosenAt || s.firstActionAt) return;
  await updateStart((x) => ({ ...x, firstActionAt: Date.now(), firstAction: kind.slice(0, 40) }));
  trackAction('onboarding', 'completed');
}

export const finishNextStep = () => updateStart((s) => ({ ...s, nextStepDoneAt: Date.now() }));
export const markStatsAsked = () => updateStart((s) => ({ ...s, statsAskedAt: Date.now() }));
