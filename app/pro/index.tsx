import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, Icon, Screen, SectionHeader, Skeleton, space, useFeedback, useLayout } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { BookingStatusBadge, MembershipBadge, VerificationBadge } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { useAccount, useIdentity } from '@/lib/api/account';
import { Booking, proBookings, proCatalog, ProCatalog, proMe, ProMe, setPublished, startApplication } from '@/lib/api/pros';

function JoinPage({ catalog, onApply, busy, hasDraft }: { catalog: ProCatalog | null; onApply: () => void; busy: boolean; hasDraft: boolean }) {
  const { t, tl, formatPrice } = useT();
  const identity = useIdentity();
  const m = catalog?.membership;
  return (
    <View style={{ gap: space[5] }}>
      <Card tone="sage" padding={24}>
        <View style={{ gap: space[3] }}>
          <AppText variant="label" color="primary">
            {t('pro.join.tagline')}
          </AppText>
          {m ? <AppText variant="display">{t('pro.join.price', { price: formatPrice(m.amountMinor, m.currency), days: m.durationDays })}</AppText> : <Skeleton height={44} />}
          {m?.trialDays ? <AppText variant="bodyStrong">{t('pro.join.trial', { days: m.trialDays })}</AppText> : null}
          <AppText variant="bodyStrong" color="primary">
            {t('pro.join.noCommission')}
          </AppText>
          {identity.registered ? (
            <Button label={hasDraft ? t('pro.join.continue') : t('pro.join.apply')} icon="briefcase-outline" onPress={onApply} loading={busy} testID="pro-apply" />
          ) : (
            <AccountGate returnTo="/pro" />
          )}
        </View>
      </Card>
      <View>
        <SectionHeader title={t('pro.join.included')} />
        <View style={{ gap: 10 }}>
          {tl('pro.join.items').map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name="checkmark-circle-outline" size={20} color="brand" />
              <AppText variant="body" style={{ flex: 1 }}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      </View>
      <View>
        <SectionHeader title={t('pro.join.steps')} />
        <View style={{ gap: 10 }}>
          {tl('pro.join.stepItems').map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4B9388' }}>
                <AppText variant="smallStrong" color="primary">
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="body" style={{ flex: 1 }}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      </View>
      <Banner tone="info" body={t('pro.join.verificationFirst')} />
      <AppText variant="small" color="textSecondary">
        {t('pro.join.honest')} {t('pro.join.renewal')}
      </AppText>
    </View>
  );
}

export default function ProHome() {
  const router = useRouter();
  const { t, tp, formatDate, formatTime } = useT();
  const { refresh } = useAccount();
  const identity = useIdentity();
  const { hasContextPanel } = useLayout();
  const { toast } = useFeedback();
  const [me, setMe] = useState<ProMe | null>(null);
  const [catalog, setCatalog] = useState<ProCatalog | null>(null);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    proCatalog().then(setCatalog).catch(() => {});
    if (!identity.registered) return setMe({ profile: null });
    try {
      const m = await proMe();
      setMe(m);
      if (m.profile) setUpcoming(await proBookings('upcoming').catch(() => []));
    } catch {
      setMe({ profile: null });
    }
  }, [identity.registered]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const apply = async () => {
    setBusy(true);
    try {
      await startApplication();
      await refresh();
      router.push('/pro/apply' as any);
    } catch {
      toast(t('common.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  if (!me) {
    return (
      <Screen back title={t('pro.title')} testID="screen-pro">
        <Skeleton height={200} radius={22} />
      </Screen>
    );
  }

  const p = me.profile;
  if (!p || p.status === 'draft') {
    return (
      <Screen back title={t('pro.join.title')} subtitle={t('pro.join.subtitle')} width="reading" testID="screen-pro-join">
        <JoinPage catalog={catalog} onApply={p ? () => router.push('/pro/apply' as any) : apply} busy={busy} hasDraft={Boolean(p)} />
      </Screen>
    );
  }

  const ms = me.membership!;
  const lastNote = p.events.find((e) => e.actorKind === 'admin' && e.message);
  const today = upcoming.filter((b) => new Date(b.startsAt).toDateString() === new Date().toDateString());
  const reasons = [!p.verified ? 'notVerified' : null, p.verified && !p.published ? 'notPublished' : null, p.verified && !ms.active ? 'noMembership' : null].filter(Boolean) as string[];

  const statusCards = (
    <>
      <Card padding={18} testID="pro-verification">
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <AppText variant="label" color="textTertiary">
              {t('pro.reviewNote')}
            </AppText>
            <VerificationBadge status={p.status} />
          </View>
          <AppText variant="small" color="textSecondary">
            {t(`pro.statusBody.${p.status}`, { date: p.verificationExpiresAt ? formatDate(p.verificationExpiresAt, { day: 'numeric', month: 'long', year: 'numeric' }) : '' })}
          </AppText>
          {lastNote && ['more_info_required', 'rejected', 'suspended'].includes(p.status) ? (
            <Card tone="gold" padding={12}>
              <AppText variant="small">{lastNote.message}</AppText>
            </Card>
          ) : null}
          {['more_info_required', 'expired'].includes(p.status) ? <Button label={t('pro.editProfile')} size="sm" onPress={() => router.push('/pro/apply' as any)} /> : null}
        </View>
      </Card>
      <Card padding={18} testID="pro-membership-card">
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <AppText variant="label" color="textTertiary">
              {t('pro.membership')}
            </AppText>
            <MembershipBadge state={ms.state} />
          </View>
          {ms.endsAt && ms.active ? (
            <AppText variant="small" color="textSecondary">
              {t('pro.endsOn', { date: formatDate(ms.endsAt, { day: 'numeric', month: 'long' }) })} · {tp('pro.daysLeft', ms.daysLeft)}
            </AppText>
          ) : null}
          <Button label={t('pro.membership')} size="sm" variant="secondary" onPress={() => router.push('/pro/membership' as any)} testID="pro-open-membership" />
        </View>
      </Card>
      <Card padding={18}>
        <View style={{ gap: 8 }}>
          <AppText variant="bodyStrong">{me.listed ? t('pro.listed') : t('pro.notListed')}</AppText>
          {reasons.map((r) => (
            <AppText key={r} variant="small" color="textSecondary">
              {t(`pro.whyNotListed.${r}`)}
            </AppText>
          ))}
          {p.verified ? (
            <Button
              label={p.published ? t('pro.unpublish') : t('pro.publish')}
              size="sm"
              variant={p.published ? 'outline' : 'primary'}
              onPress={async () => {
                await setPublished(!p.published).catch(() => toast(t('common.errorBody')));
                load();
              }}
              testID="pro-publish"
            />
          ) : null}
          {me.listed ? <Button label={t('pro.viewPublic')} size="sm" variant="ghost" onPress={() => router.push(`/specialists/${p.id}` as any)} /> : null}
        </View>
      </Card>
    </>
  );

  return (
    <Screen back title={t('pro.title')} subtitle={p.publicName || undefined} aside={statusCards} asideOnNarrow="hidden" testID="screen-pro">
      <View style={{ gap: space[5] }}>
        {!hasContextPanel ? statusCards : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button label={t('pro.bookings')} icon="calendar-number-outline" variant="secondary" onPress={() => router.push('/pro/bookings' as any)} />
          <Button label={t('pro.editProfile')} icon="create-outline" variant="quiet" onPress={() => router.push('/pro/apply' as any)} />
          <Button label={t('pro.inbox')} icon="mail-outline" variant="quiet" onPress={() => router.push('/messages' as any)} />
        </View>

        {me.counts?.requests ? <Banner tone="info" body={tp('pro.requests', me.counts.requests)} action={<Button label={t('pro.bookings')} size="sm" variant="secondary" onPress={() => router.push('/pro/bookings' as any)} />} /> : null}

        <View>
          <SectionHeader title={t('pro.today')} />
          {today.length ? (
            today.map((b) => (
              <Card key={b.id} padding={14} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <AppText variant="bodyStrong">
                    {formatTime(b.startsAt)} · {b.clientName}
                  </AppText>
                  <BookingStatusBadge status={b.status} />
                </View>
              </Card>
            ))
          ) : (
            <AppText variant="small" color="textSecondary">
              {t('pro.noToday')}
            </AppText>
          )}
        </View>

        <View>
          <SectionHeader title={t('pro.upcoming')} actionLabel={t('common.seeAll')} onAction={() => router.push('/pro/bookings' as any)} />
          {upcoming.slice(0, 5).map((b) => (
            <Card key={b.id} padding={14} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <AppText variant="body" style={{ flex: 1 }}>
                  {formatDate(b.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })} {formatTime(b.startsAt)} · {b.clientName}
                </AppText>
                <BookingStatusBadge status={b.status} />
              </View>
            </Card>
          ))}
        </View>

        {me.stats ? (
          <View>
            <SectionHeader title={t('pro.stats')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                [t('pro.views'), me.stats.views],
                [t('pro.bookingRequests'), me.stats.requests],
                [t('pro.inquiries'), me.stats.inquiries],
              ].map(([label, value]) => (
                <Card key={String(label)} padding={16} style={{ flexGrow: 1, flexBasis: 150 }}>
                  <AppText variant="title1">{String(value)}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {label}
                  </AppText>
                </Card>
              ))}
            </View>
            <AppText variant="caption" color="textTertiary" style={{ marginTop: 8 }}>
              {t('pro.noIncome')}
            </AppText>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
