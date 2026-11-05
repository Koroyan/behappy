import React from 'react';
import { ActivityIndicator, StyleProp, View, ViewStyle } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { radius } from '../tokens';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';
import { Press } from './Press';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 38, md: 48, lg: 54 };
const PAD: Record<ButtonSize, number> = { sm: 14, md: 20, lg: 24 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: 'onPrimary' as const, border: colors.primary },
    secondary: { bg: colors.primarySoft, fg: 'onPrimarySoft' as const, border: colors.primarySoft },
    outline: { bg: 'transparent', fg: 'text' as const, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: 'primary' as const, border: 'transparent' },
    quiet: { bg: colors.surfaceMuted, fg: 'text' as const, border: colors.surfaceMuted },
    danger: { bg: colors.dangerSoft, fg: 'onDangerSoft' as const, border: colors.dangerSoft },
  }[variant];

  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      haptic={variant === 'primary'}
      feedback="scale"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      testID={testID}
      focusRadius={radius.md}
      style={[
        {
          minHeight: HEIGHT[size],
          paddingHorizontal: PAD[size],
          borderRadius: radius.md,
          backgroundColor: palette.bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          gap: 8,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors[palette.fg]} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={palette.fg} /> : null}
          <View style={{ flexShrink: 1 }}>
            <AppText variant={size === 'sm' ? 'smallStrong' : 'button'} color={palette.fg} numberOfLines={2} align="center">
              {label}
            </AppText>
          </View>
          {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 19} color={palette.fg} /> : null}
        </>
      )}
    </Press>
  );
}

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: 'ghost' | 'soft' | 'solid' | 'outline';
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
  testID?: string;
}

/** Square-ish icon button with a 44pt minimum touch target. */
export function IconButton({ icon, label, onPress, variant = 'ghost', size = 44, disabled, style, color, testID }: IconButtonProps) {
  const { colors } = useTheme();
  const bg = variant === 'solid' ? colors.primary : variant === 'soft' ? colors.surfaceMuted : 'transparent';
  const fg = color ?? (variant === 'solid' ? colors.onPrimary : colors.text);
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      testID={testID}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      focusRadius={size / 2}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} color={fg} />
    </Press>
  );
}
