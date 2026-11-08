-- Fakty jednego tygodnia (pon-nd, czas Warszawy) z realnych tabel: jedno źródło dla paska pokrycia i raportu tygodnia.
-- Funkcja działa z uprawnieniami wywołującego, więc RLS i filtr user_id pilnują, że widać tylko własne dane.
-- Czego brakuje, zwraca jako null albo 0, nigdy nie zgaduje; aplikacja pokazuje to jako lukę, nie jako sukces.

create or replace function public.week_facts(p_user uuid, p_week_start date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select p_week_start as d0,
           p_week_start + 6 as d6,
           least(p_week_start + 6, (now() at time zone 'Europe/Warsaw')::date) as last_day
  ),
  own as (
    select (s.timestamp at time zone 'Europe/Warsaw')::date as d,
           coalesce(array_length(regexp_split_to_array(btrim(s.content), '\s+'), 1), 0) as words
      from public.vanguard_stream s, bounds b
     where s.user_id = p_user
       and s.origin = 'user'
       and s.classification is distinct from 'redundant'
       and (s.timestamp at time zone 'Europe/Warsaw')::date between b.d0 and b.d6
  ),
  wins as (
    select w.result, t.done
      from public.daily_wins w
      left join public.daily_win_tasks t on t.day_win_id = w.id
      join bounds b on w.date between b.d0 and b.d6
     where w.user_id = p_user
  ),
  sessions as (
    select ws.workout_day
      from public.workout_sessions ws, bounds b
     where ws.user_id = p_user and ws.date between b.d0 and b.d6
  ),
  oura as (
    select o.total_sleep_hours, o.readiness_score
      from public.oura_daily_summary o, bounds b
     where o.user_id = p_user and o.date between b.d0 and b.d6
  ),
  spend as (
    select -bt.amount as amount
      from public.bank_transactions bt, bounds b
     where bt.user_id = p_user and bt.direction = 'debit'
       and bt.booking_date between b.d0 and b.d6
       and bt.category not in ('przelewy_wlasne', 'inwestycje')
  ),
  review as (
    select r.review_completed_at, r.proud_of, r.sabotage, r.do_differently
      from public.weekly_reviews r
     where r.user_id = p_user and r.week_start = p_week_start
  )
  select jsonb_build_object(
    'week_start', p_week_start,
    'days_elapsed', (select last_day - d0 + 1 from bounds),
    'own_entry_days', (select count(distinct d) from own),
    'own_words', (select coalesce(sum(words), 0) from own),
    'days_closed', (select count(*) from public.daily_wins w, bounds b where w.user_id = p_user and w.date between b.d0 and b.d6 and w.result is not null),
    'wins_z', (select count(*) from public.daily_wins w, bounds b where w.user_id = p_user and w.date between b.d0 and b.d6 and w.result = 'Z'),
    'wins_p', (select count(*) from public.daily_wins w, bounds b where w.user_id = p_user and w.date between b.d0 and b.d6 and w.result = 'P'),
    'tasks_planned', (select count(done) from wins),
    'tasks_done', (select count(*) from wins where done),
    'workouts', (select count(*) from sessions where workout_day not ilike 'sauna%'),
    'saunas', (select count(*) from sessions where workout_day ilike 'sauna%'),
    'sleep_nights', (select count(total_sleep_hours) from oura),
    'sleep_avg_h', (select round(avg(total_sleep_hours)::numeric, 2) from oura),
    'readiness_avg', (select round(avg(readiness_score)::numeric, 1) from oura),
    'spend_pln', (select round(coalesce(sum(amount), 0)::numeric, 2) from spend),
    'spend_tx', (select count(*) from spend),
    'review_done', (select coalesce(bool_or(review_completed_at is not null), false) from review),
    'review_answers', (select coalesce(bool_or(coalesce(btrim(proud_of), '') <> '' or coalesce(btrim(sabotage), '') <> '' or coalesce(btrim(do_differently), '') <> ''), false) from review)
  )
$$;

revoke all on function public.week_facts(uuid, date) from public;
grant execute on function public.week_facts(uuid, date) to authenticated, service_role;
