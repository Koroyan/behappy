/**
 * Badges & challenges: permanent milestones and gentle 7/14/30-day
 * challenges ("most days"). No leaderboards, no comparisons, no losing.
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Button, Card, Icon, IconName, ProgressBar, Screen, SectionHeader, space, useFeedback, useTheme } from '@/design';
import { useT } from '@/i18n';
import { subscribe } from '@/lib/storage/json';
import { BADGES, badgeProgress, CHALLENGES, challengeState } from '@/lib/wellbeing/badges';
import { dayKey } from '@/lib/wellbeing/dates';
import { EVENTS_TOPIC, loadEvents } from '@/lib/wellbeing/eventStore';
import type { WellbeingEvent } from '@/lib/wellbeing/events';
import { leaveChallenge, loadProgress, markBadgesSeen, PROGRESS_TOPIC, startChallenge } from '@/lib/wellbeing/progressStore';

export default function BadgesScreen() {
  const { t, formatDate } = useT();
  const { colors } = useTheme();
  const { confirm } = useFeedback();
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof loadProgress>> | null>(null);
  const [events, setEvents] = useState<WellbeingEvent[]>([]);
  const [unseen, setUnseen] = useState<string[]>([]);
  const [today, setToday] = useState(() => dayKey());

  const refresh = useCallback(() => {
    setToday(dayKey());
    loadProgress()
      .then((p) => {
        setProgress(p);
        setUnseen((u) => (u.length ? u : p.unseen));
      })
      .catch(() => {});
    loadEvents().then(setEvents).catch(() => {});
  }, []);
  useFocusEffect(
    useCallback(() => {
      refresh();
      // Shown once: the "new" marks stay for this visit only.
      const id = setTimeout(() => markBadgesSeen().catch(() => {}), 1500);
      return () => clearTimeout(id);
    }, [refresh])
  );
  useEffect(() => {
    const a = subscribe(PROGRESS_TOPIC, refresh);
    const b = subscribe(EVENTS_TOPIC, refresh);
    return () => {
      a();
      b();
    };
  }, [refresh]);

  const earned = (progress?.badges || []).slice().sort((a, b) => b.earnedAt - a.earnedAt);
  const earnedIds = new Set(earned.map((b) => b.id));
  const next = BADGES.filter((b) => !earnedIds.has(b.id))
    .map((def) => ({ def, p: badgeProgress(def, events) }))
    .sort((a, b) => b.p.have / b.p.need - a.p.have / a.p.need)
    .slice(0, 4);
  const runs = progress?.challenges || [];
  const active = runs.filter((r) => r.status === 'active');
  const finished = runs.filter((r) => r.status !== 'active').slice(-5).reverse();

  return (
    <Screen back title={t('wb.badges.title')} subtitle={t('wb.badges.subtitle')} width="reading" testID="screen-badges">
      <SectionHeader title={t('wb.badges.earned')} />
      {earned.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space[3], marginBottom: space[4] }}>
          {earned.map((b) => {
            const def = BADGES.find((d) => d.id === b.id);
            if (!def) return null;
            return (
              <Card key={b.id} padding={14} style={{ width: '47%', flexGrow: 0, alignItems: 'center', gap: 6 }} testID={`badge-${b.id}`}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors[`${def.tone}Soft` as 'primarySoft'], alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={def.icon as IconName} size={26} color="text" />
                </View>
                <AppText variant="smallStrong" align="center">
                  {t(`wb.badges.names.${b.id}`)}
                </AppText>
                <AppText variant="caption" color="textTertiary" align="center">
                  {t('wb.badges.earnedOn', { date: formatDate(b.earnedAt, { day: 'numeric', month: 'short' }) })}
                </AppText>
                {unseen.includes(b.id) ? <View style={{ alignSelf: 'center' }}><Badge label={t('wb.badges.new')} tone="primary" /></View> : null}
              </Card>
            );
          })}
        </View>
      ) : (
        <AppText variant="body" color="textSecondary" style={{ marginBottom: space[4] }}>
          {t('wb.badges.none')}
        </AppText>
      )}

      {next.length ? (
        <>
          <SectionHeader title={t('wb.badges.next')} />
          <View style={{ gap: 8, marginBottom: space[5] }}>
            {next.map(({ def, p }) => (
              <View key={def.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon name={def.icon as IconName} size={20} color="textTertiary" />
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="small">{t(`wb.badges.names.${def.id}`)}</AppText>
                  <ProgressBar value={p.have / p.need} label={t('wb.badges.progress', p)} />
                </View>
                <AppText variant="caption" color="textTertiary">
                  {t('wb.badges.progress', p)}
                </AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title={t('wb.badges.challenges.title')} />
      <AppText variant="small" color="textSecondary" style={{ marginBottom: space[3] }}>
        {t('wb.badges.challenges.subtitle')}
      </AppText>
      <View style={{ gap: space[3] }}>
        {CHALLENGES.map((def) => {
          const run = active.find((r) => r.id === def.id);
          const st = run ? challengeState(def, run, events, today) : null;
          return (
            <Card key={def.id} padding={16} tone={run ? 'sage' : 'surface'} testID={`challenge-${def.id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon name={def.icon as IconName} size={22} color="textSecondary" />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{t(`wb.badges.challenges.names.${def.id}`)}</AppText>
                  <AppText variant="caption" color="textTertiary">
                    {st ? t('wb.badges.challenges.active', { day: st.dayNumber, days: def.days, progress: st.progress, target: st.target }) : t(`wb.badges.challenges.hints.${def.id}`)}
                  </AppText>
                </View>
              </View>
              {st ? <ProgressBar value={st.progress / st.target} label={t('wb.badges.progress', { have: st.progress, need: st.target })} /> : null}
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                {run ? (
                  <Button
                    label={t('wb.badges.challenges.leave')}
                    size="sm"
                    variant="ghost"
                    onPress={async () => {
                      if (await confirm({ title: t('wb.badges.challenges.leave'), body: t('wb.badges.challenges.leaveConfirm'), confirmLabel: t('wb.badges.challenges.leave') })) await leaveChallenge(run.runId);
                    }}
                  />
                ) : (
                  <Button label={t('wb.badges.challenges.start')} size="sm" icon="flag-outline" onPress={() => startChallenge(def.id)} testID={`challenge-start-${def.id}`} />
                )}
              </View>
            </Card>
          );
        })}
      </View>

      {finished.length ? (
        <View style={{ marginTop: space[4], gap: 6 }}>
          {finished.map((r) => {
            const def = CHALLENGES.find((c) => c.id === r.id);
            const st = def ? challengeState(def, r, events, today) : null;
            return (
              <AppText key={r.runId} variant="small" color="textSecondary">
                {t(`wb.badges.challenges.names.${r.id}`)} · {r.status === 'completed' ? t('wb.badges.challenges.completed') : t('wb.badges.challenges.ended', { progress: st?.progress ?? 0 })}
              </AppText>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}
