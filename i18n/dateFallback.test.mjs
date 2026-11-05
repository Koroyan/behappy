// Run: npm run test:unit
// The web date fallback must print exactly what full ICU (Node, and phones) prints.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const dir = path.dirname(fileURLToPath(import.meta.url));
const load = (file, deps = {}) => {
  const js = ts.transpileModule(fs.readFileSync(path.join(dir, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', js)(m, m.exports, (id) => deps[id]);
  return m.exports;
};
const names = load('dateNames.generated.ts');
const { formatDateFallback, formatTimeFallback } = load('dateFallback.ts', { './dateNames.generated': names });

const COMBOS = [
  { day: 'numeric', month: 'short' },
  { day: 'numeric', month: 'long' },
  { day: 'numeric', month: 'long', year: 'numeric' },
  { weekday: 'long', day: 'numeric', month: 'long' },
  { day: 'numeric', month: 'short', year: 'numeric' },
  { weekday: 'short', day: 'numeric', month: 'short' },
  { month: 'long', year: 'numeric' },
  { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  { weekday: 'narrow' },
];
const TAGS = { ka: 'ka-GE', hy: 'hy-AM', az: 'az-AZ' };
const dates = Array.from({ length: 12 }, (_, m) => new Date(2026, m, 1 + ((m * 5) % 27), (m * 7) % 24, (m * 13) % 60));

for (const [lang, tag] of Object.entries(TAGS)) {
  test(`${lang} dates match full ICU`, () => {
    for (const d of dates) {
      for (const o of COMBOS) {
        if (lang === 'az' && o.weekday === 'narrow') continue; // ICU's az narrow weekdays are digits; we show short names
        assert.equal(formatDateFallback(lang, d, o), new Intl.DateTimeFormat(tag, o).format(d), `${tag} ${JSON.stringify(o)} ${d.toISOString()}`);
      }
      assert.equal(formatTimeFallback(d), new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit' }).format(d));
    }
  });
}
