/**
 * Community API (server: server/community). Other members only ever appear as
 * a pseudonym and an opaque `ref`.
 */
import { apiJson } from './client';

export type ReactionKey = 'support' | 'hug' | 'strength' | 'thanks' | 'same';
export const REACTIONS: { key: ReactionKey; emoji: string }[] = [
  { key: 'support', emoji: '❤️' },
  { key: 'hug', emoji: '🤗' },
  { key: 'strength', emoji: '💪' },
  { key: 'thanks', emoji: '🙏' },
  { key: 'same', emoji: '🫂' },
];

export type ReportReason = 'harassment' | 'hate' | 'self_harm_risk' | 'spam' | 'misinformation' | 'impersonation' | 'sexual' | 'privacy' | 'violence' | 'other';
export const REPORT_REASONS: ReportReason[] = ['harassment', 'hate', 'self_harm_risk', 'spam', 'misinformation', 'impersonation', 'sexual', 'privacy', 'violence', 'other'];

export const TOPIC_IDS = ['panic', 'anxiety', 'stress', 'burnout', 'depression', 'grief', 'loneliness', 'relationships', 'self_esteem', 'sleep', 'emotional_regulation', 'growth', 'general'] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

export interface CommunityProfile {
  accountId?: string;
  pseudonym: string;
  ref: string;
  avatarSeed: number;
}

export interface Room {
  id: string;
  topic: TopicId;
  language: string;
  icon: string;
  members: number;
  lastActivityAt: number | null;
  joined: boolean;
  unread: number;
  notify: 'all' | 'mentions' | 'none' | null;
  pinnedMessageId: number | null;
  pinned?: RoomMessage | null;
}

export interface RoomMessage {
  id: number;
  roomId: string;
  author: { kind: 'member' | 'anulia' | 'system'; pseudonym: string | null; ref: string | null; avatarSeed: number; isMe: boolean; formerMember: boolean };
  body: string;
  status: 'visible' | 'held' | 'removed' | 'deleted';
  heldReason: string | null;
  replyTo: { id: number; kind: string; pseudonym: string | null; snippet: string; hidden: boolean } | null;
  asksAnulia: boolean;
  createdAt: number;
  reactions: Partial<Record<ReactionKey, number>>;
  myReactions: ReactionKey[];
  mutedAuthor: boolean;
  /** Client-only: optimistic sends. */
  pending?: 'sending' | 'failed';
  nonce?: string;
  error?: string;
}

export interface Suspension {
  id: number;
  kind: 'temporary' | 'permanent';
  reason: string;
  startsAt: number;
  endsAt: number | null;
}

export const getProfile = async () => (await apiJson<{ profile: CommunityProfile | null }>('/api/community/profile')).profile;
export const saveProfile = async (pseudonym: string, acceptGuidelines: boolean) =>
  (await apiJson<{ profile: CommunityProfile }>('/api/community/profile', { method: 'PUT', body: { pseudonym, acceptGuidelines } })).profile;
export const listRooms = async (lang: string) => (await apiJson<{ rooms: Room[] }>(`/api/community/rooms?lang=${encodeURIComponent(lang)}`)).rooms;
export const listMyRooms = async () => (await apiJson<{ rooms: Room[] }>('/api/community/my-rooms')).rooms;
export const getRoom = async (roomId: string) => (await apiJson<{ room: Room }>(`/api/community/rooms/${encodeURIComponent(roomId)}`)).room;
export const joinRoom = async (roomId: string) => (await apiJson<{ room: Room }>(`/api/community/rooms/${encodeURIComponent(roomId)}/join`, { method: 'POST', body: {} })).room;
export const leaveRoom = (roomId: string) => apiJson(`/api/community/rooms/${encodeURIComponent(roomId)}/leave`, { method: 'POST', body: {} });
export const setRoomNotify = (roomId: string, notify: 'all' | 'mentions' | 'none') => apiJson(`/api/community/rooms/${encodeURIComponent(roomId)}/notify`, { method: 'POST', body: { notify } });
export const getMessages = (roomId: string, q: { before?: number; after?: number; limit?: number } = {}) => {
  const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
  return apiJson<{ messages: RoomMessage[]; hasMore: boolean }>(`/api/community/rooms/${encodeURIComponent(roomId)}/messages${qs ? `?${qs}` : ''}`);
};
export const postMessage = (roomId: string, body: { body: string; replyToId?: number; nonce: string; askAnulia?: boolean }) =>
  apiJson<{ message: RoomMessage; duplicate: boolean; held: boolean; safetyNotice: boolean }>(`/api/community/rooms/${encodeURIComponent(roomId)}/messages`, { method: 'POST', body });
export const searchRoom = async (roomId: string, q: string) => (await apiJson<{ results: RoomMessage[] }>(`/api/community/rooms/${encodeURIComponent(roomId)}/search?q=${encodeURIComponent(q)}`)).results;
export const markRead = (roomId: string, messageId: number) => apiJson(`/api/community/rooms/${encodeURIComponent(roomId)}/read`, { method: 'POST', body: { messageId } });
export const react = (messageId: number, reaction: ReactionKey, on: boolean) =>
  apiJson<{ reactions: RoomMessage['reactions']; myReactions: ReactionKey[] }>(`/api/community/messages/${messageId}/reactions`, { method: 'POST', body: { reaction, on } });
export const deleteMessage = (messageId: number) => apiJson(`/api/community/messages/${messageId}`, { method: 'DELETE' });
export const reportMessage = (messageId: number, reason: ReportReason, details?: string) =>
  apiJson<{ ok: true; alreadyReported?: boolean }>(`/api/community/messages/${messageId}/report`, { method: 'POST', body: { reason, details } });
export const reportMember = (ref: string, reason: ReportReason, details?: string) =>
  apiJson<{ ok: true; alreadyReported?: boolean }>(`/api/community/members/${encodeURIComponent(ref)}/report`, { method: 'POST', body: { reason, details } });
export const setBlocked = (ref: string, on: boolean) => apiJson(`/api/community/members/${encodeURIComponent(ref)}/block`, { method: on ? 'POST' : 'DELETE', body: on ? {} : undefined });
export const setMuted = (ref: string, on: boolean) => apiJson(`/api/community/members/${encodeURIComponent(ref)}/mute`, { method: on ? 'POST' : 'DELETE', body: on ? {} : undefined });
export const getRelations = () => apiJson<{ blocked: { ref: string; pseudonym: string; since: number }[]; muted: { ref: string; pseudonym: string; since: number }[] }>('/api/community/relations');
export const getStatus = () => apiJson<{ suspension: Suspension | null; appeals: { id: number; suspensionId: number; status: 'open' | 'upheld' | 'overturned'; createdAt: number; note: string | null }[] }>('/api/community/status');
export const sendAppeal = (suspensionId: number, body: string) => apiJson('/api/community/appeals', { method: 'POST', body: { suspensionId, body } });

/** Avatar colours for members (from the seed the server picked). */
export const AVATAR_TONES = ['sage', 'peach', 'lavender', 'gold'] as const;
