import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen, Segmented, Skeleton, space } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { BookingStatusBadge } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { useIdentity } from '@/lib/api/account';
import { Booking, myBookings } from '@/lib/api/pros';

export default function Appointments() {
  const router = useRouter();
  const { t, formatDate, formatTime } = useT();
  const identity = useIdentity();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [list, setList] = useState<Booking[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!identity.registered) return;
      myBookings()
        .then(setList)
        .catch(() => setList([]));
    }, [identity.registered])
  );

  if (!identity.registered) {
    return (
      <Screen back title={t('appointments.title')} width="reading" testID="screen-appointments">
        <AccountGate returnTo="/appointments" />
      </Screen>
    );
  }

  const now = Date.now();
  const shown = (list || []).filter((b) => (tab === 'upcoming' ? b.endsAt > now && ['requested', 'confirmed'].includes(b.status) : !(b.endsAt > now && ['requested', 'confirmed'].includes(b.status))));
  if (tab === 'upcoming') shown.sort((a, b) => a.startsAt - b.startsAt);

  return (
    <Screen back title={t('appointments.title')} width="reading" testID="screen-appointments">
      <View style={{ gap: space[4] }}>
        <Segmented
          label={t('appointments.title')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: t('appointments.upcoming') },
            { value: 'past', label: t('appointments.past') },
          ]}
        />
        {list === null ? (
          <Skeleton height={90} radius={22} />
        ) : shown.length ? (
          shown.map((b) => (
            <Card key={b.id} padding={18} onPress={() => router.push(`/appointments/${b.id}` as any)} accessibilityLabel={b.professionalName || ''} testID="appointment-row">
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>
                    {b.professionalName}
                  </AppText>
                  <BookingStatusBadge status={b.status} />
                </View>
                <AppText variant="small" color="textSecondary">
                  {formatDate(b.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(b.startsAt)} · {b.serviceTitle}
                </AppText>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState icon="calendar-outline" title={t('appointments.empty')} action={<Button label={t('appointments.find')} onPress={() => router.push('/specialists' as any)} />} />
        )}
      </View>
    </Screen>
  );
}
