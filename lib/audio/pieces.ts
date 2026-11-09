/**
 * The composed pieces behind the Sound catalog (rendered by music.ts).
 *
 * Harmony is just intonation over the tonic ("root"); voicings are multiples
 * of it. Every chord keeps the tonic (2 × root) or its octave, so a pure tone
 * on the tonic fits every chord. Progressions follow the habits of ambient and
 * sleep music: one chord every 16 s, I – vi – IV – Isus2 (major) or
 * i – VI – iv – i(add9) (minor), all over a tonic pedal.
 *
 * Frequency pieces: root = the frequency divided by a power of two (87–174 Hz),
 * so the named frequency is an octave of the tonic. Binaural pieces: the
 * carrier is 2 × root (200–240 Hz, where binaural beats are heard best) and its
 * band is kept clear of every partial.
 */
import type { PieceDef } from './music';

const MAJOR = [
  [2, 3, 4, 5], // I
  [2, 5 / 2, 10 / 3, 4], // vi over the tonic
  [2, 8 / 3, 10 / 3, 4], // IV over the tonic
  [2, 9 / 4, 3, 4], // I sus2
];
const MAJOR_BASS = [1, 5 / 6, 2 / 3, 1];
const MINOR = [
  [2, 12 / 5, 3, 4], // i
  [2, 12 / 5, 16 / 5, 4], // VI over the tonic
  [2, 8 / 3, 16 / 5, 4], // iv over the tonic
  [2, 9 / 4, 12 / 5, 3], // i add9
];
const MINOR_BASS = [1, 4 / 5, 2 / 3, 1];
/** Steady, little motion: for focus. */
const OPEN = [
  [2, 3, 4, 9 / 2],
  [2, 8 / 3, 10 / 3, 4],
  [2, 3, 4, 5],
  [2, 8 / 3, 4, 16 / 3],
];
/** One open chord, held: for drones under bowls, the sea or a fire. */
const DRONE = [[2, 3, 4, 5]];

export const MAJOR_PENTA = [2, 9 / 4, 5 / 2, 3, 10 / 3, 4, 9 / 2, 5, 6, 20 / 3, 8];
export const MINOR_PENTA = [2, 12 / 5, 8 / 3, 3, 18 / 5, 4, 24 / 5, 16 / 3, 6, 36 / 5, 8];

/** Tonic for a named frequency: an octave of it between 87 and 174 Hz. */
export const rootFor = (hz: number) => {
  let r = hz;
  while (r >= 174) r /= 2;
  while (r < 87) r *= 2;
  return r;
};

/** Band to keep free for a binaural pair (carrier, carrier + beat), with room either side. */
const around = (carrier: number, beat: number): [number, number][] => [[carrier - 25, carrier + beat + 25]];

const major = (root: number, seed: number, extra: Partial<PieceDef> = {}): PieceDef => ({ root, bar: 16, chords: MAJOR, bass: MAJOR_BASS, seed, ...extra });
const minor = (root: number, seed: number, extra: Partial<PieceDef> = {}): PieceDef => ({ root, bar: 16, chords: MINOR, bass: MINOR_BASS, seed, ...extra });

export const PIECES = {
  // Sleep
  delta: minor(100, 11, { keys: { voice: 'piano', scale: MINOR_PENTA, density: 'sparse' }, clear: around(200, 2), dark: true }),
  nocturne: minor(110, 12, { keys: { voice: 'piano', scale: MINOR_PENTA, density: 'medium' }, dark: true }),
  deep: { root: 82.5, bar: 32, chords: DRONE, bass: [1], dark: true, level: 0.08, seed: 13 },
  // Relax
  alpha: major(100, 21, { keys: { voice: 'harp', scale: MAJOR_PENTA, density: 'medium' }, clear: around(200, 10) }),
  bowls: major(110, 22, { bowls: { ratios: [3, 5 / 2], every: 8 } }),
  piano: major(132, 23, { keys: { voice: 'piano', scale: MAJOR_PENTA, density: 'rich' } }),
  bells: major(132, 24, { keys: { voice: 'bell', scale: MAJOR_PENTA, density: 'medium' } }),
  // Meditate
  theta: { root: 110, bar: 32, chords: DRONE, bass: [1], bowls: { ratios: [3, 5 / 2], every: 8 }, clear: around(220, 6), seed: 31 },
  tibetan: { root: 110, bar: 32, chords: DRONE, bass: [1], bowls: { ratios: [2, 3, 5 / 2], every: 5.33 }, dark: true, seed: 32 },
  // Focus
  focus: { root: 120, bar: 16, chords: OPEN, clear: around(240, 15), level: 0.075, seed: 41 },
  focusSoft: { root: 120, bar: 16, chords: OPEN, level: 0.075, seed: 42 },
  // Frequencies: the named frequency is an octave of the tonic.
  hz174: major(rootFor(174), 51, { keys: { voice: 'harp', scale: MAJOR_PENTA, density: 'medium' } }),
  hz285: minor(rootFor(285), 52, { keys: { voice: 'piano', scale: MINOR_PENTA, density: 'sparse' }, dark: true }),
  hz396: minor(rootFor(396), 53, { bowls: { ratios: [2, 3], every: 8 } }),
  hz417: major(rootFor(417), 54, { keys: { voice: 'bell', scale: MAJOR_PENTA, density: 'medium' } }),
  hz528: major(rootFor(528), 55, { keys: { voice: 'piano', scale: MAJOR_PENTA, density: 'medium' } }),
  hz639: major(rootFor(639), 56, { keys: { voice: 'harp', scale: MAJOR_PENTA, density: 'sparse' } }),
  hz741: minor(rootFor(741), 57, { keys: { voice: 'bell', scale: MINOR_PENTA, density: 'sparse' } }),
  hz852: major(rootFor(852), 58, { keys: { voice: 'piano', scale: MAJOR_PENTA, density: 'sparse' }, bowls: { ratios: [2, 3], every: 16 } }),
  hz963: { root: rootFor(963), bar: 32, chords: DRONE, bass: [1], keys: { voice: 'bell', scale: MAJOR_PENTA, density: 'sparse' }, bowls: { ratios: [2, 3], every: 8 }, seed: 59 },
  // Music tuned to A = 432 Hz (A2 = 108 Hz); no tone.
  a432: major(108, 60, { keys: { voice: 'piano', scale: MAJOR_PENTA, density: 'rich' } }),
} satisfies Record<string, PieceDef>;

export type PieceId = keyof typeof PIECES;
