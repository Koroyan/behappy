import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { FeedbackProvider, ThemeProvider, useTheme } from '@/design';
import { ConsentProvider } from '@/features/common/Consent';
import { AppShell, FontGate } from '@/features/shell/AppShell';
import { AccountProvider } from '@/lib/api/account';

function Navigator() {
  const { colors, isDark, reduceMotion } = useTheme();
  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary },
    };
  }, [isDark, colors]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <AppShell>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: reduceMotion ? 'none' : 'fade_from_bottom',
          }}
        />
      </AppShell>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <ThemeProvider>
            <FontGate>
              <AccountProvider>
                <FeedbackProvider>
                  <ConsentProvider>
                    <Navigator />
                  </ConsentProvider>
                </FeedbackProvider>
              </AccountProvider>
            </FontGate>
          </ThemeProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
