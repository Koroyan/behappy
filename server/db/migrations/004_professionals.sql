-- BeHappy Professionals: applications and independent verification, public
-- profiles, services and availability, bookings, private messages.
--
-- Verification and payment are tracked separately: a paid membership never
-- changes `status`, and only status 'approved' (not expired) shows a verified
-- badge. BeHappy takes no commission: bookings record the professional's own
-- price and payment arrangement, and payment_status can only say that BeHappy
-- did not collect it.

create table professional_profiles (
  id text primary key,
  account_id text not null unique references accounts(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'more_info_required', 'approved', 'rejected', 'suspended', 'expired')),
  legal_name text,
  public_name text,
  country text,
  city text,
  contact_email citext,
  phone_e164 text,
  phone_verified_at timestamptz,
  bio text,
  photo bytea,
  photo_mime text,
  photo_updated_at timestamptz,
  languages text[] not null default '{}',
  languages_confirmed_at timestamptz,
  specializations text[] not null default '{}',
  practice_areas text,
  experience_years int check (experience_years between 0 and 70),
  offers_online boolean not null default true,
  offers_in_person boolean not null default false,
  in_person_address text,
  timezone text not null default 'Asia/Tbilisi',
  payment_arrangement text,
  payment_methods text[] not null default '{}',
  cancellation_policy text,
  cancellation_notice_hours int not null default 24 check (cancellation_notice_hours between 0 and 336),
  booking_notice_hours int not null default 12 check (booking_notice_hours between 0 and 336),
  buffer_minutes int not null default 10 check (buffer_minutes between 0 and 120),
  auto_confirm boolean not null default false,
  published boolean not null default false,
  reminders_enabled boolean not null default true,
  membership_cancelled_at timestamptz,
  verified_at timestamptz,
  verification_expires_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_bio_length check (char_length(coalesce(bio, '')) <= 3000)
);
create index professional_profiles_status_idx on professional_profiles (status);
create index professional_profiles_languages_idx on professional_profiles using gin (languages);
create index professional_profiles_specializations_idx on professional_profiles using gin (specializations);

