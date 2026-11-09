/**
 * Nature textures for the Sound catalog, built from published procedural-audio
 * models rather than noise alone:
 *
 * - Water (stream, rain on water): the sound of liquid is mostly the ringing
 *   of small air bubbles (Minnaert 1933). Each bubble is a short sine whose
 *   pitch rises slightly as it dies away, with the damping of van den Doel's
 *   "Physically-based models for liquid sounds" (f0 ≈ 3.26 kHz / radius in
 *   mm; d = 0.043·f0 + 0.0014·f0^1.5 per second). Many of them, at a varying
 *   rate, make a babbling brook.
 * - Fire: Farnell's three parts (Designing Sound): a low lapping roar, crackles
 *   in little clusters, a faint hiss.
 * - Summer night: crickets (pulsed tones near 4.5 kHz, three or four pulses per
 *   chirp) over a soft wind.
 *
 * Beds are filtered circularly and events wrap around the loop's end, so every
 * texture loops without a seam. Deterministic (same sound every time).
 */
import { Job, normalize, panGains, rand01 } from './ambient';

const TAU = 2 * Math.PI;

/** White noise in [−1, 1). */
function white(n: number, rnd: () => number) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i += 1) w[i] = rnd() * 2 - 1;
  return w;
}

/** Pink (−3 dB/octave, Paul Kellet), filtered circularly: the filter first hears the loop's tail. */
function pink(n: number, rnd: () => number): Float32Array {
  const w = white(n, rnd);
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; // prettier-ignore
  const warm = Math.min(n, 30000);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = pass ? 0 : n - warm; i < n; i += 1) {
      const x = w[i];
      b0 = 0.99886 * b0 + x * 0.0555179;
      b1 = 0.99332 * b1 + x * 0.0750759;
      b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856;
      b4 = 0.55 * b4 + x * 0.5329522;
      b5 = -0.7616 * b5 - x * 0.016898;
      if (pass) out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11;
      b6 = x * 0.115926;
    }
  }
  return out;
}

/** One-pole low-pass, in place, circular. a: 0..1 (smaller = darker). */
function lowpass(x: Float32Array, a: number) {
  const n = x.length;
  let y = 0;
  for (let i = Math.max(0, n - 4000); i < n; i += 1) y += a * (x[i] - y);
  for (let i = 0; i < n; i += 1) {
    y += a * (x[i] - y);
    x[i] = y;
  }
}

/** One-pole high-pass, in place, circular (removes rumble below ~fc). */
function highpass(x: Float32Array, sr: number, fc: number) {
  const n = x.length;
  const rc = 1 / (TAU * fc);
  const a = rc / (rc + 1 / sr);
  let y = 0;
  let prev = x[Math.max(0, n - 4001)];
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = pass ? 0 : Math.max(0, n - 4000); i < n; i += 1) {
      const v = x[i];
      y = a * (y + v - prev);
      prev = v;
      if (pass) x[i] = y;
    }
  }
}

/**
 * One bubble: a sine at the Minnaert frequency, rising slightly while it
 * decays (van den Doel). Rotation updated every 8 samples (cheap on phones).
 */
function addBubble(L: Float32Array, R: Float32Array, sr: number, start: number, radiusMm: number, amp: number, pan: number) {
  const n = L.length;
  const f0 = 3260 / radiusMm;
  if (f0 > sr * 0.42) return;
  const d = 0.043 * f0 + 0.0014 * Math.pow(f0, 1.5);
  const rise = 0.1 * d;
  const len = Math.min(n - 1, Math.round((6.9 / d) * sr));
  const [gl, gr] = panGains(pan);
  const decay = Math.exp(-d / sr);
  let e = amp;
  let x = 1;
  let y = 0;
  let idx = ((start % n) + n) % n;
  for (let b = 0; b < len; b += 8) {
    const w = (TAU * f0 * (1 + (rise * b) / sr)) / sr;
    const c = Math.cos(w);
    const s = Math.sin(w);
    const end = Math.min(len, b + 8);
    for (let i = b; i < end; i += 1) {
      const out = e * y;
      L[idx] += gl * out;
      R[idx] += gr * out;
      const nx = x * c - y * s;
      y = x * s + y * c;
      x = nx;
      e *= decay;
      idx += 1;
      if (idx === n) idx = 0;
    }
  }
}

