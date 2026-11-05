// Flitt payment gateway client — TEST MODE ONLY.
//
// Implements the documented Flitt API (https://docs.flitt.com/api/):
//  - signature: sha1 over "<secret>|<value>|<value>..." with every non-empty
//    request/response parameter sorted by key name, lowercase hex result.
//    `signature` and `response_signature_string` are excluded when verifying.
//  - POST /api/checkout/url     create an order, get a hosted checkout URL
//  - POST /api/status/order_id  server-to-server order status
//  - POST /api/reverse/order_id full/partial reversal (refund)
//  - server_callback_url        JSON POST from Flitt, retried until HTTP 200

import crypto from 'node:crypto';

export const EXCLUDED_FROM_SIGNATURE = new Set(['signature', 'response_signature_string']);

export function buildSignatureString(secretKey, params) {
  const keys = Object.keys(params)
    .filter((k) => !EXCLUDED_FROM_SIGNATURE.has(k))
    .filter((k) => params[k] !== undefined && params[k] !== null && String(params[k]) !== '')
    .sort();
  return [secretKey, ...keys.map((k) => String(params[k]))].join('|');
}

export function sign(secretKey, params) {
  return crypto.createHash('sha1').update(buildSignatureString(secretKey, params), 'utf8').digest('hex').toLowerCase();
}

export function verifySignature(secretKey, params) {
  if (!params || typeof params.signature !== 'string') return false;
  const expected = sign(secretKey, params);
  const given = params.signature.toLowerCase();
  if (expected.length !== given.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

export const FINAL_STATUSES = new Set(['approved', 'declined', 'expired', 'reversed']);
export const KNOWN_STATUSES = new Set(['created', 'processing', 'approved', 'declined', 'expired', 'reversed']);

export class FlittClient {
  constructor({ merchantId, secretKey, apiBase, fetchImpl = globalThis.fetch }) {
    this.merchantId = merchantId;
    this.secretKey = secretKey;
    this.apiBase = apiBase;
    this.fetch = fetchImpl;
  }

  async post(path, request) {
    const body = { request: { ...request, signature: sign(this.secretKey, request) } };
    const res = await this.fetch(`${this.apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Flitt ${path} returned non-JSON (HTTP ${res.status})`);
    }
    const response = json?.response ?? json;
    if (!response || response.response_status === 'failure') {
      const err = new Error(`Flitt ${path} failed: ${response?.error_message || 'unknown error'} (${response?.error_code ?? res.status})`);
      err.flitt = response;
      throw err;
    }
    return response;
  }

  /** Creates a hosted checkout and returns { checkout_url, payment_id }. */
  async createCheckout({ orderId, amountMinor, currency, description, responseUrl, callbackUrl, lifetimeSeconds, lang, productId }) {
    const request = {
      version: '1.0.1',
      merchant_id: this.merchantId,
      order_id: orderId,
      order_desc: description,
      amount: amountMinor,
      currency,
      response_url: responseUrl,
      server_callback_url: callbackUrl,
      lifetime: lifetimeSeconds,
      lang,
      product_id: productId,
    };
    const response = await this.post('/api/checkout/url', request);
    if (!response.checkout_url) throw new Error('Flitt did not return a checkout_url');
    return response;
  }

  /** Server-to-server status check. The signed response is verified before use. */
  async getOrderStatus(orderId) {
    const response = await this.post('/api/status/order_id', {
      version: '1.0.1',
      merchant_id: this.merchantId,
      order_id: orderId,
    });
    if (response.signature && !verifySignature(this.secretKey, response)) {
      throw new Error('Flitt status response has an invalid signature');
    }
    return response;
  }

  // Only documented parameters are sent: Flitt signs exactly what it receives,
  // so an unknown extra field would risk a signature mismatch.
  async reverse({ orderId, amountMinor, currency, reverseId }) {
    return this.post('/api/reverse/order_id', {
      version: '1.0.1',
      merchant_id: this.merchantId,
      order_id: orderId,
      amount: amountMinor,
      currency,
      reverse_id: reverseId,
    });
  }
}
