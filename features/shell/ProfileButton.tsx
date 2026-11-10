/**
 * Phones: the top right of each main screen. The bell opens Notifications and
 * shows, in red, how many notifications and private messages are unread (the
 * same number as on the app icon); the avatar opens Profile (account,
 * settings, appointments, messages and the rest).
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Avatar, Icon, Press, useTheme } from '@/design';
import { useT } from '@/i18n';
import { useIdentity, useUnread } from '@/lib/api/account';
import { getUserProfile } from '@/services/userProfileService';

import { CountBadge } from './CountBadge';

/** Bell + avatar, for Screen's headerRight on phones. */
export function HeaderActions() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <NotificationBell />
      <ProfileButton />
    </View>
  );
}

/** The bell with the unread count (registered accounts: notifications need one). */
export function NotificationBell() {
  const router = useRouter();
  const { t } = useT();
  const identity = useIdentity();
  const unread = useUnread().badge;
  if (!identity.registered) return null;
  return (
    <Press
      onPress={() => router.push('/notifications' as never)}
      accessibilityRole="button"
      accessibilityLabel={unread ? `${t('shell.notifications')} (${unread})` : t('shell.notifications')}
      testID="notification-bell"
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={unread ? 'notifications' : 'notifications-outline'} size={24} color={unread ? 'text' : 'textSecondary'} />
      <CountBadge count={unread} overlay testID="notification-bell-count" />
    </Press>
  );
}

export function ProfileButton() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  useFocusEffect(
    useCallback(() => {
      getUserProfile()
        .then((p) => setName(p?.name?.trim() || ''))
        .catch(() => {});
    }, [])
  );
  return (
    <Press onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={t('tools.profileButton')} testID="profile-button" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      {name ? (
        <Avatar name={name} size={38} />
      ) : (
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="person" size={20} color="onPrimarySoft" />
        </View>
      )}
    </Press>
  );
}
