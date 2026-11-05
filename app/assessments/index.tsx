import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Banner, Card, Icon, Screen, SectionHeader, space, useLayout } from '@/design';
import { useT } from '@/i18n';
import { ITEM_COUNT, TestId } from '@/lib/assessments/scoring';
import { AssessmentDraft, AssessmentRecord, listResults, loadDraft } from '@/lib/storage/assessments';

const TESTS: { id: TestId; minutes: number; tone: 'primary' | 'lavender' | 'sage' }[] = [
  { id: 'phq9', minutes: 3, tone: 'primary' },
  { id: 'gad7', minutes: 2, tone: 'lavender' },
  { id: 'dass21', minutes: 6, tone: 'sage' },
];

export default function AssessmentsScreen() {
  const router = useRouter();
  const { t, tp, formatDate } = useT();
  const { isCompact } = useLayout();
  const [results, setResults] = useState<AssessmentRecord[]>([]);
  const [draft, setDraft] = useState<AssessmentDraft | null>(null);

  useFocusEffect(
    useCallback(() => {
      listResults().then(setResults);
      loadDraft().then(setDraft);
    }, [])
  );

  return (
    <Screen back title={t('assessments.title')} subtitle={t('assessments.subtitle')} testID="screen-assessments">
      <View style={{ gap: space[5] }}>
        <Banner tone="info" icon="information-circle-outline" body={t('assessments.disclaimer')} />
        {draft ? (
          <Card tone="gold" padding={16} onPress={() => router.push(`/assessments/${draft.test}?resume=1`)}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Icon name="play-circle-outline" size={22} color="onGoldSoft" />
              <AppText variant="smallStrong" color="onGoldSoft" style={{ flex: 1 }}>
                {t('assessments.resumeNote')} · {t(`assessments.tests.${draft.test}.name`)}
              </AppText>
              <Icon name="chevron-forward" size={18} color="onGoldSoft" />
            </View>
          </Card>
        ) : null}
        <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: space[4] }}>
          {TESTS.map((test) => {
            const last = results.find((r) => r.test === test.id);
            return (
              <Card key={test.id} tone={test.tone} padding={20} onPress={() => router.push(`/assessments/${test.id}`)} style={{ flex: isCompact ? undefined : 1 }} accessibilityLabel={t(`assessments.tests.${test.id}.title`)} testID={`test-${test.id}`}>
                <AppText variant="label" color="textSecondary">
                  {t(`assessments.tests.${test.id}.name`)}
                </AppText>
                <AppText variant="title3" style={{ marginTop: 4 }}>
                  {t(`assessments.tests.${test.id}.title`)}
                </AppText>
                <AppText variant="small" color="textSecondary" style={{ marginTop: 6 }}>
                  {t(`assessments.tests.${test.id}.purpose`)}
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space[3] }}>
                  <Badge label={tp('assessments.questions', ITEM_COUNT[test.id])} tone="muted" />
                  <Badge label={t('assessments.minutes', { minutes: test.minutes })} tone="muted" icon="time-outline" />
                </View>
                {last ? (
                  <AppText variant="caption" color="textTertiary" style={{ marginTop: space[3] }}>
                    {t('assessments.lastTaken', { date: formatDate(last.at, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                  </AppText>
                ) : null}
              </Card>
            );
          })}
        </View>

        {results.length ? (
          <View>
            <SectionHeader title={t('assessments.history')} />
            <Card padding={6}>
              {results.slice(0, 12).map((r) => {
                const res: any = r.result;
                const value = 'total' in res ? `${res.total}/${res.max} · ${t(`assessments.bands.${res.band}`)}` : `D ${res.depression.score} · A ${res.anxiety.score} · S ${res.stress.score}`;
                return (
                  <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                    <AppText variant="smallStrong" style={{ width: 70 }}>
                      {t(`assessments.tests.${r.test}.name`)}
                    </AppText>
                    <AppText variant="small" style={{ flex: 1 }}>
                      {value}
                    </AppText>
                    <AppText variant="caption" color="textTertiary">
                      {formatDate(r.at, { day: 'numeric', month: 'short' })}
                    </AppText>
                  </View>
                );
              })}
            </Card>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
