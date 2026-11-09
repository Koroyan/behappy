// Run: npm run test:unit
// The Sound catalog: every track is a valid, level-matched mix; frequency and
// binaural tracks really hold what their titles say; nothing in the music beats
// against a tone; every sound loops without a seam.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fromRoot, loadTs } from '../../scripts/qa/load-ts.mjs';

const S = loadTs(fromRoot('lib/audio/synth.ts'));
const T = loadTs(fromRoot('lib/audio/tracks.ts'));
const P = loadTs(fromRoot('lib/audio/pieces.ts'));
const EN = loadTs(fromRoot('i18n/locales/wb/en.ts'));
const KA = loadTs(fromRoot('i18n/locales/wb/ka.ts'));
const en = EN[Object.keys(EN)[0]];
const ka = KA[Object.keys(KA)[0]];

const cache = new Map();
const pcm = (spec, sr) => {
  const k = `${S.specKey(spec)}@${sr || 'own'}`;
  if (!cache.has(k)) cache.set(k, sr ? S.render(spec, S.loopSeconds(spec), sr) : S.render(spec));
  return cache.get(k);
};

test('catalog: 30 tracks, unique ids, every shelf filled, valid level-matched mixes, named in en and ka', () => {
  assert.ok(T.TRACKS.length >= 30);
  assert.equal(new Set(T.TRACKS.map((t) => t.id)).size, T.TRACKS.length);
  for (const c of T.CATEGORIES) assert.ok(T.tracksIn(c).length >= 2, `${c} has tracks`);
  for (const t of T.TRACKS) {
    const layers = T.trackLayers(t);
    assert.ok(layers.length >= 1, t.id);
    assert.equal(new Set(layers.map((l) => l.id)).size, layers.length, `${t.id}: layer ids unique`);
    for (const l of layers) assert.ok(l.volume > 0 && l.volume <= 1, `${t.id}: ${l.id} volume ${l.volume}`);
    assert.ok(layers.reduce((a, l) => a + l.volume, 0) <= 1.0001, `${t.id}: layers fit under the mixer's ceiling`);
    assert.ok(typeof T.LEVEL[t.id] === 'number', `${t.id}: has a matched level`);
    for (const dict of [en, ka]) {
      assert.ok(dict.sound.tracks[t.id]?.title && dict.sound.tracks[t.id]?.desc, `${t.id}: named`);
    }
  }
});

test('frequency tracks hold exactly their tone, and nothing in the music beats against it', () => {
  for (const t of T.TRACKS.filter((x) => x.hz)) {
    const layers = t.layers();
    const toneLayer = layers.find((l) => l.spec.kind === 'tones');
    assert.ok(toneLayer && toneLayer.spec.hz.includes(t.hz), `${t.id}: has its ${t.hz} Hz tone`);
    const tone = pcm(toneLayer.spec);
    for (const ch of [tone.left, tone.right]) assert.equal(S.peakFrequency(ch.subarray(0, tone.sampleRate * 4), tone.sampleRate, t.hz - 15, t.hz + 15, 0.25), t.hz, `${t.id}: ${t.hz} Hz in both ears`);
    // The music: lines 3–20 Hz from the tone would beat against it (a wobble).
    for (const l of layers.filter((x) => x.spec.kind === 'piece' || x.spec.kind === 'pad')) {
      const p = pcm(l.spec);
      const x = p.left.subarray(0, p.sampleRate * 16);
      const at = (f) => S.goertzel(x, p.sampleRate, f);
      const ref = Math.max(at(t.hz), at(t.hz / 2), at(t.hz / 4), 1e-12);
      for (const d of [3, 4, 5, 6, 8, 10, 13, 16, 20]) for (const f of [t.hz - d, t.hz + d]) assert.ok(at(f) < ref / 100, `${t.id}: ${f.toFixed(1)} Hz too close to the ${t.hz} Hz tone`);
    }
  }
  // 432 Hz music is tuned to A4 = 432 Hz: the A sounds at exactly 432 Hz.
  const a432 = pcm({ kind: 'piece', id: 'a432' });
  assert.equal(S.peakFrequency(a432.left.subarray(0, a432.sampleRate * 8), a432.sampleRate, 420, 445, 0.25), 432);
  // Frequency pieces are built on an octave of their frequency.
  for (const hz of [174, 285, 396, 417, 528, 639, 741, 852, 963]) {
    const root = P.PIECES[`hz${hz}`].root;
    assert.ok(Math.abs(Math.log2(hz / root) - Math.round(Math.log2(hz / root))) < 1e-9, `${hz} Hz is an octave of the tonic ${root}`);
  }
});

