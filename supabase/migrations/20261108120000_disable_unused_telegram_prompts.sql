-- Wylaczenie dwoch codziennych pytan z Telegrama, z ktorych uzytkownik nie korzysta:
--   * wywiad (vanguard-eval-interview), 0 10 * * 1-5 UTC (ok. 12:00 czasu letniego)
--   * wieczorne podsumowanie dnia (recap?type=daily), 30 19 * * * UTC (ok. 21:30 czasu letniego)
-- Zamiast tego uzytkownik nagrywa glosowki wtedy, kiedy chce. Funkcje zostaja, wylaczone jest tylko wywolanie z crona,
-- a komenda /pytanie w Telegramie nadal dziala recznie.
--
-- Przywrocenie (jesli kiedys potrzebne):
--   select cron.schedule('vanguard-eval-interview', '0 10 * * 1-5', $$
--     select net.http_post(url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/vanguard-eval-interview',
--       headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
--         (select decrypted_secret from vault.decrypted_secrets where name = 'vanguard_cron_service_role_key')),
--       body := '{}'::jsonb) $$);
--   select cron.schedule('vanguard-daily-reconciliation', '30 19 * * *', $$
--     select net.http_post(url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/recap?type=daily',
--       headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
--         (select decrypted_secret from vault.decrypted_secrets where name = 'vanguard_cron_service_role_key'))) $$);

do $$
declare
  job_name text;
begin
  foreach job_name in array array['vanguard-eval-interview', 'vanguard-daily-reconciliation'] loop
    if exists (select 1 from cron.job where jobname = job_name) then
      perform cron.unschedule(job_name);
    end if;
  end loop;
end $$;
