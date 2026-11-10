import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, EmptyState, Icon, IconButton, IconName, Screen, Skeleton, space, useTheme } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { NotifyPrompt } from '@/features/notifications/NotifyPrompt';
import { useT } from '@/i18n';
import { useAccount, useIdentity } from '@/lib/api/account';
import { AppNotification, listNotifications, markNotificationsRead } from '@/lib/api/notifications';
import { onEvent } from '@/lib/realtime/socket';

const ICONS: Record<string, IconName> = {
  payment: 'card-outline',
  plus: 'sparkles-outline',
  community: 'chatbubbles-outline',
  moderation: 'shield-outline',
  booking: 'calendar-outline',
  pro: 'mail-outline',
  membership: 'card-outline',
};

/** Where tapping a notification goes. */
function hrefFor(n: AppNotification, isPro: boolean): string | null {
  const d = n.data || {};
  switch (n.kind) {
    case 'community_reply':
    case 'community_mention':
    case 'community_activity':
    case 'moderation_removed':
      return d.roomId ? `/community/${d.roomId}` : '/community';
    case 'moderation_warning':
    case 'moderation_suspended':
    case 'moderation_lifted':
    case 'moderation_appeal_decided':
      return '/community/settings';
    case 'booking_requested':
    case 'booking_confirmed_auto':
      return '/pro/bookings';
    case 'booking_cancelled':
      return d.by === 'client' && isPro ? '/pro/bookings' : d.bookingId ? `/appointments/${d.bookingId}` : '/appointments';
    case 'booking_confirmed':
    case 'booking_declined':
    case 'booking_expired':
    case 'booking_reminder':
    case 'booking_cancelled_by_admin':
      return d.bookingId ? `/appointments/${d.bookingId}` : '/appointments';
    case 'pro_message':
      return d.threadId ? `/messages/${d.threadId}` : '/messages';
    case 'pro_verification':
      return '/pro';
    case 'support_reply':
      return d.ticketId ? `/support/${d.ticketId}` : '/support';
    case 'membership_changed':
      return '/pro/membership';
    case 'membership_trial_started':
    case 'membership_activated':
    case 'membership_reminder':
    case 'membership_expired':
    case 'membership_refunded':
      return '/pro/membership';
    case 'payment_approved':
    case 'payment_refunded':
      return '/purchases';
    case 'plus_ending':
    case 'plus_ended':
      return '/pricing';
    default:
      return null;
  }
}

export default function Notifications() {
  const router = useRouter();
  const identity = useIdentity();
  const { me, refreshUnread } = useAccount();
  const { colors } = useTheme();
  const { t, formatDate, formatTime } = useT();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const isPro = Boolean(me?.professional);

  const load = useCallback(() => {
    listNotifications()
      .then((r) => setItems(r.notifications))
      .catch(() => setItems([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (identity.registered) load();
    }, [identity.registered, load])
  );

  useEffect(() => onEvent('notification:new', () => load()), [load]);

  const when = (ms?: number) => (ms ? `${formatDate(ms, { weekday: 'short', day: 'numeric', month: 'short' })} ${formatTime(ms)}` : '');
  const title = (n: AppNotification) => {
    const d = n.data || {};
    const key = `notifications.kinds.${n.kind}`;
    const topic = typeof d.roomId === 'string' ? d.roomId.split(':')[0] : '';
    const text = t(key, {
      room: topic ? t(`community.topics.${topic}.name`) : '',
      pseudonym: d.pseudonym || '',
      clientName: d.clientName || t('messages.formerClient'),
      from: d.from || '',
      date: n.kind.startsWith('membership') || n.kind.startsWith('plus_') ? (d.endsAt || d.endedAt ? formatDate(d.endsAt || d.endedAt, { day: 'numeric', month: 'long', year: 'numeric' }) : '') : when(d.startsAt),
      product: d.productKind === 'art' ? t('pricing.artTitle') : t('pricing.plusTitle'),
      days: d.daysLeft ?? d.days ?? '',
    });
    return text === key ? t('notifications.kinds.generic') : text;
  };
  const detail = (n: AppNotification) => {
    const d = n.data || {};
    if (n.kind === 'pro_verification') return [d.status ? t(`pro.status.${d.status}`) : null, d.message].filter(Boolean).join(' · ');
    if (n.kind === 'booking_cancelled' && d.late) return t('appointments.late');
    return '';
  };

  const open = async (n: AppNotification) => {
    if (!n.readAt) {
      setItems((list) => (list || []).map((x) => (x.id === n.id ? { ...x, readAt: Date.now() } : x)));
      markNotificationsRead([n.id])
        .then(() => refreshUnread())
        .catch(() => {});
    }
    const href = hrefFor(n, isPro);
    if (href) router.push(href as any);
  };

  const readAll = async () => {
    setItems((list) => (list || []).map((x) => ({ ...x, readAt: x.readAt || Date.now() })));
    await markNotificationsRead().catch(() => {});
    refreshUnread();
  };

  const unread = (items || []).filter((n) => !n.readAt).length;

  return (
    <Screen
      back
      title={t('notifications.title')}
      width="reading"
      testID="screen-notifications"
      headerRight={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {unread ? <Button label={t('notifications.markAllRead')} size="sm" variant="quiet" onPress={readAll} testID="notifications-read-all" /> : null}
          <IconButton icon="settings-outline" label={t('alerts.settings.title')} onPress={() => router.push('/settings/notifications' as never)} testID="notifications-settings" />
        </View>
      }
    >
      {identity.registered ? <NotifyPrompt style={{ marginBottom: space[4] }} /> : null}
      {!identity.registered ? (
        <AccountGate returnTo="/notifications" />
      ) : items === null ? (
        <Skeleton height={160} radius={22} />
      ) : items.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title={t('notifications.empty')} />
      ) : (
        <View style={{ gap: space[2] }}>
          {items.map((n) => {
            const group = n.kind.split('_')[0];
            const extra = detail(n);
            return (
              <Card key={n.id} padding={14} onPress={() => open(n)} accessibilityLabel={title(n)} testID="notification-row" style={!n.readAt ? { borderColor: colors.primary, borderWidth: 1 } : undefined}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <Icon name={ICONS[group] || 'notifications-outline'} size={22} color={n.readAt ? 'textTertiary' : 'primary'} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant={n.readAt ? 'body' : 'bodyStrong'}>{title(n)}</AppText>
                    {extra ? (
                      <AppText variant="small" color="textSecondary" numberOfLines={3}>
                        {extra}
                      </AppText>
                    ) : null}
                    <AppText variant="caption" color="textTertiary">
                      {when(n.createdAt)}
                    </AppText>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
