import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText, Badge, Button, Card, Icon, IconName, Screen, space, useTheme } from '@/design';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';
import { FINAL_ORDER_STATUSES, getOrder, getOrderReceipt, Order, PENDING_ORDER_KEY } from '@/lib/api/payments';

const POLL_MS = 2500;
const MAX_WAIT_MS = 3 * 60 * 1000;

/**
 * Shows only what the server verified with Flitt. URL flags are ignored.
 *
 * Opened somewhere the app isn't signed in (on iPhone, the browser sheet an
 * installed web app shows Flitt in: no pending order in this window's storage),
 * it reads the order's status with the receipt from the return link and says
 * to close the window: the app itself notices the payment (PendingPaymentWatcher).
 */
export default function CheckoutResult() {
  const params = useLocalSearchParams<{ orderId?: string; r?: string }>();
  const router = useRouter();
  const { t, formatDate, formatPrice } = useT();
  const { colors } = useTheme();
  const { refresh, entitlements } = useAccount();
  const [order, setOrder] = useState<Order | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [missing, setMissing] = useState(false);
  const [elsewhere, setElsewhere] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      const pending = await AsyncStorage.getItem(PENDING_ORDER_KEY);
      const orderId = params.orderId || pending;
      if (!orderId) {
        setMissing(true);
        return;
      }
      // Not this window's order, but a signed return link: status only, no account.
      const viaReceipt = Boolean(params.r) && pending !== orderId;
      if (viaReceipt) setElsewhere(true);
      const poll = async () => {
        try {
          if (viaReceipt) {
            const r = await getOrderReceipt(orderId, String(params.r));
            if (!alive) return;
            setOrder({ id: orderId, status: r.status, productKind: r.productKind, attemptDeclined: r.attemptDeclined } as Order);
            if (FINAL_ORDER_STATUSES.includes(r.status)) return;
          } else {
            const res = await getOrder(orderId);
            if (!alive) return;
            setOrder(res.order);
            if (FINAL_ORDER_STATUSES.includes(res.order.status)) {
              await AsyncStorage.removeItem(PENDING_ORDER_KEY);
              refresh();
              return;
            }
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
  }, [params.orderId, params.r, refresh]);

  const status = order?.status;
  const view: { icon: IconName; tone: string; title: string; body: string } =
    status === 'approved'
      ? {
          icon: 'checkmark-circle',
          tone: colors.success,
          title: t('checkout.result.approvedTitle'),
          body:
            order?.productKind === 'professional'
              ? t('membership.checkoutApproved')
              : order?.productKind === 'plus'
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

  const pro = order?.productKind === 'professional';
  const waiting = !status || (!FINAL_ORDER_STATUSES.includes(status) && !order?.attemptDeclined && !timedOut && !missing);

  return (
    <Screen width="reading" title={undefined} testID="screen-checkout-result">
      <Card padding={28} style={{ alignItems: 'center', gap: space[4], marginTop: space[8] }}>
        {waiting ? <ActivityIndicator size="large" color={colors.brand} /> : <Icon name={view.icon} size={56} color={view.tone} />}
        <AppText variant="title1" align="center" testID="checkout-result-title">
          {view.title}
        </AppText>
        {/* In Flitt's window (no account here) the end date isn't known: the hint below says what to do. */}
        {elsewhere && status === 'approved' ? null : (
          <AppText variant="body" color="textSecondary" align="center">
            {view.body}
          </AppText>
        )}
        {elsewhere ? (
          <AppText variant="small" color="textSecondary" align="center" testID="checkout-result-elsewhere">
            {t('pwa.payment.returnHint')}
          </AppText>
        ) : null}
        {order && !elsewhere ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Badge label={t('purchases.testLabel')} tone="gold" icon="flask-outline" />
            <AppText variant="caption" color="textTertiary">
              {formatPrice(order.amountMinor, order.currency)} · {order.id}
            </AppText>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: space[2], display: elsewhere ? 'none' : 'flex' }}>
          {status === 'approved' ? (
            <Button label={t('checkout.result.continue')} onPress={() => router.replace(pro ? ('/pro/membership' as any) : order?.productKind === 'art' ? '/art' : '/')} testID="checkout-continue" />
          ) : status === 'declined' || status === 'expired' || order?.attemptDeclined ? (
            <Button label={t('checkout.result.tryAgain')} onPress={() => router.replace(pro ? ('/pro/membership' as any) : '/pricing')} />
          ) : null}
          <Button label={pro ? t('membership.backToMembership') : t('checkout.result.viewPurchases')} variant="quiet" onPress={() => router.replace(pro ? ('/pro/membership' as any) : '/purchases')} />
        </View>
      </Card>
    </Screen>
  );
}
