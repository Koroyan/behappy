/**
 * Starting mixes for each Sound Lab mode. Volumes start low (hearing comfort
 * over long listening); everything can be changed in the mixer.
 */
import type { MixLayer, SoundMode } from './soundStore';
import { binaural, BEAT_BANDS, BeatBand, NatureScene, NoiseColor, SoundSpec } from './synth';

export const noiseLayer = (color: NoiseColor, volume = 0.4): MixLayer => ({ id: `noise-${color}`, spec: { kind: 'noise', color }, volume });
export const natureLayer = (scene: NatureScene, volume = 0.4): MixLayer => ({ id: `nature-${scene}`, spec: { kind: 'nature', scene }, volume });
export const binauralLayer = (carrier: number, beat: number, volume = 0.25): MixLayer => ({ id: 'binaural', spec: binaural(carrier, beat), volume });

export const PRESETS: Record<SoundMode, { layers: MixLayer[]; minutes: number | null; timers: number[] }> = {
  focus: { layers: [noiseLayer('pink', 0.35)], minutes: 25, timers: [25, 50] },
  sleep: { layers: [noiseLayer('brown', 0.35), natureLayer('rain', 0.25)], minutes: 30, timers: [15, 30, 45, 60, 90] },
  relax: { layers: [natureLayer('ocean', 0.4), binauralLayer(200, BEAT_BANDS.alpha.preset, 0.2)], minutes: 15, timers: [10, 15, 20, 30] },
  // Headache comfort: silence first. A very soft sound only if the person adds it.
  headache: { layers: [], minutes: 20, timers: [10, 20, 30] },
  mix: { layers: [natureLayer('rain', 0.35)], minutes: null, timers: [15, 30, 60] },
};

/** Headache comfort: the sound stays very quiet whatever the slider says. */
export const HEADACHE_MAX_VOLUME = 0.15;

export const LIBRARY: SoundSpec[] = [
  { kind: 'noise', color: 'pink' },
  { kind: 'noise', color: 'brown' },
  { kind: 'noise', color: 'white' },
  { kind: 'nature', scene: 'rain' },
  { kind: 'nature', scene: 'ocean' },
  { kind: 'nature', scene: 'wind' },
  { kind: 'nature', scene: 'stream' },
];

export const layerFor = (spec: SoundSpec, volume = 0.35): MixLayer => (spec.kind === 'noise' ? noiseLayer(spec.color, volume) : spec.kind === 'nature' ? natureLayer(spec.scene, volume) : { id: 'binaural', spec, volume });

export const nameKey = (spec: SoundSpec) => (spec.kind === 'noise' ? spec.color : spec.kind === 'nature' ? spec.scene : 'binaural');

export const bandOf = (beat: number): BeatBand | null => (Object.keys(BEAT_BANDS) as BeatBand[]).find((b) => beat >= BEAT_BANDS[b].min && beat <= BEAT_BANDS[b].max) ?? null;
