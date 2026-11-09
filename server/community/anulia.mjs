// Anulia in community rooms.
//
// Anulia answers only when asked (@Anulia or the "Ask Anulia" button), never
// automatically. Limits: the asker's daily allowance (quota feature
// "community"), a per-room hourly cap and a global daily cap. Context is the
// room's recent PUBLIC messages only: never journals, Anulia conversations,
// bookings or anything private. Every reply is posted as an AI message.

import { createAiControls, recordAiUsage } from '../ai.mjs';
import { ts } from '../db/index.mjs';
import { entitlementsForAccount } from '../entitlements.mjs';
import { SERVER_PROMPTS } from '../prompts/index.mjs';
import { checkAndRecord } from '../quota.mjs';
import { createLimiter } from '../rateLimit.mjs';

const HOUR = 60 * 60 * 1000;
const LANGUAGE_NAMES = {
  en: 'English', ka: 'Georgian', ru: 'Russian', hy: 'Armenian', tr: 'Turkish', az: 'Azerbaijani', es: 'Spanish', de: 'German', fr: 'French',
  pt: 'Portuguese', id: 'Indonesian', it: 'Italian', ar: 'Arabic', hi: 'Hindi', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', uk: 'Ukrainian', pl: 'Polish',
};
const TOPIC_NAMES = {
  panic: 'Panic attacks', anxiety: 'Anxiety', stress: 'Stress', burnout: 'Burnout', depression: 'Depression support', grief: 'Grief and loss',
  loneliness: 'Loneliness', relationships: 'Relationships', self_esteem: 'Self-esteem', sleep: 'Sleep', emotional_regulation: 'Emotional regulation', growth: 'Personal growth', general: 'General support',
};

const parseJson = (text) => {
  const s = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
};

const outputText = (data) => data?.output_text || data?.output?.find((o) => o?.type === 'message')?.content?.find((c) => typeof c?.text === 'string')?.text || '';

export function createCommunityAnulia({ db, config, fetchImpl = globalThis.fetch, clock = { now: () => Date.now() }, bus, settings = null }) {
  const controls = settings ? createAiControls({ db, settings, clock }) : null;
  // Shared by every server instance (table rate_counters).
  const roomHourly = createLimiter(db, { name: 'community-ai-room', limit: config.community?.anuliaHourlyRoomCap ?? 30, windowMs: HOUR });
  const globalDaily = createLimiter(db, { name: 'community-ai-global', limit: config.community?.anuliaDailyGlobalCap ?? 2000, windowMs: 24 * HOUR });

  const unavailable = (accountId, roomId, reason) => bus.emit('anulia:unavailable', { accountId, roomId, reason });

  return async function answer({ roomId, messageId, account }) {
    const now = clock.now();
    if (!config.openai?.apiKey) return unavailable(account.id, roomId, 'ai_unavailable');
    if (!(await globalDaily.allow('all', now))) return unavailable(account.id, roomId, 'busy');
    if (!(await roomHourly.allow(roomId, now))) return unavailable(account.id, roomId, 'room_busy');
    // Staff switch or daily AI budget (admin center › AI).
    if (controls && (await controls('community').catch(() => null))) return unavailable(account.id, roomId, 'busy');
    const entitlements = await entitlementsForAccount(db, account.id, now);
    const decision = await checkAndRecord({ db, accountId: account.id, entitlements, ctx: { feature: 'community' }, now });
    if (!decision.allowed) return unavailable(account.id, roomId, 'daily_limit');

    const [topic, lang] = roomId.split(':');
    const recent = await db.query(
      `select m.author_kind, coalesce(p.pseudonym, m.author_pseudonym) as name, m.body
       from community_messages m left join community_profiles p on p.account_id = m.author_account_id
       where m.room_id = $1 and m.status = 'visible' and m.id <= $2 order by m.id desc limit 12`,
      [roomId, messageId]
    );
    const transcript = recent.rows
      .reverse()
      .map((r) => `${r.author_kind === 'anulia' ? 'Bea' : r.name || 'Member'}: ${String(r.body).slice(0, 600)}`)
      .join('\n');
    const asker = recent.rows.at(-1)?.name || 'a member';
    const input = `[Room] Topic: ${TOPIC_NAMES[topic] || topic}. Language: ${LANGUAGE_NAMES[lang] || 'English'}.\n[Recent public messages]\n${transcript}\n[${asker} asked you for help in the last message. Reply with the JSON object.]`;

    let data;
    const started = Date.now();
    const model = config.ai?.models?.community || 'gpt-5.4-mini';
    try {
      const res = await fetchImpl(`${config.openai.baseUrl}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.openai.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.ai?.models?.community || 'gpt-5.4-mini',
          instructions: SERVER_PROMPTS.community.instructions,
          reasoning: SERVER_PROMPTS.community.reasoning,
          input: [{ role: 'user', content: [{ type: 'input_text', text: input }] }],
          text: { format: { type: 'json_object' } },
          max_output_tokens: 700,
          store: false,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { code: `upstream_${res.status}` });
      data = await res.json();
    } catch (e) {
      await recordAiUsage(db, { accountId: account.id, feature: 'community', model, status: 'error', errorCode: e?.code || 'unreachable', latencyMs: Date.now() - started, reservationId: decision.reservationId });
      return unavailable(account.id, roomId, 'error');
    }
    await recordAiUsage(db, { accountId: account.id, feature: 'community', model, usage: data?.usage, latencyMs: Date.now() - started, reservationId: decision.reservationId });

    const parsed = parseJson(outputText(data)) || {};
    // No links from the AI in public rooms; trimmed to a readable length.
    const reply = String(parsed.response_text || '')
      .replace(/https?:\/\/\S+/g, '')
      .trim()
      .slice(0, 1500);
    if (!reply) return unavailable(account.id, roomId, 'error');
    const risk = String(parsed.risk_level || 'none');

    const id = await db.tx(async (t) => {
      const ins = await t.query("insert into community_messages (room_id, author_account_id, author_kind, author_pseudonym, body, reply_to_id, status, created_at, flags) values ($1, null, 'anulia', 'Bea', $2, $3, 'visible', $4, $5::jsonb) returning id", [
        roomId,
        reply,
        messageId,
        ts(clock.now()),
        JSON.stringify({ ai: true, risk }),
      ]);
      if (risk === 'high' || risk === 'imminent') {
        const open = await t.query("select 1 from reports where target_type = 'message' and target_id = $1 and reason = 'self_harm_risk' and status in ('open', 'in_review')", [String(messageId)]);
        if (!open.rowCount) {
          await t.query("insert into reports (reporter_kind, target_type, target_id, target_account_id, room_id, reason, details, snapshot, priority, created_at) values ('system', 'message', $1, $2, $3, 'self_harm_risk', 'Bea (the AI companion) judged a possible risk in this conversation', $4::jsonb, 3, $5)", [
            String(messageId),
            account.id,
            roomId,
            JSON.stringify({ roomId, note: 'see room' }),
            ts(clock.now()),
          ]);
        }
      }
      return ins.rows[0].id;
    });
    bus.emit('message:new', { roomId, messageId: id });
    return id;
  };
}
