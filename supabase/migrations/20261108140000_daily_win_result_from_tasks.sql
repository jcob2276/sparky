-- Wynik dnia Z/P wynika z zadań dnia, a nie z jednorazowego zapisu przy domknięciu.
-- Dotąd result ustawiał formularz domknięcia na podstawie swojego stanu w tamtej chwili, więc zadania odhaczone
-- później (zwykle następnego dnia) zostawiały dzień jako P mimo 5/5 slotów. W historii było 11 takich dni.
-- Reguła: dzień jest rozstrzygnięty (result nie jest NULL) -> Z, gdy ma sloty i wszystkie są wykonane, inaczej P.
-- Dzień jeszcze niezamknięty (result NULL) zostaje bez wyniku.

create or replace function public.daily_win_result_for(win_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when count(*) > 0 and count(*) filter (where not coalesce(t.done, false)) = 0 then 'Z'
    else 'P'
  end
  from public.daily_win_tasks t
  where t.day_win_id = win_id
$$;

-- Po zmianie zadania przelicz wynik zamkniętego dnia.
create or replace function public.sync_daily_win_result_from_tasks()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  win uuid := coalesce(new.day_win_id, old.day_win_id);
begin
  update public.daily_wins w
     set result = public.daily_win_result_for(win)
   where w.id = win
     and w.result is not null
     and w.result is distinct from public.daily_win_result_for(win);
  return null;
end;
$$;

drop trigger if exists trg_daily_win_result_from_tasks on public.daily_win_tasks;
create trigger trg_daily_win_result_from_tasks
  after insert or delete or update of done, day_win_id on public.daily_win_tasks
  for each row execute function public.sync_daily_win_result_from_tasks();

-- Gdy formularz domknięcia zapisuje wynik po zadaniach (albo przed nimi), wartość i tak zgadza się z zadaniami.
create or replace function public.align_daily_win_result()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.result is not null then
    new.result := public.daily_win_result_for(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_align_daily_win_result on public.daily_wins;
create trigger trg_align_daily_win_result
  before update of result on public.daily_wins
  for each row execute function public.align_daily_win_result();

-- Korekta historii: tylko dni z rozstrzygniętym wynikiem, które się rozjechały z zadaniami.
update public.daily_wins w
   set result = public.daily_win_result_for(w.id)
 where w.result is not null
   and w.result is distinct from public.daily_win_result_for(w.id);
