// Translates the `wb` namespace (i18n/locales/wb/en.ts) into the other app
// languages with the project's OpenAI key, following each language's tone
// note and the terms the app already uses there. Every result is checked:
// same keys, same {placeholders}, same list lengths. Machine translation —
// native review is still recommended (see docs).
//
//   node scripts/i18n/translate-wb.mjs [--langs ru,hy] [--model gpt-6.1-sol]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const LANGS = arg('langs', 'ru,hy,uk,tr,az,de,fr,es,it,pt,pl,id,ar,hi,zh,ja,ko').split(',');
const MODEL = arg('model', 'gpt-6.1-sol');
const NAMES = { ru: 'Russian', hy: 'Armenian', uk: 'Ukrainian', tr: 'Turkish', az: 'Azerbaijani', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese', pl: 'Polish', id: 'Indonesian', ar: 'Arabic', hi: 'Hindi', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean' };

const key = (/^OPENAI_API_KEY=(.*)$/m.exec(fs.readFileSync(path.join(ROOT, 'server/.env'), 'utf8'))?.[1] || '').replace(/["\r]/g, '').trim();
if (!key) throw new Error('OPENAI_API_KEY missing in server/.env');

function evalTs(file) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({}));
  return mod.exports;
}

const en = Object.values(evalTs(path.join(ROOT, 'i18n/locales/wb/en.ts')))[0];
const fileFor = (l) => (['ru', 'hy'].includes(l) ? path.join(ROOT, `i18n/locales/${l}.ts`) : path.join(ROOT, `i18n/locales/extra/${l}.ts`));

/** Terms the app already uses in that language (so new screens match old ones). */
function glossary(l) {
  const base = Object.values(evalTs(fileFor(l)))[0] || {};
  const pick = (o, p) => p.split('.').reduce((x, k) => (x ? x[k] : undefined), o);
  const out = {};
  for (const k of ['journal', 'breathing', 'meditation', 'grounding', 'art', 'cards', 'insights', 'goals', 'anulia', 'safety']) {
    const v = pick(base, `explore.items.${k}.title`);
    if (v) out[k] = v;
  }
  out.helpScreen = pick(base, 'safety.title');
  out.moodLevels = pick(base, 'mood.levels');
  return out;
}

function toneNote(l) {
  const m = /\/\*\*\s*([^*]+?)\s*\*\//.exec(fs.readFileSync(fileFor(l), 'utf8'));
  return m ? m[1] : '';
}

function check(src, out, at = 'wb') {
  const problems = [];
  if (Array.isArray(src)) {
    if (!Array.isArray(out) || out.length !== src.length) problems.push(`${at}: list length`);
    else src.forEach((v, i) => problems.push(...check(v, out[i], `${at}[${i}]`)));
  } else if (src && typeof src === 'object') {
    if (!out || typeof out !== 'object') return [`${at}: missing`];
    for (const k of Object.keys(src)) problems.push(...check(src[k], out[k], `${at}.${k}`));
  } else {
    if (typeof out !== 'string' || !out.trim()) return [`${at}: missing`];
    const ph = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join(',');
    if (ph(src) !== ph(out)) problems.push(`${at}: placeholders ${ph(src)} ≠ ${ph(out)}`);
  }
  return problems;
}

async function translate(l) {
  const system = [
    `You translate the user interface strings of BeHappy, a well-being app (not therapy), from English into ${NAMES[l]}.`,
    `Tone: ${toneNote(l) || 'warm and respectful'}. Keep it natural for a phone app: short, kind, plain; never clinical.`,
    'Keep every {placeholder} exactly as is. Keep "Hz", numbers and "AI" as they are. Keep the JSON structure and keys exactly; translate only the string values. Arrays keep their length and order (weekdaysShort starts with Sunday).',
    `Use these terms the app already uses in ${NAMES[l]}: ${JSON.stringify(glossary(l))}. The companion's name is Anulia (write it as the app does in this language).`,
    'Never add health claims. "Binaural" is a technical term. Return only the JSON object.',
  ].join('\n');
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, instructions: system, input: `Translate this JSON:
${JSON.stringify(en)}`, reasoning: { effort: 'low' }, max_output_tokens: 32000, store: false, text: { format: { type: 'json_object' } } }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${l}: ${data?.error?.message || res.status}`);
    const text = data.output_text || (data.output || []).filter((o) => o.type === 'message').flatMap((o) => o.content).map((c) => c.text).join('');
    let out;
    try {
      out = JSON.parse(text);
    } catch {
      console.log(`${l}: attempt ${attempt} not JSON`);
      continue;
    }
    const problems = check(en, out);
    if (!problems.length) return { out, usage: data.usage };
    console.log(`${l}: attempt ${attempt}: ${problems.slice(0, 5).join('; ')}`);
  }
  throw new Error(`${l}: no valid translation after 3 attempts`);
}

const cap = (l) => l[0].toUpperCase() + l.slice(1);
let totalIn = 0;
let totalOut = 0;
for (const l of LANGS) {
  const t0 = Date.now();
  const { out, usage } = await translate(l);
  totalIn += usage?.input_tokens || 0;
  totalOut += usage?.output_tokens || 0;
  const body = `/** Well-being ecosystem (\`wb\`), ${NAMES[l]}. Machine-translated from en.ts (scripts/i18n/translate-wb.mjs); native review recommended. */\nexport const wb${cap(l)} = ${JSON.stringify(out, null, 2)};\n`;
  fs.writeFileSync(path.join(ROOT, `i18n/locales/wb/${l}.ts`), body);
  console.log(`${l}: ok (${Math.round((Date.now() - t0) / 1000)} s)`);
}
console.log(`tokens: ${totalIn} in / ${totalOut} out`);
