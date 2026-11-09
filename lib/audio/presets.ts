/**
 * Starting mixes for each Sound Lab mode. Volumes start low (hearing comfort
 * over long listening); everything can be changed in the mixer.
 */
import type { MixLayer, SoundMode } from './soundStore';
import { binaural, BEAT_BANDS, BeatBand, NatureScene, NoiseColor, PadMood, SoundSpec, tones } from './synth';

export const noiseLayer = (color: NoiseColor, volume = 0.4): MixLayer => ({ id: `noise-${color}`, spec: { kind: 'noise', color }, volume });
export const natureLayer = (scene: NatureScene, volume = 0.4): MixLayer => ({ id: `nature-${scene}`, spec: { kind: 'nature', scene }, volume });
export const binauralLayer = (carrier: number, beat: number, volume = 0.25): MixLayer => ({ id: 'binaural', spec: binaural(carrier, beat), volume });
export const padLayer = (mood: PadMood, volume = 0.4): MixLayer => ({ id: `pad-${mood}`, spec: { kind: 'pad', mood }, volume });
export const tonesLayer = (hz: number[], volume = 0.3): MixLayer => ({ id: 'tones', spec: tones(hz), volume });

/** Ready mixes in the style of popular meditation tracks (no claims; see docs/ETHICS.md). */
export const STYLE_MIXES: { id: string; label: string; layers: () => MixLayer[] }[] = [
  { id: 'tones528-174', label: '528 + 174 Hz', layers: () => [padLayer('soft', 0.35), tonesLayer([174, 528], 0.3)] },
];

export const PRESETS: Record<SoundMode, { layers: MixLayer[]; minutes: number | null; timers: number[] }> = {
  focus: { layers: [noiseLayer('pink', 0.35)], minutes: 25, timers: [25, 50] },
  // A soft chord under the nature sound, the binaural tone quietly on top (as relaxing tracks do).
  sleep: { layers: [padLayer('deep', 0.35), natureLayer('rain', 0.3), noiseLayer('brown', 0.15)], minutes: 30, timers: [15, 30, 45, 60, 90] },
  relax: { layers: [padLayer('warm', 0.45), natureLayer('ocean', 0.3), binauralLayer(200, BEAT_BANDS.alpha.preset, 0.12)], minutes: 15, timers: [10, 15, 20, 30] },
  // Headache comfort: silence first. A very soft sound only if the person adds it.
  headache: { layers: [], minutes: 20, timers: [10, 20, 30] },
  mix: { layers: [padLayer('warm', 0.4), natureLayer('rain', 0.3)], minutes: null, timers: [15, 30, 60] },
};

/** Headache comfort: the sound stays very quiet whatever the slider says. */
export const HEADACHE_MAX_VOLUME = 0.15;

export const LIBRARY: SoundSpec[] = [
  { kind: 'pad', mood: 'warm' },
  { kind: 'pad', mood: 'deep' },
  { kind: 'noise', color: 'pink' },
  { kind: 'noise', color: 'brown' },
  { kind: 'noise', color: 'white' },
  { kind: 'nature', scene: 'rain' },
  { kind: 'nature', scene: 'ocean' },
  { kind: 'nature', scene: 'wind' },
  { kind: 'nature', scene: 'stream' },
];

export const layerFor = (spec: SoundSpec, volume = 0.35): MixLayer => (spec.kind === 'noise' ? noiseLayer(spec.color, volume) : spec.kind === 'nature' ? natureLayer(spec.scene, volume) : spec.kind === 'pad' ? padLayer(spec.mood, volume) : spec.kind === 'tones' ? { id: 'tones', spec, volume } : { id: 'binaural', spec, volume });

export const nameKey = (spec: SoundSpec) => (spec.kind === 'noise' ? spec.color : spec.kind === 'nature' ? spec.scene : spec.kind === 'pad' ? (spec.mood === 'warm' ? 'padWarm' : spec.mood === 'deep' ? 'padDeep' : 'padSoft') : spec.kind === 'tones' ? 'tones' : 'binaural');

export const bandOf = (beat: number): BeatBand | null => (Object.keys(BEAT_BANDS) as BeatBand[]).find((b) => beat >= BEAT_BANDS[b].min && beat <= BEAT_BANDS[b].max) ?? null;
