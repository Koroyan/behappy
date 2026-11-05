import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, TextStyle } from 'react-native';

import { useLanguage } from '@/contexts/LanguageContext';

import { useTheme } from '../ThemeProvider';
import { ColorRole, Palette } from '../tokens';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Icons that point in a reading direction and must mirror in RTL.
const DIRECTIONAL = new Set<string>([
  'chevron-forward', 'chevron-back', 'arrow-forward', 'arrow-back', 'chevron-forward-outline', 'chevron-back-outline',
  'arrow-forward-outline', 'arrow-back-outline', 'send', 'send-outline', 'return-up-back', 'exit-outline',
]);

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorRole | string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

/** One icon family (Ionicons, outline style) everywhere, RTL-aware. */
export function Icon({ name, size = 22, color = 'text', style, accessibilityLabel }: IconProps) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const resolved = (colors as any)[color] ?? color;
  const flip = isRTL && DIRECTIONAL.has(String(name));
  return (
    <Ionicons
      name={name}
      size={size}
      color={resolved}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[flip ? { transform: [{ scaleX: -1 }] } : null, style]}
    />
  );
}
