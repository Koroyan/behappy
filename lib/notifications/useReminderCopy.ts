import { useCallback } from 'react';

import { useT } from '@/i18n';

import type { PlannedReminder } from './planner';

/** Reminder wording in the app's language; rotates day by day so it doesn't repeat. */
export function useReminderCopy() {
  const { t, tl } = useT();
  return useCallback(
    (r: PlannedReminder) => {
      if (r.kind === 'step') {
        const name = r.stepTitle || t(`wb.steps.templates.${r.stepTemplate || 'custom'}`);
        return { title: t('wb.reminders.stepTitle', { name }), body: t('wb.reminders.stepBody') };
      }
      if (r.kind === 'reflection') return { title: t('wb.reminders.reflectionTitle'), body: t('wb.reminders.reflectionBody') };
      if (r.kind === 'sleep') return { title: t('wb.reminders.sleepTitle'), body: t('wb.reminders.sleepBody') };
      const base =
        r.kind === 'journal'
          ? r.variant === 'soft'
            ? 'alerts.copy.journalSoft'
            : 'alerts.copy.journal'
          : r.kind === 'art'
            ? r.variant === 'continue'
              ? 'alerts.copy.artContinue'
              : 'alerts.copy.art'
            : 'alerts.copy.cards';
      const titles = tl(`${base}.titles`);
      const bodies = tl(`${base}.bodies`);
      const i = titles.length ? r.copyIndex % titles.length : 0;
      return { title: titles[i] || 'BeHappy', body: bodies[i] || t('alerts.reminders.section') };
    },
    [t, tl]
  );
}
