/**
 * Central localization for BeHappy 2.0.
 *
 *   const { t, tp, formatDate } = useT();
 *   t('mood.question')
 *   t('anulia.limitBody', { date })
 *   tp('common.minutes', 5)          // plural-aware: uses .one/.few/.many/.other
 *
 * Every locale file is a deep-partial of English; anything missing falls back
 * to English key by key, so a partially translated language still renders a
 * complete UI.
 */
import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';

import { AppLanguage, RTL_LANGUAGES, useLanguage } from '@/contexts/LanguageContext';

import { en } from './locales/en';
import { ka } from './locales/ka';
import { ru } from './locales/ru';
import { hy } from './locales/hy';
import { extraLocales } from './locales/extra';
import { withRtlBase } from './bidi';
import { DATE_FALLBACK_LANGS, formatDateFallback, formatTimeFallback } from './dateFallback';

// Languages that write decimals with a dot (others use a comma).
const DOT_DECIMAL = new Set(['en', 'zh', 'ja', 'ko', 'hi', 'ar']);

// Browsers without date data for these languages get our ICU-derived names.
const needsDateFallback = (language: string) => Platform.OS === 'web' && DATE_FALLBACK_LANGS.has(language);

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type Messages = typeof en;
export type PartialMessages = DeepPartial<Messages>;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly unknown[]
      ? `${P}${K}`
      : T[K] extends object
        ? Leaves<T[K], `${P}${K}.`>
        : never;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;

const CATALOG: Partial<Record<AppLanguage, PartialMessages>> = { en, ka, ru, hy, ...extraLocales };

function lookup(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const part of path.split('.')) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? String(vars[name]) : m));
}

/** Interface strings in right-to-left languages keep a right-to-left base direction (see bidi.ts). */
const direction = (lang: AppLanguage, text: string) => (RTL_LANGUAGES.has(lang) ? withRtlBase(text) : text);
const directionDeep = (lang: AppLanguage, item: unknown): unknown =>
  typeof item === 'string'
    ? direction(lang, item)
    : item && typeof item === 'object'
      ? Object.fromEntries(Object.entries(item).map(([k, v]) => [k, typeof v === 'string' ? direction(lang, v) : v]))
      : item;

export function translate(lang: AppLanguage, key: string, vars?: Record<string, string | number>): string {
  const local = lookup(CATALOG[lang], key);
  const value = typeof local === 'string' && local.trim() !== '' ? local : lookup(en, key);
  if (typeof value !== 'string') {
    if (__DEV__) console.warn(`[i18n] missing key ${key}`);
    return key;
  }
  return direction(lang, interpolate(value, vars));
}

// Catalogs are static: cache the right-to-left copies so lists keep a stable identity, as they do in other languages.
const rtlLists = new Map<string, string[]>();

export function translateList(lang: AppLanguage, key: string): string[] {
  const local = lookup(CATALOG[lang], key);
  const list = Array.isArray(local) && local.length ? local : lookup(en, key);
  if (!Array.isArray(list)) return [];
  if (!RTL_LANGUAGES.has(lang)) return list as string[];
  const cacheKey = lang + ":" + key;
  let rtl = rtlLists.get(cacheKey);
  if (!rtl) {
    rtl = list.map((item) => directionDeep(lang, item)) as string[];
    rtlLists.set(cacheKey, rtl);
  }
  return rtl;
}

const pluralRulesCache = new Map<string, Intl.PluralRules>();
function pluralCategory(locale: string, n: number): string {
  try {
    let rules = pluralRulesCache.get(locale);
    if (!rules) {
      rules = new Intl.PluralRules(locale);
      pluralRulesCache.set(locale, rules);
    }
    return rules.select(n);
  } catch {
    return n === 1 ? 'one' : 'other';
  }
}

export function useT() {
  const { language, locale, isRTL } = useLanguage();

  const t = useCallback((key: MessageKey | string, vars?: Record<string, string | number>) => translate(language, key, vars), [language]);
  const tl = useCallback((key: MessageKey | string) => translateList(language, key), [language]);

  /** Plural-aware: looks up `${key}.${category}` then `${key}.other`. */
  const tp = useCallback(
    (key: string, count: number, vars?: Record<string, string | number>) => {
      const cat = pluralCategory(locale, count);
      const localHit = lookup(CATALOG[language], `${key}.${cat}`) ?? lookup(CATALOG[language], `${key}.other`);
      const tmpl =
        (typeof localHit === 'string' && localHit) ||
        (lookup(en, `${key}.${cat === 'one' ? 'one' : 'other'}`) as string) ||
        (lookup(en, `${key}.other`) as string) ||
        key;
      return direction(language, interpolate(tmpl, { count, ...vars }));
    },
    [language, locale]
  );

  const formatDate = useCallback(
    (value: Date | number | string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) => {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      if (needsDateFallback(language)) return formatDateFallback(language as 'ka' | 'hy' | 'az', d, options);
      try {
        return new Intl.DateTimeFormat(locale, options).format(d);
      } catch {
        return d.toLocaleDateString();
      }
    },
    [locale, language]
  );

  const formatTime = useCallback(
    (value: Date | number | string) => {
      const d = value instanceof Date ? value : new Date(value);
      if (needsDateFallback(language)) return formatTimeFallback(d);
      try {
        return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
      } catch {
        return d.toLocaleTimeString();
      }
    },
    [locale, language]
  );

  /**
   * Formats a price from minor units. GEL is shown exactly, never converted,
   * and always as "51 GEL" (the way Flitt's payment page shows it).
   */
  const formatPrice = useCallback(
    (amountMinor: number, currency: string) => {
      const amount = amountMinor / 100;
      const digits = amount % 1 === 0 ? 0 : 2;
      let number: string;
      try {
        const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: 2 });
        // Browsers without data for this language fall back to English separators.
        number = nf.resolvedOptions().locale.toLowerCase().startsWith(language) ? nf.format(amount) : amount.toFixed(digits).replace('.', DOT_DECIMAL.has(language) ? '.' : ',');
      } catch {
        number = amount.toFixed(digits);
      }
      return `${number} ${currency}`;
    },
    [locale, language]
  );

  return useMemo(
    () => ({ t, tl, tp, language, locale, isRTL, formatDate, formatTime, formatPrice }),
    [t, tl, tp, language, locale, isRTL, formatDate, formatTime, formatPrice]
  );
}
