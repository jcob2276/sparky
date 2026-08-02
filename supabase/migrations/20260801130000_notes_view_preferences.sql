begin;

alter table public.user_settings
  add column if not exists notes_view_preferences jsonb not null default '{}'::jsonb;

comment on column public.user_settings.notes_view_preferences is
  'Per-collection Notes view settings keyed by all or folder:<uuid>.';

commit;
