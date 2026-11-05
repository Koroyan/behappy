// Run: npm run test:unit
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'riskLanguage.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({}));
const { mentionsSelfHarm } = mod.exports;

test('recognises self-harm language in the main languages', () => {
  for (const text of [
    'Some days I just want to die.',
    'I keep thinking about ending it all',
    'I don’t want to live like this anymore',
    'I hurt myself again last night',
    'ხანდახან ვფიქრობ, რომ აღარ მინდა ცხოვრება',
    'ვფიქრობ თავის მოკვლაზე',
    'xandaxan vfiqrob rom agar minda cxovreba',
    'Иногда я не хочу жить',
    'Ես չեմ ուզում ապրել',
    'Ich will nicht mehr leben',
    'A veces quiero morir',
    'J’ai envie de mourir',
    '我有时候想死',
  ]) {
    assert.equal(mentionsSelfHarm(text), true, text);
  }
});

test('ignores ordinary writing and figures of speech', () => {
  for (const text of [
    'ravi ramdenime dgea gabrazebuli var ar vici raze',
    'This exam is killing me but I will survive.',
    'I am dying to see that movie!',
    'დღეს კარგი დღე იყო, მეგობრებს შევხვდი.',
    'Сегодня я устал, но всё хорошо.',
    'Ich bin müde, aber zufrieden.',
    '',
  ]) {
    assert.equal(mentionsSelfHarm(text), false, text);
  }
});
