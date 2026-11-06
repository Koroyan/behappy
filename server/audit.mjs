// Append-only record of staff and security-relevant actions: verification
// decisions, moderation, refunds, role changes, document views. It records who
// did what to which record, never the content of journals or conversations.

export async function audit(q, { actorId = null, actorRole = 'system', action, targetType = null, targetId = null, metadata = {} }) {
  await q.query('insert into audit_log (actor_account_id, actor_role, action, target_type, target_id, metadata) values ($1, $2, $3, $4, $5, $6::jsonb)', [
    actorId,
    actorRole,
    action,
    targetType,
    targetId === null || targetId === undefined ? null : String(targetId),
    JSON.stringify(metadata || {}),
  ]);
}
