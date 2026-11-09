/**
 * Sound Lab synthesizer: real PCM, generated on the device (works offline,
 * no recordings to license). The same samples play on phones (as a WAV file)
 * and on the web (as a Web Audio buffer).
 *
 * Binaural: two pure tones, one per ear — e.g. 200 Hz left and 210 Hz right;
 * with headphones the difference is heard as a 10 Hz beat. That is all this
 * claims: no "brain entrainment", no 432/528 Hz healing, no cure or
 * guaranteed sleep (docs/ETHICS.md).
 *
 * Every sound is built to loop without a click: tones complete whole cycles
 * in the loop, modulations are periodic over it, noise is cross-faded.
 */

export const SAMPLE_RATE = 24000;

export type NoiseColor = 'white' | 'pink' | 'brown';
export type NatureScene = 'rain' | 'ocean' | 'wind' | 'stream';
export type PadMood = 'warm' | 'deep' | 'soft';
export type SoundSpec = { kind: 'binaural'; leftHz: number; rightHz: number } | { kind: 'noise'; color: NoiseColor } | { kind: 'nature'; scene: NatureScene } | { kind: 'pad'; mood: PadMood } | { kind: 'tones'; hz: number[] };

/**
 * A soft, slowly breathing chord to listen to (and to carry a binaural tone, as
 * relaxing tracks usually do). Every frequency is a multiple of 0.05 Hz, so it
 * completes whole cycles in its 20 s loop. Pure musical tones: no claim about
 * any frequency doing anything.
 */
export const PADS: Record<PadMood, { hz: number[]; amp: number[] }> = {
  // A major: A2 E3 A3 C#4 E4
  warm: { hz: [110, 165, 220, 277.2, 330], amp: [0.1, 0.07, 0.06, 0.035, 0.03] },
  // E major, lower: E2 B2 E3 G#3 B3
  deep: { hz: [82.4, 123.5, 164.8, 207.65, 247], amp: [0.11, 0.07, 0.055, 0.03, 0.025] },
  // Only octaves of 174 and 528 Hz (87, 174, 348 / 132, 264), each with its own
  // octave: no partial lands near a tone of the 174 + 528 Hz mix, so nothing beats
  // (an earlier 261 Hz note put 522 Hz next to 528 Hz: a 6 Hz wobble).
  soft: { hz: [87, 132, 174, 264, 348], amp: [0.09, 0.06, 0.05, 0.035, 0.025] },
};

/**
 * Pure tones like those in popular meditation tracks (e.g. 528 Hz + 174 Hz):
 * the same in both ears (not binaural), each swelling slowly. Musical tones
 * only: the app makes no claim that any frequency heals (docs/ETHICS.md).
 */
export const TONE_RANGE = { min: 40, max: 1000 };
export function tones(hz: number[]): SoundSpec {
  const list = hz.map((f) => Math.round(f * 20) / 20);
  if (!list.length || list.length > 4 || list.some((f) => !(f >= TONE_RANGE.min && f <= TONE_RANGE.max))) throw new RangeError('tones: 1–4 frequencies, 40–1000 Hz');
  return { kind: 'tones', hz: list };
}

export const BEAT_BANDS = {
  delta: { min: 0.5, max: 4, preset: 2 },
  theta: { min: 4, max: 8, preset: 6 },
  alpha: { min: 8, max: 12, preset: 10 },
  beta: { min: 13, max: 30, preset: 15 },
} as const;
export type BeatBand = keyof typeof BEAT_BANDS;

export const CARRIER = { min: 100, max: 500, default: 200 };
export const BEAT = { min: 0.5, max: 30 };

/** Left = carrier, right = carrier + beat (rounded to 0.1 Hz). Throws outside the safe ranges. */
export function binaural(carrierHz: number, beatHz: number): SoundSpec {
  const c = Math.round(carrierHz * 10) / 10;
  const b = Math.round(beatHz * 10) / 10;
  if (!(c >= CARRIER.min && c <= CARRIER.max)) throw new RangeError(`carrier ${c} Hz outside ${CARRIER.min}–${CARRIER.max}`);
  if (!(b >= BEAT.min && b <= BEAT.max)) throw new RangeError(`beat ${b} Hz outside ${BEAT.min}–${BEAT.max}`);
  return { kind: 'binaural', leftHz: c, rightHz: Math.round((c + b) * 10) / 10 };
}

