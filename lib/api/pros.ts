/**
 * Professionals, bookings, private messages, the professional workspace,
 * the membership and the admin verification desk (server: server/professional).
 */
import { Platform } from 'react-native';

import { apiFetch, apiJson } from './client';
import type { Order } from './payments';

export interface Service {
  id: string;
  title: string;
  mode: 'online' | 'in_person';
  minutes: number;
  priceMinor: number;
  currency: string;
  active?: boolean;
}

export interface Qualification {
  id?: number;
  kind: 'degree' | 'license' | 'registration' | 'certification';
  title: string;
  institution?: string | null;
  number?: string | null;
  country?: string | null;
  year?: number | null;
  validUntil?: string | null;
  verified?: boolean;
}

export interface PublicPro {
  id: string;
  publicName: string;
  photoUrl: string | null;
  country: string;
  city: string;
  bio: string;
  languages: string[];
  specializations: string[];
  practiceAreas: string | null;
  experienceYears: number | null;
  offersOnline: boolean;
  offersInPerson: boolean;
  timezone: string;
  verified: boolean;
  verifiedAt: number | null;
  verificationExpiresAt: number | null;
  qualifications: Qualification[];
  services: Service[];
  priceFromMinor: number | null;
  currency: string;
  paymentArrangement: string | null;
  paymentMethods: string[];
  cancellationPolicy: string | null;
  cancellationNoticeHours: number;
  inPersonAddress: string | null;
  listed?: boolean;
}

export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled_by_client' | 'cancelled_by_professional' | 'expired';

export interface Booking {
  id: string;
  professionalId: string;
  professionalName: string | null;
  clientName?: string;
  serviceTitle: string;
  mode: 'online' | 'in_person';
  startsAt: number;
  endsAt: number;
  status: BookingStatus;
  attendance: 'unknown' | 'attended' | 'client_no_show';
  paymentStatus: 'not_collected_by_behappy';
  priceMinor: number;
  currency: string;
  paymentArrangement: string | null;
  cancellationPolicy: string | null;
  cancellationNoticeHours: number;
  lateCancellation: boolean;
  cancelReason: string | null;
  createdAt: number;
  inPersonAddress: string | null;
  clientNote?: string;
}

export interface Thread {
  id: string;
  professionalId: string;
  professionalName: string;
  clientName?: string;
  lastMessage: { body: string; sender: string; createdAt: number } | null;
  lastMessageAt: number | null;
  unread: number;
  canWrite: boolean;
  writeBlockedReason: string | null;
  side: 'client' | 'professional';
  messages?: { id: number; sender: 'client' | 'professional' | 'system'; body: string; createdAt: number }[];
}

export interface MembershipState {
  state: string;
  active: boolean;
  current: { kind: string; startsAt: number; endsAt: number } | null;
  endsAt: number | null;
  daysLeft: number;
  graceUntil: number | null;
  trialUsed: boolean;
  /** The free trial was refused because these details already had one. */
  trialRefused?: boolean;
  periods: { id: number; kind: 'trial' | 'paid' | 'grant'; startsAt: number; endsAt: number; orderId: string | null; revokedAt: number | null }[];
  product: { id: string; amountMinor: number; currency: string; durationDays: number; trialDays: number; commissionPercent: number };
  remindersEnabled: boolean;
  cancelledAt: number | null;
  orders?: Order[];
}

export interface ProProfile {
  id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'more_info_required' | 'approved' | 'rejected' | 'suspended' | 'expired';
  verified: boolean;
  verifiedAt: number | null;
  verificationExpiresAt: number | null;
  legalName: string | null;
  publicName: string | null;
  country: string | null;
  city: string | null;
  contactEmail: string | null;
  phone: string | null;
  phoneVerified: boolean;
  bio: string | null;
  photoUrl: string | null;
  languages: string[];
  languagesConfirmed: boolean;
  specializations: string[];
  practiceAreas: string | null;
  experienceYears: number | null;
  offersOnline: boolean;
  offersInPerson: boolean;
  inPersonAddress: string | null;
  timezone: string;
  paymentArrangement: string | null;
  paymentMethods: string[];
  cancellationPolicy: string | null;
  cancellationNoticeHours: number;
  bookingNoticeHours: number;
  bufferMinutes: number;
  autoConfirm: boolean;
  published: boolean;
  remindersEnabled: boolean;
  qualifications: Qualification[];
  documents: { id: string; kind: string; fileName: string; mime: string; size: number; uploadedAt: number }[];
  services: Service[];
  availability: { rules: { weekday: number; startMinute: number; endMinute: number }[]; daysOff: string[] };
  events: { id: number; from: string | null; to: string; actorKind: string; message: string | null; internalNote?: string | null; createdAt: number }[];
  missing: string[];
  checklistItems?: string[];
}

