import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { elevation, ColorRole, Palette, radius } from '../tokens';
import { Press } from './Press';

export type CardTone = 'surface' | 'muted' | 'primary' | 'sage' | 'peach' | 'lavender' | 'gold' | 'sunken' | 'danger' | 'info';

const toneMap: Record<CardTone, ColorRole> = {
  surface: 'surface',
  muted: 'surfaceMuted',
  primary: 'primarySoft',
  sage: 'sageSoft',
  peach: 'peachSoft',
  lavender: 'lavenderSoft',
  gold: 'goldSoft',
  sunken: 'surfaceSunken',
  danger: 'dangerSoft',
  info: 'infoSoft',
};

export interface CardProps {
  tone?: CardTone;
  padding?: number;
  bordered?: boolean;
  raised?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

/** The one card surface. Borders over heavy shadows; a soft lift when raised. */
export function Card({ tone = 'surface', padding = 20, bordered, raised, onPress, accessibilityLabel, accessibilityHint, style, children, testID }: CardProps) {
  const { colors, scheme } = useTheme();
  const showBorder = bordered ?? (tone === 'surface');
  const base: ViewStyle = {
    backgroundColor: colors[toneMap[tone]],
    borderRadius: radius.xl,
    padding,
    borderWidth: showBorder ? 1 : 0,
    borderColor: colors.border,
    ...(raised ? elevation(scheme, 1) : null),
  };
  if (onPress) {
    return (
      <Press onPress={onPress} feedback="scale" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} focusRadius={radius.xl} style={[base, style]} testID={testID}>
        {children}
      </Press>
    );
  }
  return (
    <View style={[base, style]} testID={testID}>
      {children}
    </View>
  );
}
