/**
 * Connects the well-being pieces once for the whole app (renders nothing):
 * - new events complete matching Steps and update badges and challenges;
 * - the older stores (journal, check-ins, breathing, art, cards…) are imported
 *   into the event log at start and when the app comes back to the front;
 * - Step, reflection and sleep reminders are planned again when they change.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onNewEvents } from '@/lib/wellbeing/eventStore';
import { syncLegacyEvents } from '@/lib/wellbeing/legacySync';
import { evaluateProgress } from '@/lib/wellbeing/progressStore';
import { applyEventsToSteps } from '@/lib/wellbeing/stepStore';

export function WellbeingBridge() {
  useEffect(() => {
    const off = onNewEvents(async (added) => {
      await applyEventsToSteps(added).catch(() => 0);
      await evaluateProgress().catch(() => []);
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
