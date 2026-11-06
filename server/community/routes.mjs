// HTTP API for the community and its moderation. The real-time socket uses
// the same service, so limits and checks are identical on both paths.

import express from 'express';

import { requireAccount, requireStaff } from '../auth.mjs';
import { LANGUAGES } from './constants.mjs';
import { CommunityError } from './service.mjs';

const wrap = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (e) {
    if (e instanceof CommunityError) return res.status(e.status).json({ error: e.code, ...e.extra });
    throw e;
  }
};

export function communityRouter({ db, clock, community }) {
  const r = express.Router();
  const auth = requireAccount(db, { clock });
  r.use(express.json({ limit: '32kb' }));
  r.use(auth);

  r.get('/topics', wrap((req) => ({ topics: community.topics(), languages: LANGUAGES })));
  r.get('/profile', wrap(async (req) => ({ profile: await community.profile(req.account) })));
  r.put('/profile', wrap(async (req) => ({ profile: await community.setProfile(req.account, { pseudonym: req.body?.pseudonym, acceptGuidelines: req.body?.acceptGuidelines }) })));
  r.get('/status', wrap((req) => community.status(req.account)));
  r.post('/appeals', wrap((req) => community.appeal(req.account, { suspensionId: req.body?.suspensionId, body: req.body?.body })));
  r.get('/relations', wrap((req) => community.relations(req.account)));

  r.get(
    '/rooms',
    wrap(async (req) => {
      const lang = LANGUAGES.includes(String(req.query.lang)) ? String(req.query.lang) : 'en';
      return { language: lang, rooms: await community.rooms(req.account, lang) };
    })
  );
  r.get('/my-rooms', wrap(async (req) => ({ rooms: await community.myRooms(req.account) })));
  r.get('/rooms/:roomId', wrap(async (req) => ({ room: await community.room(req.account, req.params.roomId) })));
  r.post('/rooms/:roomId/join', wrap(async (req) => ({ room: await community.join(req.account, req.params.roomId) })));
  r.post('/rooms/:roomId/leave', wrap((req) => community.leave(req.account, req.params.roomId)));
  r.post('/rooms/:roomId/notify', wrap((req) => community.setNotify(req.account, req.params.roomId, req.body?.notify)));
  r.get('/rooms/:roomId/messages', wrap((req) => community.messages(req.account, req.params.roomId, { before: req.query.before, after: req.query.after, limit: req.query.limit })));
  r.post('/rooms/:roomId/messages', wrap((req) => community.post(req.account, req.params.roomId, { body: req.body?.body, replyToId: req.body?.replyToId, nonce: req.body?.nonce, askAnulia: req.body?.askAnulia })));
  r.get('/rooms/:roomId/search', wrap((req) => community.search(req.account, req.params.roomId, req.query.q)));
  r.post('/rooms/:roomId/read', wrap((req) => community.markRead(req.account, req.params.roomId, req.body?.messageId)));

  r.post('/messages/:id/reactions', wrap((req) => community.react(req.account, req.params.id, req.body?.reaction, req.body?.on !== false)));
  r.delete('/messages/:id', wrap((req) => community.deleteOwn(req.account, req.params.id)));
  r.post('/messages/:id/report', wrap((req) => community.report(req.account, { messageId: req.params.id, reason: req.body?.reason, details: req.body?.details })));
  r.post('/members/:ref/report', wrap((req) => community.report(req.account, { memberRef: req.params.ref, reason: req.body?.reason, details: req.body?.details })));
  r.post('/members/:ref/block', wrap((req) => community.block(req.account, req.params.ref, true)));
  r.delete('/members/:ref/block', wrap((req) => community.block(req.account, req.params.ref, false)));
  r.post('/members/:ref/mute', wrap((req) => community.mute(req.account, req.params.ref, true)));
  r.delete('/members/:ref/mute', wrap((req) => community.mute(req.account, req.params.ref, false)));
  return r;
}

export function moderationRouter({ db, clock, moderation }) {
  const r = express.Router();
  r.use(express.json({ limit: '32kb' }));
  r.use(requireAccount(db, { clock }), requireStaff('moderator', 'admin'));
  r.get('/summary', wrap(() => moderation.queueCounts()));
  r.get('/reports', wrap(async (req) => ({ reports: await moderation.listReports(req.account, { status: req.query.status, limit: req.query.limit }) })));
  r.post('/reports/:id/claim', wrap((req) => moderation.claim(req.account, req.params.id)));
  r.post('/reports/:id/resolve', wrap((req) => moderation.resolve(req.account, req.params.id, { action: req.body?.action, hours: req.body?.hours, note: req.body?.note, reason: req.body?.reason })));
  r.post('/messages/:id/remove', wrap((req) => moderation.removeMessage(req.account, req.params.id, { reason: req.body?.reason, note: req.body?.note })));
  r.post('/messages/:id/restore', wrap((req) => moderation.restoreMessage(req.account, req.params.id)));
  r.post('/members/:ref/suspend', wrap((req) => moderation.suspend(req.account, { memberRef: req.params.ref, kind: req.body?.kind, hours: req.body?.hours, reason: req.body?.reason })));
  r.post('/suspensions/:id/lift', wrap((req) => moderation.lift(req.account, req.params.id, req.body?.note)));
  r.get('/appeals', wrap(async (req) => ({ appeals: await moderation.listAppeals(req.account, { status: req.query.status }) })));
  r.post('/appeals/:id/decide', wrap((req) => moderation.decideAppeal(req.account, req.params.id, { decision: req.body?.decision, note: req.body?.note })));
  r.get('/history', wrap((req) => moderation.history(req.account, { memberRef: req.query.member, limit: req.query.limit })));
  r.post('/rooms/:roomId/pin', wrap((req) => moderation.pin(req.account, req.params.roomId, req.body?.messageId || null)));
  return r;
}
