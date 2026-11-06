// Run: node --test scripts/qa/secrets.test.mjs   (part of npm test)
//
// Fails if a tracked file contains something shaped like a real credential,
// or if app code (everything that ends up in the client bundle) references a
// server secret. Prints file paths only, never the matched value.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tracked = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root }).toString('utf8').split(/\r?\n/).filter(Boolean);
const TEXT = /\.(m?js|cjs|tsx?|json|md|ya?ml|txt|html|css|env|example|sql|sh|toml)$/i;
const read = (f) => {
  try {
    return fs.readFileSync(path.join(root, f), 'utf8');
  } catch {
    return '';
  }
};

const SHAPES = [
  ['OpenAI/Anthropic-style key', /(?<![A-Za-z0-9])sk-(?:proj-|svcacct-|admin-|ant-)?[A-Za-z0-9_-]{20,}/g],
  ['AWS access key', /AKIA[0-9A-Z]{16}/g],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,}/g],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/g],
  ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ['Stripe live key', /[rs]k_live_[0-9a-zA-Z]{20,}/g],
];
// Documentation placeholders such as sk-xxxx-your-api-key are fine.
const placeholder = (m) => /-key$|your|xxxx|example|placeholder|not-real|test-/i.test(m);

test('no credential-shaped strings in tracked files', () => {
  const hits = [];
  for (const f of tracked) {
    if (!TEXT.test(f) || f.startsWith('node_modules/')) continue;
    const src = read(f);
    for (const [label, re] of SHAPES) {
      for (const m of src.matchAll(re)) if (!placeholder(m[0])) hits.push(`${f}: ${label}`);
    }
  }
  assert.deepEqual(hits, [], 'credential-shaped strings found (values not shown)');
});

test('app code never references server secrets', () => {
  const CLIENT_DIRS = ['app/', 'features/', 'lib/', 'services/', 'contexts/', 'design/', 'i18n/', 'components/'];
  const SECRET_NAMES = /\b(EXPO_PUBLIC_API_KEY|OPENAI_API_KEY|FLITT_SECRET_KEY|ADMIN_TOKEN|DATABASE_URL|DOCUMENT_ENCRYPTION_KEY|MESSAGE_ENCRYPTION_KEY|SESSION_SECRET)\b/;
  const hits = tracked.filter((f) => CLIENT_DIRS.some((d) => f.startsWith(d)) && /\.(tsx?|m?js)$/.test(f) && SECRET_NAMES.test(read(f)));
  assert.deepEqual(hits, [], 'client code must not mention server secrets');
});

test('the client bundle config never forwards secrets', () => {
  const cfg = read('app.config.js');
  const extra = cfg.slice(cfg.indexOf('extra:'));
  assert.doesNotMatch(extra, /KEY|SECRET|TOKEN/, 'app.config.js extra must not carry secrets');
});
