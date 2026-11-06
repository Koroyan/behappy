/** In-app notifications (server: server/notify/notifications.mjs). */
import { apiJson } from './client';

export interface AppNotification {
  id: number;
  kind: string;
  data: Record<string, any>;
  createdAt: number;
  readAt: number | null;
}

export const listNotifications = (before?: number) =>
  apiJson<{ notifications: AppNotification[]; unread: number }>(`/api/notifications${before ? `?before=${before}` : ''}`);

export const markNotificationsRead = (ids?: number[]) =>
  apiJson<{ ok: true; unread: number }>('/api/notifications/read', { method: 'POST', body: ids ? { ids } : {} });
