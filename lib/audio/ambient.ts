/**
 * Music-like Sound Lab layers, built the way relaxation tracks are usually
 * produced: slowly drifting chords of slightly detuned voices, singing bowls
 * with their beating partials, sparse soft bells, everything in a long, dark
 * reverb. Generated on the device like every other sound (see synth.ts, which
 * holds the tunings; this file is only the signal processing).
 *
 * Every layer loops without a seam: chord voices complete whole cycles in the
 * loop, struck sounds wrap their tails around its end, and the reverb runs
 * circularly (the loop is played through it until the tail has settled).
 *
 * Renderers are generators that yield every few milliseconds of work, so a
 * phone can render in the background without freezing the screen
 * (runJobAsync); runJob simply runs them through.
 */
import type { Pcm } from './synth';

export type Job = Generator<void, Pcm, void>;

/**
 * Musical layers keep every partial below 4.5 kHz: 12 kHz holds them all and
 * keeps rendering light on phones (which run JavaScript without a JIT).
 */
export const MUSIC_RATE = 12000;

const TAU = 2 * Math.PI;
const BLOCK = 64;

export interface PadNote {
  hz: number;
  amp: number;
  /** Octave and twelfth, relative to the note (0 = none: keeps a band clear). */
  h2: number;
  h3: number;
}

export interface Voice {
  hz: number;
  phase: number;
  gainL: number;
  gainR: number;
  h2: number;
  h3: number;
  /** Multiplies h2/h3 over time: a slowly opening and closing tone colour. */
  bright?: (t: number) => number;
  env: (t: number) => number;
  start: number;
  length: number;
}

/**
 * Adds one oscillator. A rotating phasor gives sin and cos each sample; the
 * octave and twelfth come from the same phasor (sin 2θ = 2 sin θ cos θ,
 * sin 3θ = 3 sin θ − 4 sin³ θ), so a rich voice costs about one sine.
 * Writes wrap around the end of the buffer (struck tails continue at the start).
 */
export function addVoice(L: Float32Array, R: Float32Array, sr: number, v: Voice) {
  const n = L.length;
  const w = (TAU * v.hz) / sr;
  const c = Math.cos(w);
  const s = Math.sin(w);
  let x = Math.cos(v.phase);
  let y = Math.sin(v.phase);
  let idx = ((v.start % n) + n) % n;
  const gl = v.gainL;
  const gr = v.gainR;
  const len = v.length;
  for (let b = 0; b < len; b += BLOCK) {
    const end = Math.min(len, b + BLOCK);
    let e = v.env(b / sr);
    const de = (v.env(end / sr) - e) / (end - b);
    const br = v.bright ? v.bright(b / sr) : 1;
    const a2 = 2 * v.h2 * br;
    const a3 = v.h3 * br;
    for (let i = b; i < end; i += 1) {
      const out = e * y * (1 + a2 * x + a3 * (3 - 4 * y * y));
      L[idx] += gl * out;
      R[idx] += gr * out;
      const nx = x * c - y * s;
      y = x * s + y * c;
      x = nx;
      e += de;
      idx += 1;
      if (idx === n) idx = 0;
    }
    const r = 1 / Math.sqrt(x * x + y * y);
    x *= r;
    y *= r;
  }
}

/**
 * Reverb: an 8-line feedback delay network (Householder mixing, a low-pass in
 * every line for a dark tail, the wet signal high-passed at ~150 Hz so the low
 * end stays clear).
 *
 * Phones run JavaScript without a JIT, so it is written for that: the eight
 * lines are unrolled into local variables, and it runs at half the sample
 * rate (the tail is dark: nothing above a few kHz is lost).
 */
interface Fdn {
  b: Float32Array[];
  p: number[];
  z: number[];
  g: number[];
  pre: Float32Array;
  pp: number;
  hp: number;
  hpL: number;
  hpR: number;
  lastL: number;
  lastR: number;
}

function makeFdn(sr: number, t60: number): Fdn {
  const lens = [1031, 1327, 1523, 1801, 2063, 2411, 2633, 2939].map((b) => Math.max(16, Math.round((b * sr) / 24000)));
  const rc = 1 / (TAU * 150);
  return {
    b: lens.map((len) => new Float32Array(len)),
    p: lens.map(() => 0),
    z: lens.map(() => 0),
    g: lens.map((len) => Math.pow(10, (-3 * len) / (sr * t60))),
    pre: new Float32Array(Math.max(1, Math.round(0.024 * sr))),
    pp: 0,
    hp: rc / (rc + 1 / sr),
    hpL: 0,
    hpR: 0,
    lastL: 0,
    lastR: 0,
  };
}

