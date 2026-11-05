// Run: node --test lib/assessments/scoring.test.mjs   (Node ≥ 22.6 strips TS types)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DASS_ITEMS, scoreDASS21, scoreGAD7, scorePHQ9 } from './scoring.ts';

test('PHQ-9 bands at every boundary', () => {
  const withTotal = (total) => {
    const a = Array(9).fill(0);
    let left = total;
    for (let i = 0; i < 8 && left > 0; i += 1) {
      const v = Math.min(3, left);
      a[i] = v;
      left -= v;
    }
    a[8] = Math.min(3, left);
    return a;
  };
  const cases = [
    [0, 'minimal'], [4, 'minimal'], [5, 'mild'], [9, 'mild'], [10, 'moderate'], [14, 'moderate'],
    [15, 'moderatelySevere'], [19, 'moderatelySevere'], [20, 'severe'], [27, 'severe'],
  ];
  for (const [total, band] of cases) {
    const r = scorePHQ9(withTotal(total));
    assert.equal(r.total, total);
    assert.equal(r.band, band, `total ${total}`);
  }
});

test('PHQ-9 item 9 raises the safety flag on any non-zero answer, even with a low total', () => {
  const low = [0, 0, 0, 0, 0, 0, 0, 0, 1];
  const r = scorePHQ9(low);
  assert.equal(r.band, 'minimal');
  assert.equal(r.safetyFlag, true);
  assert.equal(scorePHQ9(Array(9).fill(0)).safetyFlag, false);
});

test('GAD-7 bands', () => {
  assert.equal(scoreGAD7([0, 0, 0, 0, 0, 0, 0]).band, 'minimal');
  assert.equal(scoreGAD7([1, 1, 1, 1, 1, 0, 0]).band, 'mild');
  assert.equal(scoreGAD7([2, 2, 2, 2, 2, 0, 0]).band, 'moderate');
  assert.equal(scoreGAD7([3, 3, 3, 3, 3, 0, 0]).band, 'severe');
  assert.equal(scoreGAD7([3, 3, 3, 3, 3, 3, 3]).total, 21);
});

test('DASS-21 subscales use the published items and ×2 scaling', () => {
  const all = [...DASS_ITEMS.depression, ...DASS_ITEMS.anxiety, ...DASS_ITEMS.stress].sort((a, b) => a - b);
  assert.deepEqual(all, Array.from({ length: 21 }, (_, i) => i + 1), 'every item belongs to exactly one scale');
  const answers = Array(21).fill(0);
  for (const i of DASS_ITEMS.depression) answers[i - 1] = 1; // 7 × 1 × 2 = 14 → moderate
  const r = scoreDASS21(answers);
  assert.equal(r.depression.score, 14);
  assert.equal(r.depression.band, 'moderate');
  assert.equal(r.anxiety.band, 'normal');
  assert.equal(r.stress.band, 'normal');
  assert.equal(r.meaning, 'moderate');
});

test('DASS-21 boundaries per scale', () => {
  const only = (scale, perItem) => {
    const a = Array(21).fill(0);
    DASS_ITEMS[scale].forEach((i, k) => (a[i - 1] = k < perItem.length ? perItem[k] : 0));
    return a;
  };
  // anxiety: raw 4 → 8 mild; raw 5 → 10 moderate
  assert.equal(scoreDASS21(only('anxiety', [1, 1, 1, 1])).anxiety.band, 'mild');
  assert.equal(scoreDASS21(only('anxiety', [1, 1, 1, 1, 1])).anxiety.band, 'moderate');
  // stress: raw 7 → 14 normal; raw 8 → 16 mild
  assert.equal(scoreDASS21(only('stress', [1, 1, 1, 1, 1, 1, 1])).stress.band, 'normal');
  assert.equal(scoreDASS21(only('stress', [2, 1, 1, 1, 1, 1, 1])).stress.band, 'mild');
  // depression max: 21 × 2 = 42 → extremely severe
  assert.equal(scoreDASS21(only('depression', [3, 3, 3, 3, 3, 3, 3])).depression.band, 'extremelySevere');
});

test('invalid answers are rejected', () => {
  assert.throws(() => scorePHQ9([0, 0]));
  assert.throws(() => scoreGAD7([0, 0, 0, 0, 0, 0, 4]));
});
