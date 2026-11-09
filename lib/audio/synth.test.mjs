// Run: npm run test:unit
// Sound Lab: the generated audio really has the frequencies it claims, per ear.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';

import { fromRoot, loadTs } from '../../scripts/qa/load-ts.mjs';

const S = loadTs(fromRoot('lib/audio/synth.ts'));

test('binaural 200 Hz left + 210 Hz right: measured in each channel, beat 10 Hz', () => {
  const spec = S.binaural(200, 10);
  assert.deepEqual(spec, { kind: 'binaural', leftHz: 200, rightHz: 210 });
  const pcm = S.render(spec, 2);
  assert.equal(S.peakFrequency(pcm.left, pcm.sampleRate, 150, 260, 0.5), 200, 'left ear');
  assert.equal(S.peakFrequency(pcm.right, pcm.sampleRate, 150, 260, 0.5), 210, 'right ear');
  // True stereo: each ear has only its own tone (the other is ~silent there).
  assert.ok(S.goertzel(pcm.left, pcm.sampleRate, 210) < S.goertzel(pcm.left, pcm.sampleRate, 200) / 1000);
  assert.ok(S.goertzel(pcm.right, pcm.sampleRate, 200) < S.goertzel(pcm.right, pcm.sampleRate, 210) / 1000);
  // The beat is not a tone in the signal (it is heard, not played): no 10 Hz energy.
  assert.ok(S.goertzel(pcm.left, pcm.sampleRate, 10) < 1e-6);
});

test('beat presets and custom carriers stay in their bands; out-of-range is refused', () => {
  for (const [band, { min, max, preset }] of Object.entries(S.BEAT_BANDS)) {
    const s = S.binaural(220, preset);
    const beat = Math.round((s.rightHz - s.leftHz) * 10) / 10;
    assert.ok(beat >= min && beat <= max, band);
  }
  assert.deepEqual(S.binaural(150.04, 6.5), { kind: 'binaural', leftHz: 150, rightHz: 156.5 });
  assert.throws(() => S.binaural(40, 10), RangeError, 'carrier too low');
  assert.throws(() => S.binaural(200, 45), RangeError, 'beat outside 0.5–30 Hz');
  assert.throws(() => S.binaural(200, 0.1), RangeError);
});

test('loops are seamless: whole cycles for tones, cross-faded noise', () => {
  const tone = S.binaural(200, 6.5); // 206.5 Hz needs a 10 s loop for whole cycles
  assert.equal(S.loopSeconds(tone), 10);
  const pcm = S.render(tone);
  const n = pcm.left.length;
  assert.equal(n, 10 * S.SAMPLE_RATE);
  // The sample after the last one would be the first one again.
  const next = 0.3 * Math.sin(2 * Math.PI * tone.rightHz * (n / pcm.sampleRate));
  assert.ok(Math.abs(next - pcm.right[0]) < 1e-3);
  for (const spec of [{ kind: 'noise', color: 'pink' }, { kind: 'nature', scene: 'ocean' }, { kind: 'nature', scene: 'rain' }]) {
    const p = S.render(spec, 3);
    const jump = Math.abs(p.left[p.left.length - 1] - p.left[0]);
    const typical = S.rms(p.left);
    assert.ok(jump < typical * 4, `${spec.color || spec.scene}: no click at the loop point`);
    assert.ok(typical > 0.01 && typical < 0.5, `${spec.color || spec.scene}: sensible level`);
  }
});

test('noise colours: pink and brown carry less high-frequency energy than white', () => {
  const ratio = (color) => {
    const p = S.render({ kind: 'noise', color }, 2);
    let lo = 0;
    let hi = 0;
    for (const f of [80, 120, 160, 200]) lo += S.goertzel(p.left, p.sampleRate, f);
    for (const f of [4000, 5000, 6000, 7000]) hi += S.goertzel(p.left, p.sampleRate, f);
    return lo / hi;
  };
  const white = ratio('white');
  const pink = ratio('pink');
  const brown = ratio('brown');
  assert.ok(pink > white * 5, `pink ${pink} vs white ${white}`);
  assert.ok(brown > pink * 5, `brown ${brown} vs pink ${pink}`);
  // Deterministic: the same sound every time.
  assert.deepEqual(Array.from(S.render({ kind: 'noise', color: 'pink' }, 0.01).left), Array.from(S.render({ kind: 'noise', color: 'pink' }, 0.01).left));
});

