import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '../ThemeProvider';
import { BRAND_FONT } from '../typography';

/**
 * BeHappy mark: a sun rising over a smile-shaped horizon, soft rays, still
 * water, on deep teal (the app icon's artwork: scripts/brand/logo.mjs).
 */
export function BrandMark({ size = 32 }: { size?: number }) {
  const { isDark } = useTheme();
  const id = React.useId().replace(/[^A-Za-z0-9]/g, '');
  const ivory = '#FBF8F1';
  const rays = [-62, -31, 0, 31, 62].map((deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    const r1 = 9.4;
    const r2 = deg === 0 ? 11.6 : 11.1;
    return { x1: 16 + r1 * Math.cos(a), y1: 18.8 + r1 * Math.sin(a), x2: 16 + r2 * Math.cos(a), y2: 18.8 + r2 * Math.sin(a), key: deg };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityLabel="BeHappy">
      <Defs>
        <LinearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={isDark ? '#6FB8AC' : '#5FAE9F'} />
          <Stop offset="0.55" stopColor="#3A7D73" />
          <Stop offset="1" stopColor="#285D55" />
        </LinearGradient>
        <LinearGradient id={`sun${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE2A8" />
          <Stop offset="1" stopColor="#F6A98E" />
        </LinearGradient>
      </Defs>
      <Circle cx={16} cy={16} r={16} fill={`url(#bg${id})`} />
      {rays.map((r) => (
        <Line key={r.key} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={ivory} strokeOpacity={0.9} strokeWidth={1.1} strokeLinecap="round" />
      ))}
      <Path d="M8.75 18.9a7.25 7.25 0 0 1 14.5 0z" fill={`url(#sun${id})`} />
      <Path d="M6.7 19.1Q16 25.4 25.3 19.1" stroke={ivory} strokeWidth={1.7} strokeLinecap="round" fill="none" />
      <Path d="M10.3 24.7Q16 27.2 21.7 24.7" stroke={ivory} strokeOpacity={0.55} strokeWidth={1} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** The mark and the "BeHappy" wordmark ("Be" in the brand teal), as in the phone top bar. */
export function BrandLockup({ size = 30 }: { size?: number }) {
  const { colors } = useTheme();
  // Pacifico, a brush script (like the wordmarks of social apps); the file holds only these letters.
  const fontSize = Math.round(size * 0.8);
  const word = { fontFamily: BRAND_FONT, fontWeight: '400' as const, fontSize, lineHeight: Math.round(fontSize * 1.5), letterSpacing: 0 };
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="BeHappy" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <BrandMark size={size} />
      <Text allowFontScaling={false} style={[word, { color: colors.text, includeFontPadding: false }]}>
        <Text style={{ color: colors.primary }}>Be</Text>
        Happy
      </Text>
    </View>
  );
}

/** Anulia's mark: a small two-leaf sprout, warm and non-human. */
export function AnuliaMark({ size = 40 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel="Bea">
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
