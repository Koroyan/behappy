/** Moderation API (server: server/community/moderation.mjs). Staff only. */
import { apiJson } from './client';

export interface ModReport {
  id: number;
  reporterKind: 'member' | 'system';
  targetType: 'message' | 'member';
  targetId: string;
  roomId: string | null;
  reason: string;
  details: string | null;
  snapshot: { body?: string; pseudonym?: string; roomId?: string; status?: string };
  priority: number;
  status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  assignedToMe: boolean;
  createdAt: number;
  messageStatus: string | null;
  targetMemberRef: string | null;
  targetPseudonym: string | null;
  priorReports: number;
}

export interface ModAppeal {
  id: number;
  body: string;
  status: string;
  createdAt: number;
  suspensionId: number | null;
  suspensionKind: string | null;
  suspensionReason: string | null;
  suspensionEndsAt: number | null;
  suspensionLifted: boolean;
  pseudonym: string | null;
  memberRef: string | null;
}

export interface ModAction {
  id: number;
  action: string;
  actorKind: string;
  actorPseudonym: string | null;
  targetPseudonym: string | null;
  reason: string | null;
  note: string | null;
  hours: number | null;
  createdAt: number;
}

export type ResolveAction = 'dismiss' | 'remove_message' | 'approve_message' | 'warn' | 'suspend' | 'ban';

export const summary = () => apiJson<{ openReports: number; urgentReports: number; openAppeals: number }>('/api/moderation/summary');
export const listReports = async (status = 'open') => (await apiJson<{ reports: ModReport[] }>(`/api/moderation/reports?status=${status}`)).reports;
export const claim = (id: number) => apiJson(`/api/moderation/reports/${id}/claim`, { method: 'POST', body: {} });
export const resolve = (id: number, action: ResolveAction, opts: { hours?: number; note?: string } = {}) => apiJson(`/api/moderation/reports/${id}/resolve`, { method: 'POST', body: { action, ...opts } });
export const listAppeals = async () => (await apiJson<{ appeals: ModAppeal[] }>('/api/moderation/appeals')).appeals;
export const decideAppeal = (id: number, decision: 'upheld' | 'overturned', note?: string) => apiJson(`/api/moderation/appeals/${id}/decide`, { method: 'POST', body: { decision, note } });
export const history = (memberRef?: string) => apiJson<{ actions: ModAction[] }>(`/api/moderation/history${memberRef ? `?member=${encodeURIComponent(memberRef)}` : ''}`);
