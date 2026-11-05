/**
 * Emergency and crisis resources shown on "Get help now".
 *
 * Every number below was checked on 2026-11-05 against official sites or
 * findahelpline.com (see docs/BEHAPPY_SECURITY_REVIEW.md › Safety). Lines
 * that could not be verified, or that were paused (LifeLine Ukraine 7333 at
 * the time of checking), are deliberately NOT listed. Re-verify before each
 * release; never add a number without a source.
 */
export type LineType = 'crisis' | 'suicide' | 'youth' | 'counselling' | 'emotional';

export interface SupportLine {
  name: string;
  number: string;
  /** Digits to dial (tel: link). */
  dial: string;
  type: LineType;
  free?: boolean;
  allDay?: boolean;
  note?: string;
}

export interface CountryResources {
  code: string;
  name: string;
  emergency: string[];
  lines: SupportLine[];
}

export const COUNTRIES: CountryResources[] = [
  { code: 'GE', name: 'Georgia', emergency: ['112'], lines: [] },
  {
    code: 'AM',
    name: 'Armenia',
    emergency: ['911', '112'],
    lines: [{ name: 'Emotional Support Hotline', number: '0800 00 900', dial: '080000900', type: 'emotional', free: true }],
  },
  { code: 'UA', name: 'Ukraine', emergency: ['112'], lines: [] },
  {
    code: 'RU',
    name: 'Russia',
    emergency: ['112'],
    lines: [{ name: 'Детский телефон доверия', number: '8-800-2000-122', dial: '88002000122', type: 'youth' }],
  },
  { code: 'TR', name: 'Türkiye', emergency: ['112'], lines: [] },
  { code: 'AZ', name: 'Azerbaijan', emergency: ['112'], lines: [] },
  {
    code: 'DE',
    name: 'Germany',
    emergency: ['112'],
    lines: [
      { name: 'TelefonSeelsorge', number: '0800 111 0 111', dial: '08001110111', type: 'crisis', free: true, allDay: true },
      { name: 'TelefonSeelsorge', number: '0800 111 0 222', dial: '08001110222', type: 'crisis', free: true, allDay: true },
    ],
  },
  {
    code: 'FR',
    name: 'France',
    emergency: ['112', '15'],
    lines: [{ name: '3114 — prévention du suicide', number: '3114', dial: '3114', type: 'suicide', free: true, allDay: true }],
  },
  {
    code: 'ES',
    name: 'Spain',
    emergency: ['112'],
    lines: [{ name: 'Línea 024', number: '024', dial: '024', type: 'suicide', free: true, allDay: true }],
  },
  { code: 'IT', name: 'Italy', emergency: ['112'], lines: [] },
  {
    code: 'PT',
    name: 'Portugal',
    emergency: ['112'],
    lines: [
      { name: 'SNS 24 — aconselhamento psicológico (opção 4)', number: '808 24 24 24', dial: '808242424', type: 'counselling', allDay: true },
      { name: 'Linha Nacional de Prevenção do Suicídio', number: '1411', dial: '1411', type: 'suicide' },
    ],
  },
  {
    code: 'PL',
    name: 'Poland',
    emergency: ['112'],
    lines: [{ name: '116 123', number: '116 123', dial: '116123', type: 'emotional', free: true, allDay: true }],
  },
  {
    code: 'US',
    name: 'United States',
    emergency: ['911'],
    lines: [{ name: '988 Suicide & Crisis Lifeline', number: '988', dial: '988', type: 'suicide', free: true, allDay: true, note: 'call or text' }],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    emergency: ['999', '112'],
    lines: [{ name: 'Samaritans', number: '116 123', dial: '116123', type: 'emotional', free: true, allDay: true }],
  },
];

export const HELPLINE_DIRECTORY = 'https://findahelpline.com';

/** A sensible first guess from the app language; the person can change it. */
export function defaultCountryFor(language: string): string {
  const map: Record<string, string> = { ka: 'GE', hy: 'AM', uk: 'UA', ru: 'RU', tr: 'TR', az: 'AZ', de: 'DE', fr: 'FR', es: 'ES', it: 'IT', pt: 'PT', pl: 'PL' };
  return map[language] ?? 'GE';
}
