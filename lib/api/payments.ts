/**
 * Payments client — Flitt TEST mode only.
 *
 * The app never decides whether a payment succeeded. It asks the server to
 * create an order (server-side price), opens Flitt's hosted checkout, then
 * polls the server, which verifies the payment with Flitt (signed callback or
 * signed status request) before granting anything.
 */
import { Platform } from 'react-native';

import { trackAction } from '@/lib/analytics';

import { API_BASE_URL, apiJson } from './client';

export type ProductKind = 'plus' | 'art' | 'professional';

export interface Product {
  id: string;
  kind: ProductKind;
  amountMinor: number;
  currency: string;
  durationDays: number | null;
  recurring: boolean;
  grants: string[];
  highlight: boolean;
}

export interface Catalog {
  mode: 'test';
  catalog: string;
  products: Product[];
  limits?: {
    free: { anuliaMessages: number; anuliaPeriod: string; journalReflectionsPerDay: number; cardConversations: number; freeArtSessions: number; artMessagesPerSession?: number };
    plus: { anuliaMessages: number; anuliaPeriod: string; journalReflectionsPerDay: number; cardConversationsPerDay: number; newArtSessionsPerDay: number; artMessagesPerSession?: number };
    allowances?: { plusUsdPer30Days: number; freeUsdPer30Days: number; artProgramUsd: number };
  };
  /** Automatic offers anyone gets now, decided on the server (the reference is the regular price). */
  offers?: Record<string, Offer>;
  renewal?: 'manual';
}

export interface Offer {
  listMinor: number;
  finalMinor: number;
  savingMinor: number;
  endsAt: number | null;
  name: string | null;
  firstPurchaseOnly: boolean;
}

/** What this account would pay now, with an optional promo code (the server decides). */
export interface Quote {
  productId: string;
  listMinor: number;
  finalMinor: number;
  discountMinor: number;
  promotion: { id: string; name: string; endsAt: number | null } | null;
  clamped: boolean;
  codeNotBetter: boolean;
  currency: string;
}

export type OrderStatus = 'created' | 'processing' | 'approved' | 'declined' | 'expired' | 'reversed' | 'partially_reversed' | 'error';

export interface Order {
  id: string;
  productId: string;
  productKind: ProductKind;
  durationDays: number | null;
  amountMinor: number;
  /** The regular price and the discount, when a promotion applied. */
  listAmountMinor?: number;
  discountMinor?: number;
  currency: string;
  status: OrderStatus;
  mode: 'test';
  createdAt: number;
  updatedAt: number;
  approvedAt: number | null;
  reversedAt: number | null;
  maskedCard: string | null;
  errorReason: string | null;
  /** The last card attempt was declined; the order stays open for a retry. */
  attemptDeclined?: boolean;
  declineReason?: string | null;
}

/** Remembers the order being paid, in case the return URL loses its query. */
export const PENDING_ORDER_KEY = '@behappy_pending_order';

export const FINAL_ORDER_STATUSES: OrderStatus[] = ['approved', 'declined', 'expired', 'reversed', 'partially_reversed', 'error'];

export function getCatalog(): Promise<Catalog> {
  return apiJson<Catalog>('/api/catalog', { anonymous: true });
}

export function getQuote(productId: string, promoCode?: string): Promise<Quote> {
  return apiJson<Quote>('/api/payments/quote', { method: 'POST', body: { productId, ...(promoCode ? { promoCode } : {}) } });
}

/**
 * `extend`: the person saw that they already have Plus and chose to add days
 * after its current end (the server refuses Plus during Plus otherwise: 409 plus_active).
 */
export async function startCheckout(productId: string, lang: string, promoCode?: string, { extend = false }: { extend?: boolean } = {}): Promise<{ order: Order; checkoutUrl: string; product: Product }> {
  const returnTo =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? { platform: 'web', origin: window.location.origin, path: '/checkout/result' }
      : { platform: 'native' };
  const out = await apiJson<{ order: Order; checkoutUrl: string; product: Product }>('/api/payments/checkout', { method: 'POST', body: { productId, lang, returnTo, ...(promoCode ? { promoCode } : {}), ...(extend ? { extend: true } : {}) } });
  trackAction('membership', 'checkout_started');
  return out;
}

export function getOrder(orderId: string): Promise<{ order: Order; entitlements: any }> {
  return apiJson(`/api/payments/orders/${encodeURIComponent(orderId)}`);
}

/**
 * The status of one order from the receipt in Flitt's return link, without the
 * account (the return can open in a browser window where the app isn't signed
 * in: on iPhone, the sheet over an installed web app). Plain fetch on purpose:
 * this must never create an account in that window.
 */
export async function getOrderReceipt(orderId: string, receipt: string): Promise<{ status: OrderStatus; productKind: string; attemptDeclined: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/payments/orders/${encodeURIComponent(orderId)}/receipt?r=${encodeURIComponent(receipt)}`);
  if (!res.ok) throw new Error(`receipt ${res.status}`);
  return res.json();
}

export function listOrders(): Promise<{ orders: Order[] }> {
  return apiJson('/api/payments/orders');
}
