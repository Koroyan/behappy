// Usage allowances, enforced on the server.
//
// The client shows the same numbers for transparency, but only this module
// decides. Limits are TEST configuration values (see
// docs/BEHAPPY_PRICING_STRATEGY.md for the reasoning and cost model).
//
// Design rules:
//  - Safety resources are never metered (they are not AI calls at all).
//  - A conversation that started inside the allowance gets a few "grace"
//    messages so it can close gently instead of being cut off mid-thought.
//  - Counters reset on UTC day / month boundaries.
//  - Each decision runs in one transaction with the account row locked, so
//    two simultaneous requests can't both spend the last message.

export const LIMITS = {
  free: {
    anulia: { messages: 20, period: 'month', graceMessages: 3 },
    journal: { reflections: 1, period: 'day' },
    cards: { conversations: 1, period: 'lifetime', messagesPerConversation: 40 },
    art: { freeSessionIds: [1], newSessions: 1, period: 'day', messagesPerSession: 60 },
    summary: { count: 3, period: 'day' },
    motivation: { count: 2, period: 'day' },
    transcribe: { count: 5, period: 'day' },
    speech: { count: 3, period: 'day' },
    community: { count: 5, period: 'day' },
  },
  plus: {
    anulia: { messages: 40, period: 'day', graceMessages: 3 },
    journal: { reflections: 3, period: 'day' },
    cards: { conversations: 2, period: 'day', messagesPerConversation: 60 },
    art: { newSessions: 1, period: 'day', messagesPerSession: 80 },
    summary: { count: 10, period: 'day' },
    motivation: { count: 2, period: 'day' },
    transcribe: { count: 30, period: 'day' },
    speech: { count: 10, period: 'day' },
    community: { count: 15, period: 'day' },
  },
  // Art-program owners without Plus: full program, normal Anulia free tier.
  art: { newSessions: 1, period: 'day', messagesPerSession: 80 },
};

const dayKey = (now) => new Date(now).toISOString().slice(0, 10);
const monthKey = (now) => new Date(now).toISOString().slice(0, 7);
export const periodKey = (period, now) => (period === 'day' ? dayKey(now) : period === 'month' ? monthKey(now) : 'lifetime');

export function nextReset(period, now) {
  const d = new Date(now);
  if (period === 'day') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  if (period === 'month') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return null;
}

async function readCounter(q, accountId, name, period, now) {
  const r = await q.query('select count from usage_counters where account_id = $1 and name = $2 and period = $3', [accountId, name, periodKey(period, now)]);
  return r.rows[0]?.count || 0;
}

async function bump(q, accountId, name, period, now) {
  await q.query(
    `insert into usage_counters (account_id, name, period, count) values ($1, $2, $3, 1)
     on conflict (account_id, name, period) do update set count = usage_counters.count + 1`,
    [accountId, name, periodKey(period, now)]
  );
}

async function readConversation(q, accountId, key) {
  const r = await q.query('select count, grace from ai_conversations where account_id = $1 and key = $2', [accountId, key]);
  return r.rows[0] || null;
}

async function writeConversation(q, accountId, key, count, grace) {
  await q.query(
    `insert into ai_conversations (account_id, key, count, grace) values ($1, $2, $3, $4)
     on conflict (account_id, key) do update set count = excluded.count, grace = excluded.grace`,
    [accountId, key, count, grace]
  );
}

/**
 * Decides whether one AI request may proceed, and records it if so.
 * ctx: { feature, conversationId, artSessionId }
 * Returns { allowed: true, ... } or { allowed: false, status, error, reason, resetAt }.
 */
export async function checkAndRecord({ db, accountId, entitlements, ctx, now = Date.now() }) {
  return db.tx(async (t) => {
    await t.query('select id from accounts where id = $1 for update', [accountId]);
    return decide(t, { accountId, entitlements, ctx, now });
  });
}

