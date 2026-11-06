import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, Divider, EmptyState, Press, radius, Screen, SectionHeader, Skeleton, space, TextField, useTheme } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { InfoRow, SlotPicker } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { useIdentity } from '@/lib/api/account';
import { ApiError } from '@/lib/api/client';
import { Booking, createBooking, getClientName, getPro, getSlots, PublicPro, setClientName } from '@/lib/api/pros';

const DAY = 24 * 60 * 60 * 1000;

export default function BookSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, tp, formatDate, formatTime, formatPrice } = useT();
  const { colors } = useTheme();
  const identity = useIdentity();
  const [pro, setPro] = useState<PublicPro | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [from, setFrom] = useState(() => Date.now());
  const [slots, setSlots] = useState<number[] | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Booking | null>(null);

  useEffect(() => {
    getPro(String(id))
      .then((p) => {
        setPro(p);
        setServiceId(p.services[0]?.id ?? null);
      })
      .catch(() => setPro(null));
    if (identity.registered) getClientName().then((n) => setName(n || '')).catch(() => {});
  }, [id, identity.registered]);

  const loadSlots = useCallback(async () => {
    if (!serviceId) return;
    setSlots(null);
    setSlot(null);
    try {
      setSlots((await getSlots(String(id), serviceId, from, 14)).slots);
    } catch {
      setSlots([]);
    }
  }, [id, serviceId, from]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  if (!identity.registered) {
    return (
      <Screen back title={t('booking.title')} width="reading" testID="screen-book">
        <AccountGate returnTo={`/specialists/${id}/book`} />
      </Screen>
    );
  }
  if (!pro) {
    return (
      <Screen back title={t('booking.title')} width="reading" testID="screen-book">
        <Skeleton height={200} radius={22} />
      </Screen>
    );
  }

  const service = pro.services.find((s) => s.id === serviceId) || null;
  const proName = pro.publicName;

  const submit = async () => {
    if (!service || !slot) return;
    setBusy(true);
    setError(null);
    try {
      if (name.trim()) await setClientName(name.trim());
      const b = await createBooking({ professionalId: pro.id, serviceId: service.id, startsAt: slot, note: note.trim() || undefined });
      setDone(b);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      setError(t(`booking.errors.${code && ['slot_unavailable', 'not_bookable', 'too_many_requests', 'client_profile_required', 'cannot_book_self'].includes(code) ? code : 'generic'}`));
      if (code === 'slot_unavailable') loadSlots();
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    const confirmed = done.status === 'confirmed';
    return (
      <Screen back title={confirmed ? t('booking.confirmedTitle') : t('booking.requestedTitle')} width="reading" testID="screen-book-done">
        <Card tone={confirmed ? 'sage' : 'gold'} padding={22}>
          <View style={{ gap: space[3] }}>
            <AppText variant="body">{confirmed ? t('booking.confirmedBody') : t('booking.requestedBody', { name: proName })}</AppText>
            <InfoRow icon="calendar-outline" label={t('booking.when')} value={`${formatDate(done.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatTime(done.startsAt)}`} />
            <InfoRow icon="cash-outline" label={t('booking.payment')} value={t('booking.paymentDirect', { name: proName })} />
            <Button label={t('booking.viewAppointment')} onPress={() => router.replace(`/appointments/${done.id}` as any)} testID="book-view" />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen back title={t('booking.title')} subtitle={proName} width="reading" keyboard testID="screen-book">
      <View style={{ gap: space[5] }}>
        <View>
          <SectionHeader title={t('booking.chooseService')} />
          <View style={{ gap: 8 }}>
            {pro.services.map((s) => {
              const active = s.id === serviceId;
              return (
                <Press
                  key={s.id}
                  onPress={() => setServiceId(s.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  testID="book-service"
                  style={{ padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{s.title}</AppText>
                    <AppText variant="caption" color="textSecondary">
                      {tp('common.minutes', s.minutes)} · {s.mode === 'online' ? t('specialists.online') : t('specialists.inPerson')}
                    </AppText>
                  </View>
                  <AppText variant="bodyStrong">{formatPrice(s.priceMinor, s.currency)}</AppText>
                </Press>
              );
            })}
          </View>
        </View>

        <View>
          <SectionHeader title={t('booking.chooseTime')} subtitle={t('specialists.profile.timezone', { name: proName, tz: pro.timezone })} />
          {slots === null ? (
            <Skeleton height={120} radius={18} />
          ) : slots.length ? (
            <SlotPicker slots={slots} value={slot} onChange={setSlot} />
          ) : (
            <EmptyState icon="calendar-clear-outline" title={t('booking.noSlots')} />
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] }}>
            <Button label={t('booking.earlier')} size="sm" variant="quiet" icon="chevron-back" disabled={from <= Date.now() + 1000} onPress={() => setFrom((f) => Math.max(Date.now(), f - 14 * DAY))} />
            <Button label={t('booking.later')} size="sm" variant="quiet" iconRight="chevron-forward" disabled={from > Date.now() + 14 * DAY} onPress={() => setFrom((f) => f + 14 * DAY)} />
          </View>
        </View>

        <Card padding={18}>
          <View style={{ gap: space[4] }}>
            <TextField label={t('booking.yourName', { name: proName })} value={name} onChangeText={setName} helper={t('booking.yourNameHint', { name: proName })} maxLength={60} testID="book-name" />
            <TextField label={t('booking.note', { name: proName })} value={note} onChangeText={setNote} helper={t('booking.noteHint', { name: proName })} multiline maxLength={1000} inputStyle={{ minHeight: 80 }} testID="book-note" />
          </View>
        </Card>

        {service && slot ? (
          <Card tone="muted" padding={18}>
            <View style={{ gap: space[3] }}>
              <AppText variant="title3">{t('booking.review')}</AppText>
              <InfoRow icon="calendar-outline" label={t('booking.when')} value={`${formatDate(slot, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatTime(slot)}`} />
              <InfoRow icon="person-outline" label={t('booking.session')} value={`${service.title} · ${tp('common.minutes', service.minutes)}`} />
              <InfoRow icon="pricetag-outline" label={t('booking.price')} value={formatPrice(service.priceMinor, service.currency)} />
              <InfoRow icon="cash-outline" label={t('booking.payment')} value={`${t('booking.paymentDirect', { name: proName })}${pro.paymentArrangement ? ` — ${pro.paymentArrangement}` : ''}`} />
              {pro.cancellationPolicy ? <InfoRow icon="information-circle-outline" label={t('booking.policy')} value={`${pro.cancellationPolicy} (${tp('specialists.profile.notice', pro.cancellationNoticeHours)})`} /> : null}
              <Divider />
              {error ? <Banner tone="danger" body={error} /> : null}
              <Button label={t('booking.request')} onPress={submit} loading={busy} disabled={!name.trim()} fullWidth testID="book-submit" />
            </View>
          </Card>
        ) : error ? (
          <Banner tone="danger" body={error} />
        ) : null}
      </View>
    </Screen>
  );
}
