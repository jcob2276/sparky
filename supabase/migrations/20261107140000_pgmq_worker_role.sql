-- Rola dla workera na VPS: tylko kolejka sparky_jobs, bez dostepu do reszty bazy.
-- Haslo i LOGIN nadawane poza repo (alter role ... login password ...), tutaj tylko uprawnienia.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sparky_worker') then
    create role sparky_worker nologin;
  end if;
end $$;

grant usage on schema pgmq to sparky_worker;
grant execute on all functions in schema pgmq to sparky_worker;
grant select, insert, update, delete on pgmq.q_sparky_jobs, pgmq.a_sparky_jobs to sparky_worker;
grant usage, select on all sequences in schema pgmq to sparky_worker;
grant select, insert, update, delete on pgmq.meta to sparky_worker;

-- Kolejka ma RLS bez polityk (zamknieta dla anon/authenticated); worker dostaje wlasna polityke.
drop policy if exists sparky_worker_all on pgmq.q_sparky_jobs;
create policy sparky_worker_all on pgmq.q_sparky_jobs for all to sparky_worker using (true) with check (true);
drop policy if exists sparky_worker_all on pgmq.a_sparky_jobs;
create policy sparky_worker_all on pgmq.a_sparky_jobs for all to sparky_worker using (true) with check (true);