export const specKey = (s: SoundSpec) => (s.kind === 'binaural' ? `bin-${s.leftHz}-${s.rightHz}` : s.kind === 'noise' ? `noise-${s.color}` : s.kind === 'pad' ? `pad-${s.mood}-v${s.mood === 'soft' ? 2 : 1}` : s.kind === 'tones' ? `tones-${s.hz.join('-')}-v1` : `nature-${s.scene}-v2`);

/** Loop length: tones need whole cycles of both frequencies (0.1 Hz resolution → 10 s). */
export function loopSeconds(s: SoundSpec): number {
  if (s.kind === 'binaural') {
    for (const L of [10, 20, 30, 40, 50, 60]) if (isWhole(s.leftHz * L) && isWhole(s.rightHz * L)) return L;
    return 10;
  }
  if (s.kind === 'pad' || s.kind === 'tones') return 20;
  if (s.kind === 'nature' && s.scene === 'ocean') return 24;
  return 12;
}
const isWhole = (x: number) => Math.abs(x - Math.round(x)) < 1e-6;

/** Small deterministic PRNG (same sound every time, testable). */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

export interface Pcm {
  sampleRate: number;
  left: Float32Array;
  right: Float32Array;
}

export function render(s: SoundSpec, seconds = loopSeconds(s), sampleRate = SAMPLE_RATE): Pcm {
  const n = Math.round(seconds * sampleRate);
  if (s.kind === 'binaural') {
    const left = new Float32Array(n);
    const right = new Float32Array(n);
    // Quiet and pure: meant to sit under a pad, music or nature sounds.
    const amp = 0.22;
    for (let i = 0; i < n; i += 1) {
      const t = i / sampleRate;
      left[i] = amp * Math.sin(2 * Math.PI * s.leftHz * t);
      right[i] = amp * Math.sin(2 * Math.PI * s.rightHz * t);
    }
    return { sampleRate, left, right };
  }
  if (s.kind === 'pad') return renderPad(s.mood, n, sampleRate, seconds);
  if (s.kind === 'tones') return renderTones(s.hz, n, sampleRate, seconds);
  const fade = Math.round(0.5 * sampleRate);
  const total = n + fade;
  const L = channel(s, total, sampleRate, 1);
  const R = channel(s, total, sampleRate, 2);
  return { sampleRate, left: loopCrossfade(L, n, fade), right: loopCrossfade(R, n, fade) };
}

/** Makes x[0..n) loop seamlessly by cross-fading its extra tail into the start. */
function loopCrossfade(x: Float32Array, n: number, fade: number): Float32Array {
  const out = x.slice(0, n);
  for (let i = 0; i < fade; i += 1) {
    const w = i / fade;
    out[i] = x[n + i] * (1 - w) + x[i] * w;
  }
  return out;
}

function noise(color: NoiseColor, n: number, rand: () => number): Float32Array {
  const out = new Float32Array(n);
  if (color === 'white') {
    for (let i = 0; i < n; i += 1) out[i] = rand() * 0.25;
    return out;
  }
  if (color === 'pink') {
    // Paul Kellet's refined filter: −3 dB per octave.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i += 1) {
      const w = rand();
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.06;
      b6 = w * 0.115926;
    }
    return out;
  }
  // Brown: leaky integrator of white noise (−6 dB per octave).
  let last = 0;
  for (let i = 0; i < n; i += 1) {
    last = (last + 0.02 * rand()) / 1.02;
    out[i] = last * 2.4;
  }
  return out;
}

