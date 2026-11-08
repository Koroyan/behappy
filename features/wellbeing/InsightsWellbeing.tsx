/**
 * Insights: routines, calm and sleep over the chosen period — counts and
 * minutes from the event log, the person's own sleep ratings. No scores.
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';

import { AppText, Card, space } from '@/design';
import { BarList } from '@/features/charts/Charts';
import { useT } from '@/i18n';
import { addDays, dayKey } from '@/lib/wellbeing/dates';
import { loadEvents } from '@/lib/wellbeing/eventStore';
import { CALM_TYPES, minutesOf, WellbeingEvent } from '@/lib/wellbeing/events';
import { loadStepData } from '@/lib/wellbeing/stepStore';
import { consistency } from '@/lib/wellbeing/steps';

export function InsightsWellbeing({ days }: { days: number }) {
  const { t } = useT();
  const [events, setEvents] = useState<WellbeingEvent[]>([]);
  const [steps, setSteps] = useState<{ done: number; planned: number } | null>(null);
  const today = dayKey();

  const refresh = useCallback(() => {
    loadEvents().then(setEvents).catch(() => {});
    loadStepData()
      .then((d) => setSteps(consistency(d.steps.filter((s) => !s.archived), d.marks, dayKey(), days)))
      .catch(() => {});
  }, [days]);
  useFocusEffect(refresh);

  const from = addDays(today, -(days - 1));
  const inRange = events.filter((e) => e.day >= from && e.day <= today);
  const calm = inRange.filter((e) => CALM_TYPES.includes(e.type));
  const sound = inRange.filter((e) => e.type === 'sound.session');
  const focus = inRange.filter((e) => e.type === 'focus.completed');
  const stepsDone = inRange.filter((e) => e.type === 'step.done');
  const sleep = inRange.filter((e) => e.type === 'sleep.checkin');
  const sleepAvg = sleep.length ? Math.round((sleep.reduce((s, e) => s + Number(e.data?.quality || 0), 0) / sleep.length) * 10) / 10 : null;
  const empty = !calm.length && !sound.length && !focus.length && !stepsDone.length && !sleep.length;

  return (
    <Card padding={20} testID="insights-wellbeing">
      <AppText variant="title3" style={{ marginBottom: space[2] }}>
        {t('wb.insights.title')}
      </AppText>
      {empty ? (
        <AppText variant="small" color="textSecondary">
          {t('wb.insights.noData')}
        </AppText>
      ) : (
        <>
          {steps && steps.planned ? (
            <AppText variant="small" color="textSecondary" style={{ marginBottom: space[3] }}>
              {t('wb.insights.stepsPlanned', steps)}
            </AppText>
          ) : null}
          <BarList
            items={[
              { label: t('wb.insights.stepsDone'), value: stepsDone.length },
              { label: t('wb.insights.calmMinutes'), value: minutesOf(calm) },
              { label: t('wb.insights.soundMinutes'), value: minutesOf(sound) },
              { label: t('wb.insights.focus'), value: focus.length },
            ]}
          />
          {sleepAvg !== null ? (
            <AppText variant="small" color="textSecondary" style={{ marginTop: space[3] }}>
              {t('wb.insights.sleepAvg', { value: sleepAvg, n: sleep.length })}
            </AppText>
          ) : null}
        </>
      )}
    </Card>
  );
}
