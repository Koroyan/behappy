import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';

import { AppText, Badge, Banner, Button, Card, Divider, Icon, Screen, SectionHeader, Skeleton, space, Toggle, useFeedback } from '@/design';
import { MembershipBadge } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api/client';
import { PENDING_ORDER_KEY } from '@/lib/api/payments';
import { MembershipState, membershipOverview, resumeMembership, startMembershipCheckout, stopMembership, updatePro } from '@/lib/api/pros';

const BLOCKED = ['verification_pending', 'rejected', 'suspended', 'verification_expired'];

export default function ProMembership() {
  const router = useRouter();
  const { t, tl, formatDate, formatPrice, language } = useT();
  const { confirm, toast } = useFeedback();
  const [m, setM] = useState<MembershipState | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    membershipOverview()
      .then(setM)
      .catch(() => setFailed(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!m) {
    return (
      <Screen back title={t('membership.title')} width="reading" testID="screen-pro-membership">
        {failed ? <Banner tone="warning" body={t('pro.whyNotListed.notVerified')} /> : <Skeleton height={220} radius={22} />}
      </Screen>
    );
  }

  const long = { day: 'numeric', month: 'long', year: 'numeric' } as const;
  const price = formatPrice(m.product.amountMinor, m.product.currency);
  const blocked = BLOCKED.includes(m.state);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const { order, checkoutUrl } = await startMembershipCheckout(language);
      await AsyncStorage.setItem(PENDING_ORDER_KEY, order.id);
      if (Platform.OS === 'web') {
        // Full-page redirect to Flitt's hosted TEST checkout. Access is granted
        // only after the server verifies the signed Flitt result.
        window.location.assign(checkoutUrl);
        return;
      }
      await WebBrowser.openAuthSessionAsync(checkoutUrl, 'behappy://checkout/result');
      router.replace(`/checkout/result?orderId=${encodeURIComponent(order.id)}`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      setError(code === 'verification_required' ? t('membership.verificationFirst') : t('checkout.errorCreate'));
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    const ok = await confirm({ title: t('membership.stopTitle'), body: t('membership.stopBody', { date: m.endsAt ? formatDate(m.endsAt, long) : '—' }), confirmLabel: t('membership.stop'), destructive: true });
    if (!ok) return;
    try {
      setM(await stopMembership());
    } catch {
      toast(t('common.errorBody'));
    }
  };

  const resume = async () => {
    try {
      setM(await resumeMembership());
    } catch {
      toast(t('common.errorBody'));
    }
  };

  const setReminders = async (v: boolean) => {
    setM({ ...m, remindersEnabled: v });
    try {
      await updatePro({ remindersEnabled: v });
    } catch {
      setM({ ...m, remindersEnabled: !v });
      toast(t('common.errorBody'));
    }
  };

  const statusLine =
    m.active && m.current?.kind === 'trial'
      ? t('membership.trialUntil', { date: formatDate(m.current.endsAt, long) })
      : m.active && m.endsAt
        ? t('membership.activeUntil', { date: formatDate(m.endsAt, long) })
        : m.endsAt
          ? t('membership.endedOn', { date: formatDate(m.endsAt, long) })
          : null;

  return (
    <Screen back title={t('membership.title')} width="reading" testID="screen-pro-membership">
      <View style={{ gap: space[5] }}>
        <Card tone="sage" padding={22}>
          <View style={{ gap: space[2] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <AppText variant="label" color="primary">
                {t('membership.plan')}
              </AppText>
              <MembershipBadge state={m.state} />
            </View>
            <AppText variant="title1">{t('membership.price', { price, days: m.product.durationDays })}</AppText>
            <AppText variant="bodyStrong" color="primary">
              {t('membership.commission')}
            </AppText>
            {statusLine ? (
              <AppText variant="body" testID="membership-status-line">
                {statusLine}
              </AppText>
            ) : null}
          </View>
        </Card>

        <Banner tone="test" title={t('common.test')} body={t('membership.testNotice')} />
        {blocked ? <Banner tone="info" body={t('membership.verificationFirst')} /> : null}
        {m.state === 'expired' ? <Banner tone="warning" body={t('membership.expiredInfo')} /> : null}
        {m.state === 'payment_failed' ? <Banner tone="warning" body={t('membership.paymentFailed')} /> : null}
        {m.state === 'not_started' ? <Banner tone="info" body={t('membership.notStarted')} /> : null}
        {m.trialRefused ? <Banner tone="info" body={t('membership.trialRefused')} /> : null}

        {!blocked ? (
          <View style={{ gap: 8 }}>
            {error ? <Banner tone="danger" body={error} /> : null}
            <Button label={m.endsAt ? t('membership.renew', { price }) : t('membership.start', { price })} icon="card-outline" onPress={pay} loading={busy} fullWidth testID="membership-pay" />
            <AppText variant="caption" color="textSecondary" align="center">
              {t('membership.renewNote', { days: m.product.durationDays })}
            </AppText>
          </View>
        ) : null}

        {m.active && !blocked ? (
          m.cancelledAt ? (
            <Card padding={16}>
              <View style={{ gap: 8 }}>
                <AppText variant="small" color="textSecondary">
                  {t('membership.stopBody', { date: m.endsAt ? formatDate(m.endsAt, long) : '—' })}
                </AppText>
                <Button label={t('membership.resume')} size="sm" variant="secondary" onPress={resume} testID="membership-resume" />
              </View>
            </Card>
          ) : (
            <Button label={t('membership.stop')} variant="ghost" size="sm" onPress={stop} testID="membership-stop" />
          )
        ) : null}

        <Card padding={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong">{t('membership.reminders')}</AppText>
              <AppText variant="caption" color="textSecondary">
                {t('membership.remindersHint')}
              </AppText>
            </View>
            <Toggle value={m.remindersEnabled} onValueChange={setReminders} label={t('membership.reminders')} testID="membership-reminders" />
          </View>
        </Card>

        {m.periods.length ? (
          <View>
            <SectionHeader title={t('membership.history')} />
            <Card padding={4}>
              {m.periods.map((p, i) => (
                <View key={p.id}>
                  {i ? <Divider /> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
                    <Icon name={p.kind === 'trial' ? 'gift-outline' : p.kind === 'grant' ? 'ribbon-outline' : 'card-outline'} size={20} color="textSecondary" />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{t(`membership.kinds.${p.kind}`)}</AppText>
                      <AppText variant="caption" color="textSecondary">
                        {formatDate(p.startsAt, { day: 'numeric', month: 'short', year: 'numeric' })} – {formatDate(p.endsAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </AppText>
                    </View>
                    {p.revokedAt ? <Badge label={t('membership.refunded')} tone="muted" /> : null}
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {m.orders?.length ? (
          <View>
            <SectionHeader title={t('membership.payments')} />
            <Card padding={4}>
              {m.orders.map((o, i) => {
                const receipt = ['approved', 'reversed', 'partially_reversed'].includes(o.status);
                return (
                  <View key={o.id}>
                    {i ? <Divider /> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong">{formatPrice(o.amountMinor, o.currency)}</AppText>
                        <AppText variant="caption" color="textSecondary">
                          {formatDate(o.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })} · {t(`purchases.status.${o.status}`)}
                        </AppText>
                      </View>
                      <Badge label={t('purchases.testLabel')} tone="gold" />
                      {receipt ? <Button label={t('membership.receipt')} size="sm" variant="quiet" onPress={() => router.push(`/pro/receipt/${o.id}` as any)} testID="membership-receipt" /> : null}
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          {tl('membership.terms').map((line, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
              <AppText variant="small" color="textTertiary">
                •
              </AppText>
              <AppText variant="small" color="textSecondary" style={{ flex: 1 }}>
                {line}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
