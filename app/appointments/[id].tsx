import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, Screen, Skeleton, space, useFeedback } from '@/design';
import { BookingStatusBadge, InfoRow } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { Booking, cancelBooking, getBooking, startThread } from '@/lib/api/pros';

const HOUR = 60 * 60 * 1000;

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, tp, formatDate, formatTime, formatPrice } = useT();
  const { confirm, toast } = useFeedback();
  const [b, setB] = useState<Booking | null>(null);

  useFocusEffect(
    useCallback(() => {
      getBooking(String(id)).then(setB).catch(() => setB(null));
    }, [id])
  );

  if (!b) {
    return (
      <Screen back title={t('appointments.detail')} width="reading" testID="screen-appointment">
        <Skeleton height={200} radius={22} />
      </Screen>
    );
  }

  const active = ['requested', 'confirmed'].includes(b.status) && b.startsAt > Date.now();
  const late = b.status === 'confirmed' && b.startsAt - Date.now() < b.cancellationNoticeHours * HOUR;

  const cancel = async () => {
    const ok = await confirm({
      title: t('appointments.cancelTitle'),
      body: `${t('appointments.cancelBody', { policy: b.cancellationPolicy || '—' })}${late ? `\n\n${t('appointments.lateWarning', { count: b.cancellationNoticeHours })}` : ''}`,
      confirmLabel: t('appointments.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      setB(await cancelBooking(b.id));
      toast(t('appointments.cancelled'));
    } catch {
      toast(t('common.errorBody'));
    }
  };

  const message = async () => {
    try {
      const th = await startThread(b.professionalId);
      router.push(`/messages/${th.id}` as any);
    } catch {
      toast(t('common.errorBody'));
    }
  };

  return (
    <Screen back title={t('appointments.detail')} width="reading" testID="screen-appointment">
      <View style={{ gap: space[4] }}>
        <Card padding={20}>
          <View style={{ gap: space[3] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <AppText variant="title2" style={{ flex: 1 }}>
                {b.professionalName}
              </AppText>
              <BookingStatusBadge status={b.status} />
            </View>
            <InfoRow icon="calendar-outline" label={t('appointments.when')} value={`${formatDate(b.startsAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${formatTime(b.startsAt)}–${formatTime(b.endsAt)}`} />
            <InfoRow icon="person-outline" label={t('appointments.session')} value={`${b.serviceTitle} · ${b.mode === 'online' ? t('specialists.online') : t('specialists.inPerson')} · ${formatPrice(b.priceMinor, b.currency)}`} />
            <InfoRow icon="cash-outline" label={t('appointments.payment')} value={`${t('appointments.paymentNote')}${b.paymentArrangement ? ` ${b.paymentArrangement}` : ''}`} />
            {b.mode === 'in_person' && b.inPersonAddress ? <InfoRow icon="location-outline" label={t('appointments.address')} value={b.inPersonAddress} /> : null}
            {b.mode === 'online' && b.status === 'confirmed' ? (
              <AppText variant="small" color="textSecondary">
                {t('appointments.onlineNote')}
              </AppText>
            ) : null}
            {b.attendance !== 'unknown' ? <Banner tone="info" body={t(`appointments.attendance.${b.attendance}`)} /> : null}
            {b.lateCancellation ? <Banner tone="warning" body={t('appointments.late')} /> : null}
            {b.cancellationPolicy ? (
              <AppText variant="caption" color="textTertiary">
                {b.cancellationPolicy} · {tp('specialists.profile.notice', b.cancellationNoticeHours)}
              </AppText>
            ) : null}
          </View>
        </Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button label={t('appointments.message')} icon="mail-outline" variant="secondary" onPress={message} />
          {active ? <Button label={t('appointments.reschedule')} icon="swap-horizontal-outline" variant="outline" onPress={() => router.push(`/specialists/${b.professionalId}/book?reschedule=${encodeURIComponent(b.id)}` as any)} testID="appointment-reschedule" /> : null}
          {active ? <Button label={t('appointments.cancel')} icon="close-circle-outline" variant="danger" onPress={cancel} testID="appointment-cancel" /> : null}
        </View>
      </View>
    </Screen>
  );
}