test('binaural tracks: exact pair per ear, and the music leaves that band empty (no beating in one ear)', () => {
  for (const t of T.TRACKS.filter((x) => x.binaural)) {
    const { carrier, beat } = t.binaural;
    const bin = t.layers().find((l) => l.spec.kind === 'binaural');
    assert.deepEqual([bin.spec.leftHz, bin.spec.rightHz], [carrier, carrier + beat], t.id);
    const piece = t.layers().find((l) => l.spec.kind === 'piece');
    const p = pcm(piece.spec);
    const x = p.left.subarray(0, p.sampleRate * 32);
    let strongest = 0;
    for (let f = 60; f <= 1200; f += 2) strongest = Math.max(strongest, S.goertzel(x, p.sampleRate, f));
    for (let f = carrier - 15; f <= carrier + beat + 15; f += 1) assert.ok(S.goertzel(x, p.sampleRate, f) < strongest / 300, `${t.id}: music has ${f} Hz inside the binaural band`);
  }
});

test('every sound in the catalog loops without a seam, below full scale', () => {
  const specs = new Map();
  for (const t of T.TRACKS) for (const l of t.layers()) specs.set(S.specKey(l.spec), l.spec);
  for (const [key, spec] of specs) {
    const p = pcm(spec);
    assert.equal(p.left.length, Math.round(S.loopSeconds(spec) * p.sampleRate), key);
    for (const ch of [p.left, p.right]) {
      let step = 0;
      let peak = 0;
      for (let i = 1; i < ch.length; i += 1) {
        step += Math.abs(ch[i] - ch[i - 1]);
        peak = Math.max(peak, Math.abs(ch[i]));
      }
      step /= ch.length - 1;
      assert.ok(Math.abs(ch[0] - ch[ch.length - 1]) < 4 * step + 1e-4, `${key}: seam`);
      assert.ok(peak < 0.95 && Number.isFinite(peak), `${key}: peak ${peak}`);
    }
  }
});

test('loudness: every track within 2 dB of the catalog median (K-weighted, as the app mixes it)', () => {
  const SR = 24000;
  const N = SR * 32;
  const biquad = (x, b0, b1, b2, a1, a2) => {
    const y = new Float64Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0; // prettier-ignore
    for (let i = 0; i < x.length; i += 1) {
      const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x[i];
      y2 = y1;
      y1 = v;
      y[i] = v;
    }
    return y;
  };
  const kweight = (x) => {
    const A = Math.pow(10, 3.999843853973347 / 40);
    let w0 = (2 * Math.PI * 1681.974450955533) / SR;
    let al = Math.sin(w0) / (2 * 0.7071752369554196);
    let c = Math.cos(w0);
    const a0 = A + 1 - (A - 1) * c + 2 * Math.sqrt(A) * al;
    const s = biquad(x, (A * (A + 1 + (A - 1) * c + 2 * Math.sqrt(A) * al)) / a0, (-2 * A * (A - 1 + (A + 1) * c)) / a0, (A * (A + 1 + (A - 1) * c - 2 * Math.sqrt(A) * al)) / a0, (2 * (A - 1 - (A + 1) * c)) / a0, (A + 1 - (A - 1) * c - 2 * Math.sqrt(A) * al) / a0);
    w0 = (2 * Math.PI * 38.13547087602444) / SR;
    al = Math.sin(w0) / (2 * 0.5003270373238773);
    c = Math.cos(w0);
    const b0 = 1 + al;
    return biquad(s, (1 + c) / 2 / b0, -(1 + c) / b0, (1 + c) / 2 / b0, (-2 * c) / b0, (1 - al) / b0);
  };
  const loud = T.TRACKS.map((t) => {
    const layers = T.trackLayers(t);
    const g = S.mixGains(layers.map((l) => l.volume), 0.5);
    const L = new Float64Array(N);
    const R = new Float64Array(N);
    layers.forEach((l, k) => {
      const p = pcm(l.spec, SR);
      for (let i = 0; i < N; i += 1) {
        L[i] += g[k] * p.left[i % p.left.length];
        R[i] += g[k] * p.right[i % p.right.length];
      }
    });
    const ms = (x) => x.reduce((a, v) => a + v * v, 0) / x.length;
    return [t.id, -0.691 + 10 * Math.log10(ms(kweight(L)) + ms(kweight(R)))];
  });
  const median = loud.map((x) => x[1]).sort((a, b) => a - b)[Math.floor(loud.length / 2)];
  for (const [id, l] of loud) assert.ok(Math.abs(l - median) <= 2, `${id}: ${l.toFixed(1)} LUFS vs median ${median.toFixed(1)}`);
});
