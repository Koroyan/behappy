/**
 * Composed pieces for the Sound catalog, produced the way relaxation music on
 * YouTube and in sleep apps usually is: a slow chord change every ~16 s on soft
 * detuned pads over a quiet bass, a sparse felt-piano, harp or bell melody on
 * chord tones, singing bowls now and then, all in a long, dark reverb.
 *
 * Tuning: each piece is built over one tonic in just intonation. A frequency
 * piece puts the named frequency on that tonic (528 Hz = 4 × 132 Hz), and every
 * chord holds the tonic, so the pure tone sung over the music is part of each
 * chord and never clashes. A piece that carries a binaural tone keeps that band
 * free of any partial ("clear"), so nothing beats against it in one ear.
 *
 * Loops are seamless: voices that last the whole loop complete whole cycles in
 * it; other voices fade in and out and wrap around the loop's end; the reverb
 * runs circularly (ambient.ts). Deterministic: the same piece every time.
 */
import { addStrike, addVoice, BOWL_MODES, Job, normalize, rand01, reverb } from './ambient';

export type KeysVoice = 'piano' | 'harp' | 'bell';
export type Density = 'sparse' | 'medium' | 'rich';

export interface PieceDef {
  /** The tonic in Hz; chords, bass, scale and bowls are multiples of it. */
  root: number;
  /** Seconds per chord. The loop is chords.length × bar. */
  bar: number;
  /** Pad voicings, as multiples of the root (2 = an octave above). */
  chords: number[][];
  /** Bass note per chord, as a multiple of the root (a soft, nearly pure tone). */
  bass?: number[];
  keys?: { voice: KeysVoice; scale: number[]; density: Density };
  /** Singing bowls: fundamentals as multiples of the root, struck every `every` seconds. */
  bowls?: { ratios: number[]; every: number };
  /** Frequency bands (Hz) no partial may enter (a binaural tone lives there). */
  clear?: [number, number][];
  /** A darker colour: fewer overtones, a gentle low-pass (for sleep). */
  dark?: boolean;
  /** Target loudness (RMS) of the finished stem. */
  level?: number;
  seed: number;
}

export const loopOf = (p: PieceDef) => p.chords.length * p.bar;

const TAU = 2 * Math.PI;
const isOctave = (a: number, b: number) => {
  const l = Math.log2(a / b);
  return Math.abs(l - Math.round(l)) < 0.004;
};

/** Raised-cosine fade in and out over `f` seconds at the ends of a `dur`-second note. */
const fadeIO = (t: number, dur: number, f: number) => {
  const a = t < f ? 0.5 - 0.5 * Math.cos((Math.PI * t) / f) : 1;
  const b = t > dur - f ? 0.5 - 0.5 * Math.cos((Math.PI * Math.max(0, dur - t)) / f) : 1;
  return a * b;
};

/** Maximal runs of consecutive chords (circular) that contain a tone. */
export function circularRuns(has: boolean[]): { start: number; len: number }[] {
  const C = has.length;
  if (has.every(Boolean)) return [{ start: 0, len: C }];
  const off = has.indexOf(false);
  const runs: { start: number; len: number }[] = [];
  let i = 0;
  while (i < C) {
    const k = (off + 1 + i) % C;
    if (!has[k]) {
      i += 1;
      continue;
    }
    let len = 0;
    while (i + len < C && has[(off + 1 + i + len) % C]) len += 1;
    runs.push({ start: k, len });
    i += len;
  }
  return runs;
}

/** A note of the melody: time (s), frequency (Hz), velocity 0..1, pan −1..1. */
export interface Note {
  t: number;
  hz: number;
  vel: number;
  pan: number;
}

/** Onset patterns over a 16 s bar (scaled to the piece's bar). */
const PATTERNS: Record<Density, number[][]> = {
  sparse: [[1, 7], [0.5, 6.5, 10.5], [2, 9.5]],
  medium: [[0.5, 2.5, 4.5, 8.5], [1, 5, 9, 11], [0.5, 3.5, 6.5, 9.5, 12.5]],
  rich: [[0.5, 1.7, 2.9, 6.5, 8.9, 11.3], [0.5, 2, 3.5, 5, 8.5, 10, 11.5], [0.5, 1.5, 4.5, 5.5, 8.5, 12.5]],
};

