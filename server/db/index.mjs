// Database access.
//
//  - Production: real PostgreSQL through DATABASE_URL (node-postgres pool).
//  - Development and tests: embedded PostgreSQL (PGlite), the same SQL and
//    migrations, stored in DATA_DIR/pg, or in memory for tests.
//
// Both drivers expose the same small surface:
//   db.query(sql, params)          -> { rows, rowCount }
//   db.tx(async (t) => { ... })    -> runs in one transaction (BEGIN/COMMIT,
//                                     ROLLBACK on any throw); t.query, t.exec
//   db.exec(sql)                   -> multi-statement SQL (migrations)
//   db.close()
// bigint columns are returned as JS numbers (ids and counts stay < 2^53) and
// timestamptz columns as Date objects.

import fs from 'node:fs';
import path from 'node:path';

const normalize = (r) => ({ rows: r.rows || [], rowCount: r.rowCount ?? r.affectedRows ?? (r.rows || []).length });

export async function createDatabase({ url, dataDir, memory = false } = {}) {
  if (url) return createPostgres(url);
  return createPglite(memory ? null : path.join(dataDir, 'pg'));
}

async function createPostgres(url) {
  const { default: pg } = await import('pg');
  pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8
  pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // numeric
  const sslMode = (process.env.DATABASE_SSL || '').toLowerCase();
  const ssl = sslMode === 'off' ? false : sslMode === 'no-verify' ? { rejectUnauthorized: false } : sslMode === 'require' ? { rejectUnauthorized: true } : undefined;
  const pool = new pg.Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX || 10), ...(ssl !== undefined ? { ssl } : {}) });
  pool.on('error', (err) => console.error('[db] idle client error', err.message));
  const query = async (text, params = []) => normalize(await pool.query(text, params));
  const tx = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const t = {
        query: async (text, params = []) => normalize(await client.query(text, params)),
        exec: async (sql) => {
          await client.query(sql);
        },
      };
      const result = await fn(t);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // connection already broken; the pool discards it
      }
      throw error;
    } finally {
      client.release();
    }
  };
  return {
    kind: 'postgres',
    query,
    tx,
    exec: async (sql) => {
      await pool.query(sql);
    },
    close: () => pool.end(),
  };
}

/**
 * Two processes on one embedded database directory can corrupt it (on
 * Windows a killed dev server sometimes keeps running). A lock file with the
 * owner's pid stops a second server; a stale lock from a dead process is taken over.
 */
function lockDataDir(dir) {
  const lock = path.join(dir, 'behappy-server.lock');
  if (fs.existsSync(lock)) {
    const pid = Number(fs.readFileSync(lock, 'utf8'));
    let alive = false;
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (alive) throw new Error(`Another BeHappy server (pid ${pid}) is using the embedded database in ${dir}. Stop it first: two servers on one embedded database can corrupt it.`);
  }
  fs.writeFileSync(lock, String(process.pid));
  const release = () => {
    try {
      if (Number(fs.readFileSync(lock, 'utf8')) === process.pid) fs.unlinkSync(lock);
    } catch {
      // already gone
    }
  };
  process.once('exit', release);
  return release;
}

async function createPglite(dir) {
  const { PGlite, types } = await import('@electric-sql/pglite');
  const { btree_gist } = await import('@electric-sql/pglite/contrib/btree_gist');
  const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm');
  const { citext } = await import('@electric-sql/pglite/contrib/citext');
  let release = () => {};
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    release = lockDataDir(dir);
  }
  // An explicit undefined data dir makes PGlite ignore the options: use memory://.
  const db = new PGlite(dir || 'memory://', {
    extensions: { btree_gist, pg_trgm, citext },
    parsers: { [types.INT8]: (v) => Number(v), [types.NUMERIC]: (v) => Number(v) },
  });
  await db.waitReady;
  // PGlite is a single connection: an open transaction holds it and other
  // queries wait, like statements queued on one pg connection.
  return {
    kind: 'pglite',
    query: async (text, params = []) => normalize(await db.query(text, params)),
    tx: (fn) =>
      db.transaction(async (tr) =>
        fn({
          query: async (text, params = []) => normalize(await tr.query(text, params)),
          exec: async (sql) => {
            await tr.exec(sql);
          },
        })
      ),
    exec: async (sql) => {
      await db.exec(sql);
    },
    close: async () => {
      await db.close();
      release();
    },
  };
}

/** Postgres unique-violation / exclusion-violation codes, for friendly errors. */
export const PG = { UNIQUE: '23505', EXCLUSION: '23P01', FOREIGN_KEY: '23503', CHECK: '23514' };

export const ts = (ms) => (ms === null || ms === undefined ? null : new Date(ms).toISOString());
export const ms = (date) => (date === null || date === undefined ? null : date instanceof Date ? date.getTime() : new Date(date).getTime());