/** The pad: each voice swells slowly on its own (whole cycles per loop); the ears differ a little in timing for width. */
function renderPad(mood: PadMood, n: number, sr: number, seconds: number): Pcm {
  const { hz, amp } = PADS[mood];
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  hz.forEach((f, k) => {
    const swells = 1 + (k % 3); // 1 to 3 slow swells per 20 s loop
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const tone = Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(2 * Math.PI * 2 * f * t);
      const envL = 0.55 + 0.45 * Math.sin((2 * Math.PI * swells * t) / seconds + k * 1.3);
      const envR = 0.55 + 0.45 * Math.sin((2 * Math.PI * swells * t) / seconds + k * 1.3 + 0.9);
      left[i] += amp[k] * envL * tone;
      right[i] += amp[k] * envR * tone;
    }
  });
  return { sampleRate: sr, left, right };
}

/** Pure tones, the lowest a little louder; each swells on its own, whole cycles per loop. */
function renderTones(hz: number[], n: number, sr: number, seconds: number): Pcm {
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const sorted = [...hz].sort((a, b) => a - b);
  sorted.forEach((f, k) => {
    const amp = k === 0 ? 0.11 : 0.06;
    const swells = 1 + k;
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const tone = Math.sin(2 * Math.PI * f * t);
      left[i] += amp * (0.65 + 0.35 * Math.sin((2 * Math.PI * swells * t) / seconds + k)) * tone;
      right[i] += amp * (0.65 + 0.35 * Math.sin((2 * Math.PI * swells * t) / seconds + k + 0.7)) * tone;
    }
  });
  return { sampleRate: sr, left, right };
}

/** One-pole low-pass (a: 0..1, smaller = darker). */
function lowpass(x: Float32Array, a: number): Float32Array {
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i += 1) {
    y += a * (x[i] - y);
    out[i] = y;
  }
  return out;
}

function channel(s: Exclude<SoundSpec, { kind: 'binaural' } | { kind: 'pad' } | { kind: 'tones' }>, n: number, sr: number, seed: number): Float32Array {
  const rand = rng(seed * 7919 + (s.kind === 'noise' ? s.color.length : s.scene.length * 31));
  if (s.kind === 'noise') return noise(s.color, n, rand);
  const period = n / sr;
  switch (s.scene) {
    case 'ocean': {
      // Waves: a deep brown bed plus a pink "wash" that brightens at each crest
      // and softens as the water draws back; three waves per 24 s loop.
      const deep = noise('brown', n, rand);
      const wash = noise('pink', n, rand);
      const out = new Float32Array(n);
      const waves = 3;
      let y = 0;
      for (let i = 0; i < n; i += 1) {
        const phase = (i / sr / period) * waves * 2 * Math.PI + seed * 0.6;
        const env = Math.pow(0.5 - 0.5 * Math.cos(phase), 1.6);
        y += (0.02 + 0.18 * env) * (wash[i] - y);
        out[i] = deep[i] * (0.35 + 0.5 * env) + y * 1.6 * env;
      }
      return out;
    }
    case 'wind': {
      // Pink noise through a slowly moving low-pass: gusts.
      const src = noise('pink', n, rand);
      const out = new Float32Array(n);
      let y = 0;
      for (let i = 0; i < n; i += 1) {
        const gust = 0.5 + 0.5 * Math.sin((i / n) * 2 * Math.PI * 2 + seed);
        const a = 0.02 + 0.12 * gust;
        y += a * (src[i] - y);
        out[i] = y * (1.4 + gust);
      }
      return out;
    }
    case 'stream': {
      // Running water: pink noise, gently filtered, with a soft uneven babble.
      const src = lowpass(noise('pink', n, rand), 0.45);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i += 1) {
        const babble = 0.75 + 0.25 * Math.sin((i / n) * 2 * Math.PI * 37 + seed) * Math.sin((i / n) * 2 * Math.PI * 11);
        out[i] = src[i] * 1.8 * babble;
      }
      return out;
    }
    case 'rain':
    default: {
      // Steady rain: a muffled pink bed (no hiss) plus many small, soft drops:
      // short bursts smoothed by a low-pass so they patter instead of crackle.
      const bed = lowpass(noise('pink', n, rand), 0.35);
      const drops = new Float32Array(n);
      const count = Math.round(period * 40);
      for (let d = 0; d < count; d += 1) {
        const start = Math.floor(((rand() + 1) / 2) * (n - sr * 0.05));
        const len = Math.floor(sr * (0.006 + 0.012 * ((rand() + 1) / 2)));
        const amp = 0.02 + 0.04 * ((rand() + 1) / 2);
        for (let k = 0; k < len; k += 1) drops[start + k] += rand() * amp * Math.exp((-5 * k) / len);
      }
      const soft = lowpass(drops, 0.5);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i += 1) out[i] = bed[i] * 0.9 + soft[i] * 1.4;
      return out;
    }
  }
}

