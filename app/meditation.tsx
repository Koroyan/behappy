import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { MEDITATIONS, Meditation } from '@/content/meditations';
import { pickLocalized } from '@/content/types';
import { AppText, Badge, Button, Card, Icon, ProgressRing, Screen, space, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import { logMeditation } from '@/lib/storage/activity';

export default function MeditationScreen() {
  const { t, tp, language } = useT();
  const { colors } = useTheme();
  const { isCompact, width, sidebarWidth, gutter } = useLayout();
  const [active, setActive] = useState<Meditation | null>(null);
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(0);

  const steps = active ? pickLocalized(active.steps, language) : [];
  const stepSeconds = active ? Math.max(20, Math.round((active.minutes * 60) / steps.length)) : 60;

  useEffect(() => {
    if (!active || finished) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [active, finished, step]);

  const begin = (m: Meditation) => {
    setActive(m);
    setStep(0);
    setElapsed(0);
    setFinished(false);
    startedAt.current = Date.now();
  };

  const next = () => {
    if (!active) return;
    if (step + 1 < steps.length) {
      setStep(step + 1);
      setElapsed(0);
    } else {
      setFinished(true);
      logMeditation(active.id, Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)));
    }
  };

  if (active) {
    return (
      <Screen back={() => setActive(null)} title={pickLocalized(active.title, language)} subtitle={pickLocalized(active.instructions, language)} width="reading" testID="screen-meditation-player">
        <Card padding={isCompact ? 22 : 32} style={{ alignItems: 'center', gap: space[5] }}>
          {finished ? (
            <>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="checkmark" size={34} color="onPrimarySoft" />
              </View>
              <AppText variant="title2" align="center">
                {t('meditation.completeTitle')}
              </AppText>
              <AppText variant="body" color="textSecondary" align="center">
                {t('meditation.completeBody')}
              </AppText>
              <Button label={t('common.done')} onPress={() => setActive(null)} />
            </>
          ) : (
            <>
              <AppText variant="label" color="textTertiary">
                {t('meditation.stepOf', { current: step + 1, total: steps.length })}
              </AppText>
              <ProgressRing value={Math.min(1, elapsed / stepSeconds)} size={132} stroke={8}>
                <Icon name={active.icon as any} size={36} color="brand" />
              </ProgressRing>
              <AppText variant="title2" align="center" style={{ maxWidth: 460 }} accessibilityLiveRegion="polite">
                {steps[step]}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {step > 0 ? <Button label={t('common.previous')} variant="quiet" onPress={() => { setStep(step - 1); setElapsed(0); }} /> : null}
                <Button label={step + 1 < steps.length ? t('meditation.nextStep') : t('meditation.finish')} iconRight={step + 1 < steps.length ? 'arrow-forward' : 'checkmark'} onPress={next} testID="meditation-next" />
              </View>
            </>
          )}
        </Card>
      </Screen>
    );
  }

  const columns = isCompact ? 1 : width - sidebarWidth > 1000 ? 3 : 2;
  const tileWidth = (Math.min(width - sidebarWidth - gutter * 2, 1080) - space[4] * (columns - 1)) / columns;

  return (
    <Screen back title={t('meditation.title')} subtitle={t('meditation.subtitle')} testID="screen-meditation">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[4] }}>
        {MEDITATIONS.map((m, i) => (
          <Card key={m.id} padding={20} onPress={() => begin(m)} accessibilityLabel={pickLocalized(m.title, language)} style={{ width: columns === 1 ? '100%' : tileWidth }} tone={(['sage', 'lavender', 'primary', 'peach', 'gold', 'muted'] as const)[i % 6]} testID={`meditation-${m.id}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.icon as any} size={22} color="text" />
              </View>
              <Badge label={tp('common.minutes', m.minutes)} tone="muted" icon="time-outline" />
            </View>
            <AppText variant="title3" style={{ marginTop: space[4] }}>
              {pickLocalized(m.title, language)}
            </AppText>
            <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
              {pickLocalized(m.description, language)}
            </AppText>
            <AppText variant="caption" color="textTertiary" style={{ marginTop: space[3] }}>
              {pickLocalized(m.subtitle, language)} · {t(`meditation.levels.${m.level}`)}
            </AppText>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
