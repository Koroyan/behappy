// Rate limits shared by every server instance (table rate_events).
//
// An exact sliding window: each allowed hit is one row, and a hit is allowed
// while fewer than `limit` rows of its key lie inside the window. The row is
// written first and removed again if it went over the limit, so two
// instances can't both take the last slot. Refused hits are not counted.
// Old rows are pruned now and then.

export function createLimiter(db, { name, limit, windowMs }) {
  let lastPrune = 0;
  return {
    name,
    limit,
    windowMs,
    /**
     * true when this hit is allowed (and then counted). Inside a transaction
     * pass its handle as `q`: a query on the pool would wait for that same
     * transaction (one connection in PGlite) and never finish.
     */
    async allow(key, now = Date.now(), q = db) {
      const k = `${name}:${key}`;
      const at = new Date(now).toISOString();
      const since = new Date(now - windowMs).toISOString();
      const ins = await q.query('insert into rate_events (key, at) values ($1, $2) returning id', [k, at]);
      const id = ins.rows[0].id;
      // Count the hits up to and including this one (by id: same-millisecond hits are ordered).
      const r = await q.query('select count(*)::int as n from rate_events where key = $1 and at > $2 and id <= $3', [k, since, id]);
      if (Number(r.rows[0].n) > limit) {
        await q.query('delete from rate_events where id = $1', [id]);
        return false;
      }
      if (now - lastPrune > 10 * 60 * 1000) {
        lastPrune = now;
        db.query('delete from rate_events where key like $1 and at < $2', [`${name}:%`, new Date(now - Math.max(windowMs, 60 * 60 * 1000) * 2).toISOString()]).catch(() => {});
      }
      return true;
    },
    /** Hits inside the current window. */
    async count(key, now = Date.now(), q = db) {
      const r = await q.query('select count(*)::int as n from rate_events where key = $1 and at > $2', [`${name}:${key}`, new Date(now - windowMs).toISOString()]);
      return Number(r.rows[0].n);
    },
  };
}
