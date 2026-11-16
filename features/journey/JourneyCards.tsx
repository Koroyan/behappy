/**
 * Today's contextual cards for the first days and for programs. At most one
 * "what's next" card at a time, never the whole catalog:
 * - the active program: today's day, or that it is done;
 * - otherwise, after the first-launch choice: "pick up where you left off"
 *   (no first activity yet), then once "your next step" (a fitting program);
 * - the one-time question about anonymous usage statistics, after the
 *   first activity (nothing is sent before the answer);
 * - a quiet link to "How BeHappy works".
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Icon, IconName, Press, space, useFeedback, useTheme } from '@/design';
import { ProgramIcon } from '@/features/programs/ProgramParts';
import { useT } from '@/i18n';
import { saveAnalyticsChoice, trackAction } from '@/lib/analytics';
import { useAccount, useIdentity } from '@/lib/api/account';
import { finishNextStep, getFocusAreas, loadStart, markStatsAsked, onStartChange, START_ROUTES, StartState } from '@/lib/onboarding';
import { loadConsent } from '@/lib/privacy/consent';
import { subscribe } from '@/lib/storage/json';
import { dayKey } from '@/lib/wellbeing/dates';
import { activeProgram, PROGRAMS_TOPIC } from '@/lib/wellbeing/programStore';
import { PROGRAM_DAYS, programById, recommendProgram } from '@/lib/wellbeing/programs';

type Active = Awaited<ReturnType<typeof activeProgram>>;

const GOAL_ICON: Record<string, IconName> = { stress: 'water-outline', sleep: 'moon-outline', bea: 'chatbubble-ellipses-outline', wellbeing: 'sunny-outline', psychologist: 'medkit-outline', explore: 'compass-outline' };

function useJourney() {
  const [start, setStart] = useState<StartState | null>(null);
  const [active, setActive] = useState<Active>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const refresh = useCallback(() => {
    loadStart().then(setStart).catch(() => {});
    activeProgram().then(setActive).catch(() => setActive(null));
    getFocusAreas().then(setFocus).catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const a = subscribe(PROGRAMS_TOPIC, refresh);
    const b = onStartChange(setStart);
    return () => {
      a();
      b();
    };
  }, [refresh]);
  return { start, active, focus };
}

/** The active program on Today: today's day, or that it is done for today. */
function ProgramToday({ active }: { active: NonNullable<Active> }) {
  const router = useRouter();
  const { t } = useT();
  const { run, def, state } = active;
  const today = dayKey();
  const doneToday = Object.entries(run.days).find(([, m]) => m.doneDay === today);
  return (
    <Card tone={def.tone} padding={18} onPress={() => router.push(`/programs/${def.id}` as never)} accessibilityLabel={t(`jr.programs.defs.${def.id}.title`)} testID="today-program">
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <ProgramIcon def={def} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label" color="textSecondary">
            {t(`jr.programs.defs.${def.id}.title`)}
          </AppText>
          {doneToday ? (
            <AppText variant="bodyStrong">{t('jr.programs.dayDone', { n: Number(doneToday[0]) })}</AppText>
          ) : state.current && state.openToday ? (
            <AppText variant="bodyStrong">
              {t('jr.programs.dayOf', { n: state.current, total: PROGRAM_DAYS })} · {t(`jr.programs.defs.${def.id}.days.d${state.current}.title`)}
            </AppText>
          ) : (
            <AppText variant="bodyStrong">{t('jr.programs.dayOf', { n: state.current ?? PROGRAM_DAYS, total: PROGRAM_DAYS })}</AppText>
          )}
          <AppText variant="caption" color="textSecondary">
            {doneToday ? (state.current ? t('jr.programs.opensTomorrow', { n: state.current }) : t('jr.programs.allDone')) : state.quietDays >= 2 ? t('jr.programs.welcomeBack') : t('jr.programs.todayReady')}
          </AppText>
        </View>
        <Icon name="chevron-forward" size={18} color="textTertiary" />
      </View>
    </Card>
  );
}

