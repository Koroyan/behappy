/**
 * First launch: one question — "What would you like help with today?" — and
 * each answer leads straight to something useful (a guided minute of
 * breathing, a sleep wind-down, Bea, a habits program, verified
 * psychologists, or just Today). No account, no name, no permissions here:
 * the name is optional later (Profile), AI consent is asked only for Bea and
 * only on her screen, usage statistics after the first activity, notifications
 * when a reminder is turned on.
 *
 * Resumable: closing the app before choosing shows this screen again; after
 * choosing, Today offers to continue where the person left off. People who
 * finished the earlier onboarding (or used BeHappy before 2.0) never see it.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnuliaMark, AppText, BrandMark, Button, Card, Icon, IconName, Press, space, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import { chooseStartGoal, noteWelcomeExit, noteWelcomeSeen, START_GOALS, StartGoal } from '@/lib/onboarding';
import { setAiConsent } from '@/lib/privacy/consent';

const META: Record<StartGoal, { icon: IconName; tone: 'sage' | 'lavender' | 'primary' | 'gold' | 'peach' | 'muted' }> = {
  stress: { icon: 'water-outline', tone: 'sage' },
  sleep: { icon: 'moon-outline', tone: 'lavender' },
  bea: { icon: 'chatbubble-ellipses-outline', tone: 'primary' },
  wellbeing: { icon: 'sunny-outline', tone: 'gold' },
  psychologist: { icon: 'medkit-outline', tone: 'peach' },
  explore: { icon: 'compass-outline', tone: 'muted' },
};

/** Fades and lifts in; instant when the person prefers reduced motion. */
function useEntrance(reduceMotion: boolean, delay = 0) {
  const [v] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduceMotion, delay, v]);
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };
}

export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const { t, tl } = useT();
  const { colors, reduceMotion } = useTheme();
  const { isCompact, gutter, width } = useLayout();
  const insets = useSafeAreaInsets();
  // Bea's introduction: from the link (?step=bea) or right after choosing her.
  const [beaChosen, setBeaChosen] = useState(false);
  const step: 'welcome' | 'bea' = params.step === 'bea' || beaChosen ? 'bea' : 'welcome';
  const [busy, setBusy] = useState<StartGoal | null>(null);
  const chose = useRef(false);
  const head = useEntrance(reduceMotion);
  const list = useEntrance(reduceMotion, 120);

  // "Started" and "left without choosing" (anonymous counts, only with the person's permission).
  useEffect(() => {
    noteWelcomeSeen().catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && !chose.current) noteWelcomeExit().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const choose = async (goal: StartGoal) => {
    if (busy) return;
    setBusy(goal);
    chose.current = true;
    try {
      const route = await chooseStartGoal(goal);
      if (goal === 'bea') setBeaChosen(true);
      else router.replace(route as never);
    } finally {
      setBusy(null);
    }
  };

  const meetBea = async (agree: boolean) => {
    if (agree) {
      await setAiConsent(true);
      router.replace('/anulia' as never);
    } else {
      router.replace('/' as never);
    }
  };

  const twoColumns = !isCompact && width >= 720;

  const welcome = (
    <View style={{ gap: space[6] }}>
      <Animated.View style={[{ gap: space[4] }, head]}>
        <BrandMark size={56} />
        <View style={{ gap: space[2] }}>
          <AppText variant="display" accessibilityRole="header">
            {t('jr.start.title')}
          </AppText>
          <AppText variant="body" color="textSecondary">
            {t('jr.start.subtitle')}
          </AppText>
        </View>
      </Animated.View>
      <Animated.View style={[{ flexDirection: twoColumns ? 'row' : 'column', flexWrap: 'wrap', gap: space[3] }, list]} accessibilityRole="radiogroup">
        {START_GOALS.map((g) => (
          <Press
            key={g}
            onPress={() => choose(g)}
            disabled={Boolean(busy)}
            accessibilityRole="button"
            accessibilityLabel={`${t(`jr.start.options.${g}.title`)}. ${t(`jr.start.options.${g}.hint`)}`}
            testID={`start-${g}`}
            feedback="scale"
            style={{
              flexBasis: twoColumns ? '48%' : undefined,
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 16,
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: busy === g ? colors.primary : colors.border,
              minHeight: 76,
            }}
          >
            <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors[META[g].tone === 'muted' ? 'surfaceMuted' : (`${META[g].tone}Soft` as 'sageSoft')], alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={META[g].icon} size={23} color="text" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong">{t(`jr.start.options.${g}.title`)}</AppText>
              <AppText variant="small" color="textSecondary">
                {t(`jr.start.options.${g}.hint`)}
              </AppText>
            </View>
            <Icon name="chevron-forward" size={18} color="textTertiary" />
          </Press>
        ))}
      </Animated.View>
      <View style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="lock-closed-outline" size={18} color="textSecondary" />
          <AppText variant="small" color="textSecondary" style={{ flex: 1 }}>
            {t('jr.start.privacy')}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="heart-circle-outline" size={18} color="onDangerSoft" />
          <AppText variant="small" color="textSecondary" style={{ flex: 1 }}>
            {t('jr.start.care')}{' '}
            <AppText variant="smallStrong" color="danger" onPress={() => router.push('/safety')} accessibilityRole="link" testID="start-help">
              {t('nav.needHelpNow')}
            </AppText>
          </AppText>
        </View>
      </View>
    </View>
  );

  const bea = (
    <View style={{ gap: space[5] }} testID="start-bea">
      <AnuliaMark size={64} />
      <View style={{ gap: space[2] }}>
        <AppText variant="title1" accessibilityRole="header">
          {t('jr.start.beaTitle')}
        </AppText>
        <AppText variant="body" color="textSecondary">
          {t('jr.start.beaBody')}
        </AppText>
      </View>
      <Card tone="muted" padding={16}>
        <AppText variant="smallStrong" style={{ marginBottom: space[2] }}>
          {t('consent.title')}
        </AppText>
        <View style={{ gap: 10 }}>
          {tl('consent.points').map((p) => (
            <View key={p} style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name="checkmark-circle-outline" size={20} color="brand" />
              <AppText variant="small" style={{ flex: 1 }}>
                {p}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
      <AppText variant="caption" color="textTertiary">
        {t('jr.start.beaNote')}
      </AppText>
      <View style={{ gap: 10 }}>
        <Button label={t('jr.start.beaAgree')} onPress={() => meetBea(true)} fullWidth testID="start-bea-agree" />
        <Button label={t('jr.start.beaLater')} variant="quiet" onPress={() => meetBea(false)} fullWidth testID="start-bea-later" />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="screen-onboarding">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: gutter, paddingTop: insets.top + space[6], paddingBottom: Math.max(insets.bottom, 16) + space[6] }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: twoColumns ? 760 : 560, alignSelf: 'center', flex: 1, justifyContent: isCompact ? 'flex-start' : 'center' }}>{step === 'bea' ? bea : welcome}</View>
      </ScrollView>
    </View>
  );
}
