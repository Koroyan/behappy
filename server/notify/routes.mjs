// Phone notifications and live unread counts: HTTP routes and the background
// sender. Mounted like the other feature modules (features.mjs).
//
//   POST   /api/push/devices   { token, platform, language, tz }   this phone may be notified
//          browsers: { token: endpoint, platform: 'web', keys: { p256dh, auth }, chats }
//   DELETE /api/push/devices   { token }                           not any more
//   GET    /api/push/web-key   the server's public VAPID key (for subscribing a browser)
//   PUT    /api/push/reminders { token, reminders: [{ id, kind, at, title, body, url }] }
//                              a browser's reminder plan (replaces the pending one)
//   GET    /api/push/prefs     categories, "show who wrote", quiet hours
//   PUT    /api/push/prefs
//   GET    /api/unread         small, cheap counts for badges (notifications,
//                              community rooms/messages, private messages)

import express from 'express';

import { requireAccount } from '../auth.mjs';
import { unreadCount } from './notifications.mjs';
import { isWebToken, pushFor, validPushToken } from './push.mjs';
import { vapidKeys } from './webpush.mjs';

export function mountPush(app, deps) {
  const { db, clock } = deps;
  const push = pushFor(deps);
  deps.push = push;
  const auth = requireAccount(db, { clock });
  const json = express.json({ limit: '8kb' });

  app.post('/api/push/devices', json, auth, async (req, res) => {
    const { token, platform, language, tz, keys, chats } = req.body || {};
    const problem = push.checkDevice({ token, platform, keys });
    if (problem) return res.status(400).json({ error: problem });
    if (platform === 'web' && !(await vapidKeys(deps).catch(() => null))) return res.status(503).json({ error: 'web_push_off' });
    await push.registerDevice(req.account, { token, platform, language, tz, keys, chats: chats !== false });
    res.json({ ok: true, prefs: await push.getPrefs(req.account.id) });
  });

  app.delete('/api/push/devices', json, auth, async (req, res) => {
    const token = req.body?.token;
    if (validPushToken(token) || (isWebToken(token) && String(token).length <= 2048)) await push.removeDevice(req.account, token);
    res.json({ ok: true });
  });

  // Public by nature (it is in every subscription); no account needed.
  app.get('/api/push/web-key', async (_req, res) => {
    const keys = await vapidKeys(deps).catch(() => null);
    if (!keys) return res.status(503).json({ error: 'web_push_off' });
    res.set('Cache-Control', 'no-store').json({ publicKey: keys.publicKey });
  });

  app.put('/api/push/reminders', express.json({ limit: '48kb' }), auth, async (req, res) => {
    const { token, reminders } = req.body || {};
    if (!isWebToken(token)) return res.status(400).json({ error: 'bad_token' });
    try {
      const count = await push.setReminders(req.account, token, reminders);
      res.json({ ok: true, count, pending: await push.listReminders(req.account, token) });
    } catch (e) {
      if (e?.code === 'unknown_device') return res.status(404).json({ error: 'unknown_device' });
      if (e?.code === 'bad_reminders') return res.status(400).json({ error: 'bad_reminders' });
      throw e;
    }
  });

  app.get('/api/push/prefs', auth, async (req, res) => {
    res.json({ prefs: await push.getPrefs(req.account.id), driver: push.driver === 'off' ? 'off' : 'on' });
  });

  app.put('/api/push/prefs', json, auth, async (req, res) => {
    res.json({ prefs: await push.setPrefs(req.account.id, req.body?.prefs || req.body || {}) });
  });

  // Badges refresh often (live events, coming back to the app), so this
  // answers only counts, using the same sections as /api/account/me.
  app.get('/api/unread', auth, async (req, res) => {
    const a = req.account;
    const now = clock.now();
    const section = async (name) => {
      const s = deps.meSections.find((x) => x.name === name);
      return s ? s.fn(db, a, now) : null;
    };
    const [notifications, community, client] = await Promise.all([unreadCount(db, a.id), section('community'), section('client')]);
    res.json({
      notifications,
      community: { rooms: community?.unreadRooms || 0, messages: community?.unreadMessages || 0, byRoom: community?.unreadByRoom || {} },
      messages: client?.unreadMessages || 0,
    });
  });
}

/** Background service (SERVICES): sends what is due every few seconds, sooner after a write. */
export async function startPushService({ deps }) {
  const push = deps.push || pushFor(deps);
  const seconds = Math.max(3, Number(process.env.PUSH_INTERVAL_SECONDS || 10));
  const timer = setInterval(() => push.flush().catch((e) => console.error('[push] flush failed', e?.message)), seconds * 1000);
  timer.unref?.();
  return {
    stop: async () => {
      clearInterval(timer);
      push.stop();
    },
  };
}
