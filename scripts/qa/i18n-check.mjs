// Translation checks.   node scripts/qa/i18n-check.mjs
//  1. every static key the app uses exists in English;
//  2. per-language coverage of the English catalog;
//  3. every translated string keeps exactly the {placeholders} of its English
//     source, and list lengths match (lists are rendered item by item).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const localesDir = path.join(root, 'i18n/locales');

// Loads a locale file, following its relative imports (en.ts spreads ./v3/en).
const loaded = new Map();
function loadTs(abs) {
  if (loaded.has(abs)) return loaded.get(abs);
  const src = fs.readFileSync(abs, 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  loaded.set(abs, m.exports);
  const req = (spec) => {
    if (!spec.startsWith('.')) return {};
    const base = path.resolve(path.dirname(abs), spec);
    const hit = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find((c) => fs.existsSync(c));
    return hit ? loadTs(hit) : {};
  };
  new Function('module', 'exports', 'require', js)(m, m.exports, req);
  loaded.set(abs, m.exports);
  return m.exports;
}

function loadLocale(file, exportName) {
  const tree = loadTs(path.join(localesDir, file))[exportName];
  // 3.0 namespaces for this language (v3/<code>.ts exports <code>3).
  const v3 = path.join(localesDir, 'v3', `${exportName}.ts`);
  if (exportName !== 'en' && fs.existsSync(v3)) return { ...tree, ...(loadTs(v3)[`${exportName}3`] || {}) };
  return tree;
}

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

const enTree = loadLocale('en.ts', 'en');
const en = flatten(enTree);
const enKeys = new Set(Object.keys(en));

// 1. Static keys used by the app.
const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.expo', 'dist', 'server', 'scripts', '.git', 'docs'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) files.push(p);
  }
};
walk(root);
const used = new Set();
const re = /\b(?:t|tl|tp)\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(src))) used.add(m[1]);
}
const isPrefix = (k) => [...enKeys].some((x) => x.startsWith(`${k}.`));
const missing = [...used].filter((k) => !enKeys.has(k) && !isPrefix(k));
console.log(`static keys used: ${used.size}; English leaves: ${enKeys.size}`);
console.log(missing.length ? `MISSING in en:\n  ${missing.join('\n  ')}` : 'all static keys exist in en');

// 2 + 3. Coverage and placeholder integrity.
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort().join(',');
const problems = [];
const checkLocale = (code, tree) => {
  const loc = flatten(tree);
  let have = 0;
  // The admin center (ac.*) is English and Georgian only; other languages fall back to English.
  const keys = code === 'ka' ? [...enKeys] : [...enKeys].filter((k) => !k.startsWith('ac.'));
  for (const key of keys) {
    const value = loc[key];
    if (value === undefined) continue;
    have += 1;
    const source = en[key];
    if (Array.isArray(source)) {
      if (!Array.isArray(value)) problems.push(`${code} ${key}: expected a list`);
      else if (value.length !== source.length) problems.push(`${code} ${key}: ${value.length} items, English has ${source.length}`);
      else
        source.forEach((item, i) => {
          if (typeof item === 'string' && placeholders(item) !== placeholders(value[i])) problems.push(`${code} ${key}[${i}]: placeholders {${placeholders(value[i])}} vs {${placeholders(item)}}`);
          if (item && typeof item === 'object')
            for (const [k, v] of Object.entries(item)) if (placeholders(v) !== placeholders(value[i]?.[k])) problems.push(`${code} ${key}[${i}].${k}: placeholders differ`);
        });
    } else if (typeof value !== 'string' || !value.trim()) problems.push(`${code} ${key}: empty or not text`);
    else if (placeholders(value) !== placeholders(source)) problems.push(`${code} ${key}: placeholders {${placeholders(value)}} vs {${placeholders(source)}}`);
  }
  for (const key of Object.keys(loc)) {
    const parent = key.slice(0, key.lastIndexOf('.'));
    const isPluralForm = /\.(zero|one|two|few|many|other)$/.test(key) && enKeys.has(`${parent}.other`);
    if (!enKeys.has(key) && !isPluralForm) problems.push(`${code} ${key}: not in English (typo?)`);
  }
  return `${code}: ${have}/${keys.length}`;
};

const report = [];
for (const code of ['ka', 'ru', 'hy']) report.push(checkLocale(code, loadLocale(`${code}.ts`, code)));
const extraDir = path.join(localesDir, 'extra');
if (fs.existsSync(extraDir)) {
  for (const file of fs.readdirSync(extraDir).filter((f) => /^[a-z]{2}\.ts$/.test(f)).sort()) {
    const code = file.slice(0, 2);
    report.push(checkLocale(code, loadLocale(`extra/${file}`, code)));
  }
}
console.log('coverage:', report.join(' · '));
console.log('admin center (ac.*): English and Georgian; other languages show it in English');
console.log(problems.length ? `PROBLEMS (${problems.length}):\n  ${problems.slice(0, 60).join('\n  ')}` : 'placeholders and lists match English');
if (missing.length || problems.length) process.exitCode = 1;
