-- Usage statistics become a choice for new accounts: nothing is collected
-- until the person says yes (the app asks once, after their first activity).
--   analytics_choice_at  when the person last chose (null: never asked)
-- Accounts that already switched statistics off keep that as their choice.
-- Accounts created before this change keep their current setting (on, with
-- the switch in Profile › Privacy, as they were told).
alter table accounts add column analytics_choice_at timestamptz;
update accounts set analytics_choice_at = coalesce(created_at, now()) where analytics_opt_out;
alter table accounts alter column analytics_opt_out set default true;

-- Anonymous daily totals for details that could say something sensitive about
-- one person if they were stored with their account: which first-launch
-- option or program someone chose, which sound they played. Only counts per
-- day, never an account id; shown to staff only as totals over a period, and
-- groups smaller than ANALYTICS_MIN_COHORT are hidden.
create table analytics_aggregates (
  day date not null,
  feature text not null,
  kind text not null,
  dim text not null,
  value text not null,
  n int not null default 0,
  primary key (day, feature, kind, dim, value)
);