/** Feeds input[from, to) through the network; writes the wet stereo signal when outL/outR are given. */
function fdnRun(st: Fdn, input: Float32Array, from: number, to: number, outL: Float32Array | null, outR: Float32Array | null) {
  const [b0, b1, b2, b3, b4, b5, b6, b7] = st.b;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = st.g;
  const n0 = b0.length, n1 = b1.length, n2 = b2.length, n3 = b3.length, n4 = b4.length, n5 = b5.length, n6 = b6.length, n7 = b7.length; // prettier-ignore
  let [p0, p1, p2, p3, p4, p5, p6, p7] = st.p;
  let [z0, z1, z2, z3, z4, z5, z6, z7] = st.z;
  const pre = st.pre;
  const pn = pre.length;
  let pp = st.pp;
  const hp = st.hp;
  let { hpL, hpR, lastL, lastR } = st;
  const d = 0.5;
  for (let i = from; i < to; i += 1) {
    const x = 0.35 * pre[pp];
    pre[pp] = input[i];
    pp = pp + 1 === pn ? 0 : pp + 1;
    z0 += d * (b0[p0] - z0);
    z1 += d * (b1[p1] - z1);
    z2 += d * (b2[p2] - z2);
    z3 += d * (b3[p3] - z3);
    z4 += d * (b4[p4] - z4);
    z5 += d * (b5[p5] - z5);
    z6 += d * (b6[p6] - z6);
    z7 += d * (b7[p7] - z7);
    const s = 0.25 * (z0 + z1 + z2 + z3 + z4 + z5 + z6 + z7);
    b0[p0] = g0 * (z0 - s) + x;
    b1[p1] = g1 * (z1 - s) - x;
    b2[p2] = g2 * (z2 - s) + x;
    b3[p3] = g3 * (z3 - s) - x;
    b4[p4] = g4 * (z4 - s) + x;
    b5[p5] = g5 * (z5 - s) - x;
    b6[p6] = g6 * (z6 - s) + x;
    b7[p7] = g7 * (z7 - s) - x;
    p0 = p0 + 1 === n0 ? 0 : p0 + 1;
    p1 = p1 + 1 === n1 ? 0 : p1 + 1;
    p2 = p2 + 1 === n2 ? 0 : p2 + 1;
    p3 = p3 + 1 === n3 ? 0 : p3 + 1;
    p4 = p4 + 1 === n4 ? 0 : p4 + 1;
    p5 = p5 + 1 === n5 ? 0 : p5 + 1;
    p6 = p6 + 1 === n6 ? 0 : p6 + 1;
    p7 = p7 + 1 === n7 ? 0 : p7 + 1;
    const wl = z0 - z2 + z4 - z6;
    const wr = z1 - z3 + z5 - z7;
    hpL = hp * (hpL + wl - lastL);
    hpR = hp * (hpR + wr - lastR);
    lastL = wl;
    lastR = wr;
    if (outL && outR) {
      outL[i] = hpL;
      outR[i] = hpR;
    }
  }
  st.p = [p0, p1, p2, p3, p4, p5, p6, p7];
  st.z = [z0, z1, z2, z3, z4, z5, z6, z7];
  st.pp = pp;
  Object.assign(st, { hpL, hpR, lastL, lastR });
}

/**
 * Circular reverb, so the loop stays seamless: the network first hears the
 * last 1.5 × T60 of the loop (the tail that rings into its start), then the
 * whole loop once, which is kept. Runs at half rate on a mono input; the wet
 * signal is interpolated back and mixed in (dry · x + wet · reverb).
 */
export function* reverb(L: Float32Array, R: Float32Array, sr: number, o: { t60: number; dry: number; wet: number }): Generator<void, void, void> {
  const n = L.length;
  const m = Math.ceil(n / 2);
  const rate = sr / 2;
  const input = new Float32Array(m);
  for (let j = 0; j < m; j += 1) {
    const a = 2 * j;
    const b = Math.min(n - 1, a + 1);
    input[j] = 0.25 * (L[a] + R[a] + L[b] + R[b]);
  }
  const st = makeFdn(rate, o.t60);
  const CHUNK = 8192;
  let warm = Math.round(1.2 * o.t60 * rate);
  while (warm > 0) {
    const from = Math.max(0, m - warm);
    for (let i = from; i < m; i += CHUNK) {
      fdnRun(st, input, i, Math.min(m, i + CHUNK), null, null);
      yield;
    }
    warm -= m - from;
  }
  const wetL = new Float32Array(m);
  const wetR = new Float32Array(m);
  for (let i = 0; i < m; i += CHUNK) {
    fdnRun(st, input, i, Math.min(m, i + CHUNK), wetL, wetR);
    yield;
  }
  const { dry, wet } = o;
  for (let i = 0; i < n; i += 1) {
    const j = i >> 1;
    const k = j + 1 === m ? 0 : j + 1;
    const wl = i & 1 ? 0.5 * (wetL[j] + wetL[k]) : wetL[j];
    const wr = i & 1 ? 0.5 * (wetR[j] + wetR[k]) : wetR[j];
    L[i] = dry * L[i] + wet * wl;
    R[i] = dry * R[i] + wet * wr;
  }
}

