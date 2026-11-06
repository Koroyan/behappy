import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import { AppText, Badge, Banner, Button, Card, Divider, EmptyState, Screen, SectionHeader, Sheet, Skeleton, space, useFeedback } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { InfoRow, ProAvatar, VerifiedBadge } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { useIdentity } from '@/lib/api/account';
import { getPro, PublicPro, startThread } from '@/lib/api/pros';

export default function SpecialistProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, tp, formatDate, formatPrice } = useT();
  const identity = useIdentity();
  const { toast } = useFeedback();
  const [pro, setPro] = useState<PublicPro | null | undefined>(undefined);
  const [verifiedOpen, setVerifiedOpen] = useState(false);
  const [gate, setGate] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getPro(String(id))
        .then(setPro)
        .catch(() => setPro(null));
    }, [id])
  );

  if (pro === undefined) {
    return (
      <Screen back width="reading" testID="screen-specialist">
        <View style={{ gap: 12 }}>
          <Skeleton height={80} radius={40} width={80} />
          <Skeleton height={28} />
          <Skeleton height={120} radius={22} />
        </View>
      </Screen>
    );
  }
  if (!pro) {
    return (
      <Screen back width="reading" testID="screen-specialist">
        <EmptyState icon="person-outline" title={t('specialists.profile.notFound')} action={<Button label={t('specialists.title')} onPress={() => router.replace('/specialists' as any)} />} />
      </Screen>
    );
  }

  const name = pro.publicName;
  const message = async () => {
    if (!identity.registered) return setGate(true);
    try {
      const th = await startThread(pro.id);
      router.push(`/messages/${th.id}` as any);
    } catch {
      toast(t('common.errorBody'));
    }
  };

  const aside = (
    <Card padding={20}>
      <View style={{ gap: space[3] }}>
        {pro.priceFromMinor !== null ? <AppText variant="title2">{t('specialists.from', { price: formatPrice(pro.priceFromMinor, pro.currency) })}</AppText> : null}
        {pro.listed === false ? <Banner tone="warning" body={t('specialists.profile.notListed')} /> : null}
        <Button label={t('specialists.profile.book')} icon="calendar-outline" fullWidth disabled={pro.listed === false} onPress={() => (identity.registered ? router.push(`/specialists/${pro.id}/book` as any) : setGate(true))} testID="specialist-book" />
        <Button label={t('specialists.profile.message')} icon="mail-outline" variant="outline" fullWidth onPress={message} testID="specialist-message" />
        {gate && !identity.registered ? <AccountGate returnTo={`/specialists/${pro.id}`} /> : null}
      </View>
    </Card>
  );

  return (
    <Screen back aside={aside} asideOnNarrow="below" testID="screen-specialist">
      <View style={{ gap: space[5] }}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <ProAvatar name={name} photoUrl={pro.photoUrl} size={88} />
          <View style={{ flex: 1, gap: 6 }}>
            <AppText variant="title1">{name}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {pro.verified ? (
                <Button label={t('specialists.verified')} size="sm" variant="secondary" icon="shield-checkmark-outline" onPress={() => setVerifiedOpen(true)} testID="verified-info" />
              ) : null}
              <AppText variant="small" color="textSecondary">
                {[pro.city, pro.experienceYears !== null ? tp('specialists.profile.experience', pro.experienceYears) : null].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          </View>
        </View>

        <View>
          <SectionHeader title={t('specialists.profile.about')} />
          <AppText variant="body" selectable>
            {pro.bio}
          </AppText>
          {pro.practiceAreas ? (
            <AppText variant="body" color="textSecondary" style={{ marginTop: space[2] }} selectable>
              {pro.practiceAreas}
            </AppText>
          ) : null}
        </View>

        <View>
          <SectionHeader title={t('specialists.profile.focus')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {pro.specializations.map((s) => (
              <Badge key={s} label={t(`specialists.specializations.${s}`)} tone="primary" />
            ))}
          </View>
        </View>

        <Card padding={18}>
          <View style={{ gap: space[3] }}>
            <InfoRow icon="language-outline" label={t('specialists.profile.languages')} value={pro.languages.map((l) => LANGUAGE_NAMES[l as keyof typeof LANGUAGE_NAMES] || l).join(', ')} />
            <InfoRow icon="desktop-outline" label={t('specialists.format')} value={[pro.offersOnline ? t('specialists.online') : null, pro.offersInPerson ? t('specialists.inPerson') : null].filter(Boolean).join(', ')} />
            <InfoRow icon="time-outline" label={t('booking.when')} value={t('specialists.profile.timezone', { name, tz: pro.timezone })} />
          </View>
        </Card>

        <View>
          <SectionHeader title={t('specialists.profile.sessions')} />
          <Card padding={8}>
            {pro.services.map((s, i) => (
              <View key={s.id} style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                {i ? <Divider style={{ marginBottom: 12 }} /> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{s.title}</AppText>
                    <AppText variant="caption" color="textSecondary">
                      {tp('common.minutes', s.minutes)} · {s.mode === 'online' ? t('specialists.online') : t('specialists.inPerson')}
                    </AppText>
                  </View>
                  <AppText variant="bodyStrong">{formatPrice(s.priceMinor, s.currency)}</AppText>
                </View>
              </View>
            ))}
          </Card>
        </View>

        <Card tone="sage" padding={18}>
          <View style={{ gap: space[2] }}>
            <AppText variant="title3">{t('specialists.profile.paymentTitle')}</AppText>
            <AppText variant="small" color="textSecondary">
              {t('specialists.profile.paymentNote', { name })}
            </AppText>
            {pro.paymentArrangement ? <AppText variant="body">{pro.paymentArrangement}</AppText> : null}
            {pro.paymentMethods.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {pro.paymentMethods.map((m) => (
                  <Badge key={m} label={t(`specialists.paymentMethods.${m}`)} tone="muted" />
                ))}
              </View>
            ) : null}
          </View>
        </Card>

        <View>
          <SectionHeader title={t('specialists.profile.cancellationTitle')} subtitle={tp('specialists.profile.notice', pro.cancellationNoticeHours)} />
          {pro.cancellationPolicy ? <AppText variant="body">{pro.cancellationPolicy}</AppText> : null}
        </View>

        {pro.qualifications.length ? (
          <View>
            <SectionHeader title={t('specialists.profile.qualifications')} />
            <View style={{ gap: 8 }}>
              {pro.qualifications.map((q, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <VerifiedBadge />
                  <AppText variant="small" style={{ flex: 1 }}>
                    {[q.title, q.institution, q.year].filter(Boolean).join(' · ')}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <AppText variant="caption" color="textTertiary">
          {t('specialists.disclaimer')}
        </AppText>
      </View>

      <Sheet visible={verifiedOpen} onClose={() => setVerifiedOpen(false)} title={t('specialists.profile.verifiedTitle')}>
        <AppText variant="body" color="textSecondary">
          {t('specialists.profile.verifiedBody')}
        </AppText>
        <View style={{ gap: 4, marginTop: space[3], paddingBottom: space[4] }}>
          {pro.verifiedAt ? <AppText variant="small">{t('specialists.profile.verifiedSince', { date: formatDate(pro.verifiedAt, { day: 'numeric', month: 'long', year: 'numeric' }) })}</AppText> : null}
          {pro.verificationExpiresAt ? <AppText variant="small">{t('specialists.profile.verifiedUntil', { date: formatDate(pro.verificationExpiresAt, { day: 'numeric', month: 'long', year: 'numeric' }) })}</AppText> : null}
        </View>
      </Sheet>
    </Screen>
  );
}
