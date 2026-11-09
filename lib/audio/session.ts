/**
 * The one Sound Lab session that is playing (or paused), shared by the Sound
 * Lab screen, Calm now, the Sleep companion and the Today card. Keeps playing
 * when the screen is left; the timer works from absolute end times, so it is
 * right after the app was in the background.
 */
import { useEffect, useState } from 'react';

import { EngineState, prepareSounds as prepareSoundsNow, soundEngine } from './engine';

export { prepareSounds } from './engine';
import { MixLayer, recordSession, SoundMode } from './soundStore';

export interface SoundSessionState {
  mode: SoundMode;
  title: string;
  /** The catalog track playing (null: a mix from the mixer). */
  trackId: string | null;
  layers: MixLayer[];
  startedAt: number;
  /** When the timer ends (null: no timer). */
  endsAt: number | null;
  /** Fade-out length before the end. */
  fadeMs: number;
  state: EngineState;
  /** Paused by the system (call, other app), not by the person. */
  interrupted: boolean;
  /** The timer ran out (focus counts as completed). */
  finished: boolean;
}

let current: SoundSessionState | null = null;
/** Identifies the latest start (the session object itself is replaced on every state change). */
let startToken = 0;
const listeners = new Set<(s: SoundSessionState | null) => void>();
const emit = () => listeners.forEach((fn) => fn(current ? { ...current } : null));
let ticker: ReturnType<typeof setInterval> | null = null;
let fading = false;

soundEngine.onState((s) => {
  if (!current) return;
  // The engine paused without us asking: an interruption.
  current = { ...current, state: s, interrupted: s === 'paused' && current.state === 'playing' && !pausing ? true : current.interrupted && s !== 'playing' };
  emit();
});
let pausing = false;

function startTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    if (!current || current.state !== 'playing' || !current.endsAt) return;
    const left = current.endsAt - Date.now();
    if (!fading && left <= current.fadeMs) {
      fading = true;
      soundEngine.fadeTo(0, Math.max(0, left)).catch(() => {});
    }
    if (left <= 0) stopSound({ completed: true }).catch(() => {});
    emit();
  }, 1000);
}

function stopTicker() {
  if (ticker) clearInterval(ticker);
  ticker = null;
}

export function getSoundSession() {
  return current;
}

export function useSoundSession(): SoundSessionState | null {
  const [s, setS] = useState<SoundSessionState | null>(current);
  useEffect(() => {
    listeners.add(setS);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

export async function startSound(opts: { mode: SoundMode; title: string; layers: MixLayer[]; minutes: number | null; fadeMs?: number; trackId?: string | null }) {
  // Switching tracks: a short fade, then the new one.
  if (current) await stopSound({ completed: false, fadeMs: 400 });
  fading = false;
  const now = Date.now();
  current = {
    mode: opts.mode,
    title: opts.title,
    trackId: opts.trackId ?? null,
    layers: opts.layers,
    startedAt: now,
    endsAt: opts.minutes ? now + opts.minutes * 60000 : null,
    fadeMs: opts.fadeMs ?? (opts.mode === 'sleep' ? 60000 : 4000),
    state: 'loading',
    interrupted: false,
    finished: false,
  };
  emit();
  // Start with what is already generated; the rest is made now and fades in when ready.
  const token = ++startToken;
  const ready = await soundEngine.readyLayers(opts.layers);
  const later = ready.length && ready.length < opts.layers.length ? opts.layers.filter((l) => !ready.includes(l)) : [];
  if (later.length) prepareSoundsNow(later.map((l) => l.spec));
  await soundEngine.setLayers(later.length ? ready : opts.layers, opts.title);
  await soundEngine.play();
  startTicker();
  if (later.length && token === startToken && current) await soundEngine.setLayers(opts.layers, opts.title, { background: true });
}

export async function updateLayers(layers: MixLayer[]) {
  if (!current) return;
  current = { ...current, layers };
  emit();
  await soundEngine.setLayers(layers, current.title);
}

export function setLayerVolume(id: string, volume: number) {
  if (!current) return;
  current = { ...current, layers: current.layers.map((l) => (l.id === id ? { ...l, volume } : l)) };
  soundEngine.setVolume(id, volume);
  emit();
}

export const setMasterVolume = (v: number) => soundEngine.setMaster(v);

/** Sets the timer from now (null: until stopped). Lifts a fade that had begun. */
export function setSoundTimer(minutes: number | null) {
  if (!current) return;
  current = { ...current, endsAt: minutes ? Date.now() + minutes * 60000 : null };
  if (fading) {
    fading = false;
    if (current.state === 'playing') soundEngine.fadeTo(1, 1500).catch(() => {});
  }
  emit();
}

export async function pauseSound() {
  pausing = true;
  await soundEngine.pause();
  pausing = false;
  if (current) current = { ...current, interrupted: false };
  emit();
}

export async function resumeSound() {
  if (!current) return;
  current = { ...current, interrupted: false };
  await soundEngine.play(600);
  startTicker();
}

/** Stops with a fade and records the session (a minute or more). */
export async function stopSound({ completed, fadeMs = 1200 }: { completed: boolean; fadeMs?: number }) {
  const s = current;
  if (!s) return null;
  stopTicker();
  current = { ...s, finished: completed, state: 'stopped' };
  emit();
  await soundEngine.stop(fading ? 0 : fadeMs);
  fading = false;
  const session = await recordSession(s.mode, s.startedAt, s.layers, completed, s.trackId).catch(() => null);
  current = null;
  emit();
  lastFinished = completed ? { mode: s.mode, at: Date.now() } : null;
  return session;
}

/** The last session that ran out on its timer (for "focus done" / sleep notes). */
export let lastFinished: { mode: SoundMode; at: number } | null = null;
