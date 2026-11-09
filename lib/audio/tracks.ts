/**
 * The Sound catalog: finished tracks, ready to play with one tap, in the
 * categories people look for in sleep and meditation apps and on YouTube
 * (sleep, relax, meditate, focus, frequencies, nature, noise). Each track's
 * layers and volumes are designed together and level-matched, so nobody has
 * to adjust anything; the mixer remains for anyone who wants to.
 *
 * Frequency tracks are music built over a tonic that is an octave of the named
 * frequency, with a soft pure tone at exactly that frequency. Binaural tracks
 * carry a true stereo pair on the tonic (headphones). The app makes no claim
 * that any frequency or beat heals or changes the brain (docs/ETHICS.md); the
 * tests measure that each track holds the frequency its title names.
 */
import type { IconName } from '@/design';

import { binauralLayer, natureLayer, noiseLayer } from './presets';
import type { MixLayer, SoundMode } from './soundStore';
import { PieceId } from './pieces';
import { tones } from './synth';

export type TrackCategory = 'sleep' | 'relax' | 'meditate' | 'focus' | 'frequencies' | 'nature' | 'noise';
export const CATEGORIES: TrackCategory[] = ['sleep', 'relax', 'meditate', 'focus', 'frequencies', 'nature', 'noise'];

export interface Track {
  id: string;
  categories: TrackCategory[];
  /** For events and the timer's behaviour (sleep fades out over a minute). */
  mode: SoundMode;
  colors: [string, string];
  icon: IconName;
  /** Short label on the artwork, e.g. "528 Hz" or "α 10 Hz". */
  badge?: string;
  /** Default timer in minutes (null: until stopped). */
  minutes: number | null;
  /** A pure tone at exactly this frequency is part of the track. */
  hz?: number;
  /** A binaural pair: carrier in the left ear, carrier + beat in the right. */
  binaural?: { carrier: number; beat: number };
  layers: () => MixLayer[];
}

const piece = (id: PieceId, volume: number): MixLayer => ({ id: `piece-${id}`, spec: { kind: 'piece', id }, volume });
const tone = (hz: number, volume: number): MixLayer => ({ id: 'tones', spec: tones([hz]), volume });

/** A frequency track: music over a tonic an octave of `hz`, the tone itself, an optional nature bed. */
function frequency(hz: number, id: PieceId, colors: [string, string], toneVolume: number, extra: MixLayer[] = []): Track {
  return { id: `hz${hz}`, categories: ['frequencies'], mode: 'relax', colors, icon: 'pulse-outline', badge: `${hz} Hz`, minutes: 30, hz, layers: () => [piece(id, 0.55), tone(hz, toneVolume), ...extra] };
}