/** After the first-launch choice: continue it, then one gentle next step. */
export function JourneyCard() {
  const router = useRouter();
  const { t } = useT();
  const { start, active, focus } = useJourney();
  if (active) return <ProgramToday active={active} />;
  if (!start?.goal || !start.chosenAt) return null;
  const goal = start.goal;

  if (!start.firstActionAt && goal !== 'explore') {
    const go = async () => {
      if (goal === 'bea') router.push(((await loadConsent()).ai ? '/anulia' : '/onboarding?step=bea') as never);
      else router.push(START_ROUTES[goal] as never);
    };
    return (
      <Card padding={18} onPress={go} accessibilityLabel={t('jr.next.resumeTitle')} testID="today-resume">
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Icon name={GOAL_ICON[goal]} size={24} color="primary" />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label" color="textSecondary">
              {t('jr.next.resumeTitle')}
            </AppText>
            <AppText variant="bodyStrong">{t(`jr.start.options.${goal}.title`)}</AppText>
            <AppText variant="caption" color="textSecondary">
              {t(`jr.start.options.${goal}.hint`)}
            </AppText>
          </View>
          <Icon name="chevron-forward" size={18} color="textTertiary" />
        </View>
      </Card>
    );
  }

  // The next step comes after something was actually done, once.
  if (start.nextStepDoneAt || !start.firstActionAt) return null;
  const rec = recommendProgram([goal === 'psychologist' ? 'stress' : goal, ...focus]);
  const def = rec ? programById(rec.id) : null;
  return (
    <Card tone="sage" padding={20} testID="today-next-step">
      <AppText variant="label" color="textSecondary">
        {t('jr.next.title')}
      </AppText>
      <AppText variant="title3" style={{ marginTop: 4 }}>
        {def ? t(`jr.programs.defs.${def.id}.title`) : t('jr.programs.title')}
      </AppText>
      <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
        {def ? t('jr.next.programBody', { name: t(`jr.programs.defs.${def.id}.title`) }) : t('jr.next.programsBody')}
      </AppText>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: space[4], flexWrap: 'wrap' }}>
        <Button
          label={t('jr.next.programCta')}
          size="sm"
          iconRight="arrow-forward"
          onPress={() => {
            trackAction('today', 'next_step_opened');
            finishNextStep().catch(() => {});
            router.push((def ? `/programs/${def.id}` : '/programs') as never);
          }}
          testID="today-next-open"
        />
        <Button label={t('jr.next.notNow')} size="sm" variant="quiet" onPress={() => finishNextStep().catch(() => {})} testID="today-next-later" />
      </View>
    </Card>
  );
}

/**
 * The one-time question about anonymous usage statistics. Asked after the
 * first activity (or a day after first use), only to people who were never
 * asked; until they answer, nothing is sent.
 */
export function StatsQuestion() {
  const { t } = useT();
  const identity = useIdentity();
  const { refresh, me } = useAccount();
  const { toast } = useFeedback();
  const { start } = useJourney();
  const [busy, setBusy] = useState(false);
  const notAsked = identity.analytics === false && identity.analyticsChoice === null;
  const dayOld = me?.createdAt ? Date.now() - me.createdAt > 24 * 60 * 60 * 1000 : false;
  if (!notAsked || !start || start.statsAskedAt || !(start.firstActionAt || dayOld)) return null;
  const answer = async (on: boolean) => {
    setBusy(true);
    try {
      await saveAnalyticsChoice(on);
      await markStatsAsked();
      await refresh();
      toast(t(on ? 'jr.stats.thanks' : 'jr.stats.noThanks'));
    } catch {
      toast(t('common.errorBody'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card tone="muted" padding={18} testID="today-stats-question">
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="analytics-outline" size={22} color="textSecondary" />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="bodyStrong">{t('jr.stats.title')}</AppText>
          <AppText variant="small" color="textSecondary">
            {t('jr.stats.body')}
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: space[3], flexWrap: 'wrap' }}>
        <Button label={t('jr.stats.yes')} size="sm" variant="secondary" onPress={() => answer(true)} disabled={busy} testID="stats-yes" />
        <Button label={t('jr.stats.no')} size="sm" variant="quiet" onPress={() => answer(false)} disabled={busy} testID="stats-no" />
      </View>
    </Card>
  );
}

/** A quiet way to the short guide: what is free, what needs AI or Plus, how data is protected. */
export function GuideLink({ testID = 'today-guide' }: { testID?: string }) {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <Press onPress={() => router.push('/guide' as never)} accessibilityRole="link" accessibilityLabel={t('jr.guide.title')} testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
      <Icon name="compass-outline" size={20} color="primary" />
      <View style={{ flex: 1 }}>
        <AppText variant="smallStrong">{t('jr.guide.title')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('jr.guide.linkHint')}
        </AppText>
      </View>
      <Icon name="chevron-forward" size={16} color="textTertiary" />
    </Press>
  );
}
