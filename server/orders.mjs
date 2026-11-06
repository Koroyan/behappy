// Order rows <-> the order objects the rest of the server (and the 2.0 API)
// uses: camelCase fields, times as epoch milliseconds.

import { ms } from './db/index.mjs';

export function toOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    accountDeleted: row.account_deleted,
    professionalId: row.professional_id || null,
    productId: row.product_id,
    productKind: row.product_kind,
    durationDays: row.duration_days,
    amountMinor: row.amount_minor,
    currency: row.currency,
    mode: row.mode,
    status: row.status,
    createdAt: ms(row.created_at),
    updatedAt: ms(row.updated_at),
    approvedAt: ms(row.approved_at),
    reversedAt: ms(row.reversed_at),
    reversalAmount: row.reversal_amount,
    returnUrl: row.return_url,
    checkoutUrl: row.checkout_url,
    paymentId: row.payment_id,
    maskedCard: row.masked_card,
    flittStatus: row.flitt_status,
    errorReason: row.error_reason,
    lastStatusCheckAt: ms(row.last_status_check_at),
    lastResponseCode: row.last_response_code,
    lastResponseDescription: row.last_response_description,
    attemptDeclined: row.attempt_declined,
    history: row.history || [],
  };
}

export async function getOrder(q, id, { forUpdate = false } = {}) {
  const r = await q.query(`select * from orders where id = $1${forUpdate ? ' for update' : ''}`, [String(id || '')]);
  return toOrder(r.rows[0]);
}

export async function ordersForAccount(q, accountId) {
  const r = await q.query('select * from orders where account_id = $1 order by created_at', [accountId]);
  return r.rows.map(toOrder);
}
