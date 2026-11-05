// Run: npm run test:unit
// Journal reflections must never ask questions (the person can't reply).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'reflection.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({}));
const { withoutQuestions, withoutStrayLatinLead, tidyReflection } = mod.exports;

test('drops the closing question from a real reflection', () => {
  const reply =
    'It sounds like you might be feeling a mix of emotions that are hard to express. I can sense some frustration or confusion in your words. ' +
    'It takes strength to share your feelings, even when they’re difficult to articulate. What’s been on your mind lately that feels important?';
  const out = withoutQuestions(reply);
  assert.ok(!out.includes('?'));
  assert.ok(out.endsWith('difficult to articulate.'));
});

test('handles Georgian, Armenian, Arabic and full-width question marks', () => {
  assert.equal(withoutQuestions('რამდენიმე დღეა, ბრაზი გაწუხებს. ეს გასაგებია. რა გაბრაზებს ყველაზე მეტად?'), 'რამდენიმე დღეა, ბრაზი გაწუხებს. ეს გასაგებია.');
  assert.equal(withoutQuestions('Դուք անկեղծ եք գրել։ Ի՞նչն է ձեզ օգնում։'), 'Դուք անկեղծ եք գրել։');
  assert.equal(withoutQuestions('أنت تكتب بصدق. ما الذي يساعدك؟'), 'أنت تكتب بصدق.');
  assert.equal(withoutQuestions('你写得很真诚。 什么能帮助你？'), '你写得很真诚。');
});

test('keeps statements and paragraphs untouched', () => {
  const text = 'You wrote honestly about a hard week.\n\nIf it helps, a slow breath before bed could be a small kindness to yourself.';
  assert.equal(withoutQuestions(text), text);
});

test('never returns an empty reflection', () => {
  assert.equal(withoutQuestions('How are you feeling?'), 'How are you feeling.');
});

test('drops a stray Latin word that opens a Georgian reply', () => {
  const seen = 'gabon, შენ გრძნობ გაბრაზებას და ეს შენთვის რთული მდგომარეობაა. ეს ბუნებრივია.';
  assert.equal(withoutStrayLatinLead(seen), 'შენ გრძნობ გაბრაზებას და ეს შენთვის რთული მდგომარეობაა. ეს ბუნებრივია.');
  assert.equal(tidyReflection(seen + ' რა გაბრაზებს?'), 'შენ გრძნობ გაბრაზებას და ეს შენთვის რთული მდგომარეობაა. ეს ბუნებრივია.');
});

test('keeps Latin words that belong to the text', () => {
  const english = 'Nino, it sounds like this week has been heavy. Walking by the river helped.';
  assert.equal(withoutStrayLatinLead(english), english);
  const mixed = 'შენ წერ, რომ BeHappy-ში ჩანაწერი დაგეხმარა და ეს კარგი ნიშანია.';
  assert.equal(withoutStrayLatinLead(mixed), mixed);
});
