alter table public.healthspan_snapshots
  add column if not exists methodology_version text,
  add column if not exists coverage numeric,
  add column if not exists evidence_summary jsonb not null default '{}'::jsonb;

update public.healthspan_snapshots
set
  methodology_version = coalesce(methodology_version, model_version),
  coverage = coalesce(coverage, (profile #>> '{confidence,coverage}')::numeric)
where methodology_version is null or coverage is null;

create index if not exists healthspan_snapshots_user_model_date_idx
  on public.healthspan_snapshots (user_id, model_version, snapshot_date desc);

comment on column public.healthspan_snapshots.methodology_version is
  'Version of the transparent contributor methodology used for this immutable snapshot.';
comment on column public.healthspan_snapshots.coverage is
  'Percent of configured contributor weight covered by usable evidence.';
comment on column public.healthspan_snapshots.evidence_summary is
  'Auditable source, sample-count, freshness and quality summary; never raw wearable payloads.';