test('WAV file: standard 16-bit stereo header; base64 matches Node', () => {
  const pcm = S.render(S.binaural(200, 10), 0.5);
  const wav = S.encodeWav(S.toInt16(pcm), pcm.sampleRate);
  const b = Buffer.from(wav);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WAVE');
  assert.equal(b.readUInt16LE(22), 2, 'stereo');
  assert.equal(b.readUInt32LE(24), 24000);
  assert.equal(b.readUInt16LE(34), 16);
  assert.equal(b.readUInt32LE(40), pcm.left.length * 4);
  // Left sample first: channel order is left, right.
  assert.equal(b.readInt16LE(44 + 4 * 100), Math.round(pcm.left[100] * 32767));
  assert.equal(b.readInt16LE(46 + 4 * 100), Math.round(pcm.right[100] * 32767));
  assert.equal(S.toBase64(wav), b.toString('base64'));
  assert.equal(S.toBase64(new Uint8Array([1, 2])), Buffer.from([1, 2]).toString('base64'));
});

test('safe mixing: layers never sum above full scale, master is capped', () => {
  const g = S.mixGains([1, 1, 1], 1);
  assert.ok(Math.abs(g.reduce((a, b) => a + b, 0) - S.MASTER_MAX) < 1e-9);
  assert.deepEqual(S.mixGains([0.2, 0.3], 0.5), [0.1, 0.15]);
  assert.deepEqual(S.mixGains([-1, 2], 0.5), [0, 0.5]);
  assert.equal(S.fadeAt(1, 0, 30000, 60000), 0.5, 'sleep timer fade halfway');
  assert.equal(S.fadeAt(1, 0, 90000, 60000), 0);
});

test('soft harmony (pad): the chord notes in both ears, whole cycles, a calm level', () => {
  for (const mood of ['warm', 'deep']) {
    const spec = { kind: 'pad', mood };
    assert.equal(S.loopSeconds(spec), 20);
    for (const f of S.PADS[mood].hz) assert.ok(Math.abs(f * 20 - Math.round(f * 20)) < 1e-6, `${f} Hz completes whole cycles in 20 s`);
    const p = S.render(spec, 4);
    const [root, fifth] = S.PADS[mood].hz;
    for (const ch of [p.left, p.right]) {
      assert.equal(S.peakFrequency(ch, p.sampleRate, root - 10, root + 10, 0.5), root, `${mood}: root ${root} Hz`);
      assert.equal(S.peakFrequency(ch, p.sampleRate, fifth - 10, fifth + 10, 0.5), fifth, `${mood}: fifth ${fifth} Hz`);
    }
    const level = S.rms(p.left);
    assert.ok(level > 0.03 && level < 0.25, `${mood}: level ${level}`);
    const full = S.render(spec);
    assert.ok(Math.abs(full.left[full.left.length - 1] - full.left[0]) < S.rms(full.left) * 0.2, 'no click at the loop point');
  }
});

test('nature sounds are soft: little energy above 5 kHz compared with white noise', () => {
  const hiss = (spec) => {
    const p = S.render(spec, 2);
    let lo = 0;
    let hi = 0;
    for (const f of [200, 400, 800]) lo += S.goertzel(p.left, p.sampleRate, f);
    for (const f of [5000, 7000, 9000]) hi += S.goertzel(p.left, p.sampleRate, f);
    return hi / lo;
  };
  const white = hiss({ kind: 'noise', color: 'white' });
  for (const scene of ['rain', 'ocean', 'stream']) assert.ok(hiss({ kind: 'nature', scene }) < white / 20, `${scene} is much softer than white noise at high frequencies`);
});

test('528 + 174 Hz tones (as in popular meditation tracks): both tones, same in both ears, no beat', () => {
  const spec = S.tones([174, 528]);
  assert.deepEqual(spec, { kind: 'tones', hz: [174, 528] });
  const p = S.render(spec, 4);
  for (const ch of [p.left, p.right]) {
    assert.equal(S.peakFrequency(ch, p.sampleRate, 160, 190, 0.5), 174);
    assert.equal(S.peakFrequency(ch, p.sampleRate, 510, 545, 0.5), 528);
  }
  assert.equal(S.peakFrequency(p.right, p.sampleRate, 160, 190, 0.5), S.peakFrequency(p.left, p.sampleRate, 160, 190, 0.5), 'not binaural: same pitch in both ears');
  assert.ok(S.rms(p.left) < 0.12, 'quiet');
  assert.throws(() => S.tones([20]), RangeError);
  assert.throws(() => S.tones([]), RangeError);
});

test('the soft harmony under 528 + 174 Hz has nothing near either tone (no beating)', () => {
  const pad = S.render({ kind: 'pad', mood: 'soft' }, 4);
  const tone = S.render(S.tones([174, 528]), 4);
  const mix = pad.left.map((v, i) => v + tone.left[i]);
  const p = (f) => S.goertzel(mix, pad.sampleRate, f);
  // Lines 3–20 Hz away from a tone would beat against it.
  for (const f of [154, 160, 166, 171, 177, 182, 188, 194, 508, 514, 520, 522, 525, 531, 534, 540, 548]) assert.ok(p(f) < p(528) / 100, `${f} Hz is too close to a tone`);
  assert.ok(p(174) > p(528), '174 Hz stays the warm base');
});
