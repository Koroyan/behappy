// Phone notifications and live unread counts: HTTP routes and the background
// sender. Mounted like the other feature modules (features.mjs).
//
//   POST   /api/push/devices   { token, platform, language, tz }   this phone may be notified
//   DELETE /api/push/devices   { token }                           not any more
//   GET    /api/push/prefs     categories, "show who wrote", quiet hours
//   PUT    /api/push/prefs
//   GET    /api/unread         small, cheap counts for badges (notifications,
//                              community rooms/messages, private messages)

import express from 'express';

import { requireAccount } from '../auth.mjs';
import { unreadCount } from './notifications.mjs';
import { pushFor, validPushToken } from './push.mjs';

export function mountPush(app, deps) {
  const { db, clock } = deps;
  const push = pushFor(deps);
  deps.push = push;
  const auth = requireAccount(db, { clock });
  const json = express.json({ limit: '8kb' });

  app.post('/api/push/devices', json, auth, async (req, res) => {
    const { token, platform, language, tz } = req.body || {};
    if (!validPushToken(token)) return res.status(400).json({ error: 'bad_token' });
    if (!['ios', 'android'].includes(platform)) return res.status(400).json({ error: 'bad_platform' });
    await push.registerDevice(req.account, { token, platform, language, tz });
    res.json({ ok: true, prefs: await push.getPrefs(req.account.id) });
  });

  app.delete('/api/push/devices', json, auth, async (req, res) => {
    if (validPushToken(req.body?.token)) await push.removeDevice(req.account, req.body.token);
    res.json({ ok: true });
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
