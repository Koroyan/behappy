/**
 * BeHappy 2.0 design tokens.
 *
 * One semantic token system for the whole app. Screens reference roles
 * ("surface", "textSecondary", "accentSoft"), never raw hex values, so light
 * and dark mode stay in sync and contrast stays checked in one place.
 *
 * Contrast notes (WCAG 2.1, checked against the background each role sits on):
 *  - text on bg/surface: > 11:1 light, > 13:1 dark
 *  - textSecondary: 5.7:1 light (#4F6661 on #F7F8F5), 8.9:1 dark
 *  - textTertiary: 4.6:1 light (#627571), 5.6:1 dark — metadata only
 *  - primary (#3A7D73) with white label: 4.8:1 (AA for normal text)
 *  - brand (#4B9388) is decorative: icons, rings, illustration accents (3.6:1, large/graphics only)
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  bgSubtle: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  divider: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  brand: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;

  sage: string;
  sageSoft: string;
  peach: string;
  peachSoft: string;
  onPeachSoft: string;
  lavender: string;
  lavenderSoft: string;
  onLavenderSoft: string;
  gold: string;
  goldSoft: string;
  onGoldSoft: string;

  danger: string;
  dangerSoft: string;
  onDangerSoft: string;
  warningSoft: string;
  onWarningSoft: string;
  success: string;
  successSoft: string;
  info: string;
  infoSoft: string;

  focusRing: string;
  overlay: string;
  shadow: string;
  scrim: string;

  chatUser: string;
  onChatUser: string;
  chatAssistant: string;
  onChatAssistant: string;

  /** Accessible categorical palette for charts (never red-vs-green semantics). */
  chart: string[];
  /** Sequential mood scale, low → high, single hue family (teal). */
  moodScale: [string, string, string, string, string];
}

/** Palette keys whose value is a single color (excludes chart/mood arrays). */
export type ColorRole = { [K in keyof Palette]: Palette[K] extends string ? K : never }[keyof Palette];

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    bg: '#F7F8F5',
    bgSubtle: '#F1F4EF',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#F2F5F1',
    surfaceSunken: '#ECF1EC',
    border: '#E2E9E4',
    borderStrong: '#C9D6CE',
    divider: '#E8EEEA',

    text: '#203B37',
    textSecondary: '#4F6661',
    textTertiary: '#627571',
    textInverse: '#F7F8F5',

    brand: '#4B9388',
    primary: '#3A7D73',
    primaryPressed: '#2F6A61',
    onPrimary: '#FFFFFF',
    primarySoft: '#E3F0EC',
    onPrimarySoft: '#24564F',

    sage: '#BBD8CA',
    sageSoft: '#E8F2EC',
    peach: '#F2BEAB',
    peachSoft: '#FBEDE7',
    onPeachSoft: '#7A3F2C',
    lavender: '#D9D1ED',
    lavenderSoft: '#F1EEF8',
    onLavenderSoft: '#4A3F6E',
    gold: '#F4D99F',
    goldSoft: '#FBF3DE',
    onGoldSoft: '#6A5216',

    danger: '#B4483B',
    dangerSoft: '#F9E7E3',
    onDangerSoft: '#8A3027',
    warningSoft: '#FBF1DA',
    onWarningSoft: '#6A5216',
    success: '#2F7A55',
    successSoft: '#E4F2EA',
    info: '#3A6F8F',
    infoSoft: '#E5EFF5',

    focusRing: '#4B9388',
    overlay: 'rgba(17, 30, 28, 0.42)',
    shadow: '#1B2F2B',
    scrim: 'rgba(247, 248, 245, 0.86)',

    chatUser: '#E3F0EC',
    onChatUser: '#1D3C37',
    chatAssistant: '#FFFFFF',
    onChatAssistant: '#203B37',

    chart: ['#3A7D73', '#7B6FB0', '#C29435', '#C9785F', '#5D7A8C'],
    moodScale: ['#C9DDD6', '#A3C7BB', '#7CB0A3', '#4B9388', '#2F6A61'],
  },
  dark: {
    bg: '#111E1C',
    bgSubtle: '#132220',
    surface: '#172825',
    surfaceRaised: '#1C302C',
    surfaceMuted: '#1E332F',
    surfaceSunken: '#0E1917',
    border: '#2A403B',
    borderStrong: '#3A554E',
    divider: '#22372F',

    text: '#E8EFEC',
    textSecondary: '#B3C4BF',
    textTertiary: '#91A6A0',
    textInverse: '#111E1C',

    brand: '#6FB8AC',
    primary: '#7CC2B6',
    primaryPressed: '#93CFC4',
    onPrimary: '#0B1816',
    primarySoft: '#1F3B36',
    onPrimarySoft: '#BFE3DB',

    sage: '#8FBFA9',
    sageSoft: '#1D332B',
    peach: '#E2A592',
    peachSoft: '#3A2823',
    onPeachSoft: '#F4CDBF',
    lavender: '#B9AEDD',
    lavenderSoft: '#29263A',
    onLavenderSoft: '#DCD5F2',
    gold: '#E4C47E',
    goldSoft: '#383021',
    onGoldSoft: '#F2DFAE',

    danger: '#E8907F',
    dangerSoft: '#3B2421',
    onDangerSoft: '#F6C7BD',
    warningSoft: '#383021',
    onWarningSoft: '#F2DFAE',
    success: '#7FC9A2',
    successSoft: '#1C3329',
    info: '#8FBCD6',
    infoSoft: '#1B2E39',

    focusRing: '#7CC2B6',
    overlay: 'rgba(4, 10, 9, 0.62)',
    shadow: '#000000',
    scrim: 'rgba(17, 30, 28, 0.86)',

    chatUser: '#1F3B36',
    onChatUser: '#E2F1ED',
    chatAssistant: '#1A2D29',
    onChatAssistant: '#E8EFEC',

    chart: ['#7CC2B6', '#AFA4DB', '#E0BF72', '#E29C86', '#93AEC0'],
    moodScale: ['#2C4741', '#3C6058', '#4F7E73', '#68A497', '#8DCDBF'],
  },
};

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

/** Soft, realistic elevation. Use sparingly; most surfaces rely on borders. */
export const elevation = (scheme: ColorScheme, level: 0 | 1 | 2 | 3 = 1) => {
  if (level === 0) return {};
  const shadowColor = palettes[scheme].shadow;
  const map = {
    1: { shadowOpacity: scheme === 'dark' ? 0.28 : 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
    2: { shadowOpacity: scheme === 'dark' ? 0.36 : 0.08, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
    3: { shadowOpacity: scheme === 'dark' ? 0.44 : 0.14, shadowRadius: 36, shadowOffset: { width: 0, height: 18 }, elevation: 10 },
  } as const;
  return { shadowColor, ...map[level] };
};

export const motion = {
  fast: 140,
  base: 220,
  slow: 360,
  breathe: 4000,
} as const;

export const layout = {
  /** Readable line length for long-form text. */
  readingWidth: 680,
  /** Main content column on desktop. */
  contentWidth: 1080,
  sidebarWidth: 256,
  railWidth: 84,
  contextPanelWidth: 340,
  tabBarHeight: 60,
  minTouch: 44,
} as const;

export const breakpoints = {
  medium: 768,
  expanded: 1024,
  large: 1280,
  xlarge: 1440,
} as const;
