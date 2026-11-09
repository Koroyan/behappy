// After `expo export --platform web`: makes dist/ an installable web app.
//
//   node scripts/pwa/finalize.mjs [dist]
//
//  1. Checks the manifest (fields browsers require to install) and that every
//     icon it names exists with the size it claims (PNG header).
//  2. Stamps the service worker: a build id (a hash of what was exported, so
//     each deployment is a new version and an unchanged one is not) and the
//     files to install with it: the offline page, the manifest, icons and the
//     scripts the first page loads (read from dist/index.html).
//  3. Checks that the service worker can't cache what it must not
//     (/api, other origins) — a guard against someone loosening sw.js.
// Exits with an error if anything is missing, so a broken PWA never deploys.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] || 'dist');
const problems = [];
const need = (cond, msg) => {
  if (!cond) problems.push(msg);
};
const read = (rel) => fs.readFileSync(path.join(dist, rel));
const exists = (rel) => fs.existsSync(path.join(dist, rel));

need(exists('index.html'), 'dist/index.html is missing: run `npx expo export --platform web` first');
need(exists('sw.js'), 'dist/sw.js is missing (public/sw.js not copied?)');
need(exists('offline.html'), 'dist/offline.html is missing');
need(exists('manifest.webmanifest'), 'dist/manifest.webmanifest is missing');
if (problems.length) {
  console.error(problems.map((p) => `✖ ${p}`).join('\n'));
  process.exit(1);
}

// ---------- 1. Manifest ----------
const pngSize = (buf) => (buf.subarray(1, 4).toString() === 'PNG' ? [buf.readUInt32BE(16), buf.readUInt32BE(20)] : null);
let manifest;
try {
  manifest = JSON.parse(read('manifest.webmanifest').toString('utf8'));
} catch (e) {
  console.error(`✖ manifest.webmanifest is not valid JSON: ${e.message}`);
  process.exit(1);
}
for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'icons']) need(manifest[k], `manifest: "${k}" is missing`);
need(manifest.display === 'standalone', 'manifest: display must be "standalone"');
const icons = [...(manifest.icons || []), ...(manifest.shortcuts || []).flatMap((s) => s.icons || [])];
for (const icon of icons) {
  const rel = icon.src.replace(/^\//, '');
  if (!exists(rel)) {
    problems.push(`manifest icon ${icon.src} does not exist`);
    continue;
  }
  const size = pngSize(read(rel));
  const [w, h] = String(icon.sizes).split('x').map(Number);
  need(size && size[0] === w && size[1] === h, `manifest icon ${icon.src}: claims ${icon.sizes}, is ${size ? size.join('x') : 'not a PNG'}`);
}
const purposes = (manifest.icons || []).map((i) => `${i.sizes}:${i.purpose || 'any'}`);
for (const p of ['192x192:any', '512x512:any', '512x512:maskable']) need(purposes.includes(p), `manifest: an icon ${p} is required`);
need(exists('icons/apple-touch-icon.png'), 'icons/apple-touch-icon.png is missing (iOS home screen icon)');
need(exists('icons/badge-96.png'), 'icons/badge-96.png is missing (notification badge)');

const index = read('index.html').toString('utf8');
need(index.includes('rel="manifest"'), 'index.html does not link the manifest (app/+html.tsx)');
need(/viewport-fit=cover/.test(index), 'index.html viewport lacks viewport-fit=cover (iPhone safe areas)');
need(index.includes('apple-touch-icon'), 'index.html lacks the apple-touch-icon link');

// ---------- 2. Stamp the service worker ----------
const scripts = [...new Set([...index.matchAll(/(?:src|href)="(\/_expo\/static\/[^"]+\.js)"/g)].map((m) => m[1]))];
need(scripts.length > 0, 'no /_expo/static scripts found in index.html');
const precache = ['/offline.html', '/manifest.webmanifest', '/favicon.ico', '/icons/icon-192.png', '/icons/badge-96.png', ...scripts].filter((p) => exists(p.slice(1)));

const hash = crypto.createHash('sha256');
const walk = (dir) => {
  for (const name of fs.readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    const rel = path.relative(dist, abs).replace(/\\/g, '/');
    if (rel === 'sw.js') continue;
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs);
    // Hashed names change with their content; other files are hashed by content.
    else hash.update(rel.startsWith('_expo/static/') ? `${rel}\n` : `${rel}:${crypto.createHash('sha1').update(fs.readFileSync(abs)).digest('hex')}\n`);
  }
};
walk(dist);
const template = read('sw.js').toString('utf8');
hash.update(template);
const build = hash.digest('hex').slice(0, 16);

need(template.includes("'__BEHAPPY_BUILD__'") && template.includes('/*__BEHAPPY_PRECACHE__*/'), 'dist/sw.js has no placeholders (already stamped? export again)');

// Hosting (vercel.json): every page with a [param] needs a rewrite, or a link to it 404s.
const vercelFile = path.join(dist, '..', 'vercel.json');
if (fs.existsSync(vercelFile)) {
  const vercel = JSON.parse(fs.readFileSync(vercelFile, 'utf8'));
  const routed = new Set((vercel.rewrites || []).map((r) => r.destination));
  const dynamic = [];
  const find = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (fs.statSync(abs).isDirectory()) find(abs);
      else if (/\[[^\]]+\]\.html$/.test(name)) dynamic.push(`/${path.relative(dist, abs).split(path.sep).join('/')}`);
    }
  };
  find(dist);
  for (const page of dynamic) need(routed.has(page), `vercel.json: no rewrite to ${page} (a link to it would 404)`);
  need(vercel.headers?.some((h) => h.source === '/sw.js'), 'vercel.json: /sw.js needs its no-cache header');
}

// ---------- 3. Guard the caching rules ----------
for (const rule of ["url.origin !== self.location.origin", "url.pathname.indexOf('/api/') === 0", "req.method !== 'GET'", "req.headers.has('Authorization')"]) need(template.includes(rule), `sw.js no longer contains the rule: ${rule}`);

if (problems.length) {
  console.error(problems.map((p) => `✖ ${p}`).join('\n'));
  process.exit(1);
}

const stamped = template.replace("'__BEHAPPY_BUILD__'", JSON.stringify(build)).replace('/*__BEHAPPY_PRECACHE__*/', precache.map((p) => JSON.stringify(p)).join(', '));
fs.writeFileSync(path.join(dist, 'sw.js'), stamped);
const kb = (n) => `${Math.round(n / 1024)} KB`;
const precacheBytes = precache.reduce((s, p) => s + fs.statSync(path.join(dist, p.slice(1))).size, 0);
console.log(`PWA ready: build ${build}, ${icons.length} icons checked, ${precache.length} files installed with the service worker (${kb(precacheBytes)}).`);
