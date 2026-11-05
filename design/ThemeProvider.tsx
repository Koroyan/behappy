import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme as useSystemScheme } from 'react-native';

import { ColorScheme, Palette, palettes } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';
export type MotionPreference = 'system' | 'reduce' | 'full';
export const TEXT_SCALES = [1, 1.12, 1.25] as const;

// Storage keys. "theme" is the pre-2.0 key (values "light" | "dark"), kept so
// existing users keep their choice; "system" is new.
const KEY_THEME = 'theme';
const KEY_TEXT_SCALE = '@behappy_text_scale';
const KEY_MOTION = '@behappy_motion_pref';

interface LegacyThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  border: string;
  accent: string;
  error: string;
  success: string;
}

export interface ThemeValue {
  scheme: ColorScheme;
  isDark: boolean;
  colors: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  textScale: number;
  setTextScale: (s: number) => void;
  /** Effective value: user override, otherwise the OS setting. */
  reduceMotion: boolean;
  motionPreference: MotionPreference;
  setMotionPreference: (p: MotionPreference) => void;
  /** Compatibility shape for components written before 2.0. */
  theme: { colors: LegacyThemeColors };
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [textScale, setTextScaleState] = useState(1);
  const [motionPreference, setMotionState] = useState<MotionPreference>('system');
  const [osReduceMotion, setOsReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [t, s, m] = await Promise.all([
          AsyncStorage.getItem(KEY_THEME),
          AsyncStorage.getItem(KEY_TEXT_SCALE),
          AsyncStorage.getItem(KEY_MOTION),
        ]);
        if (!alive) return;
        if (t === 'light' || t === 'dark' || t === 'system') setPreferenceState(t);
        const scale = Number(s);
        if ((TEXT_SCALES as readonly number[]).includes(scale)) setTextScaleState(scale);
        if (m === 'reduce' || m === 'full' || m === 'system') setMotionState(m);
      } catch {
        // defaults are fine
      }
    })();
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setOsReduceMotion(Boolean(v)))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setOsReduceMotion(Boolean(v)));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(KEY_THEME, p).catch(() => {});
  }, []);
  const setTextScale = useCallback((s: number) => {
    setTextScaleState(s);
    AsyncStorage.setItem(KEY_TEXT_SCALE, String(s)).catch(() => {});
  }, []);
  const setMotionPreference = useCallback((p: MotionPreference) => {
    setMotionState(p);
    AsyncStorage.setItem(KEY_MOTION, p).catch(() => {});
  }, []);

  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const colors = palettes[scheme];
  const reduceMotion = motionPreference === 'system' ? osReduceMotion : motionPreference === 'reduce';

  const value = useMemo<ThemeValue>(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      colors,
      preference,
      setPreference,
      textScale,
      setTextScale,
      reduceMotion,
      motionPreference,
      setMotionPreference,
      theme: {
        colors: {
          background: colors.bg,
          surface: colors.surface,
          card: colors.surface,
          text: colors.text,
          textSecondary: colors.textSecondary,
          textMuted: colors.textTertiary,
          primary: colors.primary,
          border: colors.border,
          accent: colors.brand,
          error: colors.danger,
          success: colors.success,
        },
      },
      toggleTheme: () => setPreference(scheme === 'dark' ? 'light' : 'dark'),
      setTheme: (dark: boolean) => setPreference(dark ? 'dark' : 'light'),
    }),
    [scheme, colors, preference, setPreference, textScale, setTextScale, reduceMotion, motionPreference, setMotionPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
