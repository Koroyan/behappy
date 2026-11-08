// Loads a pure TypeScript module (and its relative / "@/..." imports) for
// node --test, without a bundler. Modules that import React Native or Expo
// are not pure and must not be loaded this way.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cache = new Map();

export function loadTs(file) {
  const abs = path.resolve(file);
  if (cache.has(abs)) return cache.get(abs).exports;
  const js = ts.transpileModule(fs.readFileSync(abs, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(abs, mod);
  const req = (spec) => {
    let target;
    if (spec.startsWith('./') || spec.startsWith('../')) target = path.resolve(path.dirname(abs), spec);
    else if (spec.startsWith('@/')) target = path.resolve(ROOT, spec.slice(2));
    else throw new Error(`load-ts: "${spec}" (from ${path.relative(ROOT, abs)}) is not a pure module`);
    for (const ext of ['.ts', '.tsx', '/index.ts']) if (fs.existsSync(target + ext)) return loadTs(target + ext);
    throw new Error(`load-ts: cannot resolve ${spec}`);
  };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req);
  return mod.exports;
}

export const fromRoot = (p) => path.join(ROOT, p);
