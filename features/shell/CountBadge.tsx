/**
 * The unread count, as people know it from other apps: a small red pill with
 * a white number (99+ beyond that). Used on the bell, the sidebar and wherever
 * something new waits; the tab bar draws the same pill.
 */
import React from 'react';
import { View } from 'react-native';

import { AppText, useTheme } from '@/design';
import { badgeText } from '@/lib/api/account';

export function CountBadge({ count, overlay = false, testID }: { count: number; overlay?: boolean; testID?: string }) {
  const { colors } = useTheme();
  if (!count) return null;
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        ...(overlay ? { position: 'absolute' as const, top: -1, right: -3 } : null),
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        borderRadius: 10,
        backgroundColor: colors.danger,
        borderWidth: overlay ? 2 : 0,
        borderColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="caption" style={{ color: '#FFFFFF', fontSize: 11, lineHeight: 13, fontWeight: '700' }}>
        {badgeText(count)}
      </AppText>
    </View>
  );
}