/** Float channels → interleaved 16-bit PCM (clipped), with a gain. */
export function toInt16(pcm: Pcm, gain = 1): Int16Array {
  const n = pcm.left.length;
  const out = new Int16Array(n * 2);
  for (let i = 0; i < n; i += 1) {
    out[2 * i] = clip16(pcm.left[i] * gain);
    out[2 * i + 1] = clip16(pcm.right[i] * gain);
  }
  return out;
}
const clip16 = (x: number) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));

/** A standard 16-bit stereo PCM WAV file. */
export function encodeWav(samples: Int16Array, sampleRate: number, channels = 2): Uint8Array {
  const dataBytes = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * 2, true);
  v.setUint16(32, channels * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i += 1) v.setInt16(44 + i * 2, samples[i], true);
  return new Uint8Array(buf);
}

/** Power of one frequency in a signal (Goertzel). Used by tests to verify each ear. */
export function goertzel(x: ArrayLike<number>, sampleRate: number, freq: number): number {
  const k = (2 * Math.PI * freq) / sampleRate;
  const coeff = 2 * Math.cos(k);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const s0 = x[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return (s1 * s1 + s2 * s2 - coeff * s1 * s2) / (x.length * x.length);
}

/** The strongest frequency between lo and hi (step Hz). */
export function peakFrequency(x: ArrayLike<number>, sampleRate: number, lo: number, hi: number, step = 0.5): number {
  let best = lo;
  let bestPower = -1;
  for (let f = lo; f <= hi; f += step) {
    const p = goertzel(x, sampleRate, f);
    if (p > bestPower) {
      bestPower = p;
      best = f;
    }
  }
  return best;
}

export const rms = (x: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < x.length; i += 1) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, x.length));
};

/**
 * Safe mixing: layer gains are scaled so their sum never exceeds `ceiling`,
 * and the master volume is capped (hearing safety at long listening times).
 */
export const MASTER_MAX = 0.8;
export function mixGains(volumes: number[], master: number, ceiling = 1): number[] {
  const m = Math.max(0, Math.min(MASTER_MAX, master));
  const clean = volumes.map((v) => Math.max(0, Math.min(1, Number(v) || 0)));
  const sum = clean.reduce((a, b) => a + b, 0);
  const scale = sum > ceiling ? ceiling / sum : 1;
  return clean.map((v) => v * scale * m);
}

/** Volume over a fade (linear), e.g. for a sleep timer's last minute. */
export const fadeAt = (from: number, to: number, elapsedMs: number, totalMs: number) => (totalMs <= 0 ? to : from + (to - from) * Math.min(1, Math.max(0, elapsedMs / totalMs)));

/** Bytes → base64 (Hermes has no Buffer; chunked to stay fast on ~1 MB files). */
export function toBase64(bytes: Uint8Array): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const parts: string[] = [];
  let chunk = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const t = (a << 16) | (b << 8) | c;
    chunk += A[(t >> 18) & 63] + A[(t >> 12) & 63] + (i + 1 < bytes.length ? A[(t >> 6) & 63] : '=') + (i + 2 < bytes.length ? A[t & 63] : '=');
    if (chunk.length >= 32768) {
      parts.push(chunk);
      chunk = '';
    }
  }
  parts.push(chunk);
  return parts.join('');
}