export const TRACKS: Track[] = [
  // Sleep
  { id: 'sleepDelta', categories: ['sleep'], mode: 'sleep', colors: ['#1E2A4A', '#46557F'], icon: 'moon-outline', badge: 'δ 2 Hz', minutes: 45, binaural: { carrier: 200, beat: 2 }, layers: () => [piece('delta', 0.5), natureLayer('rain', 0.18), binauralLayer(200, 2, 0.1)] },
  { id: 'sleepRainPiano', categories: ['sleep'], mode: 'sleep', colors: ['#243447', '#557089'], icon: 'rainy-outline', minutes: 45, layers: () => [piece('nocturne', 0.5), natureLayer('rain', 0.3)] },
  { id: 'sleepOcean', categories: ['sleep'], mode: 'sleep', colors: ['#14303F', '#2F6170'], icon: 'boat-outline', minutes: 45, layers: () => [piece('deep', 0.35), natureLayer('ocean', 0.4), noiseLayer('brown', 0.08)] },
  { id: 'sleepFire', categories: ['sleep', 'nature'], mode: 'sleep', colors: ['#3A1F1A', '#8A4B2C'], icon: 'bonfire-outline', minutes: 45, layers: () => [natureLayer('fire', 0.55), piece('deep', 0.25)] },
  { id: 'sleepNight', categories: ['sleep', 'nature'], mode: 'sleep', colors: ['#16202E', '#3A4D66'], icon: 'cloudy-night-outline', minutes: 45, layers: () => [natureLayer('night', 0.55), piece('deep', 0.18)] },
  // Relax
  { id: 'relaxAlpha', categories: ['relax'], mode: 'relax', colors: ['#2E5E63', '#7BA7A0'], icon: 'headset-outline', badge: 'α 10 Hz', minutes: 20, binaural: { carrier: 200, beat: 10 }, layers: () => [piece('alpha', 0.5), natureLayer('ocean', 0.22), binauralLayer(200, 10, 0.1)] },
  { id: 'relaxBowls', categories: ['relax', 'meditate'], mode: 'relax', colors: ['#5B4A6E', '#A792B7'], icon: 'radio-button-on-outline', minutes: 20, layers: () => [piece('bowls', 0.55), natureLayer('stream', 0.2)] },
  { id: 'relaxPiano', categories: ['relax'], mode: 'relax', colors: ['#4E5B72', '#93A6C4'], icon: 'musical-notes-outline', minutes: 20, layers: () => [piece('piano', 0.6)] },
  { id: 'relaxStream', categories: ['relax', 'nature'], mode: 'relax', colors: ['#2F5A46', '#82AE8C'], icon: 'leaf-outline', minutes: 20, layers: () => [natureLayer('stream', 0.4), piece('bells', 0.35)] },
  // Meditate
  { id: 'meditateTheta', categories: ['meditate'], mode: 'relax', colors: ['#4A3B5E', '#8E79A8'], icon: 'flower-outline', badge: 'θ 6 Hz', minutes: 20, binaural: { carrier: 220, beat: 6 }, layers: () => [piece('theta', 0.55), binauralLayer(220, 6, 0.1)] },
  { id: 'meditateBowls', categories: ['meditate'], mode: 'relax', colors: ['#6B4E2E', '#B88E5A'], icon: 'radio-button-on-outline', minutes: 20, layers: () => [piece('tibetan', 0.6)] },
  // Focus
  { id: 'focusBeta', categories: ['focus'], mode: 'focus', colors: ['#2C4A5A', '#6E98A8'], icon: 'bulb-outline', badge: 'β 15 Hz', minutes: 25, binaural: { carrier: 240, beat: 15 }, layers: () => [piece('focus', 0.45), noiseLayer('pink', 0.1), binauralLayer(240, 15, 0.1)] },
  { id: 'focusRain', categories: ['focus'], mode: 'focus', colors: ['#34495E', '#7F93A6'], icon: 'rainy-outline', minutes: 25, layers: () => [natureLayer('rain', 0.45), piece('focusSoft', 0.25)] },
  // Frequencies (music over a tonic an octave of the frequency, plus the tone)
  frequency(174, 'hz174', ['#5A2E46', '#A35C7E'], 0.3, [natureLayer('stream', 0.12)]),
  frequency(285, 'hz285', ['#5E3A2E', '#A86E55'], 0.26, [natureLayer('rain', 0.12)]),
  frequency(396, 'hz396', ['#6B3B2B', '#B4673F'], 0.22),
  frequency(417, 'hz417', ['#6A5A2B', '#B5A050'], 0.22, [natureLayer('ocean', 0.14)]),
  frequency(528, 'hz528', ['#2F6B4F', '#5FB08A'], 0.2),
  frequency(639, 'hz639', ['#2B5E6B', '#4FA3B5'], 0.18, [natureLayer('stream', 0.12)]),
  frequency(741, 'hz741', ['#2B4A7A', '#5B84C8'], 0.16),
  frequency(852, 'hz852', ['#3E3A7A', '#7A72C8'], 0.15),
  frequency(963, 'hz963', ['#5A3A7A', '#A07AC8'], 0.14),
  { id: 'hz432', categories: ['frequencies', 'meditate'], mode: 'relax', colors: ['#3A5A3A', '#7FA87F'], icon: 'musical-note-outline', badge: '432 Hz', minutes: 30, layers: () => [piece('a432', 0.6)] },
  {
    id: 'hz528x174',
    categories: ['frequencies'],
    mode: 'relax',
    colors: ['#2F5E5A', '#8FC0B0'],
    icon: 'pulse-outline',
    badge: '528 + 174',
    minutes: 30,
    hz: 528,
    layers: () => [
      { id: 'pad-soft', spec: { kind: 'pad', mood: 'soft' }, volume: 0.4 },
      { id: 'tones', spec: tones([174, 528]), volume: 0.25 },
      { id: 'bowls-soft', spec: { kind: 'bowls', mood: 'soft' }, volume: 0.22 },
      { id: 'chimes-soft', spec: { kind: 'chimes', mood: 'soft' }, volume: 0.13 },
    ],
  },
  // Nature
  { id: 'natureRain', categories: ['nature', 'sleep'], mode: 'sleep', colors: ['#2D4256', '#6B8AA6'], icon: 'rainy-outline', minutes: 45, layers: () => [natureLayer('rain', 0.7)] },
  { id: 'natureOcean', categories: ['nature'], mode: 'relax', colors: ['#1F4A5E', '#4F8FA8'], icon: 'water-outline', minutes: 30, layers: () => [natureLayer('ocean', 0.7)] },
  { id: 'natureStream', categories: ['nature'], mode: 'relax', colors: ['#2E5A44', '#6FA585'], icon: 'leaf-outline', minutes: 30, layers: () => [natureLayer('stream', 0.7)] },
  // Noise
  { id: 'noiseBrown', categories: ['noise', 'sleep'], mode: 'sleep', colors: ['#4E3A2E', '#8E6E55'], icon: 'radio-outline', minutes: 60, layers: () => [noiseLayer('brown', 0.6)] },
  { id: 'noisePink', categories: ['noise', 'focus'], mode: 'focus', colors: ['#6E4E5E', '#B98EA3'], icon: 'radio-outline', minutes: 25, layers: () => [noiseLayer('pink', 0.5)] },
  { id: 'noiseWhite', categories: ['noise'], mode: 'focus', colors: ['#5E6670', '#A9B1BA'], icon: 'radio-outline', minutes: 25, layers: () => [noiseLayer('white', 0.35)] },
];

