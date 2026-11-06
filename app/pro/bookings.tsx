import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, EmptyState, Screen, Segmented, Skeleton, space, useFeedback } from '@/design';
import { BookingStatusBadge, InfoRow } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api/client';
import { Booking, proAttendance, proBookingAction, proBookings } from '@/lib/api/pros';

type Scope = 'requests' | 'upcoming' | 'past';

export default function ProBookings() {
  const router = useRouter();
  const { t, formatDate, formatTime, formatPrice } = useT();
  const { confirm, toast } = useFeedback();
  const [scope, setScope] = useState<Scope>('requests');
  const [list, setList] = useState<Booking[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: Scope) => {
    setList(null);
    setError(null);
    try {
      setList(await proBookings(s));
    } catch (e) {
      setList([]);
      setError(e instanceof ApiError && e.code === 'not_professional' ? t('pro.whyNotListed.notVerified') : t('common.errorBody'));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load(scope);
    }, [load, scope])
  );

  const act = async (b: Booking, action: 'confirm' | 'decline' | 'cancel') => {
    if (action !== 'confirm') {
      const ok = await confirm({
        title: action === 'decline' ? t('pro.bookingsScreen.decline') : t('pro.bookingsScreen.cancel'),
        body: `${b.clientName || ''} · ${formatDate(b.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} ${formatTime(b.startsAt)}`,
        confirmLabel: action === 'decline' ? t('pro.bookingsScreen.decline') : t('pro.bookingsScreen.cancel'),
        destructive: true,
      });
      if (!ok) return;
    }
    setBusyId(b.id);
    try {
      await proBookingAction(b.id, action);
      toast(t('pro.apply.saved'));
      await load(scope);
    } catch {
      toast(t('common.errorBody'));
    } finally {
      setBusyId(null);
    }
  };

  const mark = async (b: Booking, attendance: 'attended' | 'client_no_show') => {
    setBusyId(b.id);
    try {
      await proAttendance(b.id, attendance);
      await load(scope);
    } catch {
      toast(t('common.errorBody'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen back title={t('pro.bookings')} width="reading" testID="screen-pro-bookings">
      <View style={{ gap: space[4] }}>
        <Segmented
          label={t('pro.bookings')}
          value={scope}
          onChange={setScope}
          options={(['requests', 'upcoming', 'past'] as Scope[]).map((s) => ({ value: s, label: t(`pro.bookingsScreen.${s}`) }))}
        />
        {error ? <Banner tone="warning" body={error} /> : null}
        {list === null ? (
          <Skeleton height={120} radius={22} />
        ) : list.length === 0 ? (
          <EmptyState icon="calendar-clear-outline" title={t('pro.bookingsScreen.empty')} />
        ) : (
          list.map((b) => {
            const future = b.startsAt > Date.now();
            return (
              <Card key={b.id} padding={18} testID="pro-booking-row">
                <View style={{ gap: space[2] }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                      {b.clientName || t('messages.formerClient')}
                    </AppText>
                    <BookingStatusBadge status={b.status} />
                  </View>
                  <InfoRow icon="calendar-outline" label={t('appointments.when')} value={`${formatDate(b.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(b.startsAt)}–${formatTime(b.endsAt)}`} />
                  <InfoRow icon="person-outline" label={t('appointments.session')} value={`${b.serviceTitle} · ${b.mode === 'online' ? t('specialists.online') : t('specialists.inPerson')} · ${formatPrice(b.priceMinor, b.currency)}`} />
                  {b.clientNote ? (
                    <Card tone="sage" padding={12}>
                      <AppText variant="caption" color="textTertiary">
                        {t('pro.bookingsScreen.clientNote')}
                      </AppText>
                      <AppText variant="small">{b.clientNote}</AppText>
                    </Card>
                  ) : null}
                  {b.attendance !== 'unknown' ? (
                    <AppText variant="small" color="textSecondary">
                      {t(`appointments.attendance.${b.attendance}`)}
                    </AppText>
                  ) : null}
                  {b.lateCancellation ? <Banner tone="warning" body={t('appointments.late')} /> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {b.status === 'requested' && future ? (
                      <>
                        <Button label={t('pro.bookingsScreen.confirm')} size="sm" icon="checkmark" loading={busyId === b.id} onPress={() => act(b, 'confirm')} testID="pro-booking-confirm" />
                        <Button label={t('pro.bookingsScreen.decline')} size="sm" variant="outline" disabled={busyId === b.id} onPress={() => act(b, 'decline')} testID="pro-booking-decline" />
                      </>
                    ) : null}
                    {b.status === 'confirmed' && future ? <Button label={t('pro.bookingsScreen.cancel')} size="sm" variant="outline" disabled={busyId === b.id} onPress={() => act(b, 'cancel')} testID="pro-booking-cancel" /> : null}
                    {b.status === 'confirmed' && !future && b.attendance === 'unknown' ? (
                      <>
                        <Button label={t('pro.bookingsScreen.attended')} size="sm" variant="secondary" loading={busyId === b.id} onPress={() => mark(b, 'attended')} testID="pro-booking-attended" />
                        <Button label={t('pro.bookingsScreen.noShow')} size="sm" variant="quiet" disabled={busyId === b.id} onPress={() => mark(b, 'client_no_show')} />
                      </>
                    ) : null}
                    <Button label={t('pro.inbox')} size="sm" variant="ghost" icon="mail-outline" onPress={() => router.push('/messages' as any)} />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}
