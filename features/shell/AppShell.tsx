import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { useLanguage } from '@/contexts/LanguageContext';
import { BrandMark, fontAssetsFor, scriptForLanguage, useLayout, useTheme } from '@/design';
import { isOnboardingDone } from '@/lib/onboarding';

import { Sidebar } from './Sidebar';

SplashScreen.preventAutoHideAsync().catch(() => {});

const loadedScripts = new Set<string>();

/**
 * Loads the fonts for the current script before first paint, and lazily when
 * the language changes (Georgian/Armenian fonts are only fetched when needed).
 * Never blocks for more than ~2.5s: if fonts are slow, system fonts are used.
 */
export function FontGate({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const script = scriptForLanguage(language);
  const [ready, setReady] = useState(loadedScripts.has(script));
  const firstLoad = useRef(true);

  useEffect(() => {
    let alive = true;
    if (loadedScripts.has(script)) {
      setReady(true);
      return;
    }
    const timeout = setTimeout(() => alive && setReady(true), 2500);
    Font.loadAsync(fontAssetsFor(script))
      .then(() => {
        loadedScripts.add(script);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
      clearTimeout(timeout);
    };
  }, [script]);

  useEffect(() => {
    if (ready && firstLoad.current) {
      firstLoad.current = false;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready && firstLoad.current) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <BrandMark size={56} />
      </View>
    );
  }
  return <>{children}</>;
}

const NO_CHROME = ['/onboarding', '/quiz'];

/** Desktop/tablet workspace: persistent sidebar + content. Phones: content only. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { hasSideNav } = useLayout();
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (NO_CHROME.some((p) => pathname.startsWith(p)) || pathname.startsWith('/checkout')) return;
    isOnboardingDone().then((done) => {
      if (!done) router.replace('/onboarding');
    });
  }, [pathname, router]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = colors.bg;
    }
  }, [colors.bg]);

  const chromeless = NO_CHROME.some((p) => pathname.startsWith(p));
  if (!hasSideNav || chromeless) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>;
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <Sidebar />
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}
