/**
 * State for one community room: first load, live updates, older pages,
 * optimistic sends (retry-safe by nonce), reactions, read markers and
 * catch-up after a reconnect. Falls back to plain HTTP when the live
 * connection is unavailable.
 *
 * Messages and the live stream are for members only: someone who hasn't
 * joined gets the room's details and a "join to read" state, and the
 * socket subscribes only after joining.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { trackAction } from '@/lib/analytics';
import { ApiError } from '@/lib/api/client';
import * as api from '@/lib/api/community';
import type { ReactionKey, Room, RoomMessage } from '@/lib/api/community';
import { ConnectionStatus, getSocket, onEvent, onStatus, request } from '@/lib/realtime/socket';

const byId = (a: RoomMessage, b: RoomMessage) => a.id - b.id;
const nonce = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export interface SendResult {
  ok: boolean;
  error?: string;
  safetyNotice?: boolean;
  held?: boolean;
}

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [pending, setPending] = useState<RoomMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>('idle');
  const [anuliaThinking, setAnuliaThinking] = useState<number | null>(null);
  const [anuliaNotice, setAnuliaNotice] = useState<string | null>(null);
  const [safetyNotice, setSafetyNotice] = useState(false);
  const lastId = useRef(0);
  const joinedRef = useRef(false);
  const wasOffline = useRef(false);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const merge = useCallback((incoming: RoomMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) if (m.roomId === roomId) map.set(m.id, m);
      const next = [...map.values()].sort(byId);
      lastId.current = Math.max(lastId.current, ...next.map((m) => m.id));
      return next;
    });
  }, [roomId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res: { room: Room; messages: RoomMessage[]; hasMore: boolean };
      try {
        await getSocket();
        res = await request<{ room: Room; messages: RoomMessage[]; hasMore: boolean }>('room:join', { roomId });
      } catch {
        // Not a member yet, or no live connection: the room's details over
        // HTTP, and its messages only for members.
        const info = await api.getRoom(roomId);
        if (info.joined) {
          const m = await api.getMessages(roomId, { limit: 40 });
          res = { room: info, messages: m.messages, hasMore: m.hasMore };
        } else {
          res = { room: info, messages: [], hasMore: false };
        }
      }
      joinedRef.current = Boolean(res.room.joined);
      setRoom(res.room);
      setMessages([]);
      lastId.current = 0;
      merge(res.messages);
      setHasMore(res.hasMore);
    } catch (e) {
      setError(e instanceof ApiError ? e.code || 'generic' : 'generic');
    } finally {
      setLoading(false);
    }
  }, [roomId, merge]);

  useEffect(() => {
    load();
    const offs = [
      onEvent('message:new', (m: RoomMessage) => {
        if (m.roomId !== roomId) return;
        merge([m]);
        if (m.author.kind === 'anulia') setAnuliaThinking(null);
      }),
      onEvent('message:update', (m: RoomMessage) => m.roomId === roomId && merge([m])),
      onEvent('room:update', (p: { roomId: string }) => {
        if (p.roomId !== roomId) return;
        api
          .getRoom(roomId)
          .then((next) => {
            joinedRef.current = next.joined;
            setRoom(next);
          })
          .catch(() => {});
      }),
      onEvent('anulia:thinking', (p: { roomId: string; replyToId: number }) => p.roomId === roomId && setAnuliaThinking(p.replyToId)),
      onEvent('anulia:unavailable', (p: { roomId: string; reason: string }) => {
        if (p.roomId !== roomId) return;
        setAnuliaThinking(null);
        setAnuliaNotice(p.reason);
      }),
      onEvent('safety:notice', (p: { roomId: string }) => p.roomId === roomId && setSafetyNotice(true)),
      onStatus((s) => {
        setConnection(s);
        if (s === 'offline') wasOffline.current = true;
        // Whenever the live connection is (back) up: join the room on the
        // server and fetch only what was missed since the last message seen.
        // This also covers a first load that fell back to plain HTTP.
        if (s === 'online' && joinedRef.current) {
          wasOffline.current = false;
          request<{ messages: RoomMessage[] }>('room:sync', { roomId, afterId: lastId.current })
            .then((r) => merge(r.messages))
            .catch(() => {});
        }
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      request('room:leave', { roomId }).catch(() => {});
    };
  }, [roomId, load, merge]);

  // Anulia's "writing…" indicator gives up after a minute.
  useEffect(() => {
    if (anuliaThinking === null) return;
    const id = setTimeout(() => setAnuliaThinking(null), 60000);
    return () => clearTimeout(id);
  }, [anuliaThinking]);

  const loadEarlier = useCallback(async () => {
    if (!messages.length || loadingEarlier) return;
    setLoadingEarlier(true);
    try {
      const res = await api.getMessages(roomId, { before: messages[0].id, limit: 40 });
      merge(res.messages);
      setHasMore(res.hasMore);
    } finally {
      setLoadingEarlier(false);
    }
  }, [messages, roomId, merge, loadingEarlier]);

  const markRead = useCallback(() => {
    if (!room?.joined || !lastId.current) return;
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      request('room:read', { roomId, messageId: lastId.current }).catch(() => api.markRead(roomId, lastId.current).catch(() => {}));
    }, 600);
  }, [room?.joined, roomId]);

  const send = useCallback(
    async (body: string, opts: { replyToId?: number; askAnulia?: boolean; retryOf?: string } = {}): Promise<SendResult> => {
      const n = opts.retryOf || nonce();
      const optimistic: RoomMessage = {
        id: -Date.now(),
        roomId,
        author: { kind: 'member', pseudonym: null, ref: null, avatarSeed: 0, isMe: true, formerMember: false },
        body,
        status: 'visible',
        heldReason: null,
        replyTo: null,
        asksAnulia: Boolean(opts.askAnulia),
        createdAt: Date.now(),
        reactions: {},
        myReactions: [],
        mutedAuthor: false,
        pending: 'sending',
        nonce: n,
      };
      setPending((p) => [...p.filter((x) => x.nonce !== n), optimistic]);
      const payload = { roomId, body, replyToId: opts.replyToId, nonce: n, askAnulia: opts.askAnulia };
      try {
        let res: { message: RoomMessage; held: boolean; safetyNotice: boolean };
        try {
          res = await request('message:send', payload);
        } catch (e: any) {
          // A refusal from the server is final; only a dead connection falls back to HTTP.
          if (e?.code) throw e;
          res = await api.postMessage(roomId, payload);
        }
        setPending((p) => p.filter((x) => x.nonce !== n));
        merge([res.message]);
        if (res.safetyNotice) setSafetyNotice(true);
        trackAction('community', 'message_sent');
        return { ok: true, held: res.held, safetyNotice: res.safetyNotice };
      } catch (e: any) {
        const code = e?.code || (e instanceof ApiError ? e.code : undefined) || 'network';
        // Permanent refusals are not kept as "failed" bubbles.
        if (['slow_down', 'duplicate_message', 'message_too_long', 'suspended', 'account_suspended', 'profile_required', 'registration_required', 'guidelines_required', 'not_a_member', 'room_paused', 'empty_message', 'bad_reply'].includes(code)) {
          setPending((p) => p.filter((x) => x.nonce !== n));
        } else {
          setPending((p) => p.map((x) => (x.nonce === n ? { ...x, pending: 'failed', error: code } : x)));
        }
        return { ok: false, error: code };
      }
    },
    [roomId, merge]
  );

  const toggleReaction = useCallback(
    async (m: RoomMessage, reaction: ReactionKey) => {
      const on = !m.myReactions.includes(reaction);
      const optimistic = {
        ...m,
        myReactions: on ? [...m.myReactions, reaction] : m.myReactions.filter((r) => r !== reaction),
        reactions: { ...m.reactions, [reaction]: Math.max(0, (m.reactions[reaction] || 0) + (on ? 1 : -1)) },
      };
      merge([optimistic]);
      try {
        const res = await request<{ reactions: RoomMessage['reactions']; myReactions: ReactionKey[] }>('message:react', { messageId: m.id, reaction, on }).catch(() => api.react(m.id, reaction, on));
        merge([{ ...optimistic, reactions: res.reactions, myReactions: res.myReactions }]);
        if (on) trackAction('community', 'reaction_added');
      } catch {
        merge([m]);
      }
    },
    [merge]
  );

  /** Joins, then loads the history and subscribes to the live stream. */
  const join = useCallback(async () => {
    const r = await api.joinRoom(roomId);
    trackAction('community', 'room_joined');
    joinedRef.current = true;
    setRoom(r);
    await load();
    return r;
  }, [roomId, load]);

  /** Leaves: the history and the live stream close for this person. */
  const leave = useCallback(async () => {
    await api.leaveRoom(roomId);
    joinedRef.current = false;
    request('room:leave', { roomId }).catch(() => {});
    setMessages([]);
    setPending([]);
    setHasMore(false);
    lastId.current = 0;
    setRoom((r) => (r ? { ...r, joined: false, pinned: undefined, unread: 0, notify: null } : r));
  }, [roomId]);

  const refreshRelations = useCallback(async () => {
    await request('relations:refresh', {}).catch(() => {});
    await load();
  }, [load]);

  return {
    room,
    setRoom,
    messages: [...messages, ...pending],
    hasMore,
    loading,
    loadingEarlier,
    error,
    connection,
    anuliaThinking,
    anuliaNotice,
    clearAnuliaNotice: () => setAnuliaNotice(null),
    safetyNotice,
    clearSafetyNotice: () => setSafetyNotice(false),
    reload: load,
    loadEarlier,
    markRead,
    send,
    toggleReaction,
    join,
    leave,
    refreshRelations,
    removeLocal: (id: number) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'deleted', body: '' } : m))),
  };
}
