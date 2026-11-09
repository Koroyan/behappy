-- Financial controls (docs/BEHAPPY_FINANCE.md).
--
-- 1. Every AI call carries its cost in USD, computed when it is recorded from
--    the price table (cached input billed at the cached rate; speech and
--    transcription estimated from their size). A request first reserves its
--    worst-case cost ("reserved"); the reservation is released when the call
--    finishes and the real cost is recorded. A crash leaves the reservation
--    counted, which is the safe direction. Per-account allowances and the
--    daily budget add these costs, so two requests at once can't both spend
--    the same allowance.
alter table ai_usage add column cost_usd numeric(12, 6) not null default 0;
alter table ai_usage add column cached_tokens int not null default 0;
alter table ai_usage drop constraint if exists ai_usage_status_check;
alter table ai_usage add constraint ai_usage_status_check check (status in ('ok', 'error', 'refused', 'reserved', 'released'));
create index ai_usage_account_created_idx on ai_usage (account_id, created_at);
create index ai_usage_feature_created_idx on ai_usage (feature, created_at);

-- 2. Rate limits shared by every server instance: one row per allowed hit,
--    counted over the window (an exact sliding window; limits are small).
create table rate_events (
  id bigint generated always as identity primary key,
  key text not null,
  at timestamptz not null
);
create index rate_events_key_at_idx on rate_events (key, at);

-- 3. Promotions. Every discount is checked on the server against the
--    financial model before an order is created; a campaign whose discount
--    would push the modelled contribution under the minimum is refused (or
--    its discount reduced, if staff chose that).
create table promotions (
  id text primary key,
  code text unique,                    -- null: applies automatically (campaign)
  name text not null,
  kind text not null check (kind in ('percent', 'fixed_price', 'amount_off')),
  value numeric(10, 2) not null check (value > 0),
  product_ids text[] not null default '{}', -- empty: every eligible product
  first_purchase_only boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions int,
  redemptions int not null default 0,
  per_account_limit int not null default 1,
  stackable boolean not null default false,
  clamp_to_safe boolean not null default true, -- reduce to the safe maximum instead of refusing
  active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders remember the regular (reference) price and the promotion applied.
alter table orders add column list_amount_minor int;
alter table orders add column promotion_id text references promotions(id) on delete set null;
alter table orders add column discount_minor int not null default 0;
