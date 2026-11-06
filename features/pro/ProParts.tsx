/**
 * Building blocks for the specialists directory, booking and the
 * professional workspace.
 */
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppText, Avatar, Badge, Icon, Press, radius, space, useTheme } from '@/design';
import { useT } from '@/i18n';
import { API_BASE_URL } from '@/lib/api/client';
import type { BookingStatus, PublicPro } from '@/lib/api/pros';

export function ProAvatar({ name, photoUrl, size = 56 }: { name?: string | null; photoUrl?: string | null; size?: number }) {
  const { colors } = useTheme();
  if (photoUrl) {
    return <Image source={{ uri: `${API_BASE_URL}${photoUrl}` }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceSunken }} contentFit="cover" accessibilityIgnoresInvertColors />;
  }
  return <Avatar name={name || ''} size={size} />;
}

export function VerifiedBadge() {
  const { t } = useT();
  return <Badge label={t('specialists.verified')} tone="success" icon="shield-checkmark-outline" />;
}

const BOOKING_TONE: Record<BookingStatus, 'primary' | 'gold' | 'muted' | 'danger' | 'success'> = {
  requested: 'gold',
  confirmed: 'success',
  declined: 'muted',
  cancelled_by_client: 'muted',
  cancelled_by_professional: 'danger',
  expired: 'muted',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useT();
  return <Badge label={t(`appointments.status.${status}`)} tone={BOOKING_TONE[status]} />;
}

const VERIFICATION_TONE: Record<string, 'primary' | 'gold' | 'muted' | 'danger' | 'success' | 'lavender'> = {
  draft: 'muted',
  submitted: 'lavender',
  under_review: 'lavender',
  more_info_required: 'gold',
  approved: 'success',
  rejected: 'danger',
  suspended: 'danger',
  expired: 'gold',
};

export function VerificationBadge({ status }: { status: string }) {
  const { t } = useT();
  return <Badge label={t(`pro.status.${status}`)} tone={VERIFICATION_TONE[status] || 'muted'} />;
}

const MEMBERSHIP_TONE: Record<string, 'primary' | 'gold' | 'muted' | 'danger' | 'success' | 'lavender'> = {
  verification_pending: 'muted',
  trial_active: 'lavender',
  active: 'success',
  renewal_due: 'gold',
  cancelled: 'gold',
  grace: 'gold',
  expired: 'danger',
  payment_failed: 'danger',
  suspended: 'danger',
  rejected: 'muted',
  verification_expired: 'gold',
};

export function MembershipBadge({ state }: { state: string }) {
  const { t } = useT();
  return <Badge label={t(`pro.membershipState.${state}`)} tone={MEMBERSHIP_TONE[state] || 'muted'} />;
}

/** One result in the directory. */
export function ProCard({ pro, onPress }: { pro: PublicPro; onPress: () => void }) {
  const { t, tp, formatPrice } = useT();
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={pro.publicName}
      feedback="scale"
      testID={`pro-${pro.id}`}
      style={{ flexBasis: 320, flexGrow: 1, flexShrink: 1, maxWidth: '100%', padding: 18, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 }}
    >
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <ProAvatar name={pro.publicName} photoUrl={pro.photoUrl} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="title3" numberOfLines={2}>
            {pro.publicName}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {pro.verified ? <VerifiedBadge /> : null}
            <AppText variant="caption" color="textTertiary">
              {[pro.city, pro.experienceYears !== null ? tp('specialists.profile.experience', pro.experienceYears) : null].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>
      </View>
      <AppText variant="small" color="textSecondary" numberOfLines={3}>
        {pro.bio}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {pro.specializations.slice(0, 3).map((s) => (
          <Badge key={s} label={t(`specialists.specializations.${s}`)} tone="primary" />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <AppText variant="caption" color="textSecondary">
          {pro.languages.map((l) => l.toUpperCase()).join(' · ')} · {[pro.offersOnline ? t('specialists.online') : null, pro.offersInPerson ? t('specialists.inPerson') : null].filter(Boolean).join(', ')}
        </AppText>
        {pro.priceFromMinor !== null ? (
          <AppText variant="smallStrong" color="primary">
            {t('specialists.from', { price: formatPrice(pro.priceFromMinor, pro.currency) })}
          </AppText>
        ) : null}
      </View>
    </Press>
  );
}

/** Day chips and time chips for bookable slots, in the viewer's time zone. */
export function SlotPicker({ slots, value, onChange }: { slots: number[]; value: number | null; onChange: (ms: number) => void }) {
  const { formatDate, formatTime } = useT();
  const { colors } = useTheme();
  const days = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const s of slots) {
      const key = new Date(s).toDateString();
      map.set(key, [...(map.get(key) || []), s]);
    }
    return [...map.entries()];
  }, [slots]);
  const [day, setDay] = useState<string | null>(null);
  const current = day && days.some(([k]) => k === day) ? day : days[0]?.[0] ?? null;
  const times = days.find(([k]) => k === current)?.[1] || [];
  return (
    <View style={{ gap: space[3] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map(([key, list]) => {
          const active = key === current;
          return (
            <Press
              key={key}
              onPress={() => setDay(key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              testID="slot-day"
              style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface, alignItems: 'center', minWidth: 72 }}
            >
              <AppText variant="caption" color={active ? 'onPrimarySoft' : 'textSecondary'}>
                {formatDate(list[0], { weekday: 'short' })}
              </AppText>
              <AppText variant="bodyStrong" color={active ? 'onPrimarySoft' : 'text'}>
                {formatDate(list[0], { day: 'numeric', month: 'short' })}
              </AppText>
            </Press>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {times.map((s) => {
          const active = s === value;
          return (
            <Press
              key={s}
              onPress={() => onChange(s)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              testID="slot-time"
              style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.surface }}
            >
              <AppText variant="smallStrong" color={active ? 'onPrimary' : 'text'}>
                {formatTime(s)}
              </AppText>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

export function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; value: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <Icon name={icon} size={18} color="textSecondary" />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="caption" color="textTertiary">
          {label}
        </AppText>
        {typeof value === 'string' ? <AppText variant="body">{value}</AppText> : value}
      </View>
    </View>
  );
}