/** A short burst of noise with an exponential decay (a crackle, a raindrop's tick). */
function addBurst(L: Float32Array, R: Float32Array, rnd: () => number, start: number, len: number, amp: number, pan: number, lp = 1) {
  const n = L.length;
  const [gl, gr] = panGains(pan);
  let idx = ((start % n) + n) % n;
  let y = 0;
  let prev = 0;
  for (let i = 0; i < len; i += 1) {
    const x = (rnd() * 2 - 1) * amp * Math.exp((-5 * i) / len);
    y += lp * (x - y);
    const out = y - 0.6 * prev; // a touch of high-pass: a snap, not a thud
    prev = y;
    L[idx] += gl * out;
    R[idx] += gr * out;
    idx += 1;
    if (idx === n) idx = 0;
  }
}

/** Radius in mm from a power law between lo and hi (more small bubbles than large). */
function radius(rnd: () => number, lo: number, hi: number, k = 1.5) {
  const a = Math.pow(lo, -k);
  const b = Math.pow(hi, -k);
  return Math.pow(a + (b - a) * rnd(), -1 / k);
}

/** A babbling brook: bubbles at a gently varying rate over a soft bed of moving water. */
export function* streamJob(seconds: number, sr: number): Job {
  const n = Math.round(seconds * sr);
  const rnd = rand01(9011);
  // A quiet hush of moving water (300 Hz–3 kHz); the bubbles carry the sound.
  const L = pink(n, rnd);
  const R = pink(n, rnd);
  for (const ch of [L, R]) {
    highpass(ch, sr, 300);
    lowpass(ch, 0.5);
    for (let i = 0; i < n; i += 1) ch[i] *= 0.12;
  }
  yield;
  let t = 0;
  while (t < seconds) {
    const rate = 160 * (0.65 + 0.35 * Math.sin((TAU * 3 * t) / seconds) * Math.sin((TAU * 7 * t) / seconds + 1));
    t += -Math.log(1 - rnd() * 0.999) / Math.max(20, rate);
    const r = radius(rnd, 1, 5);
    addBubble(L, R, sr, Math.round(t * sr), r, 0.22 * Math.pow(r / 5, 0.8) * (0.4 + 0.6 * rnd()), rnd() * 1.6 - 0.8);
    if (Math.floor(t * 10) !== Math.floor((t - 0.001) * 10)) yield;
  }
  lowpass(L, 0.55);
  lowpass(R, 0.55);
  return normalize(L, R, sr, 0.075);
}

/** Steady rain heard from inside: a soft bed, many small ticks, drops plinking on water. */
export function* rainJob(seconds: number, sr: number): Job {
  const n = Math.round(seconds * sr);
  const rnd = rand01(7717);
  const L = pink(n, rnd);
  const R = pink(n, rnd);
  for (const ch of [L, R]) {
    highpass(ch, sr, 150);
    lowpass(ch, 0.35);
  }
  yield;
  // Ticks: tiny bursts on leaves and roofs.
  const ticks = Math.round(seconds * 380);
  for (let k = 0; k < ticks; k += 1) {
    addBurst(L, R, rnd, Math.floor(rnd() * n), Math.round(sr * (0.001 + 0.002 * rnd())), 0.04 + 0.06 * rnd(), rnd() * 1.8 - 0.9, 0.5);
    if (k % 2000 === 0) yield;
  }
  // Drops on water: bubbles.
  const drops = Math.round(seconds * 22);
  for (let k = 0; k < drops; k += 1) addBubble(L, R, sr, Math.floor(rnd() * n), radius(rnd, 1.4, 4), 0.08 * (0.4 + 0.6 * rnd()), rnd() * 1.6 - 0.8);
  yield;
  lowpass(L, 0.45);
  lowpass(R, 0.45);
  return normalize(L, R, sr, 0.08);
}

