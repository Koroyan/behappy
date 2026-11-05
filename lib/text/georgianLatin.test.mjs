// Run: npm run test:unit
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'georgianLatin.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({}));
const { looksLikeGeorgianLatin, latinToGeorgian } = mod.exports;

test('recognises Georgian typed in Latin letters', () => {
  assert.equal(looksLikeGeorgianLatin('ravi ramdenime dgea gabrazebuli var ar vici raze'), true);
  assert.equal(looksLikeGeorgianLatin('dges dzalian daglili var'), true);
  assert.equal(looksLikeGeorgianLatin('shen rogor xar?'), true);
});

test('leaves English, Georgian script and Russian alone', () => {
  assert.equal(looksLikeGeorgianLatin('I feel sad today and I do not know why'), false);
  assert.equal(looksLikeGeorgianLatin('Today was a good day with my friends'), false);
  assert.equal(looksLikeGeorgianLatin('დღეს კარგი დღე იყო'), false);
  assert.equal(looksLikeGeorgianLatin('Сегодня был хороший день'), false);
  assert.equal(looksLikeGeorgianLatin('ok'), false);
});

test('transliterates to Georgian script', () => {
  assert.equal(latinToGeorgian('ravi ramdenime dgea gabrazebuli var ar vici raze'), 'რავი რამდენიმე დგეა გაბრაზებული ვარ არ ვიცი რაზე');
  assert.equal(latinToGeorgian('shen rogor xar?'), 'შენ როგორ ხარ?');
  assert.equal(latinToGeorgian('Chemi megobari'), 'ჩემი მეგობარი');
});
