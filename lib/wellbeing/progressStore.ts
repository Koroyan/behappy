/**
 * Earned badges and challenge runs on this device (@behappy_progress_v1).
 * Re-evaluated whenever new events arrive (WellbeingBridge).
 */
import { publish, readJson, uid, writeJson } from '@/lib/storage/json';

import { CHALLENGES, ChallengeRun, challengeState, EarnedBadge, newBadges } from './badges';
import { dayKey } from './dates';
import { loadEvents, recordEvent } from './eventStore';

const KEY = '@behappy_progress_v1';
export const PROGRESS_TOPIC = 'progress';

interface ProgressData {
  v: 1;
  badges: EarnedBadge[];
  challenges: ChallengeRun[];
  /** Badges the person hasn't seen yet (for a gentle "new" dot). */
  unseen: string[];
}

export async function loadProgress(): Promise<ProgressData> {
  const raw = await readJson<Partial<ProgressData>>(KEY, {});
  return { v: 1, badges: raw.badges || [], challenges: raw.challenges || [], unseen: raw.unseen || [] };
}

async function save(d: ProgressData) {
  await writeJson(KEY, d);
  publish(PROGRESS_TOPIC);
}

let running: Promise<EarnedBadge[]> | null = null;

/** Checks challenges and badges against all events; returns badges earned now. */
export function evaluateProgress(): Promise<EarnedBadge[]> {
  if (running) return running.then(() => evaluateProgress());
  running = (async () => {
    const d = await loadProgress();
    const today = dayKey();
    let events = await loadEvents();
    let changed = false;
    for (const run of d.challenges) {
      if (run.status !== 'active') continue;
      const def = CHALLENGES.find((c) => c.id === run.id);
      if (!def) continue;
      const st = challengeState(def, run, events, today);
      if (st.status === 'active') continue;
      run.status = st.status;
      changed = true;
      if (st.status === 'completed') {
        run.completedAt = Date.now();
        await recordEvent('challenge.completed', run.runId, { challenge: run.id });
        events = await loadEvents();
      }
    }
    const fresh = newBadges(events, d.badges);
    if (fresh.length || changed) {
      d.badges = [...d.badges, ...fresh];
      d.unseen = [...new Set([...d.unseen, ...fresh.map((b) => b.id)])];
      await save(d);
    }
    return fresh;
  })().finally(() => {
    running = null;
  });
  return running;
}

export async function startChallenge(id: string): Promise<ChallengeRun> {
  const d = await loadProgress();
  const existing = d.challenges.find((c) => c.id === id && c.status === 'active');
  if (existing) return existing;
  const run: ChallengeRun = { id, runId: uid('ch'), startDay: dayKey(), status: 'active' };
  d.challenges = [...d.challenges, run];
  await save(d);
  return run;
}

/** Leaving a challenge is fine: it just ends, nothing is lost. */
export async function leaveChallenge(runId: string) {
  const d = await loadProgress();
  d.challenges = d.challenges.map((c) => (c.runId === runId && c.status === 'active' ? { ...c, status: 'ended' as const } : c));
  await save(d);
}

export async function markBadgesSeen() {
  const d = await loadProgress();
  if (!d.unseen.length) return;
  d.unseen = [];
  await save(d);
}
