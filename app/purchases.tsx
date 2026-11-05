import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { AppText, Badge, Banner, Button, Card, Divider, EmptyState, Screen, SectionHeader, space, TextField, useFeedback } from '@/design';
import { useT } from '@/i18n';
import { restoreWithCode, useAccount } from '@/lib/api/account';
import { listOrders, Order } from '@/lib/api/payments';

export default function PurchasesScreen() {
  const { t, formatDate, formatPrice } = useT();
  const { toast } = useFeedback();
  const { account, refresh, offline } = useAccount();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(false);

  const load = useCallback(() => {
    listOrders()
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]));
  }, []);
  useFocusEffect(load);

  const copy = async () => {
    const value = account?.recoveryCode;
    if (!value) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(value).catch(() => {});
      toast(t('common.copied'));
    } else {
      Share.share({ message: value }).catch(() => {});
    }
  };

  const restore = async () => {
    setRestoring(true);
    setRestoreError(false);
    const ok = await restoreWithCode(code);
    setRestoring(false);
    if (ok) {
      toast(t('purchases.restored'));
      setCode('');
      await refresh();
      load();
    } else setRestoreError(true);
  };

  const statusTone = (s: Order['status']) => (s === 'approved' ? 'success' : s === 'declined' || s === 'error' ? 'danger' : 'muted');

  return (
    <Screen back title={t('purchases.title')} width="reading" keyboard testID="screen-purchases">
      <View style={{ gap: space[6] }}>
        {offline ? <Banner tone="warning" body={t('errors.network')} /> : null}
        <Card padding={8}>
          {orders && orders.length === 0 ? (
            <EmptyState icon="receipt-outline" title={t('purchases.empty')} />
          ) : (
            (orders ?? []).map((o, i) => (
              <View key={o.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }} testID="order-row">
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="callout">{o.productKind === 'art' ? t('pricing.artTitle') : t('pricing.passDays', { days: o.durationDays ?? 0 })}</AppText>
                    <AppText variant="caption" color="textTertiary">
                      {formatDate(o.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {o.maskedCard ? ` · ${o.maskedCard}` : ''}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <AppText variant="smallStrong">{formatPrice(o.amountMinor, o.currency)}</AppText>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Badge label={t(`purchases.status.${o.attemptDeclined ? 'declined' : o.status}`)} tone={statusTone(o.attemptDeclined ? 'declined' : o.status) as any} />
                      <Badge label={t('purchases.testLabel')} tone="gold" />
                    </View>
                  </View>
                </View>
                {i < (orders?.length ?? 0) - 1 ? <Divider /> : null}
              </View>
            ))
          )}
        </Card>
        <Button label={t('purchases.refresh')} variant="ghost" icon="refresh" onPress={load} />

        <Card padding={20}>
          <SectionHeader title={t('purchases.recoveryTitle')} subtitle={t('purchases.recoveryBody')} />
          {showCode && account?.recoveryCode ? (
            <View style={{ gap: space[3] }}>
              <AppText variant="title2" selectable style={{ letterSpacing: 1 }} testID="recovery-code">
                {account.recoveryCode}
              </AppText>
              <Button label={t('common.copy')} icon="copy-outline" variant="secondary" size="sm" onPress={copy} />
            </View>
          ) : (
            <Button label={t('purchases.showCode')} icon="key-outline" variant="secondary" onPress={() => setShowCode(true)} disabled={!account?.recoveryCode} />
          )}
        </Card>

        <Card padding={20}>
          <SectionHeader title={t('purchases.restoreTitle')} />
          <View style={{ gap: space[3] }}>
            <TextField value={code} onChangeText={setCode} placeholder={t('purchases.restorePlaceholder')} autoCapitalize="characters" autoCorrect={false} error={restoreError ? t('purchases.restoreFailed') : undefined} testID="restore-input" />
            <Button label={t('purchases.restore')} onPress={restore} loading={restoring} disabled={code.replace(/[^0-9a-z]/gi, '').length < 16} testID="restore-submit" />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
