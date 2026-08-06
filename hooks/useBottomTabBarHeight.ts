import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Icon + label area only, matching app/(tabs)/_layout.tsx exactly — the real
// safe-area bottom inset is added on top of this at render time, per device.
export const TAB_BAR_CONTENT_HEIGHT = Platform.OS === 'ios' ? 52 : 49;

/** Total rendered height of the floating bottom tab bar on this device right now. */
export function useBottomTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 8);
}
