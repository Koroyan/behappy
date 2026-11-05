/**
 * /quiz — ad-landing self-reflection check-in (not a clinical instrument).
 * Content: content/quiz.ts (pre-2.0 copy, en/ka/ru). Flow: intro → 6 questions
 * → result with a gentle focus area and a next step. Email is asked only when
 * a lead endpoint is actually configured (EXPO_PUBLIC_LEAD_WEBHOOK_URL), with
 * honest wording; otherwise nothing is collected.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusTag, QUIZ_FOCUS, QUIZ_QUESTIONS, QUIZ_TEXT, QuizOption } from '@/content/quiz';
import { pickLocalized } from '@/content/types';
import { AppText, Banner, BrandMark, Button, Card, Icon, Press, ProgressBar, space, TextField, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';

type Phase = 'intro' | 'questions' | 'email' | 'result';
const LEAD_WEBHOOK = process.env.EXPO_PUBLIC_LEAD_WEBHOOK_URL;
const plus = (s: string) => s.replace(/Premium/g, 'Plus');

export default function QuizScreen() {
  const router = useRouter();
  const { t, language } = useT();
  const { colors } = useTheme();
  const { gutter, isCompact } = useLayout();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuizOption>>({});
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const L = (key: string) => plus(pickLocalized(QUIZ_TEXT[key] ?? { en: '' }, language));

  const { zone, focusTag } = useMemo(() => {
    const picked = Object.values(answers);
    if (!picked.length) return { zone: 'mid' as const, focusTag: 'mood' as FocusTag };
    const avg = picked.reduce((s, o) => s + o.weight, 0) / picked.length;
    const tally: Partial<Record<FocusTag, number>> = {};
    for (const o of picked) tally[o.tag] = (tally[o.tag] || 0) + o.weight;
    const top = (Object.entries(tally) as [FocusTag, number][]).sort((a, b) => b[1] - a[1])[0];
    return { zone: avg >= 67 ? ('high' as const) : avg >= 34 ? ('mid' as const) : ('low' as const), focusTag: top ? top[0] : ('mood' as FocusTag) };
  }, [answers]);

  const choose = (opt: QuizOption) => {
    const next = { ...answers, [index]: opt };
    setAnswers(next);
    if (index < QUIZ_QUESTIONS.length - 1) setIndex(index + 1);
    else {
      AsyncStorage.setItem('quiz:leadAnswers', JSON.stringify(Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v.id])))).catch(() => {});
      setPhase(LEAD_WEBHOOK ? 'email' : 'result');
    }
  };

  const submitEmail = async () => {
    const value = email.trim();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setEmailError(true);
      return;
    }
    if (value && LEAD_WEBHOOK) {
      await AsyncStorage.setItem('quiz:leadEmail', value).catch(() => {});
      fetch(LEAD_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value, focusTag, zone, source: 'quiz' }) }).catch(() => {});
    }
    setPhase('result');
  };

  const focus = QUIZ_FOCUS[focusTag];
  const zoneLabel = L(zone === 'high' ? 'scoreZoneHigh' : zone === 'mid' ? 'scoreZoneMid' : 'scoreZoneLow');

  let body: React.ReactNode = null;
  if (phase === 'intro') {
    body = (
      <View style={{ gap: space[6] }}>
        <BrandMark size={56} />
        <View style={{ gap: space[3] }}>
          <AppText variant="label" color="primary">
            {L('introKicker')}
          </AppText>
          <AppText variant="display">{L('introTitle')}</AppText>
          <AppText variant="body" color="textSecondary">
            {L('introSubtitle')}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[L('trustPrivate'), L('trustAnytime')].map((x) => (
            <View key={x} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Icon name="checkmark-circle-outline" size={16} color="brand" />
              <AppText variant="caption">{x}</AppText>
            </View>
          ))}
        </View>
        <Button label={L('introStart')} size="lg" iconRight="arrow-forward" onPress={() => setPhase('questions')} testID="quiz-start" />
        <AppText variant="caption" color="textTertiary">
          {L('introFootnote')}
        </AppText>
      </View>
    );
  } else if (phase === 'questions') {
    const q = QUIZ_QUESTIONS[index];
    body = (
      <View style={{ gap: space[5] }}>
        <View style={{ gap: 8 }}>
          <AppText variant="caption" color="textSecondary">
            {t('assessments.questionOf', { current: index + 1, total: QUIZ_QUESTIONS.length })}
          </AppText>
          <ProgressBar value={index / QUIZ_QUESTIONS.length} />
        </View>
        <AppText variant="title1">{pickLocalized(q.question, language)}</AppText>
        <View style={{ gap: 10 }}>
          {q.options.map((o) => {
            const selected = answers[index]?.id === o.id;
            return (
              <Press
                key={o.id}
                onPress={() => choose(o)}
                haptic
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                testID={`quiz-option-${o.id}`}
                style={{ minHeight: 56, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface, justifyContent: 'center' }}
              >
                <AppText variant="callout">{pickLocalized(o.label, language)}</AppText>
              </Press>
            );
          })}
        </View>
        {index > 0 ? <Button label={t('common.previous')} variant="ghost" icon="chevron-back" onPress={() => setIndex(index - 1)} /> : null}
      </View>
    );
  } else if (phase === 'email') {
    body = (
      <View style={{ gap: space[5] }}>
        <AppText variant="title1">{t('common.optional')}</AppText>
        <AppText variant="body" color="textSecondary">
          {t('brand.promise')}
        </AppText>
        <TextField value={email} onChangeText={(v) => { setEmail(v); setEmailError(false); }} placeholder={L('emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" error={emailError ? L('emailInvalid') : undefined} />
        <Button label={L('emailContinue')} onPress={submitEmail} fullWidth />
        <Button label={L('emailSkip')} variant="quiet" onPress={() => setPhase('result')} fullWidth />
      </View>
    );
  } else {
    body = (
      <View style={{ gap: space[5] }}>
        <AppText variant="label" color="primary">
          {L('resultsKicker')}
        </AppText>
        <AppText variant="display">{pickLocalized(focus.title, language)}</AppText>
        <AppText variant="body" color="textSecondary">
          {pickLocalized(focus.desc, language)}
        </AppText>
        <Card tone="muted" padding={18}>
          <AppText variant="caption" color="textTertiary">
            {L('scoreLabel')}
          </AppText>
          <AppText variant="title3" style={{ marginTop: 4 }}>
            {zoneLabel}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            {(['low', 'mid', 'high'] as const).map((z) => (
              <View key={z} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: z === zone ? colors.brand : colors.surfaceSunken }} />
            ))}
          </View>
        </Card>
        <Card tone="peach" padding={20}>
          <AppText variant="label" color="onPeachSoft">
            {L('recommendedTitle')}
          </AppText>
          <AppText variant="body" style={{ marginTop: 6 }}>
            {plus(pickLocalized(focus.feature, language))}
          </AppText>
        </Card>
        <Button label={L('freeCta')} size="lg" icon="color-palette-outline" onPress={() => router.replace('/art/1')} fullWidth testID="quiz-free-cta" />
        <AppText variant="caption" color="textTertiary" align="center">
          {L('freeCtaSub')}
        </AppText>
        <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: 10 }}>
          <Button label={t('today.anuliaStart')} variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.replace('/anulia')} style={{ flex: 1 }} fullWidth={isCompact} />
          <Button label={t('pricing.title')} variant="quiet" onPress={() => router.push('/pricing')} style={{ flex: 1 }} fullWidth={isCompact} />
        </View>
        <Banner tone="info" body={L('introFootnote')} action={<Button label={t('safety.title')} size="sm" variant="ghost" onPress={() => router.push('/safety')} />} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="screen-quiz">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: gutter, paddingTop: insets.top + space[8], paddingBottom: Math.max(insets.bottom, 16) + space[6] }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>{body}</View>
      </ScrollView>
    </View>
  );
}
