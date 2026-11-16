/**
 * Connects the well-being pieces once for the whole app (renders nothing):
 * - new events complete matching Steps and the current day of the active
 *   program, and update badges and challenges;
 * - the older stores (journal, check-ins, breathing, art, cards…) are imported
 *   into the event log at start and when the app comes back to the front;
 * - Step, reflection and sleep reminders are planned again when they change;
 * - finished practices count in usage statistics (the kind of practice only,
 *   never what was written) and as the first activity after the welcome screen.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { Feature, trackAction } from '@/lib/analytics';
import { noteFirstActivity } from '@/lib/onboarding';
import { onNewEvents } from '@/lib/wellbeing/eventStore';
import type { EventType, WellbeingEvent } from '@/lib/wellbeing/events';
import { syncLegacyEvents } from '@/lib/wellbeing/legacySync';
import { applyEventsToPrograms } from '@/lib/wellbeing/programStore';
import { evaluateProgress } from '@/lib/wellbeing/progressStore';
import { applyEventsToSteps } from '@/lib/wellbeing/stepStore';

/**
 * Events that become usage actions. Journal, programs and sound are counted
 * where they happen (journal.ts, programStore.ts, audio/session.ts).
 */
const ACTION_FOR: Partial<Record<EventType, [Feature, string]>> = {
  'breathing.completed': ['breathing', 'exercise_completed'],
  'meditation.completed': ['meditation', 'session_completed'],
  'grounding.completed': ['grounding', 'exercise_completed'],
  'calm.used': ['calm', 'exercise_completed'],
  'sleep.checkin': ['sleep', 'checkin_saved'],
  'step.created': ['steps', 'created'],
  'step.done': ['steps', 'completed'],
  'step.skipped': ['steps', 'skipped'],
  'mood.checkin': ['today', 'checkin_saved'],
  'cards.completed': ['cards', 'conversation_completed'],
  'art.completed': ['art', 'session_completed'],
  'challenge.completed': ['badges', 'challenge_completed'],
};

/** Done things that count as the first activity after the welcome screen. */
const FIRST_ACTIVITY: EventType[] = ['breathing.completed', 'meditation.completed', 'grounding.completed', 'calm.used', 'sound.session', 'sleep.bedtime', 'sleep.checkin', 'journal.saved', 'mood.checkin', 'step.created', 'step.done', 'cards.completed', 'art.completed', 'program.day'];

/** Older history imported at start is not a new action. */
const RECENT_MS = 6 * 60 * 60 * 1000;

function countEvents(added: WellbeingEvent[]) {
  const now = Date.now();
  for (const e of added) {
    if (now - e.at > RECENT_MS) continue;
    const action = ACTION_FOR[e.type];
    if (action) trackAction(action[0], action[1], e.type === 'calm.used' && typeof e.data?.kind === 'string' ? { exercise: e.data.kind } : undefined);
  }
  const first = added.find((e) => FIRST_ACTIVITY.includes(e.type) && now - e.at <= RECENT_MS);
  if (first) noteFirstActivity(first.type).catch(() => {});
}

export function WellbeingBridge() {
  useEffect(() => {
    const off = onNewEvents(async (added) => {
      countEvents(added);
      await applyEventsToSteps(added).catch(() => 0);
      await applyEventsToPrograms(added).catch(() => 0);
      const badges = await evaluateProgress().catch(() => []);
      for (const b of badges) trackAction('badges', 'earned', { badge: b.id });
    });
    const sync = () => {
      syncLegacyEvents()
        .then(() => evaluateProgress())
        .catch(() => {});
    };
    sync();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => {
      off();
      sub.remove();
    };
  }, []);
  return null;
}
