/**
 * Phones: the way to Profile (account, settings, appointments, messages and
 * the rest) from the top of each main screen, now that the tab bar holds the
 * tools. A small count shows unread notifications and messages.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Avatar, Icon, Press, useTheme } from '@/design';
import { useT } from '@/i18n';
import { badgeText, useUnread } from '@/lib/api/account';
import { getUserProfile } from '@/services/userProfileService';

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
  const unread = useUnread().badge;
  return (
    <Press onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={unread ? `${t('tools.profileButton')} (${unread})` : t('tools.profileButton')} testID="profile-button" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      {name ? (
        <Avatar name={name} size={38} />
      ) : (
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="person" size={20} color="onPrimarySoft" />
        </View>
      )}
      {unread ? (
        <View
          testID="profile-button-dot"
          style={{ position: 'absolute', top: 0, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="caption" style={{ color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '700' }}>
            {badgeText(unread)}
          </AppText>
        </View>
      ) : null}
    </Press>
  );
}