/** Scales to a calm level (RMS), never above 0.89 peak. */
export function normalize(L: Float32Array, R: Float32Array, sr: number, target: number): Pcm {
  let sq = 0;
  let peak = 0;
  for (let i = 0; i < L.length; i += 1) {
    sq += L[i] * L[i] + R[i] * R[i];
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const level = Math.sqrt(sq / Math.max(1, 2 * L.length));
  let k = level > 0 ? target / level : 1;
  if (peak * k > 0.89) k = 0.89 / peak;
  for (let i = 0; i < L.length; i += 1) {
    L[i] *= k;
    R[i] *= k;
  }
  return { sampleRate: sr, left: L, right: R };
}

export const panGains = (pan: number): [number, number] => [Math.cos(((pan + 1) * Math.PI) / 4), Math.sin(((pan + 1) * Math.PI) / 4)];

/**
 * A chord that breathes: each note is three voices — one in the centre, two
 * detuned by 0.05–0.15 Hz to the left and right (a slow shimmer, never a
 * wobble); notes swell on their own and their tone colour opens and closes.
 * Detunings are multiples of 0.05 Hz, so a 20 s loop holds whole cycles.
 */
export function* padJob(notes: PadNote[], seconds: number, sr: number): Job {
  const n = Math.round(seconds * sr);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let k = 0; k < notes.length; k += 1) {
    const { hz, amp, h2, h3 } = notes[k];
    const delta = 0.05 * (1 + (k % 3));
    const swells = 1 + (k % 2);
    const env = (t: number) => amp * (0.62 + 0.38 * Math.sin((TAU * swells * t) / seconds + k * 1.7));
    const bright = (t: number) => 0.55 + 0.45 * Math.sin((TAU * t) / seconds + k * 0.9 + 1);
    const voices: [number, number, number][] = [
      [0, 0.7, 0.7],
      [-delta, 0.42, 0.22],
      [delta, 0.22, 0.42],
    ];
    for (const [d, gl, gr] of voices) {
      addVoice(L, R, sr, { hz: hz + d, phase: k * 2.1 + d * 37, gainL: gl, gainR: gr, h2, h3, bright, env, start: 0, length: n });
      yield;
    }
  }
  yield* reverb(L, R, sr, { t60: 5, dry: 0.8, wet: 0.5 });
  return normalize(L, R, sr, 0.09);
}

/** Pure tones, the same in both ears (not binaural), each swelling slowly, in the same reverb. */
export function* tonesJob(hz: number[], seconds: number, sr: number): Job {
  const n = Math.round(seconds * sr);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const sorted = [...hz].sort((a, b) => a - b);
  for (let k = 0; k < sorted.length; k += 1) {
    const amp = k === 0 ? 1 : 0.55;
    const env = (t: number) => amp * (0.65 + 0.35 * Math.sin((TAU * (1 + k) * t) / seconds + k));
    addVoice(L, R, sr, { hz: sorted[k], phase: k, gainL: 0.7, gainR: 0.7, h2: 0, h3: 0, env, start: 0, length: n });
    yield;
  }
  yield* reverb(L, R, sr, { t60: 4, dry: 0.85, wet: 0.35 });
  return normalize(L, R, sr, 0.055);
}

export interface Strike {
  t: number;
  hz: number;
  amp: number;
  t60: number;
  pan: number;
  attack: number;
  /** Stop once the note has decayed this many dB (default 70; 50 is plenty inside a reverb). */
  until?: number;
}

/** Struck partials: a soft (raised-cosine) attack, then an exponential decay to −70 dB; tails wrap around the loop. */
export function addStrike(L: Float32Array, R: Float32Array, sr: number, s: Strike, phase: number) {
  const n = L.length;
  const k = 6.9078 / s.t60; // −60 dB at t60
  const length = Math.min(n - 1, Math.round((s.attack + (s.t60 * (s.until ?? 70)) / 60) * sr));
  const [gainL, gainR] = panGains(s.pan);
  const env = (t: number) => s.amp * (t < s.attack ? 0.5 - 0.5 * Math.cos((Math.PI * t) / s.attack) : Math.exp(-k * (t - s.attack)));
  addVoice(L, R, sr, { hz: s.hz, phase, gainL, gainR, h2: 0, h3: 0, env, start: Math.round(s.t * sr), length });
}