/**
 * A slow, wandering melody on the piece's scale: small steps, chord tones on
 * the first and last note of each bar, a gentle arc of loudness, some bars
 * left nearly empty to breathe. Harp bars open with a short rising arpeggio.
 */
export function composeMelody(p: PieceDef, seconds: number): Note[] {
  if (!p.keys) return [];
  const rnd = rand01(p.seed * 7919 + 17);
  const bar = (seconds / loopOf(p)) * p.bar;
  const time = bar / 16;
  // Put the melody's middle around 450 Hz whatever the tonic.
  const mid = p.keys.scale[Math.floor(p.keys.scale.length / 2)] * p.root;
  const shift = Math.pow(2, Math.round(Math.log2(450 / mid)));
  const clear = p.clear || [];
  const ok = (hz: number) => !clear.some(([lo, hi]) => hz >= lo - 8 && hz <= hi + 8);
  const scale = p.keys.scale.map((x) => x * p.root * shift).filter(ok);
  if (!scale.length) return [];
  const chordTone = (hz: number, k: number) => p.chords[k].some((x) => isOctave(hz, x * p.root));
  const nearestChordTone = (i: number, k: number) => {
    for (const d of [0, 1, -1, 2, -2, 3, -3]) {
      const j = i + d;
      if (j >= 0 && j < scale.length && chordTone(scale[j], k)) return j;
    }
    return i;
  };
  const notes: Note[] = [];
  let idx = Math.floor(scale.length / 2);
  const steps = [-2, -1, -1, 1, 1, 2];
  for (let k = 0; k < p.chords.length; k += 1) {
    const t0 = k * bar;
    const sets = PATTERNS[p.keys.density];
    const onsets = sets[Math.floor(rnd() * sets.length)];
    if (p.keys.voice === 'harp') {
      // A short rising arpeggio of chord tones opens the bar.
      const tones = scale.map((hz, i) => [hz, i] as const).filter(([hz]) => chordTone(hz, k));
      const from = Math.max(0, Math.min(tones.length - 4, Math.floor(tones.length / 2) - 2));
      tones.slice(from, from + 4).forEach(([hz], j) => notes.push({ t: t0 + 0.2 + j * 0.34, hz, vel: 0.5 - j * 0.06, pan: -0.3 + j * 0.2 }));
    }
    onsets.forEach((o, j) => {
      const last = j === onsets.length - 1;
      idx = Math.max(0, Math.min(scale.length - 1, idx + steps[Math.floor(rnd() * steps.length)]));
      if (j === 0 || last || rnd() < 0.35) idx = nearestChordTone(idx, k);
      const arc = Math.sin((Math.PI * (j + 0.5)) / onsets.length);
      const vel = 0.42 + 0.3 * arc + 0.12 * rnd();
      const jitter = (rnd() - 0.5) * 0.08;
      notes.push({ t: t0 + (p.keys!.voice === 'harp' ? 2 : 0) * time + o * time + jitter, hz: scale[idx], vel, pan: (idx / Math.max(1, scale.length - 1) - 0.5) * 0.7 });
    });
    // The piano's left hand: a low chord tone at the start of most bars, for body.
    if (p.keys.voice === 'piano' && rnd() < 0.8) {
      const low = p.chords[k][0] * p.root * (p.chords[k][0] * p.root > 220 ? 0.5 : 1);
      if (ok(low)) notes.push({ t: t0 + 0.05, hz: low, vel: 0.32, pan: -0.25 });
    }
  }
  return notes.sort((a, b) => a.t - b.t);
}

/** A felt piano note: slightly stretched partials, two strings on the lowest two (slow beating), a soft hammer. */
function addPiano(L: Float32Array, R: Float32Array, sr: number, n: Note, ok: (hz: number) => boolean, phase: number) {
  const parts = n.hz < 250 ? 6 : n.hz < 500 ? 5 : 4;
  const t1 = Math.max(2.5, Math.min(8, 7 * Math.pow(200 / n.hz, 0.35)));
  for (let k = 1; k <= parts; k += 1) {
    const hz = k * n.hz * Math.sqrt(1 + 0.0001 * k * k);
    if (hz > 4500 || !ok(hz)) continue;
    const amp = (n.vel / Math.pow(k, 1.4)) * (k === 1 ? 1 : 0.5 + 0.5 * n.vel);
    const t60 = t1 / (1 + 0.45 * (k - 1));
    addStrike(L, R, sr, { t: n.t, hz, amp, t60, pan: n.pan, attack: 0.004, until: 50 }, phase + k);
    if (k <= 2 && ok(hz + 0.12 * k)) addStrike(L, R, sr, { t: n.t, hz: hz + 0.12 * k, amp: amp * 0.6, t60: t60 * 0.8, pan: n.pan * 0.5, attack: 0.004, until: 50 }, phase + k + 0.5);
  }
}

