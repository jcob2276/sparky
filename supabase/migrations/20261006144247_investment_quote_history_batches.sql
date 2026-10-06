-- Reuse the shared quote importer; rotate the SEC-covered US listings explicitly.
SELECT cron.schedule('sync-us-market-quotes','*/5 6-20 * * 1-5',$request$
  WITH universe AS (
    SELECT DISTINCT ticker FROM public.vw_sec13f_screener
    WHERE ticker ~ '^[A-Z0-9][A-Z0-9./-]{0,20}$'
  ), numbered AS (
    SELECT ticker,row_number() OVER(ORDER BY ticker) AS n,count(*) OVER() AS total FROM universe
  ), batch AS (
    SELECT ticker FROM numbered
    WHERE floor((n-1)/20.0)=mod(floor(extract(epoch FROM now())/300),greatest(ceil(total/20.0),1))
  ), requested AS (
    SELECT ticker || '.US' AS symbol FROM batch
    UNION SELECT unnest(array['MRVL.US','NVDA.US','NBIS.US','BE.US','AMZN.US','VST.US'])
  )
  SELECT net.http_post(
    url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=quotes',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vanguard_cron_service_role_key' LIMIT 1)),
    body := jsonb_build_object('persist',true,
      'range','5d',
      'tickers',(SELECT jsonb_agg(symbol ORDER BY symbol) FROM requested)),
    timeout_milliseconds := 60000
  ) WHERE EXISTS(SELECT 1 FROM batch);
$request$);


SELECT cron.schedule('sync-us-price-history','*/2 * * * *',$request$
  WITH universe AS (
    SELECT DISTINCT ticker,replace(replace(ticker,'/','-'),'.','-') AS symbol
    FROM public.vw_sec13f_screener WHERE ticker ~ '^[A-Z0-9][A-Z0-9./-]{0,20}$'
  ), numbered AS (
    SELECT *,row_number() OVER(ORDER BY ticker) AS n,count(*) OVER() AS total FROM universe
  ), batch AS (
    SELECT ticker FROM numbered u
    WHERE floor((n-1)/3.0)=mod(floor(extract(epoch FROM now())/120),greatest(ceil(total/3.0),1))
      AND NOT EXISTS(SELECT 1 FROM public.prices_daily p
        WHERE p.ticker=u.symbol AND p.date <= current_date-375
          AND p.close_raw>0 AND p.currency IS NOT NULL AND p.source_url IS NOT NULL)
  )
  SELECT net.http_post(
    url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=quotes',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vanguard_cron_service_role_key' LIMIT 1)),
    body := jsonb_build_object('persist',true,'range','2y',
      'tickers',(SELECT jsonb_agg(ticker || '.US' ORDER BY ticker) FROM batch)),
    timeout_milliseconds := 60000
  ) WHERE EXISTS(SELECT 1 FROM batch);
$request$);
