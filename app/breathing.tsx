import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { BREATHING_PATTERNS, BreathingPattern } from '@/content/breathingPatterns';
import { pickLocalized } from '@/content/types';
import { AppText, Button, Card, Chip, Icon, Screen, space, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import { logBreathing } from '@/lib/storage/activity';

type Phase = 'inhale' | 'hold' | 'exhale' | 'pause';

const phasesOf = (p: BreathingPattern): { phase: Phase; seconds: number }[] =>
  [
    { phase: 'inhale' as Phase, seconds: p.inhale },
    { phase: 'hold' as Phase, seconds: p.hold },
    { phase: 'exhale' as Phase, seconds: p.exhale },
    { phase: 'pause' as Phase, seconds: p.pause },
  ].filter((x) => x.seconds > 0);

function Rhythm({ pattern }: { pattern: BreathingPattern }) {
  const { colors } = useTheme();
  const segs = phasesOf(pattern);
  const total = segs.reduce((s, x) => s + x.seconds, 0);
  const color: Record<Phase, string> = { inhale: colors.brand, hold: colors.gold, exhale: colors.lavender, pause: colors.sage };
  return (
    <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
      {segs.map((s, i) => (
        <View key={i} style={{ flex: s.seconds / total, backgroundColor: color[s.phase] }} />
      ))}
    </View>
  );
}

export default function BreathingScreen() {
  const { t, language } = useT();
  const { colors, reduceMotion } = useTheme();
  const { isCompact, width } = useLayout();
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [done, setDone] = useState(false);
  const scale = useRef(new Animated.Value(0.62)).current;
  const startedAt = useRef<number>(0);

  const pattern = BREATHING_PATTERNS[selected];
  const phases = phasesOf(pattern);
  const current = phases[phaseIdx];
  const size = Math.min(width - 80, isCompact ? 280 : 340);

  const animateFor = useCallback(
    (phase: Phase, seconds: number) => {
      if (reduceMotion) return;
      const to = phase === 'inhale' ? 1 : phase === 'exhale' ? 0.62 : undefined;
      if (to === undefined) return;
      Animated.timing(scale, { toValue: to, duration: seconds * 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }).start();
    },
    [scale, reduceMotion]
  );

  const start = () => {
    setRunning(true);
    setPaused(false);
    setDone(false);
    setPhaseIdx(0);
    setCycle(1);
    setLeft(phases[0].seconds);
    startedAt.current = Date.now();
    scale.setValue(0.62);
    animateFor(phases[0].phase, phases[0].seconds);
  };

  const stop = () => {
    setRunning(false);
    setPaused(false);
    scale.stopAnimation();
    Animated.timing(scale, { toValue: 0.62, duration: 400, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l > 1) return l - 1;
        // advance phase
        const nextIdx = phaseIdx + 1;
        if (nextIdx < phases.length) {
          setPhaseIdx(nextIdx);
          animateFor(phases[nextIdx].phase, phases[nextIdx].seconds);
          return phases[nextIdx].seconds;
        }
        if (cycle < pattern.cycles) {
          setCycle((c) => c + 1);
          setPhaseIdx(0);
          animateFor(phases[0].phase, phases[0].seconds);
          return phases[0].seconds;
        }
        setRunning(false);
        setDone(true);
        logBreathing(pattern.id, (Date.now() - startedAt.current) / 60000);
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, paused, phaseIdx, cycle, phases, pattern, animateFor]);

  const phaseLabel = running ? t(`breathing.phases.${current?.phase ?? 'inhale'}`) : done ? t('breathing.completeTitle') : t('breathing.phases.ready');

  return (
    <Screen back title={t('breathing.title')} subtitle={t('breathing.subtitle')} testID="screen-breathing">
      <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: space[6], alignItems: isCompact ? 'stretch' : 'flex-start' }}>
        <Card padding={isCompact ? 20 : 32} style={{ flex: isCompact ? undefined : 1.3, alignItems: 'center' }}>
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLiveRegion="polite" accessibilityLabel={`${phaseLabel} ${running ? left : ''}`}>
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, opacity: 0.55 }} />
            <Animated.View
              style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.sageSoft,
                borderWidth: 2,
                borderColor: colors.brand,
                transform: [{ scale: reduceMotion ? 0.82 : scale }],
              }}
            />
            <AppText variant="title1" align="center">
              {phaseLabel}
            </AppText>
            {running ? (
              <AppText variant="display" color="primary" align="center" style={{ marginTop: 6 }}>
                {left}
              </AppText>
            ) : null}
          </View>
          <AppText variant="small" color="textSecondary" style={{ marginTop: space[4] }}>
            {running || done ? t('breathing.cycle', { current: cycle, total: pattern.cycles }) : pickLocalized(pattern.description, language)}
          </AppText>
          {done ? (
            <AppText variant="body" color="textSecondary" align="center" style={{ marginTop: space[2] }}>
              {t('breathing.completeBody')}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: space[5], flexWrap: 'wrap', justifyContent: 'center' }}>
            {!running ? (
              <Button label={done ? t('breathing.again') : t('breathing.start')} icon="play" onPress={start} size="lg" testID="breathing-start" />
            ) : (
              <>
                <Button label={paused ? t('breathing.resume') : t('breathing.pause')} icon={paused ? 'play' : 'pause'} variant="secondary" onPress={() => setPaused((p) => !p)} />
                <Button label={t('breathing.stop')} icon="stop" variant="quiet" onPress={stop} testID="breathing-stop" />
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: space[4] }}>
            <Icon name="information-circle-outline" size={16} color="textTertiary" />
            <AppText variant="caption" color="textTertiary">
              {t('breathing.safetyNote')}
            </AppText>
          </View>
        </Card>

        <View style={{ flex: isCompact ? undefined : 1, gap: space[3] }}>
          <AppText variant="title3">{t('breathing.choose')}</AppText>
          {BREATHING_PATTERNS.map((p, i) => (
            <Card
              key={p.id}
              padding={18}
              tone={i === selected ? 'primary' : 'surface'}
              onPress={() => {
                if (running) stop();
                setSelected(i);
                setDone(false);
              }}
              accessibilityLabel={pickLocalized(p.name, language)}
              testID={`pattern-${p.id}`}
            >
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="bodyStrong">{pickLocalized(p.name, language)}</AppText>
                  {i === selected ? <Icon name="checkmark-circle" size={20} color="primary" /> : null}
                </View>
                <AppText variant="small" color="textSecondary">
                  {pickLocalized(p.description, language)}
                </AppText>
                <Rhythm pattern={p} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {pickLocalized(p.benefits, language).map((b) => (
                    <Chip key={b} label={b} tone="sage" style={{ minHeight: 30, paddingHorizontal: 10 }} />
                  ))}
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}
