/**
 * Calm now: three instant ways to settle — a guided minute of breathing,
 * grounding, or a dim, silent screen. No network, no AI, no account needed.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, View } from 'react-native';

import { AppText, Button, Card, Chip, Icon, IconName, Screen, space, useTheme } from '@/design';
import { useT } from '@/i18n';
import { recordEvent } from '@/lib/wellbeing/eventStore';

const IN_MS = 4000;
const OUT_MS = 6000;
const CYCLES = 6; // one minute

export default function CalmNowScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, reduceMotion } = useTheme();
  const [breathing, setBreathing] = useState(false);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [cycle, setCycle] = useState(0);
  const [done, setDone] = useState(false);
  const [silence, setSilence] = useState<number | null>(null);
  const [silenceLeft, setSilenceLeft] = useState(0);
  const [scale] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    if (!breathing) return;
    let alive = true;
    let i = 0;
    const begin = Date.now();
    const step = () => {
      if (!alive) return;
      if (i >= CYCLES * 2) {
        setBreathing(false);
        setDone(true);
        recordEvent('calm.used', begin, { kind: 'breathe', minutes: 1 }).catch(() => {});
        return;
      }
      const inhale = i % 2 === 0;
      setPhase(inhale ? 'in' : 'out');
      setCycle(Math.floor(i / 2) + 1);
      Animated.timing(scale, { toValue: inhale ? 1 : 0.6, duration: reduceMotion ? 0 : inhale ? IN_MS : OUT_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
      i += 1;
      setTimeout(step, inhale ? IN_MS : OUT_MS);
    };
    step();
    return () => {
      alive = false;
    };
  }, [breathing, reduceMotion, scale]);

  useEffect(() => {
    if (silence === null) return;
    const end = Date.now() + silence * 60000;
    const id = setInterval(() => {
      const left = end - Date.now();
      setSilenceLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(id);
        recordEvent('calm.used', end - silence * 60000, { kind: 'silence', minutes: silence }).catch(() => {});
        setSilence(null);
        setDone(true);
      }
    }, 500);
    return () => clearInterval(id);
  }, [silence]);

  const option = (icon: IconName, title: string, sub: string, onPress: () => void, testID: string) => (
    <Card padding={20} onPress={onPress} accessibilityLabel={title} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={24} color="onPrimarySoft" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="title3">{title}</AppText>
          <AppText variant="small" color="textSecondary">
            {sub}
          </AppText>
        </View>
      </View>
    </Card>
  );

  return (
    <Screen back title={t('wb.calm.title')} subtitle={t('wb.calm.subtitle')} width="reading" testID="screen-calm">
      {breathing ? (
        <Card tone="sage" padding={24} style={{ alignItems: 'center', gap: space[4] }} testID="calm-breathing">
          <Animated.View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: colors.surface, transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="title2">{phase === 'in' ? t('wb.calm.inhale') : t('wb.calm.exhale')}</AppText>
          </Animated.View>
          <AppText variant="caption" color="textSecondary">
            {cycle} / {CYCLES}
          </AppText>
          <Button label={t('wb.calm.end')} variant="quiet" onPress={() => setBreathing(false)} />
        </Card>
      ) : (
        <View style={{ gap: space[3] }}>
          {done ? (
            <Card tone="sage" padding={18} testID="calm-done">
              <AppText variant="body">{t('wb.calm.done')}</AppText>
            </Card>
          ) : null}
          {option('leaf-outline', t('wb.calm.breathe'), t('wb.calm.breatheSub'), () => {
            setDone(false);
            setBreathing(true);
          }, 'calm-breathe')}
          {option('hand-left-outline', t('wb.calm.ground'), t('wb.calm.groundSub'), () => router.push('/grounding'), 'calm-ground')}
          <Card padding={20} testID="calm-silence">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.lavenderSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="moon-outline" size={24} color="onLavenderSoft" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="title3">{t('wb.calm.silence')}</AppText>
                <AppText variant="small" color="textSecondary">
                  {t('wb.calm.silenceSub')}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: space[3] }}>
              {[1, 3, 5].map((n) => (
                <Chip key={n} label={t('wb.calm.silenceFor', { n })} onPress={() => setSilence(n)} testID={`calm-silence-${n}`} />
              ))}
            </View>
          </Card>
          <Button label={t('wb.calm.help')} icon="heart-outline" variant="ghost" onPress={() => router.push('/safety')} style={{ alignSelf: 'flex-start', marginTop: space[2] }} />
        </View>
      )}

      <Modal visible={silence !== null} transparent animationType="fade" onRequestClose={() => setSilence(null)} statusBarTranslucent>
        <Pressable onPress={() => setSilence(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={t('wb.sound.headache.undim')} testID="calm-silence-overlay">
          <AppText variant="title1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {`${Math.floor(silenceLeft / 60000)}:${String(Math.floor((silenceLeft % 60000) / 1000)).padStart(2, '0')}`}
          </AppText>
          <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
            {t('wb.sound.headache.undim')}
          </AppText>
        </Pressable>
      </Modal>
    </Screen>
  );
}
