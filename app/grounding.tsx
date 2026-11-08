/**
 * /grounding — the 5-4-3-2-1 senses exercise for anxious or panicky moments.
 * No timers and no pressure: each tap marks one thing noticed, and "Next" is
 * always available.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Icon, IconName, Press, ProgressBar, Screen, space, useTheme } from '@/design';
import { useT } from '@/i18n';
import { logGrounding } from '@/lib/storage/activity';

const STEPS: { sense: 'see' | 'touch' | 'hear' | 'smell' | 'taste'; count: number; icon: IconName }[] = [
  { sense: 'see', count: 5, icon: 'eye-outline' },
  { sense: 'touch', count: 4, icon: 'hand-left-outline' },
  { sense: 'hear', count: 3, icon: 'ear-outline' },
  { sense: 'smell', count: 2, icon: 'flower-outline' },
  { sense: 'taste', count: 1, icon: 'water-outline' },
];

export default function GroundingScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  const [step, setStep] = useState(-1); // -1 intro, 0..4 steps, 5 done
  const [noticed, setNoticed] = useState(0);

  const go = (next: number) => {
    setStep(next);
    setNoticed(0);
    // All five senses done: this (not opening the screen) is a completed grounding.
    if (next === 5) logGrounding().catch(() => {});
  };

  let body: React.ReactNode;
  if (step < 0) {
    body = (
      <Card tone="sage" padding={24}>
        <AppText variant="body">{t('grounding.intro')}</AppText>
        <Button label={t('grounding.begin')} icon="play" onPress={() => go(0)} style={{ marginTop: space[5] }} testID="grounding-begin" />
      </Card>
    );
  } else if (step >= STEPS.length) {
    body = (
      <Card tone="primary" padding={24} testID="grounding-done">
        <AppText variant="title2">{t('grounding.completeTitle')}</AppText>
        <AppText variant="body" style={{ marginTop: space[2] }}>
          {t('grounding.completeBody')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space[5] }}>
          <Button label={t('grounding.again')} icon="refresh" variant="secondary" onPress={() => go(0)} />
          <Button label={t('grounding.toBreathing')} icon="leaf-outline" variant="outline" onPress={() => router.push('/breathing')} />
        </View>
      </Card>
    );
  } else {
    const s = STEPS[step];
    const full = noticed >= s.count;
    body = (
      <View style={{ gap: space[4] }}>
        <View style={{ gap: 8 }}>
          <AppText variant="caption" color="textSecondary">
            {t('grounding.step', { current: step + 1, total: STEPS.length })}
          </AppText>
          <ProgressBar value={step / STEPS.length} />
        </View>
        <Card padding={24} testID={`grounding-step-${s.sense}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={s.icon} size={28} color="onPrimarySoft" />
            </View>
            <AppText variant="display" color="primary">
              {s.count}
            </AppText>
          </View>
          <AppText variant="title2" style={{ marginTop: space[4] }}>
            {t(`grounding.steps.${s.sense}`)}
          </AppText>
          <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
            {t(`grounding.hints.${s.sense}`)}
          </AppText>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: space[5] }} accessibilityLabel={t('grounding.count', { count: noticed, total: s.count })}>
            {Array.from({ length: s.count }, (_, i) => (
              <View key={i} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: i < noticed ? colors.primary : colors.surfaceSunken, borderWidth: 1, borderColor: i < noticed ? colors.primary : colors.borderStrong }} />
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space[5] }}>
            <Press
              onPress={() => setNoticed((n) => Math.min(n + 1, s.count))}
              disabled={full}
              haptic
              accessibilityRole="button"
              accessibilityLabel={t('grounding.noticed')}
              testID="grounding-noticed"
              style={{ paddingHorizontal: 18, minHeight: 44, borderRadius: 999, justifyContent: 'center', backgroundColor: full ? colors.surfaceSunken : colors.primarySoft }}
            >
              <AppText variant="callout" color={full ? 'textTertiary' : 'onPrimarySoft'}>
                {t('grounding.noticed')} · {t('grounding.count', { count: noticed, total: s.count })}
              </AppText>
            </Press>
            <Button label={t('grounding.next')} iconRight="arrow-forward" variant={full ? 'primary' : 'outline'} onPress={() => go(step + 1)} testID="grounding-next" />
          </View>
        </Card>
        {step > 0 ? <Button label={t('common.previous')} variant="ghost" icon="chevron-back" onPress={() => go(step - 1)} style={{ alignSelf: 'flex-start' }} /> : null}
      </View>
    );
  }

  return (
    <Screen back title={t('grounding.title')} subtitle={t('grounding.subtitle')} width="reading" testID="screen-grounding">
      {body}
    </Screen>
  );
}