/** A plucked harp string: bright attack, partials falling off fast. */
function addHarp(L: Float32Array, R: Float32Array, sr: number, n: Note, ok: (hz: number) => boolean, phase: number) {
  for (let k = 1; k <= 5; k += 1) {
    const hz = k * n.hz;
    if (hz > 4500 || !ok(hz)) continue;
    addStrike(L, R, sr, { t: n.t, hz, amp: n.vel / Math.pow(k, 1.8), t60: 3.4 / (1 + 0.6 * (k - 1)), pan: n.pan, attack: 0.002, until: 50 }, phase + k);
  }
}

/** A soft bell: fundamental, a slightly detuned octave, a faint twelfth. */
function addBell(L: Float32Array, R: Float32Array, sr: number, n: Note, ok: (hz: number) => boolean, phase: number) {
  const parts: [number, number, number][] = [
    [n.hz, 1, 4.5],
    [2 * n.hz + 0.35, 0.28, 2.4],
    [3 * n.hz, 0.08, 1.1],
  ];
  for (const [hz, a, t60] of parts) if (ok(hz)) addStrike(L, R, sr, { t: n.t, hz, amp: n.vel * a, t60, pan: n.pan, attack: 0.005, until: 55 }, phase + hz);
}

/** A singing bowl strike: paired partials at bowl ratios (the slow "wah"). */
export function addBowl(L: Float32Array, R: Float32Array, sr: number, t: number, hz: number, vel: number, pan: number, ok: (hz: number) => boolean = () => true) {
  for (const [m, mode] of BOWL_MODES.entries()) {
    const attack = m === 0 ? 0.015 : 0.008;
    const f = hz * mode.r;
    if (ok(f)) addStrike(L, R, sr, { t, hz: f, amp: vel * mode.a, t60: mode.t60, pan: pan - 0.4, attack }, m + t);
    if (ok(f + mode.d)) addStrike(L, R, sr, { t, hz: f + mode.d, amp: vel * mode.a * 0.6, t60: mode.t60, pan: pan + 0.4, attack }, m * 2 + t);
  }
}

/** Gentle one-pole low-pass, run circularly so the loop stays seamless. */
function darken(x: Float32Array, a: number) {
  const n = x.length;
  let y = 0;
  for (let i = Math.max(0, n - 2000); i < n; i += 1) y += a * (x[i] - y);
  for (let i = 0; i < n; i += 1) {
    y += a * (x[i] - y);
    x[i] = y;
  }
}

