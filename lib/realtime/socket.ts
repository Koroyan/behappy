/**
 * One Socket.IO connection to the BeHappy server for live community rooms.
 *
 * - Authenticates with the same token as the HTTP API (never a URL param).
 * - Reconnects by itself; screens listen to `onStatus` and ask for what they
 *   missed (room:sync) when the connection comes back.
 * - Signing in or out closes the connection; the next use opens a new one.
 */
import { io, Socket } from 'socket.io-client';

import { API_BASE_URL, getStoredAccount, onAccountChange, TUNNEL_HEADERS } from '@/lib/api/client';

export type ConnectionStatus = 'idle' | 'connecting' | 'online' | 'offline';

let socket: Socket | null = null;
let token: string | null = null;
let status: ConnectionStatus = 'idle';
const statusListeners = new Set<(s: ConnectionStatus) => void>();
const eventListeners = new Map<string, Set<(payload: any) => void>>();

const FORWARDED = ['message:new', 'message:update', 'room:update', 'anulia:thinking', 'anulia:unavailable', 'safety:notice', 'notification:new', 'account:suspended'];

function setStatus(next: ConnectionStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((fn) => fn(next));
}

export async function getSocket(): Promise<Socket | null> {
  const account = await getStoredAccount();
  if (!account) return null;
  if (socket && token === account.token) return socket;
  socket?.disconnect();
  token = account.token;
  setStatus('connecting');
  const s = io(API_BASE_URL, {
    path: '/socket.io',
    auth: { token: account.token },
    // WebSocket first; long-polling if a network or tunnel blocks it.
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    extraHeaders: TUNNEL_HEADERS,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8000,
    timeout: 10000,
  });
  for (const event of FORWARDED) s.on(event, (payload: any) => eventListeners.get(event)?.forEach((fn) => fn(payload)));
  s.on('connect', () => setStatus('online'));
  s.on('disconnect', () => setStatus('offline'));
  s.on('connect_error', () => setStatus('offline'));
  socket = s;
  return s;
}

onAccountChange(() => {
  socket?.disconnect();
  socket = null;
  token = null;
  setStatus('idle');
});

export function onStatus(fn: (s: ConnectionStatus) => void) {
  statusListeners.add(fn);
  fn(status);
  return () => {
    statusListeners.delete(fn);
  };
}

export function onEvent(event: string, fn: (payload: any) => void) {
  if (!eventListeners.has(event)) eventListeners.set(event, new Set());
  eventListeners.get(event)!.add(fn);
  return () => {
    eventListeners.get(event)?.delete(fn);
  };
}

/** Emits with an acknowledgement; rejects when offline or after a timeout. */
export async function request<T = any>(event: string, payload: Record<string, unknown>, timeoutMs = 10000): Promise<T> {
  const s = await getSocket();
  if (!s) throw new Error('offline');
  // A fresh connection may still be opening: wait a moment instead of failing.
  if (!s.connected) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        s.off('connect', onConnect);
        reject(new Error('offline'));
      }, Math.min(timeoutMs, 4000));
      const onConnect = () => {
        clearTimeout(timer);
        resolve();
      };
      s.once('connect', onConnect);
    });
  }
  return new Promise<T>((resolve, reject) => {
    s.timeout(timeoutMs).emit(event, payload, (err: unknown, res: any) => {
      if (err) return reject(new Error('timeout'));
      if (res && res.ok === false) {
        const e = new Error(res.error || 'server_error') as Error & { code?: string; data?: any };
        e.code = res.error;
        e.data = res;
        return reject(e);
      }
      resolve(res as T);
    });
  });
}

export const connectionStatus = () => status;
