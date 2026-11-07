/** Support requests to the BeHappy team (Profile › Help and support). Stored encrypted on the server. */
import { apiJson } from './client';

export type SupportCategory = 'account' | 'payment' | 'professional' | 'community' | 'privacy' | 'deletion' | 'bug' | 'safety' | 'other';
export const SUPPORT_CATEGORIES: SupportCategory[] = ['account', 'payment', 'professional', 'community', 'privacy', 'deletion', 'bug', 'safety', 'other'];

export interface SupportMessage {
  id: number;
  from: 'user' | 'staff' | 'system';
  body: string;
  at: number;
}

export interface SupportTicket {
  id: string;
  category: SupportCategory;
  subject: string;
  status: 'open' | 'waiting_on_staff' | 'waiting_on_user' | 'resolved' | 'closed';
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
  messages?: SupportMessage[];
}

const enc = encodeURIComponent;
export const listTickets = async () => (await apiJson<{ tickets: SupportTicket[] }>('/api/support/tickets')).tickets;
export const getTicket = async (id: string) => (await apiJson<{ ticket: SupportTicket }>(`/api/support/tickets/${enc(id)}`)).ticket;
export const createTicket = async (body: { category: SupportCategory; subject: string; body: string }) => (await apiJson<{ ticket: SupportTicket }>('/api/support/tickets', { method: 'POST', body })).ticket;
export const replyTicket = async (id: string, body: string) => (await apiJson<{ ticket: SupportTicket }>(`/api/support/tickets/${enc(id)}/messages`, { method: 'POST', body: { body } })).ticket;
export const closeTicket = (id: string) => apiJson(`/api/support/tickets/${enc(id)}/close`, { method: 'POST', body: {} });
