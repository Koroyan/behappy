// Metro: Expo's defaults, minus folders that change constantly during
// development and are never part of the app — the dev database (.server-data,
// written on every API request), QA screenshots (qa-shots) and the web build
// (dist). Watching them made Metro's web server rendering fail now and then
// with "Requiring unknown module …" while the browser journeys were running.
//
// Development only: Metro also forwards /api and /socket.io to the API
// (127.0.0.1:8787, API_PORT). The web app looks for the API on its own origin,
// so opening Metro directly (http://<computer>:8082) works like the dev proxy
// on 8081 (scripts/dev/proxy.mjs). Socket.IO works over long-polling here;
// the proxy on 8081 also carries its WebSockets.
const http = require('node:http');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ignored = ['.server-data', 'qa-shots', 'dist'].map((dir) => new RegExp(`^${escape(path.resolve(__dirname, dir))}[/\\\\].*`));

config.resolver.blockList = [...[].concat(config.resolver.blockList || []), ...ignored];

const API = { host: '127.0.0.1', port: Number(process.env.API_PORT || 8787) };
const isApi = (url = '/') => url === '/api' || url.startsWith('/api/') || url.startsWith('/api?') || url.startsWith('/socket.io/');

function forwardToApi(req, res) {
  const headers = { ...req.headers };
  const peer = req.socket?.remoteAddress || '127.0.0.1';
  headers['x-forwarded-for'] = req.headers['x-forwarded-for'] ? `${req.headers['x-forwarded-for']}, ${peer}` : peer;
  // The API's own address on this computer (same host name, API port): payment
  // providers send the browser back there, since Expo's dev server refuses
  // their cross-site POST (server/app.mjs requestApiBase accepts it in development).
  const hostname = String(req.headers.host || 'localhost').replace(/:\d+$/, '');
  headers['x-forwarded-host'] = `${hostname}:${API.port}`;
  headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'http';
  const upstream = http.request({ ...API, method: req.method, path: req.url, headers }, (r) => {
    res.writeHead(r.statusCode || 502, r.statusMessage, r.headers);
    r.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('BeHappy API is not running (npm run server:local).');
  });
  req.pipe(upstream);
}

const previous = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const inner = previous ? previous(middleware, server) : middleware;
    return (req, res, next) => (isApi(req.url) ? forwardToApi(req, res) : inner(req, res, next));
  },
};

module.exports = config;
