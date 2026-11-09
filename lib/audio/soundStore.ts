/**
 * Sound Lab favourites, history and preferences (@behappy_sound_v1).
 * Listening sessions also become events (sound.session, focus.completed,
 * sleep.bedtime) for Steps, badges and the recap.
 */
import { publish, readJson, uid, writeJson } from '@/lib/storage/json';
import { recordEvent } from '@/lib/wellbeing/eventStore';

import type { SoundSpec } from './synth';

const KEY = '@behappy_sound_v1';
export const SOUND_TOPIC = 'sound';

export type SoundMode = 'focus' | 'sleep' | 'relax' | 'headache' | 'mix';

export interface MixLayer {
  id: string;
  spec: SoundSpec;
  volume: number;
}

export interface SavedMix {
  id: string;
  name: string;
  mode: SoundMode;
  layers: MixLayer[];
  createdAt: number;
}

export interface SoundSession {
  id: string;
  mode: SoundMode;
  startedAt: number;
  minutes: number;
  /** Layer kinds only (e.g. "noise-brown"), for history. */
  layers: string[];
  completed: boolean;
  /** The catalog track, when one was played. */
  trackId?: string;
}

interface SoundData {
  v: 1;
  favorites: SavedMix[];
  history: SoundSession[];
  master: number;
  /** The person confirmed they understand binaural beats need headphones. */
  headphonesNoted: boolean;
  /** Ask "how did you sleep?" the morning after a sleep session. */
  morningCheckIn: boolean;
}

export async function loadSound(): Promise<SoundData> {
  const raw = await readJson<Partial<SoundData>>(KEY, {});
  return { v: 1, favorites: raw.favorites || [], history: raw.history || [], master: typeof raw.master === 'number' ? raw.master : 0.5, headphonesNoted: Boolean(raw.headphonesNoted), morningCheckIn: raw.morningCheckIn !== false };
}

async function update(fn: (d: SoundData) => SoundData) {
  const d = fn(await loadSound());
  await writeJson(KEY, d);
  publish(SOUND_TOPIC);
  return d;
}

export const setSoundPrefs = (patch: Partial<Pick<SoundData, 'master' | 'headphonesNoted' | 'morningCheckIn'>>) => update((d) => ({ ...d, ...patch }));

export async function saveFavorite(name: string, mode: SoundMode, layers: MixLayer[]) {
  const mix: SavedMix = { id: uid('mix'), name: name.trim().slice(0, 40) || 'Mix', mode, layers, createdAt: Date.now() };
  await update((d) => ({ ...d, favorites: [mix, ...d.favorites].slice(0, 30) }));
  return mix;
}

export const removeFavorite = (id: string) => update((d) => ({ ...d, favorites: d.favorites.filter((f) => f.id !== id) }));

const layerKey = (l: MixLayer) => (l.spec.kind === 'binaural' ? `binaural-${l.spec.leftHz}/${l.spec.rightHz}` : l.spec.kind === 'noise' ? `noise-${l.spec.color}` : l.spec.kind === 'pad' ? `pad-${l.spec.mood}` : l.spec.kind === 'tones' ? `tones-${l.spec.hz.join('+')}` : l.spec.kind === 'bowls' || l.spec.kind === 'chimes' ? `${l.spec.kind}-${l.spec.mood}` : l.spec.kind === 'piece' ? `piece-${l.spec.id}` : `nature-${l.spec.scene}`);

/**
 * A finished listening session (stopped by the person or by its timer).
 * Under a minute is not recorded. Focus counts as completed only when the
 * timer ran out; sleep sessions mark bedtime.
 */
export async function recordSession(mode: SoundMode, startedAt: number, layers: MixLayer[], completed: boolean, trackId?: string | null) {
  const minutes = Math.round((Date.now() - startedAt) / 60000);
  if (minutes < 1) return null;
  const session: SoundSession = { id: uid('snd'), mode, startedAt, minutes, layers: layers.map(layerKey), completed, ...(trackId ? { trackId } : {}) };
  await update((d) => ({ ...d, history: [session, ...d.history].slice(0, 200) }));
  await recordEvent('sound.session', session.id, { mode, minutes }, startedAt);
  if (mode === 'focus' && completed) await recordEvent('focus.completed', session.id, { minutes }, Date.now());
  if (mode === 'sleep') await recordEvent('sleep.bedtime', `sound:${session.id}`, { minutes }, startedAt);
  return session;
}
