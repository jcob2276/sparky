-- Keep the existing importer and authorization; rotate the complete covered GPW universe.
do $rotation$
declare quote_job bigint;
begin
  select jobid into quote_job from cron.job where jobname = 'sync-market-quotes';
  if quote_job is null then raise exception 'Missing sync-market-quotes schedule'; end if;
  perform cron.alter_job(quote_job, command := $request$
    with universe as (
      select distinct ticker || '.WA' as symbol from gpw_fin_public_teaser
      where ticker ~ '^[A-Z0-9][A-Z0-9.-]{0,20}$'
    ), numbered as (
      select symbol, row_number() over(order by symbol) as n, count(*) over() as total
      from universe
    ), batch as (
      select symbol from numbered
      where floor((n - 1) / 20.0) = mod(floor(extract(epoch from now()) / 900), greatest(ceil(total / 20.0), 1))
    ), requested as (
      select symbol from batch
      union select unnest(array['MRVL','JEDI.DE','SXR8.DE','NVDA','NBIS','BE','AMZN','VST','CSPX.L'])
    )
    select net.http_post(
      url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=quotes',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name='vanguard_cron_service_role_key' limit 1)),
      body := jsonb_build_object('persist',true,
        'range',case when exists(select 1 from batch b where not exists
          (select 1 from market_quotes q where q.symbol=b.symbol)) then '3mo' else '5d' end,
        'tickers',(select jsonb_agg(symbol order by symbol) from requested)),
      timeout_milliseconds := 60000
    );
  $request$);
end;
$rotation$;

-- Recover listing identity from recorded provenance, never guess it from bare tickers.
update prices_daily p set ticker = substring(p.source_url from '/chart/([^?]+)')
where p.source='yahoo_chart' and p.source_url ~ '/chart/[A-Z0-9.-]+\.(WA|DE|L|AS)\?'
  and p.ticker <> substring(p.source_url from '/chart/([^?]+)')
  and not exists(select 1 from prices_daily canonical
    where canonical.ticker=substring(p.source_url from '/chart/([^?]+)') and canonical.date=p.date);
