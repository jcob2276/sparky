create table public.healthspan_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  period text not null check (period in ('daily', 'weekly', 'manual')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date, period)
);

create table public.healthspan_levers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  contributor_key text not null,
  title text not null,
  target_label text not null,
  baseline_score numeric,
  target_score numeric,
  actual_score numeric,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'completed', 'dismissed', 'evaluated')),
  outcome text check (outcome in ('success', 'fail', 'no_data')),
  decided_at timestamptz,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start, contributor_key)
);

create index healthspan_checkins_user_date_idx
  on public.healthspan_checkins (user_id, checkin_date desc);
create index healthspan_levers_user_week_idx
  on public.healthspan_levers (user_id, week_start desc);

alter table public.healthspan_checkins enable row level security;
alter table public.healthspan_levers enable row level security;

create policy "Users manage own healthspan checkins"
  on public.healthspan_checkins for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own healthspan levers"
  on public.healthspan_levers for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.healthspan_checkins to authenticated;
grant select, insert, update, delete on public.healthspan_levers to authenticated;
