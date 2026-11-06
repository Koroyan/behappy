import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon, Press, useTheme, useLayout } from '@/design';

import { usePrimaryNav } from './Sidebar';

const ROUTE_TO_KEY: Record<string, string> = { index: 'today', community: 'community', anulia: 'anulia', journal: 'journal', profile: 'profile' };

/** Phone navigation: five calm destinations, large touch targets, labels always visible. */
export function MobileTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { width } = useLayout();
  const insets = useSafeAreaInsets();
  const { primary } = usePrimaryNav();
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const a = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  if (keyboardOpen) return null;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 6),
        paddingTop: 6,
        paddingHorizontal: 6,
      }}
    >
      {state.routes.map((route, index) => {
        const key = ROUTE_TO_KEY[route.name];
        const item = primary.find((p) => p.key === key);
        if (!item) return null;
        const focused = state.index === index;
        return (
          <Press
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={item.label}
            testID={`tab-${key}`}
            feedback="opacity"
            haptic
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
            }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 3 }}
          >
            <View style={{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999, backgroundColor: focused ? colors.primarySoft : 'transparent' }}>
              <Icon name={focused ? item.activeIcon : item.icon} size={22} color={focused ? 'onPrimarySoft' : 'textTertiary'} />
            </View>
            <AppText variant="caption" color={focused ? 'text' : 'textTertiary'} numberOfLines={1} style={{ fontSize: width < 360 ? 10.5 : 11.5 }}>
              {item.label}
            </AppText>
          </Press>
        );
      })}
    </View>
  );
}
