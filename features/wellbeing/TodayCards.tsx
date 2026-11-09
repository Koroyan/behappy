/**
 * Today: today's Steps (done / skip right there), Sound (what's playing, or
 * Calm now and Sound Lab), and "Today so far" (the factual recap).
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Icon, IconButton, IconName, SectionHeader, space, useTheme } from '@/design';
import { useT } from '@/i18n';
import { pauseSound, resumeSound, startSound, stopSound, useSoundSession } from '@/lib/audio/session';
import { loadSound, SOUND_TOPIC } from '@/lib/audio/soundStore';
import { categoryForHour, suggestTrack, trackById, trackLayers } from '@/lib/audio/tracks';
import { subscribe } from '@/lib/storage/json';
import { dayKey } from '@/lib/wellbeing/dates';
import { EVENTS_TOPIC } from '@/lib/wellbeing/eventStore';
import type { RecapFact } from '@/lib/wellbeing/recap';
import { factsFor } from '@/lib/wellbeing/reflectionStore';
import { loadStepData, markStep, STEPS_TOPIC, undoMark } from '@/lib/wellbeing/stepStore';
import { stepsForDay, TEMPLATES } from '@/lib/wellbeing/steps';

import { FactLine } from './FactLine';

type StepData = Awaited<ReturnType<typeof loadStepData>>;

export function TodaySteps() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  const [data, setData] = useState<StepData | null>(null);
  const refresh = useCallback(() => {
    loadStepData().then(setData).catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => subscribe(STEPS_TOPIC, refresh), [refresh]);
  if (!data) return null;
  const today = dayKey();
  const steps = data.steps.filter((s) => !s.archived);
  const list = stepsForDay(steps, data.marks, today);

  return (
    <View testID="today-steps">
      <SectionHeader title={t('wb.today.stepsTitle')} actionLabel={t('wb.today.allSteps')} onAction={() => router.push('/steps' as any)} style={{ marginBottom: space[2] }} />
      {!steps.length ? (
        <Card padding={16} onPress={() => router.push('/steps' as any)} accessibilityLabel={t('wb.steps.add')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="footsteps-outline" size={22} color="textSecondary" />
            <AppText variant="small" color="textSecondary" style={{ flex: 1 }}>
              {t('wb.today.noSteps')}
            </AppText>
            <Icon name="add" size={20} color="textTertiary" />
          </View>
        </Card>
      ) : !list.length ? (
        <AppText variant="small" color="textSecondary">
          {t('wb.steps.none')}
        </AppText>
      ) : (
        <View style={{ gap: 8 }}>
          {list.map(({ step, state }) => (
            <Card key={step.id} padding={12} testID={`today-step-${step.template}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: state === 'done' ? colors.sageSoft : colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={(state === 'done' ? 'checkmark' : TEMPLATES[step.template].icon) as IconName} size={18} color={state === 'done' ? 'onPrimarySoft' : 'textSecondary'} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="bodyStrong" numberOfLines={1} color={state === 'skipped' ? 'textTertiary' : 'text'}>
                    {step.title?.trim() || t(`wb.steps.templates.${step.template}`)}
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    {state === 'done' ? t('wb.steps.done') : state === 'skipped' ? t('wb.steps.skipped') : step.time || t('wb.steps.anyTime')}
                  </AppText>
                </View>
                {state === 'due' ? (
                  <>
                    {TEMPLATES[step.template].route ? <IconButton icon="play" label={`${t('wb.steps.doIt')}: ${t(`wb.steps.templates.${step.template}`)}`} onPress={() => router.push(TEMPLATES[step.template].route as any)} size={36} variant="soft" /> : null}
                    <IconButton icon="checkmark" label={`${t('wb.steps.markDone')}: ${t(`wb.steps.templates.${step.template}`)}`} onPress={() => markStep(step, today, 'done')} size={36} variant="soft" testID={`today-step-done-${step.template}`} />
                  </>
                ) : (
                  <IconButton icon="arrow-undo" label={t('wb.steps.undo')} onPress={() => undoMark(step, today)} size={36} variant="soft" />
                )}
              </View>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

export function TodaySound() {
  const router = useRouter();
  const { t } = useT();
  const session = useSoundSession();
  // A one-tap suggestion for this hour (the person's own latest choice comes first).
  const [recent, setRecent] = useState<(string | undefined)[]>([]);
  useEffect(() => {
    const load = () => loadSound().then((s) => setRecent(s.history.map((h) => h.trackId))).catch(() => {});
    load();
    return subscribe(SOUND_TOPIC, load);
  }, []);
  const suggested = suggestTrack(categoryForHour(new Date().getHours()), recent);
  const playing = trackById(session?.trackId);
  const playSuggested = () => startSound({ mode: suggested.mode, title: t(`wb.sound.tracks.${suggested.id}.title`), layers: trackLayers(suggested), minutes: suggested.minutes, trackId: suggested.id }).catch(() => {});
  return (
    <Card tone="lavender" padding={16} testID="today-sound">
      {session ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="musical-notes" size={22} color="onLavenderSoft" />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="onLavenderSoft">
              {t('wb.sound.nowPlaying')}
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {playing ? t(`wb.sound.tracks.${playing.id}.title`) : t(`wb.sound.modes.${session.mode}`)}
            </AppText>
          </View>
          {session.state === 'paused' ? <IconButton icon="play" label={t('wb.sound.resume')} onPress={() => resumeSound()} size={38} variant="soft" /> : <IconButton icon="pause" label={t('wb.sound.pause')} onPress={() => pauseSound()} size={38} variant="soft" />}
          <IconButton icon="stop" label={t('wb.sound.stop')} onPress={() => stopSound({ completed: false })} size={38} variant="soft" />
          <IconButton icon="chevron-forward" label={t('wb.sound.open')} onPress={() => router.push(`/sound?mode=${session.mode}` as any)} size={38} variant="soft" />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button label={t(`wb.sound.tracks.${suggested.id}.title`)} icon="play" size="sm" onPress={playSuggested} testID="today-sound-suggested" />
          <Button label={t('wb.today.calm')} icon="water-outline" size="sm" variant="quiet" onPress={() => router.push('/calm' as any)} testID="today-calm" />
          <Button label={t('wb.sound.title')} icon="musical-notes-outline" size="sm" variant="quiet" onPress={() => router.push('/sound' as any)} testID="today-sound-open" />
        </View>
      )}
    </Card>
  );
}

export function TodayRecap() {
  const router = useRouter();
  const { t } = useT();
  const [facts, setFacts] = useState<RecapFact[] | null>(null);
  const refresh = useCallback(() => {
    factsFor().then(setFacts).catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => subscribe(EVENTS_TOPIC, refresh), [refresh]);
  if (!facts) return null;
  return (
    <View testID="today-recap">
      <SectionHeader title={t('wb.today.recapTitle')} actionLabel={t('wb.today.openReflection')} onAction={() => router.push('/reflection' as any)} style={{ marginBottom: space[2] }} />
      <Card padding={14}>
        {facts.length ? facts.slice(0, 5).map((f) => <FactLine key={f.id} fact={f} />) : <AppText variant="small" color="textSecondary">{t('wb.today.recapEmpty')}</AppText>}
      </Card>
    </View>
  );
}