/** A fireplace: a low lapping roar, crackles in little clusters, rare pops, a faint hiss. */
export function* fireJob(seconds: number, sr: number): Job {
  const n = Math.round(seconds * sr);
  const rnd = rand01(4243);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  // Roar: brown-ish noise (circular leaky integrator), low-passed, slowly lapping.
  for (const [ch, seed] of [[L, 1], [R, 2]] as const) {
    const w = white(n, rand01(4243 + seed));
    let y = 0;
    for (let i = Math.max(0, n - 3000); i < n; i += 1) y = (y + 0.02 * w[i]) / 1.02;
    for (let i = 0; i < n; i += 1) {
      y = (y + 0.02 * w[i]) / 1.02;
      const t = i / sr;
      const lap = 0.55 + 0.25 * Math.sin((TAU * 2 * t) / seconds + seed) + 0.2 * Math.sin((TAU * 5 * t) / seconds + 2 * seed);
      ch[i] = y * 2.2 * lap;
    }
    lowpass(ch, 0.06);
    yield;
  }
  // Crackles in clusters.
  let t = 0;
  while (t < seconds) {
    t += -Math.log(1 - rnd() * 0.999) / 1.6;
    const count = 2 + Math.floor(rnd() * 6);
    const pan = rnd() * 1.4 - 0.7;
    for (let c = 0; c < count; c += 1) {
      const at = Math.round((t + rnd() * 0.25) * sr);
      const amp = 0.02 + 0.2 * Math.pow(rnd(), 3);
      addBurst(L, R, rnd, at, Math.round(sr * (0.0004 + 0.0026 * rnd())), amp, pan + (rnd() - 0.5) * 0.3, 0.8);
    }
    yield;
  }
  // Rare pops of resin: longer, lower.
  const pops = Math.round(seconds * 0.25);
  for (let k = 0; k < pops; k += 1) addBurst(L, R, rnd, Math.floor(rnd() * n), Math.round(sr * (0.005 + 0.007 * rnd())), 0.18 + 0.15 * rnd(), rnd() - 0.5, 0.3);
  // Hiss: faint, coming and going.
  for (let i = 0; i < n; i += 1) {
    const h = (rnd() * 2 - 1) * 0.006 * (0.5 + 0.5 * Math.sin((TAU * 3 * i) / n));
    L[i] += h;
    R[i] += h * 0.8;
  }
  lowpass(L, 0.7);
  lowpass(R, 0.7);
  return normalize(L, R, sr, 0.09);
}

/** A summer night: a few crickets at different distances over a soft wind. */
export function* nightJob(seconds: number, sr: number): Job {
  const n = Math.round(seconds * sr);
  const rnd = rand01(3121);
  const L = pink(n, rnd);
  const R = pink(n, rnd);
  lowpass(L, 0.03);
  lowpass(R, 0.03);
  for (let i = 0; i < n; i += 1) {
    const gust = 0.6 + 0.4 * Math.sin((TAU * 2 * i) / n + 0.5);
    L[i] *= 1.4 * gust;
    R[i] *= 1.4 * gust;
  }
  yield;
  const crickets = [
    { hz: 4300, period: 0.62, amp: 0.075, pan: -0.6, pulses: 3 },
    { hz: 4550, period: 0.81, amp: 0.05, pan: 0.5, pulses: 4 },
    { hz: 4820, period: 0.7, amp: 0.035, pan: 0.1, pulses: 3 },
    { hz: 5060, period: 0.93, amp: 0.025, pan: -0.2, pulses: 4 },
  ];
  const pulseLen = Math.round(0.014 * sr);
  const gap = Math.round(0.031 * sr);
  for (const c of crickets) {
    const [gl, gr] = panGains(c.pan);
    let t = rnd() * c.period;
    while (t < seconds) {
      const start = Math.round(t * sr);
      for (let p = 0; p < c.pulses; p += 1) {
        let idx = (start + p * gap) % n;
        for (let i = 0; i < pulseLen; i += 1) {
          const w = Math.sin((Math.PI * i) / pulseLen);
          const s = c.amp * w * w * Math.sin((TAU * c.hz * i) / sr);
          L[idx] += gl * s;
          R[idx] += gr * s;
          idx += 1;
          if (idx === n) idx = 0;
        }
      }
      t += c.period * (0.95 + 0.1 * rnd());
    }
    yield;
  }
  return normalize(L, R, sr, 0.13);
}
