import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, EmptyState, Icon, IconName, Screen, Segmented, space, useLayout } from '@/design';
import { BarList, MoodChart } from '@/features/charts/Charts';
import { useT } from '@/i18n';
import { ActivityData, feelingCounts, loadActivity, moodSeries, summarize } from '@/lib/storage/activity';

const RANGES = { week: 7, month: 30, quarter: 90 } as const;
type Range = keyof typeof RANGES;

export default function InsightsScreen() {
  const router = useRouter();
  const { t, tl } = useT();
  const { isCompact } = useLayout();
  const [data, setData] = useState<ActivityData | null>(null);
  const [range, setRange] = useState<Range>('month');

  useFocusEffect(
    useCallback(() => {
      loadActivity().then(setData);
    }, [])
  );

  const days = RANGES[range];
  const ms = days * 86400000;
  const summary = useMemo(() => (data ? summarize(data, ms) : null), [data, ms]);
  const series = useMemo(() => (data ? moodSeries(data, days) : []), [data, days]);
  const feelings = useMemo(() => (data ? feelingCounts(data, ms) : []), [data, ms]);
  const hasMood = series.some((p) => p.value !== null);
  const levels = tl('mood.levels');
  const withData = series.filter((p) => p.value !== null);
  const avg = withData.length ? withData.reduce((s, p) => s + (p.value as number), 0) / withData.length : null;

  const empty = data && !data.checkIns.length && !data.journal.length && !data.breathing.length && !data.meditation.length && !data.artCompleted.length;

  const stat = (icon: IconName, label: string, value: number) => (
    <Card padding={18} style={{ flex: 1, minWidth: isCompact ? '45%' : undefined }}>
      <Icon name={icon} size={20} color="brand" />
      <AppText variant="display" style={{ fontSize: 30, lineHeight: 36, marginTop: 6 }}>
        {value}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </Card>
  );

  return (
    <Screen back title={t('insights.title')} subtitle={t('insights.subtitle')} testID="screen-insights">
      {empty ? (
        <Card padding={8}>
          <EmptyState icon="analytics-outline" title={t('insights.empty')} action={<Button label={t('mood.save')} onPress={() => router.push('/')} />} />
        </Card>
      ) : (
        <View style={{ gap: space[5] }}>
          <Segmented
            label={t('insights.title')}
            value={range}
            onChange={setRange}
            options={(Object.keys(RANGES) as Range[]).map((r) => ({ value: r, label: t(`insights.range.${r}`) }))}
          />
          <Card padding={20} testID="insights-mood">
            <AppText variant="title3">{t('insights.moodTrend')}</AppText>
            <AppText variant="caption" color="textSecondary" style={{ marginTop: 2, marginBottom: space[4] }}>
              {t('insights.moodTrendHint')}
              {avg !== null ? ` ${t('insights.average', { value: levels[Math.round(avg)] })}` : ''}
            </AppText>
            {hasMood ? <MoodChart points={series} label={t('insights.moodTrend')} /> : <AppText variant="small" color="textSecondary">{t('insights.noData')}</AppText>}
          </Card>

          {summary ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[4] }}>
              {stat('happy-outline', t('insights.checkIns'), summary.checkIns)}
              {stat('book-outline', t('insights.journalEntries'), summary.journal)}
              {stat('leaf-outline', t('insights.practices'), summary.breathing + summary.meditation + summary.art + summary.cards)}
            </View>
          ) : null}

          <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: space[5] }}>
            <Card padding={20} style={{ flex: 1 }}>
              <AppText variant="title3" style={{ marginBottom: space[4] }}>
                {t('insights.activity')}
              </AppText>
              {summary ? (
                <BarList
                  items={[
                    { label: t('insights.activityTypes.journal'), value: summary.journal },
                    { label: t('insights.activityTypes.breathing'), value: summary.breathing },
                    { label: t('insights.activityTypes.meditation'), value: summary.meditation },
                    { label: t('insights.activityTypes.art'), value: summary.art },
                    { label: t('insights.activityTypes.cards'), value: summary.cards },
                    { label: t('insights.activityTypes.anulia'), value: summary.anulia },
                  ]}
                />
              ) : null}
            </Card>
            <Card padding={20} style={{ flex: 1 }}>
              <AppText variant="title3" style={{ marginBottom: space[4] }}>
                {t('insights.feelings')}
              </AppText>
              {feelings.length ? (
                <BarList items={feelings.slice(0, 6).map(([f, c]) => ({ label: t(`mood.feelings.${f}`), value: c }))} />
              ) : (
                <AppText variant="small" color="textSecondary">
                  {t('insights.noData')}
                </AppText>
              )}
            </Card>
          </View>
        </View>
      )}
    </Screen>
  );
}
