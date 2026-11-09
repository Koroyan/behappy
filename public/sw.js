/* BeHappy service worker.
 *
 * What it does:
 *  - Installs the app shell (scripts the first page needs, the offline page,
 *    icons) so BeHappy opens fast and still opens without a connection.
 *  - Pages: network first; when offline, the copy of that page saved on the
 *    last visit, otherwise the offline page. Pages are the pre-rendered HTML
 *    of the static export: they never contain anyone's data.
 *  - Scripts, fonts, images and sounds with a content hash in the name: from
 *    the cache once fetched (they never change under the same name).
 *  - Notifications (Web Push): shows them, opens the right screen on a tap.
 *  - Updates: a new version waits until the person taps "Refresh" in the app
 *    (the page sends SKIP_WAITING); nothing is swapped under someone typing.
 *
 * What it never touches: anything not on this origin (the BeHappy API on its
 * own domain, Flitt checkout, AI), /api and /socket.io on this origin, any
 * request that carries an Authorization header, anything but GET, partial
 * (Range) requests, and responses marked no-store. So no account data, AI
 * reply, journal text or payment page is ever written to a cache here.
 *
 * scripts/pwa/finalize.mjs stamps BUILD and PRECACHE after `expo export`.
 * Unstamped (the development server), it only handles notifications.
 */
const BUILD = '__BEHAPPY_BUILD__';
const PRECACHE = [/*__BEHAPPY_PRECACHE__*/];
const DEV = BUILD.indexOf('__') === 0 || new URL(self.location.href).searchParams.get('mode') === 'dev';

const STATIC = 'bh-static-' + BUILD;
const PAGES = 'bh-pages-' + BUILD;
const OFFLINE = '/offline.html';
const MAX_PAGES = 60;

const isStatic = (path) =>
  path.indexOf('/_expo/static/') === 0 ||
  path.indexOf('/assets/') === 0 ||
  path.indexOf('/icons/') === 0 ||
  path === '/manifest.webmanifest' ||
  path === '/favicon.ico' ||
  path === OFFLINE ||
  /\.(?:ttf|otf|woff2?)$/i.test(path);

const cacheable = (res) =>
  res && res.ok && res.type === 'basic' && !/no-store|private/i.test(res.headers.get('Cache-Control') || '');

/** A path inside the app ("/journal"), never another site. */
const safePath = (url) => (typeof url === 'string' && url.length < 300 && url[0] === '/' && url[1] !== '/' && url[1] !== '\\' ? url : '/');

/** One cache entry per page path: the query (?orderId=…) never matters for static HTML. */
const pageKey = (url) => {
  const p = url.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  return new Request(self.location.origin + (p || '/'));
};

self.addEventListener('install', (event) => {
  if (DEV) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC);
      // One missing file must not stop the install (the network still works for it).
      // A host that redirects (/offline.html → /offline) gives a "redirected" response,
      // which can't answer a page load: keep a plain copy instead.
      await Promise.all(
        PRECACHE.map(async (u) => {
          try {
            // Hashed scripts were just loaded by the page: take them from the HTTP cache
            // (no second download); unhashed files (offline page, manifest, icons) fresh.
            const res = await fetch(new Request(u, { cache: u.indexOf('/_expo/static/') === 0 ? 'default' : 'reload' }));
            if (!cacheable(res)) return;
            await cache.put(u, res.redirected ? new Response(await res.blob(), { status: 200, headers: res.headers }) : res);
          } catch (e) {
            // fetched later, when used
          }
        })
      );
      const pages = await caches.open(PAGES);
      try {
        const home = await fetch(new Request('/', { cache: 'reload' }));
        if (cacheable(home)) await pages.put(pageKey(new URL('/', self.location.origin)), home);
      } catch (e) {
        // offline while installing: the home page is saved on the next visit
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = DEV ? [] : [STATIC, PAGES];
      for (const name of await caches.keys()) if (name.indexOf('bh-') === 0 && keep.indexOf(name) < 0) await caches.delete(name);
      if (!DEV && self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => undefined);
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function trimPages(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_PAGES; i += 1) await cache.delete(keys[i]);
}

async function page(event, url) {
  const cache = await caches.open(PAGES);
  const key = pageKey(url);
  try {
    const res = (await event.preloadResponse) || (await fetch(event.request));
    if (cacheable(res) && (res.headers.get('Content-Type') || '').indexOf('text/html') >= 0) {
      const copy = res.clone();
      event.waitUntil(cache.put(key, copy).then(() => trimPages(cache)).catch(() => undefined));
    }
    return res;
  } catch (e) {
    return (
      (await cache.match(key)) ||
      (await caches.match(OFFLINE)) ||
      new Response('BeHappy is offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    );
  }
}

async function cacheFirst(event) {
  const hit = await caches.match(event.request);
  if (hit) return hit;
  const res = await fetch(event.request);
  if (cacheable(res)) {
    const copy = res.clone();
    event.waitUntil(caches.open(STATIC).then((c) => c.put(event.request, copy)).catch(() => undefined));
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  if (DEV) return;
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/api' || url.pathname.indexOf('/api/') === 0 || url.pathname.indexOf('/socket.io/') === 0) return;
  if (req.headers.has('Authorization') || req.headers.has('Range')) return;
  if (req.mode === 'navigate') {
    event.respondWith(page(event, url));
    return;
  }
  if (isStatic(url.pathname)) event.respondWith(cacheFirst(event));
});

// ---------- Notifications ----------

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = typeof data.title === 'string' && data.title ? data.title.slice(0, 120) : 'BeHappy';
  const tag = typeof data.tag === 'string' && /^[a-z0-9-]{1,60}$/.test(data.tag) ? data.tag : 'behappy';
  const options = {
    body: typeof data.body === 'string' ? data.body.slice(0, 300) : '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag,
    // A newer message with the same tag replaces the older one (no pile of duplicates) and still alerts.
    renotify: true,
    data: { url: safePath(data.url), kind: typeof data.kind === 'string' ? data.kind : '' },
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      try {
        if (typeof data.badge === 'number' && self.navigator.setAppBadge) {
          if (data.badge > 0) await self.navigator.setAppBadge(data.badge);
          else await self.navigator.clearAppBadge();
        }
      } catch (e) {
        // badges are optional
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = safePath(event.notification.data && event.notification.data.url);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (open) {
        try {
          await open.focus();
        } catch (e) {
          // focusing may be refused; the message still opens the screen
        }
        open.postMessage({ type: 'behappy:open', url });
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});

// The browser replaced the subscription (keys rotated): subscribe again and let
// an open BeHappy window register it (the server is told on the next start too).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const old = event.oldSubscription && event.oldSubscription.options;
        if (old && old.applicationServerKey) await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: old.applicationServerKey });
      } catch (e) {
        // the app subscribes again when it opens
      }
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windows.forEach((c) => c.postMessage({ type: 'behappy:resubscribe' }));
    })()
  );
});