export interface ProMe {
  profile: ProProfile | null;
  membership?: MembershipState;
  stats?: { days: number; views: number; requests: number; inquiries: number };
  counts?: { requests: number; upcoming: number; next7: number; attended: number };
  unreadMessages?: number;
  listed?: boolean;
}

export interface ProCatalog {
  specializations: string[];
  paymentMethods: string[];
  languages: string[];
  documentKinds: string[];
  membership: MembershipState['product'];
  commissionPercent: number;
}

const enc = encodeURIComponent;
const qs = (o: Record<string, unknown>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const proCatalog = () => apiJson<ProCatalog>('/api/pros/catalog', { anonymous: true });
export const searchPros = async (f: { language?: string; specialization?: string; mode?: string; maxPrice?: number; city?: string; q?: string }) => (await apiJson<{ professionals: PublicPro[] }>(`/api/pros${qs(f)}`)).professionals;
export const getPro = async (id: string) => (await apiJson<{ professional: PublicPro }>(`/api/pros/${enc(id)}`)).professional;
export const getSlots = (id: string, serviceId: string, from?: number, days = 14) => apiJson<{ timezone: string; minutes: number; slots: number[] }>(`/api/pros/${enc(id)}/slots${qs({ serviceId, from, days })}`);

export const getClientName = async () => (await apiJson<{ displayName: string | null }>('/api/client/profile')).displayName;
export const setClientName = (displayName: string) => apiJson('/api/client/profile', { method: 'PUT', body: { displayName } });
export const createBooking = async (b: { professionalId: string; serviceId: string; startsAt: number; note?: string }) => (await apiJson<{ booking: Booking }>('/api/bookings', { method: 'POST', body: b })).booking;
export const myBookings = async () => (await apiJson<{ bookings: Booking[] }>('/api/bookings')).bookings;
export const getBooking = async (id: string) => (await apiJson<{ booking: Booking }>(`/api/bookings/${enc(id)}`)).booking;
export const cancelBooking = async (id: string, reason?: string) => (await apiJson<{ booking: Booking }>(`/api/bookings/${enc(id)}/cancel`, { method: 'POST', body: { reason } })).booking;
export const rescheduleBooking = async (id: string, serviceId: string, startsAt: number) => (await apiJson<{ booking: Booking }>(`/api/bookings/${enc(id)}/reschedule`, { method: 'POST', body: { serviceId, startsAt } })).booking;

export const listThreads = async () => (await apiJson<{ threads: Thread[] }>('/api/threads')).threads;
export const openThread = async (id: string) => (await apiJson<{ thread: Thread }>(`/api/threads/${enc(id)}`)).thread;
export const startThread = async (professionalId: string, body?: string) => (await apiJson<{ thread: Thread }>('/api/threads', { method: 'POST', body: { professionalId, body } })).thread;
export const sendThreadMessage = async (id: string, body: string) => (await apiJson<{ thread: Thread }>(`/api/threads/${enc(id)}/messages`, { method: 'POST', body: { body } })).thread;
export const reportThreadMessage = (id: string, messageId: number, reason: string, details?: string) => apiJson(`/api/threads/${enc(id)}/messages/${messageId}/report`, { method: 'POST', body: { reason, details } });

export const proMe = () => apiJson<ProMe>('/api/pro/me');
export const startApplication = async () => (await apiJson<{ profile: ProProfile }>('/api/pro/application', { method: 'POST', body: {} })).profile;
export const updatePro = async (body: Record<string, unknown>) => (await apiJson<{ profile: ProProfile }>('/api/pro/profile', { method: 'PUT', body })).profile;
export const setQualifications = async (qualifications: Qualification[]) => (await apiJson<{ profile: ProProfile }>('/api/pro/qualifications', { method: 'PUT', body: { qualifications } })).profile;
export const setServices = async (services: Partial<Service>[]) => (await apiJson<{ profile: ProProfile }>('/api/pro/services', { method: 'PUT', body: { services } })).profile;
export const setAvailability = async (rules: ProProfile['availability']['rules'], daysOff: string[]) => (await apiJson<{ profile: ProProfile }>('/api/pro/availability', { method: 'PUT', body: { rules, daysOff } })).profile;
export const uploadPhoto = async (dataBase64: string, mime: string) => (await apiJson<{ profile: ProProfile }>('/api/pro/photo', { method: 'PUT', body: { dataBase64, mime } })).profile;
export const uploadDocument = async (doc: { kind: string; fileName: string; mime: string; dataBase64: string }) => (await apiJson<{ profile: ProProfile }>('/api/pro/documents', { method: 'POST', body: doc })).profile;
export const removeDocument = async (id: string) => (await apiJson<{ profile: ProProfile }>(`/api/pro/documents/${enc(id)}`, { method: 'DELETE' })).profile;
export const startPhone = (phone: string) => apiJson<{ ok: true; phone: string }>('/api/pro/phone', { method: 'POST', body: { phone } });
export const verifyPhone = async (code: string) => (await apiJson<{ profile: ProProfile }>('/api/pro/phone/verify', { method: 'POST', body: { code } })).profile;
export const submitApplication = async () => (await apiJson<{ profile: ProProfile }>('/api/pro/submit', { method: 'POST', body: {} })).profile;
export const setPublished = async (published: boolean) => (await apiJson<{ profile: ProProfile }>('/api/pro/publish', { method: 'POST', body: { published } })).profile;
export const proBookings = async (scope: 'requests' | 'upcoming' | 'past') => (await apiJson<{ bookings: Booking[] }>(`/api/pro/bookings?scope=${scope}`)).bookings;
export const proBookingAction = async (id: string, action: 'confirm' | 'decline' | 'cancel', reason?: string) => (await apiJson<{ booking: Booking }>(`/api/pro/bookings/${enc(id)}/${action}`, { method: 'POST', body: { reason } })).booking;
export const proAttendance = async (id: string, attendance: 'attended' | 'client_no_show') => (await apiJson<{ booking: Booking }>(`/api/pro/bookings/${enc(id)}/attendance`, { method: 'POST', body: { attendance } })).booking;

export const membershipOverview = () => apiJson<MembershipState>('/api/pro/membership');
export async function startMembershipCheckout(lang: string) {
  const returnTo = Platform.OS === 'web' && typeof window !== 'undefined' ? { platform: 'web', origin: window.location.origin, path: '/checkout/result' } : { platform: 'native' };
  return apiJson<{ order: Order; checkoutUrl: string }>('/api/pro/membership/checkout', { method: 'POST', body: { lang, returnTo } });
}
export const stopMembership = () => apiJson<MembershipState>('/api/pro/membership/cancel', { method: 'POST', body: {} });
export const resumeMembership = () => apiJson<MembershipState>('/api/pro/membership/resume', { method: 'POST', body: {} });
export const getReceipt = async (orderId: string) => (await apiJson<{ receipt: any }>(`/api/pro/membership/receipts/${enc(orderId)}`)).receipt;

// ---------- Admin ----------
export const adminOverview = () => apiJson<any>('/api/admin/overview');
export const adminHealth = () => apiJson<any>('/api/admin/health');
export const adminApplications = async (status?: string) => (await apiJson<{ professionals: any[] }>(`/api/admin/pros${qs({ status })}`)).professionals;
export const adminApplication = (id: string) => apiJson<{ professional: ProProfile; membership: MembershipState }>(`/api/admin/pros/${enc(id)}`);
export const adminReview = (id: string, body: { action: string; message?: string; internalNote?: string; checklist?: Record<string, boolean>; verifiedQualificationIds?: number[] }) => apiJson<any>(`/api/admin/pros/${enc(id)}/review`, { method: 'POST', body });
export const adminGrant = (id: string, days: number, reason: string) => apiJson(`/api/admin/pros/${enc(id)}/membership/grant`, { method: 'POST', body: { days, reason } });
export const adminMemberships = async () => (await apiJson<{ memberships: any[] }>('/api/admin/memberships')).memberships;
export const adminPayments = async () => (await apiJson<{ payments: any[] }>('/api/admin/payments')).payments;

/** Opens a verification document (fetched with the admin's session, never a public URL). */
export async function openAdminDocument(proId: string, docId: string): Promise<string | null> {
  const res = await apiFetch(`/api/admin/pros/${enc(proId)}/documents/${enc(docId)}`, { headers: { Accept: '*/*' } });
  if (!res.ok) return null;
  const blob = await res.blob();
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return url;
  }
  return null;
}

/** Absolute URL for a professional's photo. */
export const photoSrc = (base: string, url: string | null) => (url ? `${base}${url}` : null);
