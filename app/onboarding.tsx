import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnuliaMark, AppText, BrandMark, Button, Card, Chip, Icon, IconName, ProgressBar, space, TextField, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import { completeOnboarding } from '@/lib/onboarding';
import { setAiConsent } from '@/lib/privacy/consent';
import { getUserProfile, saveUserProfile } from '@/services/userProfileService';

const FOCUS = ['stress', 'anxiety', 'mood', 'sleep', 'relationships', 'selfworth', 'creativity', 'curiosity'] as const;
const BENEFIT_ICONS: IconName[] = ['chatbubble-ellipses-outline', 'color-palette-outline', 'leaf-outline'];

export default function Onboarding() {
  const router = useRouter();
  const { t, tl } = useT();
  const { colors } = useTheme();
  const { isCompact, gutter } = useLayout();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [focus, setFocus] = useState<string[]>([]);
  const [aiChoice, setAiChoice] = useState<boolean | null>(null);
  const total = 5;
  const benefits = tl('onboarding.benefits') as unknown as { title: string; body: string }[];

  const finish = async () => {
    if (name.trim()) {
      const existing = await getUserProfile();
      await saveUserProfile({
        name: name.trim(),
        gender: existing?.gender ?? 'prefer_not_to_say',
        age: existing?.age ?? 0,
        healthConditions: existing?.healthConditions,
        mainConcerns: existing?.mainConcerns,
      });
    }
    if (aiChoice) await setAiConsent(true);
    await completeOnboarding(focus);
    router.replace('/');
  };

  const next = () => (step < total - 1 ? setStep(step + 1) : finish());

  const body = [
    <View key="welcome" style={{ gap: space[6] }}>
      <BrandMark size={64} />
      <View style={{ gap: space[3] }}>
        <AppText variant="display">{t('onboarding.welcomeTitle')}</AppText>
        <AppText variant="body" color="textSecondary">
          {t('onboarding.welcomeBody')}
        </AppText>
      </View>
      <View style={{ gap: space[3] }}>
        {benefits.map((b, i) => (
          <Card key={b.title} tone={(['primary', 'peach', 'sage'] as const)[i]} padding={18}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Icon name={BENEFIT_ICONS[i]} size={22} color="text" />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="title3">{b.title}</AppText>
                <AppText variant="small" color="textSecondary">
                  {b.body}
                </AppText>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </View>,
    <View key="name" style={{ gap: space[5] }}>
      <AppText variant="title1">{t('onboarding.nameTitle')}</AppText>
      <AppText variant="body" color="textSecondary">
        {t('onboarding.nameBody')}
      </AppText>
      <TextField value={name} onChangeText={setName} placeholder={t('personal.namePlaceholder')} autoFocus autoComplete="given-name" returnKeyType="next" onSubmitEditing={next} testID="onboarding-name" />
    </View>,
    <View key="focus" style={{ gap: space[5] }}>
      <AppText variant="title1">{t('onboarding.focusTitle')}</AppText>
      <AppText variant="body" color="textSecondary">
        {t('onboarding.focusBody')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {FOCUS.map((f) => (
          <Chip key={f} label={t(`onboarding.focus.${f}`)} selected={focus.includes(f)} onPress={() => setFocus((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))} />
        ))}
      </View>
    </View>,
    <View key="ai" style={{ gap: space[5] }}>
      <AnuliaMark size={64} />
      <AppText variant="title1">{t('onboarding.aiTitle')}</AppText>
      <AppText variant="body" color="textSecondary">
        {t('onboarding.aiBody')}
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
      <View style={{ gap: 10 }}>
        <Button label={t('onboarding.aiEnable')} variant={aiChoice === true ? 'primary' : 'outline'} icon={aiChoice === true ? 'checkmark' : undefined} onPress={() => setAiChoice(true)} fullWidth testID="onboarding-ai-on" />
        <Button label={t('onboarding.aiLater')} variant={aiChoice === false ? 'secondary' : 'quiet'} onPress={() => setAiChoice(false)} fullWidth />
      </View>
    </View>,
    <View key="care" style={{ gap: space[5] }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="heart-circle-outline" size={34} color="onDangerSoft" />
      </View>
      <AppText variant="title1">{t('onboarding.careTitle')}</AppText>
      <AppText variant="body" color="textSecondary">
        {t('onboarding.careBody')}
      </AppText>
    </View>,
  ][step];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="screen-onboarding">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: gutter, paddingTop: insets.top + space[6], paddingBottom: space[6] }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', flex: 1, gap: space[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={(step + 1) / total} />
            </View>
            {step > 0 && step < total - 1 ? <Button label={t('common.skip')} variant="ghost" size="sm" onPress={next} /> : null}
          </View>
          <View style={{ flex: 1, justifyContent: isCompact ? 'flex-start' : 'center' }}>{body}</View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: gutter, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingTop: 8 }}>
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', flexDirection: 'row', gap: 10 }}>
          {step > 0 ? <Button label={t('common.back')} variant="quiet" onPress={() => setStep(step - 1)} /> : null}
          <Button label={step === 0 ? t('onboarding.begin') : step === total - 1 ? t('onboarding.finish') : t('common.continue')} onPress={next} style={{ flex: 1 }} fullWidth testID="onboarding-next" />
        </View>
      </View>
    </View>
  );
}
