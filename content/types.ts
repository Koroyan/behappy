import type { AppLanguage } from '@/contexts/LanguageContext';

/** Text available in some or all app languages; English is always present. */
export type Localized = Partial<Record<AppLanguage, string>> & { en: string };
export type LocalizedList = Partial<Record<AppLanguage, string[]>> & { en: string[] };

/** Picks the user's language, falling back to English (never to an empty string). */
export function pickLocalized<T>(value: Partial<Record<string, T>> & { en: T }, lang: AppLanguage | string): T {
  const v = value[lang];
  if (v !== undefined && v !== null && (typeof v !== 'string' || v.trim() !== '')) return v as T;
  return value.en;
}
