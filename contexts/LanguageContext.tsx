import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform } from 'react-native';

export type AppLanguage =
  | 'en' // English
  | 'ka' // Georgian
  | 'ru' // Russian
  | 'hy' // Armenian
  | 'tr' // Turkish
  | 'az' // Azerbaijani
  | 'es' // Spanish
  | 'de' // German
  | 'fr' // French
  | 'pt' // Portuguese
  | 'id' // Indonesian
  | 'it' // Italian
  | 'ar' // Arabic (RTL)
  | 'hi' // Hindi
  | 'zh' // Chinese (Simplified)
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'uk' // Ukrainian
  | 'pl'; // Polish

export const SUPPORTED_LANGUAGES: AppLanguage[] = [
  'ka', 'en', 'ru', 'hy', 'uk', 'tr', 'az', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'id', 'ar', 'hi', 'zh', 'ja', 'ko',
];

/** Native names, shown in the language picker. */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  ka: 'ქართული',
  en: 'English',
  ru: 'Русский',
  hy: 'Հայերեն',
  uk: 'Українська',
  tr: 'Türkçe',
  az: 'Azərbaycan',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  pl: 'Polski',
  id: 'Bahasa Indonesia',
  ar: 'العربية',
  hi: 'हिन्दी',
  zh: '简体中文',
  ja: '日本語',
  ko: '한국어',
};

/** BCP 47 tags for Intl date/number formatting. */
export const LOCALE_TAGS: Record<AppLanguage, string> = {
  ka: 'ka-GE', en: 'en-US', ru: 'ru-RU', hy: 'hy-AM', uk: 'uk-UA', tr: 'tr-TR', az: 'az-AZ', de: 'de-DE',
  fr: 'fr-FR', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', pl: 'pl-PL', id: 'id-ID', ar: 'ar', hi: 'hi-IN',
  zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
};

export const RTL_LANGUAGES = new Set<AppLanguage>(['ar']);

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  locale: string;
  isRTL: boolean;
  /** True on native when the layout direction needs an app restart to flip. */
  restartNeededForDirection: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = '@behappy_language';

function detectDeviceLanguage(): AppLanguage {
  try {
    const tag = (Intl.DateTimeFormat().resolvedOptions().locale || 'en').toLowerCase();
    const base = tag.split('-')[0] as AppLanguage;
    if (SUPPORTED_LANGUAGES.includes(base)) return base;
  } catch {
    // fall through
  }
  return 'en';
}

function applyDirection(lang: AppLanguage): boolean {
  const rtl = RTL_LANGUAGES.has(lang);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', lang);
    }
    return false;
  }
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    return true; // takes effect after the app reloads
  }
  return false;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [loaded, setLoaded] = useState(false);
  const [restartNeededForDirection, setRestartNeeded] = useState(false);

  useEffect(() => {
    (async () => {
      let lang: AppLanguage = detectDeviceLanguage();
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && (SUPPORTED_LANGUAGES as string[]).includes(saved)) lang = saved as AppLanguage;
      } catch {
        // keep the detected language
      }
      setLanguageState(lang);
      setRestartNeeded(applyDirection(lang));
      setLoaded(true);
    })();
  }, []);

  const setLanguage = useCallback(async (lang: AppLanguage) => {
    setLanguageState(lang);
    setRestartNeeded(applyDirection(lang));
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // non-fatal
    }
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      locale: LOCALE_TAGS[language],
      isRTL: RTL_LANGUAGES.has(language),
      restartNeededForDirection,
    }),
    [language, setLanguage, restartNeededForDirection]
  );

  // Render nothing until the saved language is known, so the first frame is
  // already in the right language (the root layout shows the splash meanwhile).
  if (!loaded) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: 'en',
      setLanguage: async () => {},
      locale: 'en-US',
      isRTL: false,
      restartNeededForDirection: false,
    };
  }
  return ctx;
};
