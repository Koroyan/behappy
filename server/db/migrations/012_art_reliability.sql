-- Art reflection: what the app itself knows about a session run, so replies
-- and summaries can be checked before the person sees them
-- (server/art/turn.mjs).
--
-- Data minimisation: no message text and no images are stored. `facts` holds
-- only lexicon matches (a feeling stem with its polarity, colour names, body
-- places), `comparison` the result of comparing the first and changed drawing,
-- `correction` the reply text the person actually saw when the app had to
-- replace the model's draft (so the next turn continues from what was shown).
-- Rows are removed with the account and after 60 days (scheduler).
create table art_runs (
  account_id text not null references accounts(id) on delete cascade,
  art_session integer not null,
  run_id text not null,
  facts jsonb not null default '[]',
  comparison jsonb,
  correction jsonb,
  updated_at timestamptz not null default now(),
  primary key (account_id, art_session, run_id)
);
create index art_runs_updated_idx on art_runs (updated_at);

-- Fingerprints of uploaded artwork (hashes and a 48×48 grey / 24×24 colour
-- signature), never the image itself.
create table art_image_fingerprints (
  id bigint generated always as identity primary key,
  account_id text not null references accounts(id) on delete cascade,
  art_session integer not null,
  run_id text not null,
  kind text not null check (kind in ('image_v1', 'image_v2')),
  fingerprint jsonb not null,
  created_at timestamptz not null default now()
);
create index art_image_fingerprints_run_idx on art_image_fingerprints (account_id, art_session, run_id, kind, id desc);
create index art_image_fingerprints_created_idx on art_image_fingerprints (created_at);
