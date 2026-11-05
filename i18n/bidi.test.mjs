// Run: npm run test:unit
// Arabic interface strings that open with a Latin word must still read right-to-left.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const dir = path.dirname(fileURLToPath(import.meta.url));
const js = ts.transpileModule(fs.readFileSync(path.join(dir, 'bidi.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', 'require', js)(m, m.exports, () => ({}));
const { withRtlBase, RLM } = m.exports;

test('a right-to-left sentence that starts with a Latin name gets a leading mark', () => {
  assert.equal(withRtlBase('Anulia ذكاء اصطناعي.'), RLM + 'Anulia ذكاء اصطناعي.');
  assert.equal(withRtlBase('BeHappy Plus مفعّل حتى 6 نوفمبر.'), RLM + 'BeHappy Plus مفعّل حتى 6 نوفمبر.');
  assert.equal(withRtlBase('Anulia: 3 من 50 اليوم'), RLM + 'Anulia: 3 من 50 اليوم');
});

test('text that already reads right-to-left, or has no right-to-left letters, is left alone', () => {
  for (const s of ['مرحبًا، أنا Anulia.', '3 من 43 جلسة مكتملة', '«المساعدة الآن»', '0 GEL', 'PHQ-9', 'Hello.', '', RLM + 'Anulia تفكّر…']) {
    assert.equal(withRtlBase(s), s);
  }
});
