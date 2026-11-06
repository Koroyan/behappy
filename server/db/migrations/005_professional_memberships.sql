-- BeHappy Professional membership: fixed-price prepaid periods (no
-- commission on sessions). A period comes from a free trial (granted at
-- verification approval), a verified Flitt payment (order_id), or a manual
-- grant by an admin. Access is always computed from these rows on the server.

create table professional_memberships (
  id bigint generated always as identity primary key,
  professional_id text not null references professional_profiles(id) on delete cascade,
  kind text not null check (kind in ('trial', 'paid', 'grant')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  order_id text unique references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  check (ends_at > starts_at)
);
create index professional_memberships_pro_idx on professional_memberships (professional_id, ends_at desc);

-- One free trial per person: keyed by HMACs of the verified phone, licence /
-- registration numbers and email (not the raw values). Kept after account
-- deletion only as these one-way hashes, to stop repeated trials.
create table trial_grants (
  key_hash text primary key,
  professional_id text references professional_profiles(id) on delete set null,
  kind text not null check (kind in ('phone', 'license', 'email', 'account')),
  created_at timestamptz not null default now()
);