async function decide(t, { accountId, entitlements, ctx, now }) {
  const tier = entitlements.plus.active ? 'plus' : 'free';
  const limits = LIMITS[tier];
  const feature = ctx.feature;

  const deny = (reason, period, extra = {}) => ({
    allowed: false,
    status: 402,
    error: 'quota_exceeded',
    feature,
    reason,
    tier,
    resetAt: period ? nextReset(period, now) : null,
    ...extra,
  });

  if (feature === 'anulia') {
    const rule = limits.anulia;
    const conv = String(ctx.conversationId || 'default').slice(0, 80);
    const used = await readCounter(t, accountId, 'anulia', rule.period, now);
    const convKey = `anulia:${periodKey(rule.period, now)}:${conv}`;
    const convRow = (await readConversation(t, accountId, convKey)) || { count: 0, grace: 0 };
    if (used < rule.messages) {
      await writeConversation(t, accountId, convKey, convRow.count + 1, convRow.grace);
      await bump(t, accountId, 'anulia', rule.period, now);
      return { allowed: true, remaining: rule.messages - used - 1, tier };
    }
    // Gentle landing: an ongoing conversation may finish with a few extra turns.
    if (convRow.count > 0 && convRow.grace < rule.graceMessages) {
      await writeConversation(t, accountId, convKey, convRow.count + 1, convRow.grace + 1);
      return { allowed: true, remaining: 0, grace: true, graceLeft: rule.graceMessages - convRow.grace - 1, tier };
    }
    return deny(tier === 'plus' ? 'daily_limit' : 'free_limit', rule.period);
  }

  if (feature === 'journal') {
    const rule = limits.journal;
    const used = await readCounter(t, accountId, 'journal', rule.period, now);
    if (used >= rule.reflections) return deny('daily_limit', rule.period);
    await bump(t, accountId, 'journal', rule.period, now);
    return { allowed: true, remaining: rule.reflections - used - 1, tier };
  }

  if (feature === 'cards') {
    const rule = limits.cards;
    const conv = String(ctx.conversationId || '').slice(0, 80);
    if (!conv) return { allowed: false, status: 400, error: 'missing_conversation', feature };
    const key = `cards:${conv}`;
    const known = await readConversation(t, accountId, key);
    if (known) {
      if (known.count >= rule.messagesPerConversation) return deny('conversation_limit', null);
      await writeConversation(t, accountId, key, known.count + 1, known.grace);
      return { allowed: true, tier };
    }
    const started = await readCounter(t, accountId, 'cards_started', rule.period, now);
    if (started >= rule.conversations) {
      return deny(tier === 'plus' ? 'daily_limit' : 'need_plus', rule.period === 'lifetime' ? null : rule.period);
    }
    await writeConversation(t, accountId, key, 1, 0);
    await bump(t, accountId, 'cards_started', rule.period, now);
    return { allowed: true, tier, startedNew: true };
  }

  if (feature === 'art') {
    const sessionId = Number(ctx.artSessionId);
    if (!Number.isInteger(sessionId) || sessionId < 1 || sessionId > 43) {
      return { allowed: false, status: 400, error: 'missing_art_session', feature };
    }
    const hasProgram = entitlements.artProgram.active;
    const freeSession = LIMITS.free.art.freeSessionIds.includes(sessionId);
    if (!hasProgram && !freeSession) return deny('need_art_access', null);

    const rule = tier === 'plus' ? LIMITS.plus.art : hasProgram ? LIMITS.art : LIMITS.free.art;
    const r = await t.query('select count from art_session_usage where account_id = $1 and session_id = $2', [accountId, sessionId]);
    const row = r.rows[0];
    if (row) {
      if (row.count >= rule.messagesPerSession) return deny('session_message_limit', null);
      await t.query('update art_session_usage set count = count + 1 where account_id = $1 and session_id = $2', [accountId, sessionId]);
      return { allowed: true, tier };
    }
    const startedToday = await readCounter(t, accountId, 'art_started', 'day', now);
    if (startedToday >= rule.newSessions) return deny('daily_new_session_limit', 'day');
    await t.query('insert into art_session_usage (account_id, session_id, count, started_at) values ($1, $2, 1, $3)', [accountId, sessionId, new Date(now).toISOString()]);
    await bump(t, accountId, 'art_started', 'day', now);
    return { allowed: true, tier, startedNew: true };
  }

  const simple = { summary: limits.summary, motivation: limits.motivation, transcribe: limits.transcribe, speech: limits.speech, community: limits.community }[feature];
  if (simple) {
    const used = await readCounter(t, accountId, feature, simple.period, now);
    if (used >= simple.count) return deny('daily_limit', simple.period);
    await bump(t, accountId, feature, simple.period, now);
    return { allowed: true, tier, remaining: simple.count - used - 1 };
  }

  return { allowed: false, status: 400, error: 'unknown_feature', feature };
}

/** Read-only usage summary for the client (shown on Profile / Pricing). */
export async function usageSummary({ db, accountId, entitlements, now = Date.now() }) {
  const tier = entitlements.plus.active ? 'plus' : 'free';
  const limits = LIMITS[tier];
  const read = (name, period) => readCounter(db, accountId, name, period, now);
  return {
    tier,
    anulia: {
      used: await read('anulia', limits.anulia.period),
      limit: limits.anulia.messages,
      period: limits.anulia.period,
      resetAt: nextReset(limits.anulia.period, now),
    },
    journal: {
      used: await read('journal', limits.journal.period),
      limit: limits.journal.reflections,
      period: limits.journal.period,
    },
    cards: {
      started: await read('cards_started', limits.cards.period),
      limit: limits.cards.conversations,
      period: limits.cards.period,
    },
    art: {
      startedToday: await read('art_started', 'day'),
      newSessionsPerDay: (tier === 'plus' ? LIMITS.plus.art : entitlements.artProgram.active ? LIMITS.art : LIMITS.free.art).newSessions,
      freeSessionIds: LIMITS.free.art.freeSessionIds,
    },
    community: {
      used: await read('community', limits.community.period),
      limit: limits.community.count,
      period: limits.community.period,
    },
  };
}
