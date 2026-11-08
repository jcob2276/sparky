-- Jeden wspólny kształt przeglądu: stan ciała/ducha/konta (1-10) i jeden cel na filar.
-- Tydzień ma to już w weekly_reviews (pillar_scores, week_goal_*). Miesiąc (4 tygodnie)
-- i sprint (12 tygodni) dostają te same pola, żeby wszystkie trzy przeglądy wyglądały tak samo.

alter table public.monthly_reviews
  add column if not exists pillar_scores jsonb,
  add column if not exists goal_cialo text,
  add column if not exists goal_duch text,
  add column if not exists goal_konto text;

alter table public.sprint_reviews
  add column if not exists pillar_scores jsonb;

alter table public.sprint_goals
  add column if not exists goal_cialo text,
  add column if not exists goal_duch text,
  add column if not exists goal_konto text;

comment on column public.monthly_reviews.goal_cialo is 'Cel ciała na kolejne 4 tygodnie (jedna rzecz).';
comment on column public.monthly_reviews.goal_duch is 'Cel ducha na kolejne 4 tygodnie (jedna rzecz).';
comment on column public.monthly_reviews.goal_konto is 'Cel konta na kolejne 4 tygodnie (jedna rzecz).';
comment on column public.sprint_goals.goal_cialo is 'Cel ciała na cały sprint 12 tygodni (jedna rzecz).';
comment on column public.sprint_goals.goal_duch is 'Cel ducha na cały sprint 12 tygodni (jedna rzecz).';
comment on column public.sprint_goals.goal_konto is 'Cel konta na cały sprint 12 tygodni (jedna rzecz).';
