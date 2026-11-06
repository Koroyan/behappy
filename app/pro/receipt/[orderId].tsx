import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { AppText, Banner, Button, Card, Divider, Screen, Skeleton, space } from '@/design';
import { useT } from '@/i18n';
import { getReceipt } from '@/lib/api/pros';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 }}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="smallStrong" style={{ flexShrink: 1, textAlign: 'right' }} selectable>
        {value}
      </AppText>
    </View>
  );
}

export default function Receipt() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { t, formatDate, formatPrice } = useT();
  const [r, setR] = useState<any | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getReceipt(String(orderId))
      .then(setR)
      .catch(() => setFailed(true));
  }, [orderId]);

  const long = { day: 'numeric', month: 'long', year: 'numeric' } as const;

  return (
    <Screen back title={t('membership.receiptTitle')} width="reading" testID="screen-pro-receipt">
      {!r ? (
        failed ? <Banner tone="warning" body={t('common.errorBody')} /> : <Skeleton height={260} radius={22} />
      ) : (
        <View style={{ gap: space[4] }}>
          <Banner tone="test" title={t('common.test')} body={t('membership.testReceipt')} />
          <Card padding={22}>
            <View>
              <AppText variant="title2">{r.product}</AppText>
              <AppText variant="caption" color="textTertiary" style={{ marginBottom: space[3] }}>
                {t('membership.commission')}
              </AppText>
              <Divider />
              <Row label={t('membership.receiptNumber')} value={r.receiptNumber} />
              <Row label={t('membership.seller')} value={r.seller} />
              <Row label={t('membership.buyer')} value={r.buyer || '—'} />
              <Row label={t('membership.paidAt')} value={r.paidAt ? formatDate(r.paidAt, long) : '—'} />
              {r.period ? <Row label={t('membership.period')} value={`${formatDate(r.period.startsAt, long)} – ${formatDate(r.period.endsAt, long)}`} /> : null}
              <Row label={t('membership.amount')} value={formatPrice(r.amountMinor, r.currency)} />
              {r.maskedCard ? <Row label={t('membership.card')} value={r.maskedCard} /> : null}
              {r.status !== 'approved' ? <Row label={t('membership.refunded')} value={r.reversedAt ? formatDate(r.reversedAt, long) : t(`purchases.status.${r.status}`)} /> : null}
            </View>
          </Card>
          {Platform.OS === 'web' ? <Button label={t('membership.print')} icon="print-outline" variant="secondary" onPress={() => window.print()} /> : null}
        </View>
      )}
    </Screen>
  );
}