export function* pieceJob(p: PieceDef, seconds: number, sr: number): Job {
  const n = Math.round(seconds * sr);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const C = p.chords.length;
  const bar = (seconds / loopOf(p)) * p.bar;
  const F = Math.min(5, bar * 0.35);
  const clear = p.clear || [];
  const ok = (hz: number) => !clear.some(([lo, hi]) => hz >= lo && hz <= hi);
  const snap = (hz: number) => Math.round(hz * seconds) / seconds;

  // Pad: each distinct tone sounds for its run of chords (a tone shared by
  // neighbouring chords simply carries on); detuned partner for shimmer.
  const tones = new Map<number, boolean[]>();
  p.chords.forEach((c, k) =>
    c.forEach((x) => {
      const key = Math.round(x * 1e4) / 1e4;
      const has = tones.get(key) || new Array(C).fill(false);
      has[k] = true;
      tones.set(key, has);
    })
  );
  let v = 0;
  for (const [x, has] of tones) {
    const f = p.root * x;
    if (!ok(f)) continue;
    const amp = Math.max(0.35, Math.min(1.1, Math.pow(260 / f, 0.6)));
    // No octave overtone where a chord already sounds that octave as its own note:
    // two near-equal components there would beat (a wobble).
    const octavePlayed = p.chords.some((c, k) => has[k] && c.some((y) => Math.abs(y - 2 * x) < 1e-6));
    const h2 = ok(2 * f) && !octavePlayed ? (p.dark ? 0.12 : 0.2) : 0;
    const h3 = ok(3 * f) && !p.dark ? 0.05 : 0;
    const detune = 0.05 * (1 + (v % 3));
    const side = v % 2 ? 1 : -1;
    for (const run of circularRuns(has)) {
      const full = run.len === C;
      const start = full ? 0 : Math.round((run.start * bar - F / 2) * sr);
      const length = full ? n : Math.round((run.len * bar + F) * sr);
      const dur = length / sr;
      const swell = full ? seconds / (2 + (v % 2)) : bar * (1.1 + 0.2 * (v % 3));
      const phase = v * 1.3;
      const env = (t: number) => amp * (0.86 + 0.14 * Math.sin((TAU * t) / swell + phase)) * (full ? 1 : fadeIO(t, dur, F));
      const bright = (t: number) => 0.6 + 0.4 * Math.sin((TAU * t) / (full ? seconds : bar * 1.7) + phase);
      addVoice(L, R, sr, { hz: full ? snap(f) : f, phase: v * 1.9, gainL: 0.62, gainR: 0.62, h2, h3, bright, env, start, length });
      const fd = f + detune;
      // The detuned partner gives shimmer where it matters (low and middle); high tones go without.
      // Kept well below the note: their slow beating then swells by a few dB instead of
      // nearly cancelling the note every few seconds (a wobble, seen in the spectrogram).
      if (ok(fd) && f < 600) addVoice(L, R, sr, { hz: full ? snap(fd) : fd, phase: v * 2.7 + 1, gainL: side < 0 ? 0.22 : 0.08, gainR: side < 0 ? 0.08 : 0.22, h2, h3, bright, env, start, length });
      yield;
    }
    v += 1;
  }

  // Bass: the chord's root, low and nearly pure, joined across repeated roots.
  // Short fades: two low notes overlapping for long sound muddy and rough.
  const FB = Math.min(1.5, bar * 0.1);
  if (p.bass) {
    const roots = new Map<number, boolean[]>();
    p.bass.forEach((x, k) => {
      const key = Math.round(x * 1e4) / 1e4;
      const has = roots.get(key) || new Array(C).fill(false);
      has[k] = true;
      roots.set(key, has);
    });
    for (const [x, has] of roots) {
      const f = p.root * x;
      if (!ok(f)) continue;
      for (const run of circularRuns(has)) {
        const full = run.len === C;
        const start = full ? 0 : Math.round((run.start * bar - FB / 2) * sr);
        const length = full ? n : Math.round((run.len * bar + FB) * sr);
        const dur = length / sr;
        const env = (t: number) => 0.75 * (0.85 + 0.15 * Math.sin((TAU * t) / (full ? seconds / 2 : bar))) * (full ? 1 : fadeIO(t, dur, FB));
        addVoice(L, R, sr, { hz: full ? snap(f) : f, phase: x, gainL: 0.65, gainR: 0.65, h2: ok(2 * f) ? 0.1 : 0, h3: 0, env, start, length });
        yield;
      }
    }
  }

  // Melody.
  const notes = composeMelody(p, seconds);
  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[i];
    const scaled = { ...note, vel: note.vel * 0.55 };
    if (p.keys?.voice === 'harp') addHarp(L, R, sr, scaled, ok, i);
    else if (p.keys?.voice === 'bell') addBell(L, R, sr, scaled, ok, i);
    else addPiano(L, R, sr, scaled, ok, i);
    if (i % 3 === 2) yield;
  }

  // Singing bowls, struck softly in turn.
  if (p.bowls) {
    const every = (seconds / loopOf(p)) * p.bowls.every;
    let j = 0;
    for (let t = 0.6; t < seconds - 0.1; t += every, j += 1) {
      const hz = p.root * p.bowls.ratios[j % p.bowls.ratios.length];
      addBowl(L, R, sr, t, hz, 0.35 + 0.15 * ((j * 7) % 3) / 2, j % 2 ? 0.3 : -0.3, ok);
      yield;
    }
  }

  if (p.dark) {
    darken(L, 0.6);
    darken(R, 0.6);
  }
  yield* reverb(L, R, sr, { t60: p.dark ? 6 : 5, dry: 0.8, wet: 0.55 });
  return normalize(L, R, sr, p.level ?? 0.085);
}
