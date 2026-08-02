create table public.healthspan_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  model_version text not null,
  profile jsonb not null,
  pace jsonb not null,
  input_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date, model_version)
);

create index healthspan_snapshots_user_date_idx
  on public.healthspan_snapshots (user_id, snapshot_date desc);

alter table public.healthspan_snapshots enable row level security;

create policy "Users can read own healthspan snapshots"
  on public.healthspan_snapshots for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own healthspan snapshots"
  on public.healthspan_snapshots for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own healthspan snapshots"
  on public.healthspan_snapshots for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.healthspan_snapshots to authenticated;