create table professional_qualifications (
  id bigint generated always as identity primary key,
  professional_id text not null references professional_profiles(id) on delete cascade,
  kind text not null check (kind in ('degree', 'license', 'registration', 'certification')),
  title text not null,
  institution text,
  number text,
  country text,
  year int check (year between 1950 and 2100),
  valid_until date,
  verified boolean not null default false,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index professional_qualifications_pro_idx on professional_qualifications (professional_id);

-- Encrypted at rest (AES-256-GCM, DOCUMENT_ENCRYPTION_KEY). Every view is audited.
create table verification_documents (
  id text primary key,
  professional_id text not null references professional_profiles(id) on delete cascade,
  kind text not null check (kind in ('identity', 'degree', 'license', 'certification', 'other')),
  file_name text not null,
  mime text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text not null,
  ciphertext bytea not null,
  iv bytea not null,
  tag bytea not null,
  uploaded_at timestamptz not null default now()
);
create index verification_documents_pro_idx on verification_documents (professional_id);

-- The verification record: every status change, who made it and why.
create table verification_events (
  id bigint generated always as identity primary key,
  professional_id text not null references professional_profiles(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_account_id text,
  actor_kind text not null check (actor_kind in ('professional', 'admin', 'system')),
  message text,
  internal_note text,
  checklist jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index verification_events_pro_idx on verification_events (professional_id, created_at desc);

create table professional_services (
  id text primary key,
  professional_id text not null references professional_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  mode text not null check (mode in ('online', 'in_person')),
  minutes int not null check (minutes between 15 and 240),
  price_minor int not null check (price_minor >= 0 and price_minor <= 10000000),
  currency text not null default 'GEL',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index professional_services_pro_idx on professional_services (professional_id);

-- Weekly hours in the professional's own time zone (ISO weekday 1 = Monday).
create table availability_rules (
  id bigint generated always as identity primary key,
  professional_id text not null references professional_profiles(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  start_minute int not null check (start_minute between 0 and 1439),
  end_minute int not null check (end_minute between 1 and 1440),
  check (end_minute > start_minute)
);
create index availability_rules_pro_idx on availability_rules (professional_id);

create table availability_exceptions (
  id bigint generated always as identity primary key,
  professional_id text not null references professional_profiles(id) on delete cascade,
  day date not null,
  note text,
  unique (professional_id, day)
);

-- What a professional sees about a client: the name the client chose here.
-- No link to the client's community name, journal or AI conversations.
create table client_profiles (
  account_id text primary key references accounts(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bookings (
  id text primary key,
  professional_id text not null references professional_profiles(id) on delete cascade,
  client_account_id text references accounts(id) on delete set null,
  client_display_name text not null,
  service_id text references professional_services(id) on delete set null,
  service_title text not null,
  mode text not null check (mode in ('online', 'in_person')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  slot tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status text not null check (status in ('requested', 'confirmed', 'declined', 'cancelled_by_client', 'cancelled_by_professional', 'expired')),
  attendance text not null default 'unknown' check (attendance in ('unknown', 'attended', 'client_no_show')),
  attendance_marked_at timestamptz,
  payment_status text not null default 'not_collected_by_behappy' check (payment_status = 'not_collected_by_behappy'),
  price_minor int not null check (price_minor >= 0),
  currency text not null,
  payment_arrangement text,
  cancellation_policy text,
  cancellation_notice_hours int not null,
  client_note_enc bytea,
  client_note_iv bytea,
  client_note_tag bytea,
  late_cancellation boolean not null default false,
  cancel_reason text,
  rescheduled_from text references bookings(id) on delete set null,
  confirmed_at timestamptz,
  decided_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Two active bookings can never overlap for the same professional, even
  -- when requests arrive at the same moment.
  constraint bookings_no_overlap exclude using gist (professional_id with =, slot with &&) where (status in ('requested', 'confirmed'))
);
create index bookings_pro_idx on bookings (professional_id, starts_at);
create index bookings_client_idx on bookings (client_account_id, starts_at);
create index bookings_status_idx on bookings (status, starts_at);

create table booking_events (
  id bigint generated always as identity primary key,
  booking_id text not null references bookings(id) on delete cascade,
  actor_kind text not null check (actor_kind in ('client', 'professional', 'system')),
  event text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on booking_events (booking_id, created_at);

-- Private client <-> professional messages, encrypted at rest
-- (MESSAGE_ENCRYPTION_KEY). Staff can't read them; a reported message is
-- shared with moderators only through the reporter's own report.
create table pro_threads (
  id text primary key,
  professional_id text not null references professional_profiles(id) on delete cascade,
  client_account_id text references accounts(id) on delete set null,
  client_display_name text not null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  client_last_read_at timestamptz,
  pro_last_read_at timestamptz,
  unique (professional_id, client_account_id)
);
create index pro_threads_client_idx on pro_threads (client_account_id);

create table pro_messages (
  id bigint generated always as identity primary key,
  thread_id text not null references pro_threads(id) on delete cascade,
  sender_kind text not null check (sender_kind in ('client', 'professional', 'system')),
  ciphertext bytea not null,
  iv bytea not null,
  tag bytea not null,
  created_at timestamptz not null default now()
);
create index pro_messages_thread_idx on pro_messages (thread_id, id);

-- Daily counts for the professional's dashboard. No viewer identity.
create table professional_profile_stats (
  professional_id text not null references professional_profiles(id) on delete cascade,
  day date not null,
  views int not null default 0,
  booking_requests int not null default 0,
  inquiries int not null default 0,
  primary key (professional_id, day)
);

alter table orders add constraint orders_professional_fk foreign key (professional_id) references professional_profiles(id) on delete set null;
