// One-time import of the 2.0 JSON store (DATA_DIR/db.json) into PostgreSQL.
//
// Existing installs keep working: device tokens were stored as SHA-256 hashes
// in 2.0 and are imported as device sessions with the same hash, recovery
// codes keep working, and orders, usage counters, response-chain owners and
// payment events carry over. Runs inside one transaction and records itself
// in the meta table, so it happens exactly once. The JSON file is left in
// place (renamed copies are the owner's call).

import fs from 'node:fs';
import path from 'node:path';

import { newId } from '../auth.mjs';
import { ts } from './index.mjs';

const DAY = 24 * 60 * 60 * 1000;

export async function importJsonStore(db, dataDir, { log = () => {}, now = Date.now() } = {}) {
  const file = path.join(dataDir, 'db.json');
  if (!fs.existsSync(file)) return { imported: false, reason: 'no_file' };
  const done = await db.query("select value from meta where key = 'json_import'");
  if (done.rowCount) return { imported: false, reason: 'already_imported' };

  const raw = fs.readFileSync(file, 'utf8');
  const data = raw.trim() ? JSON.parse(raw) : {};
  const accounts = Object.values(data.accounts || {}).filter((a) => a && typeof a.id === 'string');
  const known = new Set(accounts.map((a) => a.id));
  const counts = { accounts: 0, sessions: 0, orders: 0, counters: 0, conversations: 0, artSessions: 0, responseOwners: 0, paymentEvents: 0 };

  await db.tx(async (t) => {
    for (const a of accounts) {
      await t.query('insert into accounts (id, recovery_hash, created_at, last_seen_at) values ($1, $2, $3, $4) on conflict (id) do nothing', [a.id, a.recoveryHash || null, ts(a.createdAt || now), ts(a.lastSeenAt || a.createdAt || now)]);
      counts.accounts += 1;
      if (a.tokenHash) {
        await t.query("insert into sessions (id, account_id, token_hash, kind, created_at, last_used_at, expires_at) values ($1, $2, $3, 'device', $4, $5, $6) on conflict (token_hash) do nothing", [
          newId('ses'),
          a.id,
          a.tokenHash,
          ts(a.createdAt || now),
          ts(a.lastSeenAt || now),
          ts(Math.max(now, a.lastSeenAt || 0) + 400 * DAY),
        ]);
        counts.sessions += 1;
      }
    }

    for (const o of Object.values(data.orders || {})) {
      if (!o || !o.id) continue;
      const deleted = !o.accountId || o.accountId === 'deleted' || !known.has(o.accountId);
      await t.query(
        `insert into orders (id, account_id, account_deleted, product_id, product_kind, duration_days, amount_minor, currency, mode, status, created_at, updated_at,
           approved_at, reversed_at, reversal_amount, return_url, checkout_url, payment_id, masked_card, flitt_status, error_reason, last_status_check_at,
           last_response_code, last_response_description, attempt_declined, history)
         values ($1, $2, $3, $4, $5, $6, $7, $8, 'test', $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25::jsonb)
         on conflict (id) do nothing`,
        [
          o.id,
          deleted ? null : o.accountId,
          deleted,
          o.productId,
          o.productKind,
          o.durationDays ?? null,
          o.amountMinor,
          o.currency,
          o.status,
          ts(o.createdAt || now),
          ts(o.updatedAt || o.createdAt || now),
          ts(o.approvedAt),
          ts(o.reversedAt),
          o.reversalAmount ?? null,
          o.returnUrl || null,
          o.checkoutUrl || null,
          o.paymentId || null,
          o.maskedCard || null,
          o.flittStatus || null,
          o.errorReason || null,
          ts(o.lastStatusCheckAt),
          o.lastResponseCode || null,
          o.lastResponseDescription || null,
          Boolean(o.attemptDeclined),
          JSON.stringify(Array.isArray(o.history) ? o.history : []),
        ]
      );
      counts.orders += 1;
    }

    for (const [accountId, u] of Object.entries(data.usage || {})) {
      if (!known.has(accountId) || !u) continue;
      for (const [key, n] of Object.entries(u.counters || {})) {
        const i = key.indexOf(':');
        if (i < 0) continue;
        await t.query('insert into usage_counters (account_id, name, period, count) values ($1, $2, $3, $4) on conflict do nothing', [accountId, key.slice(0, i), key.slice(i + 1), Number(n) || 0]);
        counts.counters += 1;
      }
      for (const [key, row] of Object.entries(u.conversations || {})) {
        // 2.0 keyed Anulia conversations as "<period>:<conversation>"; 3.0 adds the feature prefix.
        const newKey = key.startsWith('cards:') ? key : `anulia:${key}`;
        await t.query('insert into ai_conversations (account_id, key, count, grace) values ($1, $2, $3, $4) on conflict do nothing', [accountId, newKey, Number(row?.count) || 0, Number(row?.grace) || 0]);
        counts.conversations += 1;
      }
      for (const [sessionId, row] of Object.entries(u.artSessions || {})) {
        const id = Number(sessionId);
        if (!Number.isInteger(id) || id < 1 || id > 43) continue;
        await t.query('insert into art_session_usage (account_id, session_id, count, started_at) values ($1, $2, $3, $4) on conflict do nothing', [accountId, id, Number(row?.count) || 0, ts(row?.startedAt || now)]);
        counts.artSessions += 1;
      }
    }

    for (const [responseId, row] of Object.entries(data.responseOwners || {})) {
      if (!row || !known.has(row.accountId)) continue;
      await t.query('insert into ai_response_owners (response_id, account_id, created_at) values ($1, $2, $3) on conflict do nothing', [responseId, row.accountId, ts(row.at || now)]);
      counts.responseOwners += 1;
    }

    for (const [key, row] of Object.entries(data.paymentEvents || {})) {
      await t.query('insert into payment_events (dedupe_key, order_id, via, note, created_at) values ($1, $2, $3, $4, $5) on conflict do nothing', [key, key.split(':')[0], row?.via || 'import', row?.ignored || null, ts(row?.at || now)]);
      counts.paymentEvents += 1;
    }

    await t.query("insert into meta (key, value) values ('json_import', $1::jsonb)", [JSON.stringify({ at: new Date(now).toISOString(), file: 'db.json', counts })]);
  });
  log(`[db] imported the 2.0 JSON store: ${JSON.stringify(counts)}`);
  return { imported: true, counts };
}
