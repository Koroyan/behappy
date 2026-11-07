import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';

import { AppLanguage, LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useLanguage } from '@/contexts/LanguageContext';
import { AppText, Avatar, Badge, Banner, Button, Card, Divider, Icon, ListRow, ProgressBar, Press, Screen, Segmented, SectionHeader, Sheet, space, TEXT_SCALES, Toggle, useFeedback, useLayout, useTheme } from '@/design';
import { MoreMenu } from '@/features/shell/MoreMenu';
import { useT } from '@/i18n';
import { AccountDeletionError, useAccount, useIdentity } from '@/lib/api/account';
import { saveAnalyticsChoice } from '@/lib/analytics';
import { setAiConsent, setPersonalize, useConsent } from '@/lib/privacy/consent';
import { deleteAllData, exportAllData } from '@/lib/storage/dataTools';
import { getUserProfile } from '@/services/userProfileService';

export default function ProfileScreen() {
  const router = useRouter();
  const { t, tl, formatDate } = useT();
  const { hasContextPanel, hasSideNav } = useLayout();
  const { language, setLanguage, restartNeededForDirection } = useLanguage();
  const theme = useTheme();
  const { me, entitlements, refresh, offline } = useAccount();
  const identity = useIdentity();
  const consent = useConsent();
  const { confirm, toast } = useFeedback();
  const [name, setName] = useState('');
  const [langOpen, setLangOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getUserProfile().then((p) => setName(p?.name ?? ''));
      refresh();
    }, [refresh])
  );

  const usage = me?.usage;
  const plusUntil = entitlements.plus.active && entitlements.plus.expiresAt ? formatDate(entitlements.plus.expiresAt, { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const onDelete = async () => {
    const ok = await confirm({ title: t('profile.deleteConfirmTitle'), body: t('profile.deleteConfirmBody'), confirmLabel: t('profile.deleteConfirmCta'), destructive: true });
    if (!ok) return;
    try {
      await deleteAllData();
    } catch (e) {
      const reason = e instanceof AccountDeletionError ? e.reason : 'server';
      if (reason !== 'not_signed_in') {
        // Nothing was deleted: say so plainly instead of pretending it worked.
        await confirm({ title: t('common.errorTitle'), body: t(reason === 'offline' ? 'profile.deleteFailedOffline' : 'profile.deleteFailedServer'), confirmLabel: t('common.gotIt'), notice: true });
        return;
      }
      const localOnly = await confirm({ title: t('profile.deleteNotSignedInTitle'), body: t('profile.deleteNotSignedInBody'), confirmLabel: t('profile.deleteNotSignedInCta'), destructive: true });
      if (!localOnly) return;
      await deleteAllData({ localOnly: true });
    }
    toast(t('profile.deleted'));
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setTimeout(() => window.location.assign('/'), 600);
    } else {
      router.replace('/onboarding');
    }
  };

  const onExport = async () => {
    try {
      await exportAllData();
      toast(t('profile.exported'));
    } catch {
      toast(t('errors.saveFailed'));
    }
  };

  const membership = (
    <Card padding={20} testID="profile-membership">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" color="textTertiary">
            {t('profile.membership')}
          </AppText>
          <AppText variant="title2">{entitlements.plus.active ? t('profile.plusPlan') : t('profile.freePlan')}</AppText>
          {plusUntil ? (
            <AppText variant="small" color="textSecondary">
              {t('profile.plusUntil', { date: plusUntil })}
            </AppText>
          ) : null}
        </View>
        {me?.payments?.mode === 'test' ? <Badge label={t('common.test')} tone="gold" icon="flask-outline" /> : null}
      </View>
      {entitlements.artProgram.owned ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space[3] }}>
          <Icon name="color-palette-outline" size={18} color="brand" />
          <AppText variant="small">{t('profile.artOwned')}</AppText>
        </View>
      ) : null}
      {usage ? (
        <View style={{ marginTop: space[4], gap: 6 }}>
          <AppText variant="small" color="textSecondary">
            {t('profile.usageAnulia', { used: usage.anulia.used, limit: usage.anulia.limit, period: t(`profile.period.${usage.anulia.period}`) })}
          </AppText>
          <ProgressBar value={usage.anulia.limit ? usage.anulia.used / usage.anulia.limit : 0} />
        </View>
      ) : offline ? (
        <AppText variant="caption" color="textTertiary" style={{ marginTop: space[3] }}>
          {t('errors.network')}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: space[4], flexWrap: 'wrap' }}>
        <Button label={entitlements.plus.active ? t('pricing.extend') : t('profile.seePlans')} size="sm" onPress={() => router.push('/pricing')} />
        <Button label={t('profile.purchases')} size="sm" variant="quiet" onPress={() => router.push('/purchases')} />
      </View>
    </Card>
  );

  const preferences = (
    <Card padding={20}>
      <SectionHeader title={t('profile.preferences')} />
      <ListRow icon="language-outline" iconTone="primary" title={t('profile.language')} value={LANGUAGE_NAMES[language]} onPress={() => setLangOpen(true)} testID="profile-language" />
      {restartNeededForDirection ? <Banner tone="info" body={t('profile.rtlRestart')} /> : null}
      <Divider />
      <View style={{ paddingVertical: 14, gap: 10 }}>
        <AppText variant="callout">{t('profile.theme')}</AppText>
        <Segmented
          label={t('profile.theme')}
          value={theme.preference}
          onChange={theme.setPreference}
          options={[
            { value: 'system', label: t('profile.themeOptions.system') },
            { value: 'light', label: t('profile.themeOptions.light') },
            { value: 'dark', label: t('profile.themeOptions.dark') },
          ]}
        />
      </View>
      <Divider />
      <View style={{ paddingVertical: 14, gap: 10 }}>
        <AppText variant="callout">{t('profile.textSize')}</AppText>
        <Segmented
          label={t('profile.textSize')}
          value={theme.textScale}
          onChange={theme.setTextScale}
          options={TEXT_SCALES.map((s, i) => ({ value: s, label: tl('profile.textSizeOptions')[i] }))}
        />
      </View>
      <Divider />
      <View style={{ paddingVertical: 14, gap: 10 }}>
        <AppText variant="callout">{t('profile.motion')}</AppText>
        <Segmented
          label={t('profile.motion')}
          value={theme.motionPreference}
          onChange={theme.setMotionPreference}
          options={[
            { value: 'system', label: t('profile.motionOptions.system') },
            { value: 'reduce', label: t('profile.motionOptions.reduce') },
            { value: 'full', label: t('profile.motionOptions.full') },
          ]}
        />
      </View>
    </Card>
  );

  const analyticsOn = (me?.identity as { analytics?: boolean } | undefined)?.analytics !== false;
  const [analyticsBusy, setAnalyticsBusy] = useState(false);
  const onAnalytics = async (on: boolean) => {
    setAnalyticsBusy(true);
    try {
      await saveAnalyticsChoice(on);
      await refresh();
      if (!on) toast(t('usageStats.offDone'));
    } catch {
      toast(t('common.errorBody'));
    } finally {
      setAnalyticsBusy(false);
    }
  };

  const privacy = (
    <Card padding={20}>
      <SectionHeader title={t('profile.privacy')} />
      <ListRow
        icon="sparkles-outline"
        iconTone="lavender"
        title={t('profile.aiConsent')}
        subtitle={consent.ai ? t('profile.aiConsentOn') : t('profile.aiConsentOff')}
        right={<Toggle value={consent.ai} onValueChange={(v) => setAiConsent(v)} label={t('profile.aiConsent')} testID="toggle-ai" />}
      />
      <Divider />
      <ListRow
        icon="person-outline"
        iconTone="sage"
        title={t('profile.personalization')}
        subtitle={t('profile.personalizationHint')}
        right={<Toggle value={consent.personalize} onValueChange={(v) => setPersonalize(v)} label={t('profile.personalization')} />}
      />
      <Divider />
      <ListRow
        icon="analytics-outline"
        iconTone="muted"
        title={t('usageStats.title')}
        subtitle={analyticsOn ? t('usageStats.on') : t('usageStats.off')}
        right={<Toggle value={analyticsOn} onValueChange={(v) => !analyticsBusy && onAnalytics(v)} label={t('usageStats.title')} testID="toggle-analytics" />}
      />
      <Divider />
      <ListRow icon="download-outline" iconTone="muted" title={t('profile.exportData')} subtitle={t('profile.exportHint')} onPress={onExport} />
      <Divider />
      <ListRow icon="trash-outline" iconTone="danger" title={t('profile.deleteData')} subtitle={t('profile.deleteHint')} onPress={onDelete} destructive testID="profile-delete" />
    </Card>
  );

  const support = (
    <Card padding={20}>
      <SectionHeader title={t('profile.support')} />
      <ListRow icon="heart-circle-outline" iconTone="danger" title={t('safety.title')} onPress={() => router.push('/safety')} />
      <Divider />
      <ListRow icon="chatbox-ellipses-outline" title={t('help.title')} onPress={() => router.push('/support' as any)} testID="profile-support" />
      <Divider />
      <ListRow icon="information-circle-outline" title={t('about.title')} onPress={() => router.push('/about')} />
      <Divider />
      <ListRow icon="flag-outline" iconTone="gold" title={t('goals.title')} onPress={() => router.push('/goals')} />
      <AppText variant="caption" color="textTertiary" style={{ marginTop: space[3] }}>
        {t('profile.version', { version: Constants.expoConfig?.version ?? '2.0' })}
      </AppText>
    </Card>
  );

  return (
    <Screen tab title={t('profile.title')} testID="screen-profile" aside={<>{membership}{support}</>} asideOnNarrow="hidden">
      <View style={{ gap: space[5] }}>
        <Press onPress={() => router.push('/profile/personal')} accessibilityLabel={t('profile.personal')} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }} testID="profile-personal">
          <Avatar name={name} size={64} />
          <View style={{ flex: 1 }}>
            <AppText variant="title2">{name || t('profile.guest')}</AppText>
            <AppText variant="small" color="textSecondary">
              {t('profile.personalHint')}
            </AppText>
          </View>
          <Icon name="chevron-forward" size={18} color="textTertiary" />
        </Press>
        <Card padding={6} testID="profile-account">
          <View style={{ paddingHorizontal: 14 }}>
            <ListRow
              icon={identity.registered ? 'person-circle-outline' : 'person-add-outline'}
              iconTone={identity.registered ? 'primary' : 'lavender'}
              title={t('account.title')}
              subtitle={identity.registered ? t('account.signedInAs', { email: identity.email || '' }) : t('account.anonymousTitle')}
              onPress={() => router.push('/account' as any)}
            />
          </View>
        </Card>
        {!hasSideNav ? <MoreMenu /> : null}
        {!hasContextPanel ? membership : null}
        {preferences}
        {privacy}
        {!hasContextPanel ? support : null}
      </View>

      <Sheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('profile.language')}>
        <View style={{ gap: 4, paddingBottom: space[4] }}>
          {SUPPORTED_LANGUAGES.map((l: AppLanguage) => (
            <Press
              key={l}
              onPress={() => {
                setLanguage(l);
                setLangOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: l === language }}
              testID={`lang-${l}`}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: l === language ? theme.colors.primarySoft : 'transparent' }}
            >
              <AppText variant="callout">{LANGUAGE_NAMES[l]}</AppText>
              {l === language ? <Icon name="checkmark" size={18} color="onPrimarySoft" /> : null}
            </Press>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
