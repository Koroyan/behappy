// Real-time community rooms over Socket.IO (wss:// behind the HTTPS proxy).
//
//  - The handshake carries the same bearer token as the HTTP API; the
//    server checks it and keeps only the account on the socket.
//  - Clients join "room:<id>"; every message is filtered per recipient
//    (blocked authors, held messages) before it is sent.
//  - Reconnection: Socket.IO reconnects automatically; the client then asks
//    for "room:sync" with the last id it saw and receives what it missed.
//  - Writes go through the same service as the HTTP API (same limits and
//    checks); fan-out happens after the database commit.

import { Server } from 'socket.io';

import { findAccountByToken, isStaff } from '../auth.mjs';
import { loadMessageRows, messageForViewer, reactionsFor, relationsFor } from './service.mjs';

export function startRealtime({ server, deps, community }) {
  const { db, config, clock } = deps;
  const allowed = new Set([...config.appPublicUrls, ...config.corsOrigins]);
  const io = new Server(server, {
    path: '/socket.io',
    serveClient: false,
    maxHttpBufferSize: 64 * 1024,
    pingInterval: 25000,
    pingTimeout: 20000,
    cors: {
      origin(origin, cb) {
        if (!origin || allowed.has(String(origin).replace(/\/$/, ''))) return cb(null, true);
        return cb(null, false);
      },
    },
  });

  const refreshRelations = async (socket) => {
    const rel = await relationsFor(db, socket.data.account.id);
    socket.data.viewer = { ...rel, staff: isStaff(socket.data.account, 'moderator') || isStaff(socket.data.account, 'admin') };
  };

  io.use(async (socket, next) => {
    try {
      const account = await findAccountByToken(db, socket.handshake.auth?.token, clock.now());
      if (!account) return next(new Error('unauthorized'));
      socket.data.account = account;
      await refreshRelations(socket);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  const reply = (ack, payload) => {
    if (typeof ack === 'function') ack(payload);
  };
  const guard = (fn) => async (payload, ack) => {
    try {
      reply(ack, { ok: true, ...(await fn(payload || {})) });
    } catch (e) {
      reply(ack, { ok: false, error: e.code || 'server_error', ...(e.extra || {}) });
    }
  };

  io.on('connection', (socket) => {
    const account = socket.data.account;
    socket.join(`user:${account.id}`);

    socket.on(
      'room:join',
      guard(async ({ roomId }) => {
        const room = await community.room(account, roomId);
        socket.join(`room:${roomId}`);
        const { messages, hasMore } = await community.messages(account, roomId, { limit: 40 });
        return { room, messages, hasMore };
      })
    );
    socket.on(
      'room:leave',
      guard(async ({ roomId }) => {
        socket.leave(`room:${roomId}`);
        return {};
      })
    );
    socket.on(
      'room:sync',
      guard(async ({ roomId, afterId }) => {
        socket.join(`room:${roomId}`);
        return community.messages(account, roomId, { after: afterId, limit: 100 });
      })
    );
    socket.on(
      'message:send',
      guard(async ({ roomId, body, replyToId, nonce, askAnulia }) => community.post(account, roomId, { body, replyToId, nonce, askAnulia }))
    );
    socket.on(
      'message:react',
      guard(async ({ messageId, reaction, on }) => community.react(account, messageId, reaction, on !== false))
    );
    socket.on(
      'room:read',
      guard(async ({ roomId, messageId }) => community.markRead(account, roomId, messageId))
    );
    socket.on(
      'relations:refresh',
      guard(async () => {
        await refreshRelations(socket);
        return {};
      })
    );
  });

  // ---------- Fan-out after commit ----------
  const sendToRoom = async (roomId, messageId, event) => {
    const [row] = await loadMessageRows(db, [messageId]);
    if (!row) return;
    const sockets = await io.in(`room:${roomId}`).fetchSockets();
    if (!sockets.length) return;
    for (const s of sockets) {
      const viewer = s.data.viewer || { id: s.data.account?.id, blocked: new Set(), muted: new Set() };
      const reactions = await reactionsFor(db, [messageId], viewer.id);
      const dto = messageForViewer(row, viewer, reactions);
      if (dto) s.emit(event, dto);
    }
  };

  community.bus.on('message:new', ({ roomId, messageId }) => sendToRoom(roomId, messageId, 'message:new'));
  community.bus.on('message:update', ({ roomId, messageId }) => sendToRoom(roomId, messageId, 'message:update'));
  community.bus.on('message:reactions', ({ roomId, messageId }) => sendToRoom(roomId, messageId, 'message:update'));
  community.bus.on('message:held', async ({ roomId, messageId, accountId }) => {
    const [row] = await loadMessageRows(db, [messageId]);
    if (row) io.to(`user:${accountId}`).emit('message:new', messageForViewer(row, { id: accountId, blocked: new Set(), muted: new Set() }, new Map()));
  });
  community.bus.on('room:update', ({ roomId }) => io.to(`room:${roomId}`).emit('room:update', { roomId }));
  community.bus.on('anulia:thinking', ({ roomId, replyToId }) => io.to(`room:${roomId}`).emit('anulia:thinking', { roomId, replyToId }));
  community.bus.on('anulia:unavailable', ({ accountId, roomId, reason }) => io.to(`user:${accountId}`).emit('anulia:unavailable', { roomId, reason }));
  community.bus.on('safety:notice', ({ accountId, roomId }) => io.to(`user:${accountId}`).emit('safety:notice', { roomId }));
  community.bus.on('notification', ({ accountId }) => io.to(`user:${accountId}`).emit('notification:new', {}));
  community.bus.on('suspended', ({ accountId }) => io.to(`user:${accountId}`).emit('account:suspended', {}));
  community.bus.on('relations', async ({ accountId }) => {
    for (const s of await io.in(`user:${accountId}`).fetchSockets()) await refreshRelations(s);
  });

  return {
    io,
    stop: () =>
      new Promise((resolve) => {
        io.close(() => resolve());
      }),
  };
}
