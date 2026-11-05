import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Animated, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { radius as radii } from '../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Visual feedback: a gentle scale (cards) or opacity (rows, icons). */
  feedback?: 'scale' | 'opacity' | 'none';
  haptic?: boolean;
  focusRadius?: number;
  children?: React.ReactNode;
}

/**
 * Base pressable with calm press feedback, optional haptics on mobile, a
 * visible keyboard focus ring on the web, and reduced-motion support.
 * Layout styles (flex, width, margins) apply to the touch target itself.
 */
export function Press({ style, feedback = 'opacity', haptic = false, focusRadius = radii.md, onPress, onPressIn, onPressOut, disabled, children, ...rest }: PressProps) {
  const { reduceMotion, colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = React.useState(false);

  const to = (value: number) => {
    if (feedback === 'none') return;
    if (reduceMotion) {
      anim.setValue(value);
      return;
    }
    Animated.timing(anim, { toValue: value, duration: value ? 90 : 160, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const animatedStyle =
    feedback === 'scale'
      ? { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 1 : 0.985] }) }], opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) }
      : feedback === 'opacity'
        ? { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.62] }) }
        : null;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(e) => {
        to(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(0);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...rest}
      style={[
        style,
        animatedStyle,
        disabled ? { opacity: 0.5 } : null,
        focused && Platform.OS === 'web'
          ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.focusRing, outlineOffset: 2, borderRadius: focusRadius } as any)
          : null,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
