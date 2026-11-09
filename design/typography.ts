import { Platform, TextStyle } from 'react-native';

/**
 * Type system.
 *
 * Fonts are chosen per script so every priority language gets a typeface
 * designed for it, with verified glyph coverage (see @expo-google-fonts
 * metadata.json "subsets"):
 *   latin   → Inter (UI) + Lora (editorial): Latin, Latin-ext, Cyrillic, Cyrillic-ext
 *             covers en, ru, uk, tr, az (ə), es, de, fr, pt, id, it, pl
 *   georgian→ Noto Sans Georgian + Noto Serif Georgian (both include Latin)
 *   armenian→ Noto Sans Armenian + Noto Serif Armenian (both include Latin)
 *   system  → platform fonts for ar, hi, zh, ja, ko (huge CJK/Indic fonts are
 *             better served by the OS than bundled)
 */

export type ScriptGroup = 'latin' | 'georgian' | 'armenian' | 'system';
export type Weight = 'regular' | 'medium' | 'semibold';
export type Family = 'sans' | 'serif';

export function scriptForLanguage(lang: string): ScriptGroup {
  if (lang === 'ka') return 'georgian';
  if (lang === 'hy') return 'armenian';
  if (['ar', 'hi', 'zh', 'ja', 'ko'].includes(lang)) return 'system';
  return 'latin';
}

const FAMILIES: Record<Exclude<ScriptGroup, 'system'>, Record<Family, Partial<Record<Weight, string>>>> = {
  latin: {
    sans: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold' },
    serif: { regular: 'Lora_400Regular', medium: 'Lora_600SemiBold', semibold: 'Lora_600SemiBold' },
  },
  georgian: {
    sans: { regular: 'NotoSansGeorgian_400Regular', medium: 'NotoSansGeorgian_500Medium', semibold: 'NotoSansGeorgian_600SemiBold' },
    serif: { regular: 'NotoSerifGeorgian_400Regular', medium: 'NotoSerifGeorgian_600SemiBold', semibold: 'NotoSerifGeorgian_600SemiBold' },
  },
  armenian: {
    sans: { regular: 'NotoSansArmenian_400Regular', medium: 'NotoSansArmenian_500Medium', semibold: 'NotoSansArmenian_600SemiBold' },
    serif: { regular: 'NotoSerifArmenian_400Regular', medium: 'NotoSerifArmenian_600SemiBold', semibold: 'NotoSerifArmenian_600SemiBold' },
  },
};

const WEB_FALLBACK_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif';
const WEB_FALLBACK_SERIF = 'Georgia, "Noto Serif", "Times New Roman", serif';
const SYSTEM_WEIGHT: Record<Weight, TextStyle['fontWeight']> = { regular: '400', medium: '500', semibold: '600' };

/** Resolves fontFamily (+ fontWeight for system fonts) for a script/family/weight. */
export function fontFor(script: ScriptGroup, family: Family, weight: Weight): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (script === 'system') {
    if (Platform.OS === 'web') {
      return { fontFamily: family === 'serif' ? WEB_FALLBACK_SERIF : WEB_FALLBACK_SANS, fontWeight: SYSTEM_WEIGHT[weight] };
    }
    return { fontWeight: SYSTEM_WEIGHT[weight] };
  }
  const name = FAMILIES[script][family][weight] || FAMILIES[script][family].regular!;
  if (Platform.OS === 'web') {
    // On the web, a stack lets mixed-script user text (e.g. Georgian typed in
    // the English UI) fall back gracefully, glyph by glyph.
    const others = (['latin', 'georgian', 'armenian'] as const)
      .filter((s) => s !== script)
      .map((s) => FAMILIES[s][family][weight])
      .filter(Boolean)
      .join(', ');
    return { fontFamily: `${name}, ${others}, ${family === 'serif' ? WEB_FALLBACK_SERIF : WEB_FALLBACK_SANS}` };
  }
  // Native: the custom family name already encodes weight; adding fontWeight
  // can make Android fall back to a synthetic bold.
  return { fontFamily: name };
}

export type TextVariant =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'body'
  | 'bodyStrong'
  | 'bodySerif'
  | 'callout'
  | 'small'
  | 'smallStrong'
  | 'caption'
  | 'label'
  | 'button';

interface VariantSpec {
  family: Family;
  weight: Weight;
  size: number;
  /** Desktop size (≥1024px). Defaults to size. */
  sizeWide?: number;
  lineHeight: number; // multiplier
  letterSpacing?: number;
}