/**
 * Singing bowls: modal partials at the ratios of a thin bowl (≈ 1 : 2.83 :
 * 5.42 : 8.77), each a close pair (0.7–2.9 Hz apart, as in real bowls, whose
 * slight asymmetry makes them "wah" slowly), panned apart; higher partials die
 * first. Struck softly, four times per loop, two bowls alternating.
 */
export const BOWL_MODES = [
  { r: 1, a: 1, t60: 14, d: 0.7 },
  { r: 2.83, a: 0.5, t60: 8, d: 1.3 },
  { r: 5.42, a: 0.24, t60: 4.5, d: 2.1 },
  { r: 8.77, a: 0.1, t60: 2.5, d: 2.9 },
];
const BOWL_STRIKES: [number, number, number][] = [
  [0.4, 0, 1],
  [7.9, 1, 0.65],
  [15.2, 0, 0.8],
  [22.8, 1, 0.55],
];
export function* bowlsJob(bowls: number[], seconds: number, sr: number): Job {
  const n = Math.round(seconds * sr);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const scale = seconds / 30;
  for (const [t, b, v] of BOWL_STRIKES) {
    const hz = bowls[b % bowls.length];
    const pan = b % 2 ? 0.3 : -0.3;
    for (const [m, mode] of BOWL_MODES.entries()) {
      const attack = m === 0 ? 0.015 : 0.008;
      addStrike(L, R, sr, { t: t * scale, hz: hz * mode.r, amp: v * mode.a, t60: mode.t60, pan: pan - 0.4, attack }, m + t);
      addStrike(L, R, sr, { t: t * scale, hz: hz * mode.r + mode.d, amp: v * mode.a * 0.6, t60: mode.t60, pan: pan + 0.4, attack }, m * 2 + t);
      yield;
    }
  }
  yield* reverb(L, R, sr, { t60: 5.5, dry: 0.8, wet: 0.5 });
  return normalize(L, R, sr, 0.06);
}

/** Small deterministic PRNG in [0, 1) (the same melody every time). */
export function rand01(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * Soft bells: a sparse, wandering melody on notes that sit well with the
 * chord, 2.6–5.8 s apart, sometimes a second note just after; each a bell-like
 * tone (fundamental, a slightly detuned octave, a faint twelfth) in a wide
 * reverb.
 */
export function* chimesJob(notes: number[], seconds: number, sr: number, seed = 1): Job {
  const n = Math.round(seconds * sr);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const rnd = rand01(seed * 2654435761);
  const gaps = [2.6, 3.4, 4.2, 5.8];
  let idx = Math.floor(notes.length / 2);
  let t = 0.9;
  let count = 0;
  while (t < seconds - 1) {
    const amp = 0.6 + 0.4 * rnd();
    const pan = rnd() - 0.5;
    const play = (hz: number, at: number, a: number, p: number) => {
      addStrike(L, R, sr, { t: at, hz, amp: a, t60: 4.5, pan: p, attack: 0.005 }, count);
      addStrike(L, R, sr, { t: at, hz: 2 * hz + 0.35, amp: a * 0.28, t60: 2.4, pan: -p, attack: 0.004 }, count + 1);
      addStrike(L, R, sr, { t: at, hz: 3 * hz, amp: a * 0.08, t60: 1.1, pan: p, attack: 0.003 }, count + 2);
      count += 3;
    };
    play(notes[idx], t, amp, pan);
    if (rnd() < 0.25) play(notes[Math.min(notes.length - 1, idx + 2)], t + 0.32, amp * 0.6, -pan);
    yield;
    const steps = [-2, -1, 1, 1, 2];
    idx = Math.max(0, Math.min(notes.length - 1, idx + steps[Math.floor(rnd() * steps.length)]));
    t += gaps[Math.floor(rnd() * gaps.length)];
  }
  yield* reverb(L, R, sr, { t60: 5, dry: 0.7, wet: 0.65 });
  return normalize(L, R, sr, 0.045);
}

export function runJob(job: Job): Pcm {
  let r = job.next();
  while (!r.done) r = job.next();
  return r.value;
}

/** Runs a job in slices of ~sliceMs, letting the screen update in between. */
export async function runJobAsync(job: Job, sliceMs = 24): Promise<Pcm> {
  let r = job.next();
  let since = Date.now();
  while (!r.done) {
    if (Date.now() - since > sliceMs) {
      await new Promise((res) => setTimeout(res, 0));
      since = Date.now();
    }
    r = job.next();
  }
  return r.value;
}
