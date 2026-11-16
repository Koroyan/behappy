-- Optional end-to-end encrypted backup (off unless the person turns it on).
--
-- Everything stored here was encrypted on the person's device before it was
-- sent: the server keeps sealed boxes and a wrapped data key, never a key it
-- could use, never plaintext. Staff can see that a backup exists and its size,
-- nothing inside it. Deleting the account deletes all of it (foreign keys).
--
--   backup_vaults        one per account: the wrapped data key (opens only with
--                        the person's recovery key) and the current revision
--   backup_snapshots     the current encrypted snapshot (one box)
--   backup_uploads/_chunks  an upload in progress, in parts, so an interrupted
--                        upload continues where it stopped; committed atomically
--   backup_blobs         encrypted attachments (artwork), one box each

create table backup_vaults (
  account_id text primary key references accounts(id) on delete cascade,
  key_envelope jsonb not null,
  key_id text not null,
  revision int not null default 0,
  snapshot_size int not null default 0,
  snapshot_sha256 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table backup_snapshots (
  account_id text primary key references accounts(id) on delete cascade,
  revision int not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

create table backup_uploads (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  base_revision int not null,
  parts int not null check (parts between 1 and 64),
  size int not null,
  sha256 text not null,
  created_at timestamptz not null default now()
);
create index backup_uploads_account_idx on backup_uploads (account_id, created_at);

create table backup_upload_chunks (
  upload_id text not null references backup_uploads(id) on delete cascade,
  n int not null,
  data bytea not null,
  primary key (upload_id, n)
);

create table backup_blobs (
  account_id text not null references accounts(id) on delete cascade,
  blob_id text not null,
  size int not null,
  sha256 text not null,
  data bytea not null,
  created_at timestamptz not null default now(),
  primary key (account_id, blob_id)
);
