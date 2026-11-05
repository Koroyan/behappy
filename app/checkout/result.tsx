import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText, Badge, Button, Card, Icon, IconName, Screen, space, useTheme } from '@/design';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';
import { FINAL_ORDER_STATUSES, getOrder, Order, PENDING_ORDER_KEY } from '@/lib/api/payments';

const POLL_MS = 2500;
const MAX_WAIT_MS = 3 * 60 * 1000;

/** Shows only what the server verified with Flitt. URL flags are ignored. */
export default function CheckoutResult() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const router = useRouter();
  const { t, formatDate, formatPrice } = useT();
  const { colors } = useTheme();
  const { refresh, entitlements } = useAccount();
  const [order, setOrder] = useState<Order | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [missing, setMissing] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      const orderId = params.orderId || (await AsyncStorage.getItem(PENDING_ORDER_KEY));
      if (!orderId) {
        setMissing(true);
        return;
      }
      const poll = async () => {
        try {
          const res = await getOrder(orderId);
          if (!alive) return;
          setOrder(res.order);
          if (FINAL_ORDER_STATUSES.includes(res.order.status)) {
            await AsyncStorage.removeItem(PENDING_ORDER_KEY);
            refresh();
            return;
          }
        } catch {
          // keep polling: the server may be momentarily unreachable
        }
        if (Date.now() - started.current > MAX_WAIT_MS) {
          setTimedOut(true);
          return;
        }
        timer = setTimeout(poll, POLL_MS);
      };
      poll();
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [params.orderId, refresh]);

  const status = order?.status;
  const view: { icon: IconName; tone: string; title: string; body: string } =
    status === 'approved'
      ? {
          icon: 'checkmark-circle',
          tone: colors.success,
          title: t('checkout.result.approvedTitle'),
          body:
            order?.productKind === 'plus'
              ? t('checkout.result.approvedPlus', { date: entitlements.plus.expiresAt ? formatDate(entitlements.plus.expiresAt, { day: 'numeric', month: 'long', year: 'numeric' }) : '…' })
              : t('checkout.result.approvedArt'),
        }
      : status === 'declined' || order?.attemptDeclined
        ? { icon: 'close-circle-outline', tone: colors.danger, title: t('checkout.result.declinedTitle'), body: t('checkout.result.declinedBody') }
        : status === 'expired'
          ? { icon: 'time-outline', tone: colors.textSecondary, title: t('checkout.result.expiredTitle'), body: t('checkout.result.expiredBody') }
          : status === 'reversed' || status === 'partially_reversed'
            ? { icon: 'return-down-back-outline', tone: colors.textSecondary, title: t('checkout.result.reversedTitle'), body: t('checkout.result.reversedBody') }
            : status === 'error' || missing
              ? { icon: 'alert-circle-outline', tone: colors.danger, title: t('checkout.result.errorTitle'), body: t('checkout.result.errorBody') }
              : timedOut
                ? { icon: 'hourglass-outline', tone: colors.textSecondary, title: t('checkout.result.pendingTitle'), body: t('checkout.result.pendingBody') }
                : { icon: 'sync-outline', tone: colors.brand, title: t('checkout.result.checking'), body: t('checkout.result.checkingBody') };

  const waiting = !status || (!FINAL_ORDER_STATUSES.includes(status) && !order?.attemptDeclined && !timedOut && !missing);

  return (
    <Screen width="reading" title={undefined} testID="screen-checkout-result">
      <Card padding={28} style={{ alignItems: 'center', gap: space[4], marginTop: space[8] }}>
        {waiting ? <ActivityIndicator size="large" color={colors.brand} /> : <Icon name={view.icon} size={56} color={view.tone} />}
        <AppText variant="title1" align="center" testID="checkout-result-title">
          {view.title}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          {view.body}
        </AppText>
        {order ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Badge label={t('purchases.testLabel')} tone="gold" icon="flask-outline" />
            <AppText variant="caption" color="textTertiary">
              {formatPrice(order.amountMinor, order.currency)} · {order.id}
            </AppText>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: space[2] }}>
          {status === 'approved' ? (
            <Button label={t('checkout.result.continue')} onPress={() => router.replace(order?.productKind === 'art' ? '/art' : '/')} testID="checkout-continue" />
          ) : status === 'declined' || status === 'expired' || order?.attemptDeclined ? (
            <Button label={t('checkout.result.tryAgain')} onPress={() => router.replace('/pricing')} />
          ) : null}
          <Button label={t('checkout.result.viewPurchases')} variant="quiet" onPress={() => router.replace('/purchases')} />
        </View>
      </Card>
    </Screen>
  );
}