/**
 * Loudness matching: each track's gain brings it to the catalog's median
 * loudness (K-weighted, ITU BS.1770, as the app mixes it), so moving from one
 * track to another never jumps in volume. Measured by
 * lib/audio/tracks.test.mjs, which fails if a track drifts more than 2 dB.
 */
export const LEVEL: Record<string, number> = {"sleepDelta":1.02,"sleepRainPiano":0.98,"sleepOcean":1.11,"sleepFire":1.23,"sleepNight":1.35,"relaxAlpha":1,"relaxBowls":0.98,"relaxPiano":0.94,"relaxStream":1.06,"meditateTheta":1.01,"meditateBowls":0.96,"focusBeta":1.23,"focusRain":1.14,"hz174":0.84,"hz285":0.83,"hz396":0.91,"hz417":1.07,"hz528":1.07,"hz639":1.04,"hz741":1.04,"hz852":1.01,"hz963":1,"hz432":0.95,"hz528x174":1,"natureRain":0.82,"natureOcean":0.84,"natureStream":0.8,"noiseBrown":0.75,"noisePink":0.96,"noiseWhite":0.62}; // prettier-ignore

/** The layers to play: the designed mix at the track's matched level. */
export const trackLayers = (t: Track): MixLayer[] => t.layers().map((l) => ({ ...l, volume: Math.min(1, Math.round(l.volume * (LEVEL[t.id] ?? 1) * 1000) / 1000) }));

export const trackById = (id: string | undefined | null) => TRACKS.find((t) => t.id === id) ?? null;

/** What fits the hour: sleep at night, focus in working hours, relax around them. */
export const categoryForHour = (hour: number): TrackCategory => (hour >= 21 || hour < 5 ? 'sleep' : hour >= 9 && hour < 17 ? 'focus' : 'relax');
const DEFAULT_FOR: Partial<Record<TrackCategory, string>> = { sleep: 'sleepRainPiano', focus: 'focusRain', relax: 'relaxPiano' };

/** One track to offer with one tap: the person's latest in that category, else a gentle default. */
export function suggestTrack(category: TrackCategory, recentIds: (string | undefined)[]): Track {
  const own = recentIds.map((id) => trackById(id)).find((t) => t && t.categories.includes(category));
  return own ?? trackById(DEFAULT_FOR[category] ?? 'relaxPiano')!;
}
export const tracksIn = (c: TrackCategory) => TRACKS.filter((t) => t.categories.includes(c));
