// Serves the exported web app (dist/) the way the hosting does, for testing
// the production PWA locally: clean URLs (/journal → journal.html, and
// /journal.html redirects to /journal), the rewrites and headers from
// vercel.json, and /api + /socket.io passed to the local API (same origin,
// like the development proxy). Development and QA only.
//
//   npm run build:web && npm run pwa:serve        → http://localhost:8090
//   PORT=8090 API_PORT=8787 DIST=dist node scripts/pwa/serve-dist.mjs
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8090);
const API = { host: '127.0.0.1', port: Number(process.env.API_PORT || 8787) };
const DIST = path.resolve(process.env.DIST || 'dist');
const vercel = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.txt': 'text/plain; charset=utf-8',
};

/** vercel.json patterns: "/(.*)", "/_expo/static/(.*)", "/art/:id". */
function toRegex(source) {
  let out = '';
  for (let i = 0; i < source.length; ) {
    if (source.startsWith('(.*)', i)) {
      out += '(.*)';
      i += 4;
      continue;
    }
    const param = /^:([A-Za-z0-9_]+)/.exec(source.slice(i));
    if (param) {
      out += '([^/]+)';
      i += param[0].length;
      continue;
    }
    out += source[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    i += 1;
  }
  return new RegExp(`^${out}$`);
}
const headerRules = (vercel.headers || []).map((h) => ({ re: toRegex(h.source), headers: h.headers }));
const rewrites = (vercel.rewrites || []).map((r) => ({ re: toRegex(r.source), destination: r.destination }));

const isApi = (url) => url === '/api' || url.startsWith('/api/') || url.startsWith('/api?') || url.startsWith('/socket.io/');

function fileFor(pathname) {
  const inside = (rel) => {
    const abs = path.resolve(DIST, `.${rel}`);
    return abs.startsWith(DIST) && fs.existsSync(abs) && fs.statSync(abs).isFile() ? abs : null;
  };
  if (pathname.endsWith('/')) return inside(`${pathname}index.html`);
  return inside(pathname) || inside(`${pathname}.html`) || inside(`${pathname}/index.html`) || (() => {
    for (const r of rewrites) if (r.re.test(pathname)) return inside(r.destination);
    return null;
  })();
}

function proxy(req, res) {
  const headers = { ...req.headers, 'x-forwarded-host': req.headers.host || '', 'x-forwarded-proto': 'http', 'x-forwarded-for': req.socket.remoteAddress || '127.0.0.1' };
  const up = http.request({ ...API, method: req.method, path: req.url, headers }, (r) => {
    res.writeHead(r.statusCode || 502, r.headers);
    r.pipe(res);
  });
  up.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('BeHappy API is not running (npm run server:local).');
  });
  req.pipe(up);
}

const server = http.createServer((req, res) => {
  if (isApi(req.url || '/')) return proxy(req, res);
  const url = new URL(req.url || '/', 'http://local');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  // cleanUrls: /x.html → 308 /x (and /index.html → /).
  if (vercel.cleanUrls && pathname.endsWith('.html')) {
    const clean = pathname.replace(/(\/index)?\.html$/, '') || '/';
    res.writeHead(308, { Location: clean + url.search });
    res.end();
    return;
  }
  const file = fileFor(pathname);
  const extra = {};
  for (const rule of headerRules) if (rule.re.test(pathname)) for (const h of rule.headers) extra[h.key] = h.value;
  if (!file) {
    const notFound = fileFor('/+not-found');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...extra });
    res.end(notFound ? fs.readFileSync(notFound) : 'Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', ...extra });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
});

// Socket.IO (community rooms) to the API.
server.on('upgrade', (req, socket, head) => {
  if (!isApi(req.url || '')) return socket.destroy();
  const up = net.connect(API.port, API.host, () => {
    let raw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (const [k, v] of Object.entries(req.headers)) for (const value of Array.isArray(v) ? v : [v]) raw += `${k}: ${value}\r\n`;
    up.write(`${raw}\r\n`);
    if (head?.length) up.write(head);
    socket.pipe(up).pipe(socket);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(PORT, () => console.log(`BeHappy web app (production build) on http://localhost:${PORT}  ·  /api → ${API.host}:${API.port}  ·  ${DIST}`));
