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
  },
  // Art-program owners without Plus: full program, normal Anulia free tier.
  art: { newSessions: 1, period: 'day', messagesPerSession: 80 },
};

const dayKey = (now) => new Date(now).toISOString().slice(0, 10);
const monthKey = (now) => new Date(now).toISOString().slice(0, 7);
const periodKey = (period, now) => (period === 'day' ? dayKey(now) : period === 'month' ? monthKey(now) : 'lifetime');

function nextReset(period, now) {
  const d = new Date(now);
  if (period === 'day') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  if (period === 'month') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return null;
}

function usageFor(store, accountId) {
  if (!store.data.usage[accountId]) store.data.usage[accountId] = { counters: {}, conversations: {}, artSessions: {} };
  return store.data.usage[accountId];
}

const readCounter = (usage, name, period, now) => usage.counters[`${name}:${periodKey(period, now)}`] || 0;

function bump(store, accountId, name, period, now) {
  store.mutate(() => {
    const usage = usageFor(store, accountId);
    const key = `${name}:${periodKey(period, now)}`;
    usage.counters[key] = (usage.counters[key] || 0) + 1;
  });
}

/**
 * Decides whether one AI request may proceed, and records it if so.
 * ctx: { feature, conversationId, artSessionId }
 * Returns { allowed: true } or { allowed: false, status, error, reason, resetAt }.
 */
export function checkAndRecord({ store, accountId, entitlements, ctx, now = Date.now() }) {
  const tier = entitlements.plus.active ? 'plus' : 'free';
  const limits = LIMITS[tier];
  const usage = usageFor(store, accountId);
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
    const used = readCounter(usage, 'anulia', rule.period, now);
    const convKey = `${periodKey(rule.period, now)}:${conv}`;
    const convRow = usage.conversations[convKey] || { count: 0, grace: 0 };

    if (used < rule.messages) {
      store.mutate(() => {
        usage.conversations[convKey] = { count: convRow.count + 1, grace: convRow.grace };
        usage.counters[`anulia:${periodKey(rule.period, now)}`] = used + 1;
      });
      return { allowed: true, remaining: rule.messages - used - 1, tier };
    }
    // Gentle landing: an ongoing conversation may finish with a few extra turns.
    if (convRow.count > 0 && convRow.grace < rule.graceMessages) {
      store.mutate(() => {
        usage.conversations[convKey] = { count: convRow.count + 1, grace: convRow.grace + 1 };
      });
      return { allowed: true, remaining: 0, grace: true, graceLeft: rule.graceMessages - convRow.grace - 1, tier };
    }
    return deny(tier === 'plus' ? 'daily_limit' : 'free_limit', rule.period);
  }

  if (feature === 'journal') {
    const rule = limits.journal;
    const used = readCounter(usage, 'journal', rule.period, now);
    if (used >= rule.reflections) return deny('daily_limit', rule.period);
    bump(store, accountId, 'journal', rule.period, now);
    return { allowed: true, remaining: rule.reflections - used - 1, tier };
  }

  if (feature === 'cards') {
    const rule = limits.cards;
    const conv = String(ctx.conversationId || '').slice(0, 80);
    if (!conv) return { allowed: false, status: 400, error: 'missing_conversation', feature };
    const known = usage.conversations[`cards:${conv}`];
    if (known) {
      if (known.count >= rule.messagesPerConversation) return deny('conversation_limit', null);
      store.mutate(() => {
        usage.conversations[`cards:${conv}`] = { ...known, count: known.count + 1 };
      });
      return { allowed: true, tier };
    }
    const started = readCounter(usage, 'cards_started', rule.period, now);
    if (started >= rule.conversations) {
      return deny(tier === 'plus' ? 'daily_limit' : 'need_plus', rule.period === 'lifetime' ? null : rule.period);
    }
    store.mutate(() => {
      usage.conversations[`cards:${conv}`] = { count: 1, startedAt: now };
      const key = `cards_started:${periodKey(rule.period, now)}`;
      usage.counters[key] = (usage.counters[key] || 0) + 1;
    });
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
    const row = usage.artSessions[sessionId];
    if (row) {
      if (row.count >= rule.messagesPerSession) return deny('session_message_limit', null);
      store.mutate(() => {
        usage.artSessions[sessionId] = { ...row, count: row.count + 1 };
      });
      return { allowed: true, tier };
    }
    const startedToday = readCounter(usage, 'art_started', 'day', now);
    if (startedToday >= rule.newSessions) return deny('daily_new_session_limit', 'day');
    store.mutate(() => {
      usage.artSessions[sessionId] = { count: 1, startedAt: now };
      const key = `art_started:${dayKey(now)}`;
      usage.counters[key] = (usage.counters[key] || 0) + 1;
    });
    return { allowed: true, tier, startedNew: true };
  }

  const simple = { summary: limits.summary, motivation: limits.motivation, transcribe: limits.transcribe, speech: limits.speech }[feature];
  if (simple) {
    const used = readCounter(usage, feature, simple.period, now);
    if (used >= simple.count) return deny('daily_limit', simple.period);
    bump(store, accountId, feature, simple.period, now);
    return { allowed: true, tier };
  }

  return { allowed: false, status: 400, error: 'unknown_feature', feature };
}

/** Read-only usage summary for the client (shown on Profile / Pricing). */
export function usageSummary({ store, accountId, entitlements, now = Date.now() }) {
  const tier = entitlements.plus.active ? 'plus' : 'free';
  const limits = LIMITS[tier];
  const usage = store.data.usage[accountId] || { counters: {}, conversations: {}, artSessions: {} };
  const anuliaUsed = readCounter(usage, 'anulia', limits.anulia.period, now);
  return {
    tier,
    anulia: {
      used: anuliaUsed,
      limit: limits.anulia.messages,
      period: limits.anulia.period,
      resetAt: nextReset(limits.anulia.period, now),
    },
    journal: {
      used: readCounter(usage, 'journal', limits.journal.period, now),
      limit: limits.journal.reflections,
      period: limits.journal.period,
    },
    cards: {
      started: readCounter(usage, 'cards_started', limits.cards.period, now),
      limit: limits.cards.conversations,
      period: limits.cards.period,
    },
    art: {
      startedToday: readCounter(usage, 'art_started', 'day', now),
      newSessionsPerDay: (tier === 'plus' ? LIMITS.plus.art : entitlements.artProgram.active ? LIMITS.art : LIMITS.free.art).newSessions,
      freeSessionIds: LIMITS.free.art.freeSessionIds,
    },
  };
}
