/**
 * Admin center palette (light and dark). Interface chrome uses the BeHappy
 * admin brand colors; chart marks use the validated data palette (blue,
 * orange, aqua; checked for colour-vision deficiency and contrast against
 * these card surfaces with the dataviz validator). Status colours are kept
 * for states and always come with an icon and a label.
 */
import { useTheme } from '@/design';

export interface AdminColors {
  bg: string;
  sidebar: string;
  sidebarText: string;
  sidebarMuted: string;
  sidebarActive: string;
  sidebarActiveText: string;
  brand: string;
  primary: string;
  onPrimary: string;
  accent: string;
  accentText: string;
  card: string;
  cardMuted: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  dangerSoft: string;
  warningSoft: string;
  successSoft: string;
  infoSoft: string;
  // Charts
  series: [string, string, string];
  grid: string;
  axis: string;
  chartInk: string;
}

const LIGHT: AdminColors = {
  bg: '#F7F8F5',
  sidebar: '#203B37',
  sidebarText: '#E3EEE9',
  sidebarMuted: '#9DB7AD',
  sidebarActive: '#315F58',
  sidebarActiveText: '#FFFFFF',
  brand: '#315F58',
  primary: '#3A7D73',
  onPrimary: '#FFFFFF',
  accent: '#BBD8CA',
  accentText: '#1F3B35',
  card: '#FFFFFF',
  cardMuted: '#F1F5F2',
  border: '#E2E9E4',
  text: '#16231F',
  textSecondary: '#4B5D57',
  textMuted: '#74867F',
  success: '#2B7A4B',
  warning: '#9A6500',
  danger: '#B83A2A',
  dangerSoft: '#FBE9E6',
  warningSoft: '#FDF3DC',
  successSoft: '#E4F3EA',
  infoSoft: '#E6F0FB',
  series: ['#2a78d6', '#eb6834', '#1baf7a'],
  grid: '#E9EEEA',
  axis: '#C6D1CC',
  chartInk: '#52514e',
};

const DARK: AdminColors = {
  bg: '#0E1513',
  sidebar: '#0A1210',
  sidebarText: '#D7E5DF',
  sidebarMuted: '#7F988E',
  sidebarActive: '#1E3934',
  sidebarActiveText: '#FFFFFF',
  brand: '#7DBAAE',
  primary: '#5FA497',
  onPrimary: '#06110E',
  accent: '#2A463F',
  accentText: '#D3E8DF',
  card: '#16201D',
  cardMuted: '#1C2925',
  border: '#26332F',
  text: '#E7EFEB',
  textSecondary: '#B0C2BB',
  textMuted: '#84978F',
  success: '#5CB98A',
  warning: '#E0A63C',
  danger: '#E5735E',
  dangerSoft: '#3A1E1A',
  warningSoft: '#3A2E14',
  successSoft: '#163126',
  infoSoft: '#172636',
  series: ['#3987e5', '#d95926', '#199e70'],
  grid: '#24302C',
  axis: '#35443F',
  chartInk: '#c3c2b7',
};

export function useAdminColors(): AdminColors {
  const { isDark } = useTheme();
  return isDark ? DARK : LIGHT;
}

/** Fixed status colours (never used for series). */
export const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' } as const;
