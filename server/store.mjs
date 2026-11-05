// Small durable JSON store for the test-stage backend.
//
// Writes are atomic (write temp file, then rename) and happen synchronously
// after every mutation, so a crash never leaves a half-written payment record.
// This is fine for sandbox traffic. Before real launch, swap this module for a
// managed database; the rest of the server only uses the functions exported here.

import fs from 'node:fs';
import path from 'node:path';

const EMPTY = () => ({
  version: 1,
  accounts: {}, // accountId -> { id, tokenHash, recoveryHash, createdAt, lastSeenAt }
  orders: {}, // orderId -> order record
  usage: {}, // accountId -> usage counters
  responseOwners: {}, // OpenAI response id -> { accountId, at }
  paymentEvents: {}, // dedupe key -> { at }
});

export class Store {
  constructor(dataDir, fileName = 'db.json') {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, fileName);
    this.data = EMPTY();
    this.load();
  }

  load() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    if (!fs.existsSync(this.file)) {
      this.flush();
      return;
    }
    const raw = fs.readFileSync(this.file, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : EMPTY();
    this.data = { ...EMPTY(), ...parsed };
  }

  flush() {
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  /** Runs a mutation and persists it. Returns the mutation's result. */
  mutate(fn) {
    const result = fn(this.data);
    this.flush();
    return result;
  }

  get accounts() {
    return this.data.accounts;
  }

  get orders() {
    return this.data.orders;
  }

  /** Drops response-ownership rows older than maxAgeMs to keep the file small. */
  pruneResponseOwners(maxAgeMs = 31 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [id, row] of Object.entries(this.data.responseOwners)) {
      if (!row || row.at < cutoff) {
        delete this.data.responseOwners[id];
        removed += 1;
      }
    }
    if (removed) this.flush();
    return removed;
  }
}

/** In-memory store for tests: same API, no disk access. */
export class MemoryStore extends Store {
  constructor() {
    super('/dev/null-not-used');
  }

  load() {
    this.data = EMPTY();
  }

  flush() {
    // no-op
  }
}
