/**
 * My Programs: the active program, a suggestion from what the person chose
 * themselves (editable: any program can be picked), programs on pause, all
 * four programs and the ones already finished. Self-care, not treatment;
 * safety help stays one tap away and free.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Icon, Screen, SectionHeader, space } from '@/design';
import { ProgramCard, ProgramIcon } from '@/features/programs/ProgramParts';
import { useT } from '@/i18n';
import { getFocusAreas, loadStart } from '@/lib/onboarding';
import { subscribe } from '@/lib/storage/json';
import { dayKey } from '@/lib/wellbeing/dates';
import { latestRunOf, loadPrograms, PROGRAMS_TOPIC, type ProgramData } from '@/lib/wellbeing/programStore';
import { programById, PROGRAMS, recommendProgram, runState } from '@/lib/wellbeing/programs';

export default function ProgramsScreen() {
  const router = useRouter();
  const { t, formatDate } = useT();
  const [data, setData] = useState<ProgramData | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const today = dayKey();

  const refresh = useCallback(() => {
    loadPrograms().then(setData).catch(() => setData({ v: 1, runs: [] }));
    Promise.all([loadStart(), getFocusAreas()])
      .then(([s, f]) => setGoals([...(s.goal ? [s.goal] : []), ...f]))
      .catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => subscribe(PROGRAMS_TOPIC, refresh), [refresh]);

  const runs = data?.runs ?? [];
  const active = runs.find((r) => r.status === 'active') || null;
  const paused = runs.filter((r) => r.status === 'paused');
  const finished = runs.filter((r) => r.status === 'completed').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  const rec = recommendProgram(goals);
  const recDef = rec && !active ? programById(rec.id) : null;
  const open = (id: string) => router.push(`/programs/${id}` as never);

  return (
    <Screen back title={t('jr.programs.title')} subtitle={t('jr.programs.subtitle')} width="reading" testID="screen-programs">
      <View style={{ gap: space[5] }}>
        {active ? (
          <View>
            <SectionHeader title={t('jr.programs.active')} />
            <ProgramCard def={programById(active.programId)!} run={active} state={runState(active, today)} onPress={() => open(active.programId)} testID={`program-active-${active.programId}`} />
          </View>
        ) : null}

        {recDef ? (
          <Card tone={recDef.tone} padding={20} testID="program-suggested">
            <AppText variant="label" color="textSecondary">
              {t('jr.programs.suggested')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: space[2] }}>
              <ProgramIcon def={recDef} />
              <View style={{ flex: 1 }}>
                <AppText variant="title3">{t(`jr.programs.defs.${recDef.id}.title`)}</AppText>
                <AppText variant="small" color="textSecondary">
                  {t('jr.programs.because', { choice: t(`jr.programs.goals.${rec!.because}`) })}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: space[4], flexWrap: 'wrap' }}>
              <Button label={t('jr.programs.seeProgram')} size="sm" iconRight="arrow-forward" onPress={() => open(recDef.id)} testID="program-suggested-open" />
            </View>
            <AppText variant="caption" color="textSecondary" style={{ marginTop: space[3] }}>
              {t('jr.programs.suggestionNote')}
            </AppText>
          </Card>
        ) : null}

        {paused.length ? (
          <View>
            <SectionHeader title={t('jr.programs.paused')} />
            <View style={{ gap: space[3] }}>
              {paused.map((r) => (
                <ProgramCard key={r.runId} def={programById(r.programId)!} run={r} state={runState(r, today)} onPress={() => open(r.programId)} testID={`program-paused-${r.programId}`} />
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <SectionHeader title={t('jr.programs.all')} />
          <View style={{ gap: space[3] }}>
            {PROGRAMS.map((def) => {
              const latest = data ? latestRunOf(data, def.id) : null;
              const times = runs.filter((r) => r.programId === def.id && r.status === 'completed').length;
              return (
                <ProgramCard
                  key={def.id}
                  def={def}
                  run={latest && latest.status !== 'stopped' && latest.status !== 'completed' ? latest : null}
                  state={latest ? runState(latest, today) : null}
                  onPress={() => open(def.id)}
                  note={times ? t('jr.programs.timesDone', { n: times }) : undefined}
                  testID={`program-${def.id}`}
                />
              );
            })}
          </View>
        </View>

        {finished.length ? (
          <View>
            <SectionHeader title={t('jr.programs.completed')} />
            <View style={{ gap: 8 }}>
              {finished.map((r) => (
                <View key={r.runId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="checkmark-circle" size={20} color="brand" />
                  <AppText variant="small" style={{ flex: 1 }}>
                    {t(`jr.programs.defs.${r.programId}.title`)} · {formatDate(r.completedAt || r.updatedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Card tone="muted" padding={18}>
          <AppText variant="smallStrong">{t('jr.programs.notTitle')}</AppText>
          <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
            {t('jr.programs.notBody')}
          </AppText>
          <Button label={t('nav.needHelpNow')} icon="heart-outline" variant="ghost" size="sm" onPress={() => router.push('/safety')} style={{ alignSelf: 'flex-start', marginTop: space[2], marginStart: -10 }} />
        </Card>
      </View>
    </Screen>
  );
}
