// Development front door: one origin for the web app and the API.
//
//   PROXY_PORT (8081)  ->  /api/*, /socket.io/*  ->  API (8787)
//                      ->  everything else       ->  Expo web / Metro (8082)
//
// Serving the API on the app's own origin means the app works the same on
// http://localhost:8081 and through a tunnel (ngrok) on a phone: no
// localhost URLs inside the page, no mixed content, WebSockets included.
// Development only; production puts a TLS proxy (deploy/Caddyfile) in front.
//
//   node scripts/dev/proxy.mjs
import http from 'node:http';
import net from 'node:net';

const PORT = Number(process.env.PROXY_PORT || 8081);
const API = { host: '127.0.0.1', port: Number(process.env.API_PORT || 8787) };
const WEB = { host: '127.0.0.1', port: Number(process.env.WEB_PORT || 8082) };

const targetFor = (url = '/') => (url === '/api' || url.startsWith('/api/') || url.startsWith('/api?') || url.startsWith('/socket.io/') ? API : WEB);

function forwardedHeaders(req) {
  const headers = { ...req.headers };
  const peer = req.socket.remoteAddress || '127.0.0.1';
  headers['x-forwarded-for'] = req.headers['x-forwarded-for'] ? `${req.headers['x-forwarded-for']}, ${peer}` : peer;
  headers['x-forwarded-host'] = req.headers['x-forwarded-host'] || req.headers.host || '';
  headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'http';
  return headers;
}

const server = http.createServer((req, res) => {
  const target = targetFor(req.url);
  const upstream = http.request({ ...target, method: req.method, path: req.url, headers: forwardedHeaders(req) }, (r) => {
    res.writeHead(r.statusCode || 502, r.statusMessage, r.headers);
    r.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(target === API ? 'BeHappy API is not running (npm run server:local).' : 'Expo web is not running on port 8082.');
  });
  req.pipe(upstream);
});

// WebSockets: Socket.IO (community rooms) to the API, Metro's hot reload to Expo.
server.on('upgrade', (req, socket, head) => {
  const target = targetFor(req.url);
  const upstream = net.connect(target.port, target.host, () => {
    let raw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (const [k, v] of Object.entries(forwardedHeaders(req))) {
      for (const value of Array.isArray(v) ? v : [v]) raw += `${k}: ${value}\r\n`;
    }
    upstream.write(`${raw}\r\n`);
    if (head?.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(PORT, () => {
  console.log(`[proxy] http://localhost:${PORT}  ->  /api, /socket.io: ${API.port}  ·  app: ${WEB.port}`);
});