export const VARIANTS: Record<TextVariant, VariantSpec> = {
  display: { family: 'serif', weight: 'semibold', size: 32, sizeWide: 44, lineHeight: 1.16, letterSpacing: -0.4 },
  title1: { family: 'serif', weight: 'semibold', size: 27, sizeWide: 32, lineHeight: 1.2, letterSpacing: -0.2 },
  title2: { family: 'sans', weight: 'semibold', size: 20, sizeWide: 22, lineHeight: 1.3, letterSpacing: -0.1 },
  title3: { family: 'sans', weight: 'semibold', size: 17, sizeWide: 18, lineHeight: 1.35 },
  body: { family: 'sans', weight: 'regular', size: 16, lineHeight: 1.5 },
  bodyStrong: { family: 'sans', weight: 'semibold', size: 16, lineHeight: 1.5 },
  bodySerif: { family: 'serif', weight: 'regular', size: 18, sizeWide: 19, lineHeight: 1.6 },
  callout: { family: 'sans', weight: 'medium', size: 15, lineHeight: 1.45 },
  small: { family: 'sans', weight: 'regular', size: 14, lineHeight: 1.45 },
  smallStrong: { family: 'sans', weight: 'semibold', size: 14, lineHeight: 1.45 },
  caption: { family: 'sans', weight: 'regular', size: 13, lineHeight: 1.4 },
  label: { family: 'sans', weight: 'semibold', size: 12, lineHeight: 1.35, letterSpacing: 0.4 },
  button: { family: 'sans', weight: 'semibold', size: 16, lineHeight: 1.25 },
};

export function resolveVariant(variant: TextVariant, script: ScriptGroup, wide: boolean, scale = 1): TextStyle {
  const spec = VARIANTS[variant];
  const base = (wide && spec.sizeWide) || spec.size;
  // Georgian and Armenian glyphs run wider and have taller ascenders than Latin
  // at the same size: a slight size reduction plus extra line height keeps the
  // rhythm consistent and stops labels from overflowing.
  const optical = script === 'georgian' || script === 'armenian' ? 0.97 : 1;
  const fontSize = Math.round(base * scale * optical * 10) / 10;
  const lineFactor = script === 'georgian' || script === 'armenian' ? spec.lineHeight + 0.08 : spec.lineHeight;
  return {
    ...fontFor(script, spec.family, spec.weight),
    fontSize,
    lineHeight: Math.round(fontSize * lineFactor),
    letterSpacing: script === 'latin' ? spec.letterSpacing : 0,
  };
}

/** Font family of the "BeHappy" wordmark (only its letters are in the file). */
export const BRAND_FONT = 'BeHappyWordmark';

/** Font files to load for a script group (Latin is always loaded for digits/UI). */
export function fontAssetsFor(script: ScriptGroup): Record<string, any> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const latin = {
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Lora_400Regular: require('@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf'),
    Lora_600SemiBold: require('@expo-google-fonts/lora/600SemiBold/Lora_600SemiBold.ttf'),
    // The "BeHappy" wordmark: Pacifico (SIL OFL, assets/fonts/Pacifico-OFL.txt), cut down to its six letters (10 KB).
    [BRAND_FONT]: require('../assets/fonts/Pacifico-BeHappy.ttf'),
  };
  if (script === 'georgian') {
    return {
      ...latin,
      NotoSansGeorgian_400Regular: require('@expo-google-fonts/noto-sans-georgian/400Regular/NotoSansGeorgian_400Regular.ttf'),
      NotoSansGeorgian_500Medium: require('@expo-google-fonts/noto-sans-georgian/500Medium/NotoSansGeorgian_500Medium.ttf'),
      NotoSansGeorgian_600SemiBold: require('@expo-google-fonts/noto-sans-georgian/600SemiBold/NotoSansGeorgian_600SemiBold.ttf'),
      NotoSerifGeorgian_400Regular: require('@expo-google-fonts/noto-serif-georgian/400Regular/NotoSerifGeorgian_400Regular.ttf'),
      NotoSerifGeorgian_600SemiBold: require('@expo-google-fonts/noto-serif-georgian/600SemiBold/NotoSerifGeorgian_600SemiBold.ttf'),
    };
  }
  if (script === 'armenian') {
    return {
      ...latin,
      NotoSansArmenian_400Regular: require('@expo-google-fonts/noto-sans-armenian/400Regular/NotoSansArmenian_400Regular.ttf'),
      NotoSansArmenian_500Medium: require('@expo-google-fonts/noto-sans-armenian/500Medium/NotoSansArmenian_500Medium.ttf'),
      NotoSansArmenian_600SemiBold: require('@expo-google-fonts/noto-sans-armenian/600SemiBold/NotoSansArmenian_600SemiBold.ttf'),
      NotoSerifArmenian_400Regular: require('@expo-google-fonts/noto-serif-armenian/400Regular/NotoSerifArmenian_400Regular.ttf'),
      NotoSerifArmenian_600SemiBold: require('@expo-google-fonts/noto-serif-armenian/600SemiBold/NotoSerifArmenian_600SemiBold.ttf'),
    };
  }
  return latin;
  /* eslint-enable @typescript-eslint/no-require-imports */
}
