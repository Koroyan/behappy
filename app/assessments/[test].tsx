import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, Icon, Press, ProgressBar, Screen, space, useTheme } from '@/design';
import { useT } from '@/i18n';
import { DassResult, ITEM_COUNT, scoreDASS21, scoreGAD7, scorePHQ9, SimpleResult, TestId } from '@/lib/assessments/scoring';
import { clearDraft, loadDraft, saveDraft, saveResult } from '@/lib/storage/assessments';

type Stage = 'intro' | 'questions' | 'result';

export default function AssessmentRunner() {
  const params = useLocalSearchParams<{ test: string; resume?: string }>();
  const test = (['phq9', 'gad7', 'dass21'].includes(String(params.test)) ? params.test : 'phq9') as TestId;
  const router = useRouter();
  const { t, tl, language } = useT();
  const { colors } = useTheme();
  const n = ITEM_COUNT[test];
  const items = tl(`assessments.tests.${test}.items`);
  const options = tl(`assessments.tests.${test}.options`);

  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<SimpleResult | DassResult | null>(null);

  useEffect(() => {
    if (params.resume !== '1') return;
    loadDraft().then((d) => {
      if (d && d.test === test && d.answers.length === n) {
        setAnswers(d.answers);
        setIndex(Math.min(d.index, n - 1));
        setStage('questions');
      }
    });
  }, [params.resume, test, n]);

  const answer = (value: number) => {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
    if (index < n - 1) {
      setIndex(index + 1);
      saveDraft({ test, answers: next, index: index + 1 });
    } else {
      saveDraft({ test, answers: next, index });
    }
  };

  const finish = async () => {
    if (answers.some((a) => a === null)) {
      setIndex(answers.findIndex((a) => a === null));
      return;
    }
    const final = answers as number[];
    const r = test === 'phq9' ? scorePHQ9(final) : test === 'gad7' ? scoreGAD7(final) : scoreDASS21(final);
    await saveResult(test, final, r);
    setResult(r);
    setStage('result');
  };

  const allAnswered = answers.every((a) => a !== null);
  const meaning = result ? result.meaning : 'low';
  const tips = useMemo(() => (result ? tl(`assessments.tips.${meaning}`) : []), [result, meaning, tl]);

  if (stage === 'intro') {
    return (
      <Screen back eyebrow={t(`assessments.tests.${test}.name`)} title={t(`assessments.tests.${test}.title`)} subtitle={t(`assessments.tests.${test}.purpose`)} width="reading" testID="screen-assessment-intro">
        <View style={{ gap: space[5] }}>
          <Card padding={20}>
            <AppText variant="body">{t(`assessments.tests.${test}.instructions`)}</AppText>
          </Card>
          <Banner tone="info" body={t('assessments.disclaimer')} />
          {language !== 'en' ? <Banner tone="warning" body={t('assessments.translationNote')} /> : null}
          <Button label={t('assessments.begin')} size="lg" iconRight="arrow-forward" onPress={() => setStage('questions')} fullWidth testID="assessment-begin" />
          <AppText variant="caption" color="textTertiary">
            {t(`assessments.tests.${test}.credit`)}
          </AppText>
        </View>
      </Screen>
    );
  }

  if (stage === 'questions') {
    return (
      <Screen back={() => setStage('intro')} compactHeader title={t(`assessments.tests.${test}.name`)} width="reading" testID="screen-assessment-question">
        <View style={{ gap: space[5], marginTop: space[3] }}>
          <View style={{ gap: 8 }}>
            <AppText variant="caption" color="textSecondary">
              {t('assessments.questionOf', { current: index + 1, total: n })}
            </AppText>
            <ProgressBar value={(index + (answers[index] !== null ? 1 : 0)) / n} />
          </View>
          <AppText variant="caption" color="textTertiary">
            {t(`assessments.tests.${test}.instructions`)}
          </AppText>
          <AppText variant="title2" accessibilityLiveRegion="polite" testID="assessment-question">
            {items[index]}
          </AppText>
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            {options.map((label, value) => {
              const selected = answers[index] === value;
              return (
                <Press
                  key={label}
                  onPress={() => answer(value)}
                  haptic
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                  testID={`answer-${value}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 56,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 16,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primarySoft : colors.surface,
                  }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.primary : colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                    {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
                  </View>
                  <AppText variant="callout" style={{ flex: 1 }}>
                    {label}
                  </AppText>
                </Press>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
            <Button label={t('common.previous')} variant="quiet" icon="chevron-back" disabled={index === 0} onPress={() => setIndex(index - 1)} />
            {index < n - 1 ? (
              <Button label={t('common.next')} variant="secondary" iconRight="chevron-forward" disabled={answers[index] === null} onPress={() => setIndex(index + 1)} />
            ) : (
              <Button label={t('assessments.finish')} disabled={!allAnswered} onPress={finish} testID="assessment-finish" />
            )}
          </View>
        </View>
      </Screen>
    );
  }

  const simple = result && 'total' in result ? (result as SimpleResult) : null;
  const dass = result && !('total' in result) ? (result as DassResult) : null;

  return (
    <Screen back={() => router.replace('/assessments')} eyebrow={t(`assessments.tests.${test}.name`)} title={t('assessments.resultTitle')} width="reading" testID="screen-assessment-result">
      <View style={{ gap: space[5] }}>
        {simple?.safetyFlag ? (
          <Card tone="danger" padding={20} testID="assessment-safety">
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Icon name="heart-circle-outline" size={26} color="onDangerSoft" />
              <View style={{ flex: 1, gap: 6 }}>
                <AppText variant="title3" color="onDangerSoft">
                  {t('assessments.safetyTitle')}
                </AppText>
                <AppText variant="body" color="onDangerSoft">
                  {t('assessments.safetyBody')}
                </AppText>
                <Button label={t('assessments.safetyCta')} icon="call-outline" variant="primary" onPress={() => router.push('/safety')} style={{ marginTop: 6 }} />
              </View>
            </View>
          </Card>
        ) : null}

        <Card padding={22}>
          {simple ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }} testID="assessment-score" accessibilityLabel={t('assessments.scoreLabel', { score: simple.total, max: simple.max })}>
                <AppText variant="display">{simple.total}</AppText>
                <AppText variant="callout" color="textTertiary">
                  / {simple.max}
                </AppText>
              </View>
              <AppText variant="title3">{t(`assessments.bands.${simple.band}`)}</AppText>
              <ProgressBar value={simple.total / simple.max} />
            </View>
          ) : dass ? (
            <View style={{ gap: 14 }}>
              {(['depression', 'anxiety', 'stress'] as const).map((k) => (
                <View key={k} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="bodyStrong">{t(`assessments.tests.dass21.scales.${k}`)}</AppText>
                    <AppText variant="small" color="textSecondary">
                      {dass[k].score} · {t(`assessments.bands.${dass[k].band}`)}
                    </AppText>
                  </View>
                  <ProgressBar value={dass[k].score / 42} />
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        <Card tone="muted" padding={20}>
          <AppText variant="title3">{t('assessments.whatItMeans')}</AppText>
          <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
            {t(`assessments.meaning.${meaning}`)}
          </AppText>
          <AppText variant="title3" style={{ marginTop: space[4] }}>
            {t('assessments.nextSteps')}
          </AppText>
          <View style={{ gap: 8, marginTop: 6 }}>
            {tips.map((tip) => (
              <View key={tip} style={{ flexDirection: 'row', gap: 10 }}>
                <Icon name="checkmark" size={18} color="brand" />
                <AppText variant="small" style={{ flex: 1 }}>
                  {tip}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        <Banner tone="info" body={t('assessments.disclaimer')} />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button label={t('assessments.retake')} variant="secondary" icon="refresh" onPress={async () => { await clearDraft(); setAnswers(Array(n).fill(null)); setIndex(0); setResult(null); setStage('intro'); }} />
          <Button label={t('assessments.history')} variant="quiet" onPress={() => router.replace('/assessments')} />
        </View>
        <AppText variant="caption" color="textTertiary">
          {t(`assessments.tests.${test}.credit`)}
        </AppText>
      </View>
    </Screen>
  );
}
