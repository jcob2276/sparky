-- Rozliczenie celów w przeglądzie: przy zamknięciu okresu oceniasz cele, z którymi w niego wchodziłeś
-- (dowiezione / częściowo / spalone). Zapis leży na wierszu zamykanego okresu, obok jego ocen filarów.
-- Kształt: {"cialo": "done" | "partial" | "missed", "duch": ..., "konto": ...}; brak klucza = nie rozliczono.

create or replace function public.is_review_goal_status(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null
    or (
      jsonb_typeof(value) = 'object'
      and not exists (
        select 1
        from jsonb_each(value) as entry(pillar, status)
        where entry.pillar not in ('cialo', 'duch', 'konto')
          or entry.status not in ('"done"'::jsonb, '"partial"'::jsonb, '"missed"'::jsonb)
      )
    );
$$;

comment on function public.is_review_goal_status(jsonb) is
  'Walidacja goal_status przeglądów: obiekt pillar -> done|partial|missed.';

alter table public.weekly_reviews
  add column if not exists goal_status jsonb,
  add constraint weekly_reviews_goal_status_check check (public.is_review_goal_status(goal_status));

alter table public.monthly_reviews
  add column if not exists goal_status jsonb,
  add constraint monthly_reviews_goal_status_check check (public.is_review_goal_status(goal_status));

alter table public.sprint_reviews
  add column if not exists goal_status jsonb,
  add constraint sprint_reviews_goal_status_check check (public.is_review_goal_status(goal_status));

comment on column public.weekly_reviews.goal_status is
  'Rozliczenie celów tygodnia (week_goal_*) przy jego zamknięciu: pillar -> done|partial|missed.';
comment on column public.monthly_reviews.goal_status is
  'Rozliczenie celów, z którymi wchodziłeś w ten blok 4 tygodni: pillar -> done|partial|missed.';
comment on column public.sprint_reviews.goal_status is
  'Rozliczenie celów sprintu przy jego zamknięciu: pillar -> done|partial|missed.';
