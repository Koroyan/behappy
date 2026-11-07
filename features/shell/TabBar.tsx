import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon, Press, useTheme, useLayout } from '@/design';

import { usePrimaryNav } from './Sidebar';

const ROUTE_TO_KEY: Record<string, string> = { index: 'today', tools: 'tools', community: 'community', anulia: 'anulia', specialists: 'specialists', profile: 'profile' };

/** Rough glyph width (in em) per script, to fit long labels on narrow phones. */
const glyphEm = (s: string) =>
  /[Ⴀ-ჿᲐ-Ჿ԰-֏]/.test(s) ? 0.72 : /[぀-ヿ㐀-鿿가-힯]/.test(s) ? 1.0 : /[؀-ۿऀ-ॿ]/.test(s) ? 0.62 : 0.57;

/** The usual size, shrunk (to 9px at least) when a translation is longer than its tab. */
export const tabLabelSize = (label: string, tabWidth: number, base: number) => Math.max(9, Math.min(base, (tabWidth - 6) / (Math.max(label.length, 1) * glyphEm(label))));

/**
 * Phone navigation: five calm destinations, large touch targets, labels always
 * visible. Anulia sits in the middle as a raised button.
 */
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
        const press = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
        };
        const labelSize = tabLabelSize(item.label, (width - 12) / Math.max(primary.length, 1), width < 360 ? 10.5 : 11.5);
        if (key === 'anulia') {
          return (
            <Press key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={item.label} testID={`tab-${key}`} feedback="opacity" haptic onPress={press} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 52, gap: 3 }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  marginTop: -22,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 4,
                  borderColor: colors.surface,
                  shadowColor: colors.shadow,
                  shadowOpacity: 0.18,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                }}
              >
                <Icon name={focused ? item.activeIcon : item.icon} size={24} color="onPrimary" />
              </View>
              <AppText variant="caption" color={focused ? 'text' : 'textTertiary'} numberOfLines={1} style={{ fontSize: labelSize }}>
                {item.label}
              </AppText>
            </Press>
          );
        }
        return (
          <Press
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={item.label}
            testID={`tab-${key}`}
            feedback="opacity"
            haptic
            onPress={press}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 3 }}
          >
            <View style={{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999, backgroundColor: focused ? colors.primarySoft : 'transparent' }}>
              <Icon name={focused ? item.activeIcon : item.icon} size={22} color={focused ? 'onPrimarySoft' : 'textTertiary'} />
            </View>
            <AppText variant="caption" color={focused ? 'text' : 'textTertiary'} numberOfLines={1} style={{ fontSize: labelSize }}>
              {item.label}
            </AppText>
          </Press>
        );
      })}
    </View>
  );
}
