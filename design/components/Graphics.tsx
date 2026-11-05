import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

/** BeHappy mark: a calm sunrise over still water. */
export function BrandMark({ size = 32 }: { size?: number }) {
  const { colors, isDark } = useTheme();
  const ivory = isDark ? '#E8EFEC' : '#F7F8F5';
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityLabel="BeHappy">
      <Circle cx={16} cy={16} r={16} fill={colors.brand} />
      <Path d="M8.6 19.6a7.4 7.4 0 0 1 14.8 0z" fill={isDark ? '#F0BFAE' : '#F6C9B8'} />
      <Path d="M5.2 21.6c3.5-1.5 7.1-2.2 10.8-2.2s7.3.7 10.8 2.2" stroke={ivory} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d="M7.8 25.1c2.7-.9 5.4-1.3 8.2-1.3s5.5.4 8.2 1.3" stroke={ivory} strokeOpacity={0.65} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function BrandLockup({ size = 30 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <BrandMark size={size} />
      <AppText variant="title3" style={{ letterSpacing: 0.2 }}>
        BeHappy
      </AppText>
    </View>
  );
}

/** Anulia's mark: a small two-leaf sprout, warm and non-human. */
export function AnuliaMark({ size = 40 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel="Anulia">
      <Circle cx={20} cy={20} r={20} fill={colors.primarySoft} />
      <G>
        <Path d="M20 29V18" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
        <Path d="M20 21.5c-1-4.8-4.3-7.6-9.4-7.9.2 5.1 3.6 8.4 9.4 7.9z" fill={colors.peach} />
        <Path d="M20 18.5c.6-5.4 4.2-8.6 10-9 .1 5.8-3.7 9.4-10 9z" fill={colors.brand} />
      </G>
    </Svg>
  );
}

/** Progress ring for program/session completion. */
export function ProgressRing({ value, size = 72, stroke = 7, children, label }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; label?: string }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceSunken} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.brand}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/**
 * Mood glyph: one teal family from light to deep (never red-to-green), with
 * a mouth that gently changes shape. Always paired with a text label.
 */
export function MoodGlyph({ level, size = 44, selected }: { level: 0 | 1 | 2 | 3 | 4; size?: number; selected?: boolean }) {
  const { colors, isDark } = useTheme();
  const fill = colors.moodScale[level];
  const ink = isDark ? (level >= 3 ? '#0B1816' : '#E8EFEC') : level >= 3 ? '#FFFFFF' : '#203B37';
  const curve = [-4.2, -2.2, 0, 2.6, 4.6][level];
  const mouthY = 26.5 - curve / 3;
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={selected ? 21 : 20} fill={fill} stroke={selected ? colors.primary : 'transparent'} strokeWidth={selected ? 2 : 0} />
      <Circle cx={16} cy={18.5} r={1.9} fill={ink} />
      <Circle cx={28} cy={18.5} r={1.9} fill={ink} />
      <Path d={`M15 ${mouthY} Q22 ${mouthY + curve} 29 ${mouthY}`} stroke={ink} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      {level === 4 ? <Path d="M10.5 14.5l2-1.2M33.5 14.5l-2-1.2" stroke={ink} strokeOpacity={0.5} strokeWidth={1.6} strokeLinecap="round" /> : null}
    </Svg>
  );
}
