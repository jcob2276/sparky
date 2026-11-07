-- Kolejka zadan w Postgresie (pgmq) dla workera na VPS + gotowe wrappery S3 i Logflare.
-- Nie instalujemy pg_graphql (anon ma USAGE na public, GraphQL ujawnilby strukture bazy).

create extension if not exists pgmq;
create extension if not exists wrappers with schema extensions;

do $$
begin
  if not exists (select 1 from pg_foreign_data_wrapper where fdwname = 's3_wrapper') then
    create foreign data wrapper s3_wrapper
      handler extensions.s3_fdw_handler validator extensions.s3_fdw_validator;
  end if;
  if not exists (select 1 from pg_foreign_data_wrapper where fdwname = 'logflare_wrapper') then
    create foreign data wrapper logflare_wrapper
      handler extensions.logflare_fdw_handler validator extensions.logflare_fdw_validator;
  end if;
end $$;

-- Kolejka robocza. Dostep tylko dla postgres/service_role (RLS wlaczone, bez polityk).
select pgmq.create('sparky_jobs');
alter table pgmq.q_sparky_jobs enable row level security;
alter table pgmq.a_sparky_jobs enable row level security;

revoke all on all tables in schema pgmq from anon, authenticated;
revoke usage on schema pgmq from anon, authenticated;
