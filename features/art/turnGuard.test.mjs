// Run: npm run test:unit
// Art session guards on the device: run ids, late replies, phase never backwards.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'turnGuard.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { runIdFor, isStaleTurn, nextPhase } = mod.exports;

test('run id comes from the session start (older saved progress has a string date)', () => {
  assert.equal(runIdFor(new Date(1762600000000)), 'run-1762600000000');
  assert.equal(runIdFor('2025-11-08T10:00:00.000Z'), `run-${Date.parse('2025-11-08T10:00:00.000Z')}`);
  assert.equal(runIdFor(undefined), undefined);
  assert.equal(runIdFor('not a date'), undefined);
  assert.match(runIdFor(Date.now()), /^[A-Za-z0-9_-]{1,64}$/, 'fits the server header rule');
});

test('a late reply never overwrites newer messages', () => {
  const sent = { id: 'u2', role: 'user' };
  assert.equal(isStaleTurn([{ id: 'a1', role: 'assistant' }, sent], 'u2'), false, 'normal case');
  assert.equal(isStaleTurn([{ id: 'a1' }, sent, { id: 'a9', role: 'assistant' }, { id: 'u3', role: 'user' }], 'u2'), true, 'the session moved on');
  assert.equal(isStaleTurn([], 'u2'), false, 'nothing stored yet (first turn)');
});

test('the stored phase never goes backwards; nonsense keeps the current phase', () => {
  assert.equal(nextPhase(0, 1), 1);
  assert.equal(nextPhase(1, 0), 1);
  assert.equal(nextPhase(2, 1), 2);
  assert.equal(nextPhase(1, 'x'), 1);
  assert.equal(nextPhase(0, 2), 2);
});
