// Applies server/db/migrations/NNN_name.sql in order, each in its own
// transaction, and records it in schema_migrations. Safe to run on every
// start; on PostgreSQL an advisory lock keeps two instances from racing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const LOCK_ID = 7270301;

export function listMigrations(dir = MIGRATIONS_DIR) {
  return fs
    .readdirSync(dir)
    .filter((f) => /^[0-9]{3}_[a-z0-9_]+[.]sql$/.test(f))
    .sort()
    .map((f) => ({ version: f.replace(/[.]sql$/, ''), file: path.join(dir, f) }));
}

export async function migrate(db, { dir = MIGRATIONS_DIR, log = () => {} } = {}) {
  await db.query('create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())');
  const applied = [];
  for (const m of listMigrations(dir)) {
    const done = await db.tx(async (t) => {
      if (db.kind === 'postgres') await t.query('select pg_advisory_xact_lock($1)', [LOCK_ID]);
      const exists = await t.query('select 1 from schema_migrations where version = $1', [m.version]);
      if (exists.rowCount) return false;
      await t.exec(fs.readFileSync(m.file, 'utf8'));
      await t.query('insert into schema_migrations (version) values ($1)', [m.version]);
      return true;
    });
    if (done) {
      applied.push(m.version);
      log(`[db] applied migration ${m.version}`);
    }
  }
  return applied;
}

export async function schemaVersion(db) {
  const r = await db.query('select max(version) as v from schema_migrations');
  return r.rows[0]?.v || null;
}
