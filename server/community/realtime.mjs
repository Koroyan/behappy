// Real-time community rooms over Socket.IO (wss:// behind the HTTPS proxy).
//
//  - The handshake carries the same bearer token as the HTTP API; the
//    server checks it and keeps only the account on the socket.
//  - Clients join "room:<id>" only after the same access check as the HTTP
//    API (registered, guidelines accepted, member of that room). Leaving a
//    room, an archived room or a revoked session removes the socket.
//  - Every message is filtered per recipient (blocked authors, held
//    messages) before it is sent.
//  - The session behind a socket is checked again at least once a minute,
//    so a revoked or expired token stops working on open connections too.
//  - Reconnection: Socket.IO reconnects automatically; the client then asks
//    for "room:sync" with the last id it saw and receives what it missed.
//  - Writes go through the same service as the HTTP API (same limits and
//    checks); fan-out happens after the database commit.

import { Server } from 'socket.io';

import { can } from '../admin/permissions.mjs';
import { findAccountByToken } from '../auth.mjs';
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
    socket.data.viewer = { ...rel, staff: can(socket.data.account, 'moderation.act') };
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
  const SESSION_RECHECK_MS = 60 * 1000;
  /** The socket's account, re-read from the session at most once a minute. */
  const current = async (socket) => {
    const now = clock.now();
    if (now - (socket.data.checkedAt || 0) < SESSION_RECHECK_MS) return socket.data.account;
    const account = await findAccountByToken(db, socket.handshake.auth?.token, now);
    if (!account) {
      socket.disconnect(true);
      throw Object.assign(new Error('unauthorized'), { code: 'unauthorized' });
    }
    socket.data.account = account;
    socket.data.checkedAt = now;
    return account;
  };
  const guard = (socket, fn) => async (payload, ack) => {
    try {
      const account = await current(socket);
      reply(ack, { ok: true, ...(await fn(account, payload || {})) });
    } catch (e) {
      reply(ack, { ok: false, error: e.code || 'server_error', ...(e.extra || {}) });
    }
  };

  io.on('connection', (socket) => {
    socket.data.checkedAt = clock.now();
    socket.join(`user:${socket.data.account.id}`);

    socket.on(
      'room:join',
      guard(socket, async (account, { roomId }) => {
        // The access check runs before the socket is subscribed.
        const { messages, hasMore } = await community.messages(account, roomId, { limit: 40 });
        const room = await community.room(account, roomId);
        socket.join(`room:${roomId}`);
        return { room, messages, hasMore };
      })
    );
    socket.on(
      'room:leave',
      guard(socket, async (_account, { roomId }) => {
        socket.leave(`room:${roomId}`);
        return {};
      })
    );
    socket.on(
      'room:sync',
      guard(socket, async (account, { roomId, afterId }) => {
        const res = await community.messages(account, roomId, { after: afterId, limit: 100 });
        socket.join(`room:${roomId}`);
        return res;
      })
    );
    socket.on(
      'message:send',
      guard(socket, async (account, { roomId, body, replyToId, nonce, askAnulia }) => community.post(account, roomId, { body, replyToId, nonce, askAnulia }))
    );
    socket.on(
      'message:react',
      guard(socket, async (account, { messageId, reaction, on }) => community.react(account, messageId, reaction, on !== false))
    );
    socket.on(
      'room:read',
      guard(socket, async (account, { roomId, messageId }) => community.markRead(account, roomId, messageId))
    );
    socket.on(
      'relations:refresh',
      guard(socket, async () => {
        await refreshRelations(socket);
        return {};
      })
    );
    // Presence only: a private conversation open on this device. Nothing is
    // broadcast to "thread:" rooms; the phone notification step uses this to
    // stay quiet while the person is already reading that conversation.
    socket.on(
      'thread:watch',
      guard(socket, async (_account, { threadId }) => {
        if (typeof threadId === 'string' && threadId.length <= 64) socket.join(`thread:${threadId}`);
        return {};
      })
    );
    socket.on(
      'thread:unwatch',
      guard(socket, async (_account, { threadId }) => {
        if (typeof threadId === 'string') socket.leave(`thread:${threadId}`);
        return {};
      })
    );
  });

  /** Is this person looking at that room or thread on any connected device? */
  const isWatching = async (accountId, roomName) => {
    for (const s of await io.in(`user:${accountId}`).fetchSockets()) if (s.rooms.has(roomName)) return true;
    return false;
  };

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

  community.bus.on('message:new', async ({ roomId, messageId }) => {
    await sendToRoom(roomId, messageId, 'message:new');
    // Members who are elsewhere in the app update their unread badges.
    const [row] = await loadMessageRows(db, [messageId]);
    const members = await db.query('select account_id from room_memberships where room_id = $1 and account_id <> $2', [roomId, row?.author_account_id || '']);
    if (members.rowCount) io.to(members.rows.map((m) => `user:${m.account_id}`)).emit('room:activity', { roomId });
  });
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
  community.bus.on('notification', ({ accountId }) => {
    io.to(`user:${accountId}`).emit('notification:new', {});
    deps.push?.poke();
  });
  // Read on one device: the person's other devices update their badges.
  community.bus.on('unread', ({ accountId }) => io.to(`user:${accountId}`).emit('unread:changed', {}));
  community.bus.on('suspended', ({ accountId }) => io.to(`user:${accountId}`).emit('account:suspended', {}));
  community.bus.on('relations', async ({ accountId }) => {
    for (const s of await io.in(`user:${accountId}`).fetchSockets()) await refreshRelations(s);
  });
  // Membership ends: stop that person's live stream for the room on every device.
  community.bus.on('membership:left', ({ roomId, accountId }) => io.in(`user:${accountId}`).socketsLeave(`room:${roomId}`));
  // A room is archived: nobody keeps its stream.
  community.bus.on('room:archived', ({ roomId }) => {
    io.to(`room:${roomId}`).emit('room:update', { roomId });
    io.in(`room:${roomId}`).socketsLeave(`room:${roomId}`);
  });

  // Other modules (private messages, bookings, staff tools) push to or close a person's connections.
  deps.realtime = {
    toUser: (accountId, event, payload) => {
      io.to(`user:${accountId}`).emit(event, payload);
      if (event === 'notification:new') deps.push?.poke();
    },
    isWatching,
    connections: () => io.engine.clientsCount,
    /** Closes live connections: all of a person's, or only those of one session. */
    disconnect: async (accountId, { sessionId, exceptSessionId } = {}) => {
      let n = 0;
      for (const s of await io.in(`user:${accountId}`).fetchSockets()) {
        if (sessionId && s.data.account?.sessionId !== sessionId) continue;
        if (exceptSessionId && s.data.account?.sessionId === exceptSessionId) continue;
        s.disconnect(true);
        n += 1;
      }
      return n;
    },
  };

  return {
    io,
    stop: () =>
      new Promise((resolve) => {
        io.close(() => resolve());
      }),
  };
}
