-- User decision is separate from outcome evaluation:
-- proposed -> accepted/rejected, while status remains pending/evaluated.
alter table public.oracle_recommendations
  add column if not exists decision_status text not null default 'proposed',
  add column if not exists decision_at timestamptz,
  add column if not exists scheduled_for date,
  add column if not exists user_note text;

alter table public.oracle_recommendations
  drop constraint if exists oracle_recommendations_decision_status_check;

alter table public.oracle_recommendations
  add constraint oracle_recommendations_decision_status_check
  check (decision_status in ('proposed', 'accepted', 'rejected'));

create index if not exists idx_oracle_recommendations_decision_queue
  on public.oracle_recommendations (user_id, decision_status, created_at desc)
  where status = 'pending';
