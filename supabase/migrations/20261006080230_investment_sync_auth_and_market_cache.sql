-- Keep the working Vault authorization and remove the conflicting publishable key.
DO $migration$
DECLARE job_row record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'vanguard_cron_service_role_key' AND length(decrypted_secret) > 0) THEN
    RAISE EXCEPTION 'Missing investment cron authorization in Vault';
  END IF;
  FOR job_row IN SELECT jobid, command FROM cron.job
    WHERE jobname IN ('sync-market-quotes', 'sync-knf-shorts', 'sync-senate-trades', 'sync-insider-trades')
  LOOP
    PERFORM cron.alter_job(job_row.jobid, command := regexp_replace(job_row.command,
      $pattern$'apikey'\s*,\s*'sb_publishable_[^']+'\s*,$pattern$, '', 'g'));
  END LOOP;
END;
$migration$;

-- Raw and adjusted prices have different uses: current prices vs total-return history.
ALTER TABLE public.prices_daily
  ADD COLUMN IF NOT EXISTS close_raw numeric,
  ADD COLUMN IF NOT EXISTS open numeric,
  ADD COLUMN IF NOT EXISTS high numeric,
  ADD COLUMN IF NOT EXISTS low numeric,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS quote_asof timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.market_quotes (
  symbol text PRIMARY KEY,
  ticker text NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  previous_close numeric CHECK (previous_close > 0),
  currency text NOT NULL,
  quote_asof timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  source_url text NOT NULL
);
ALTER TABLE public.market_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY market_quotes_read ON public.market_quotes FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.market_quotes TO anon, authenticated;
GRANT ALL ON public.market_quotes TO service_role;

COMMENT ON COLUMN public.market_quotes.quote_asof IS 'Provider timestamp of the actual quote, distinct from fetched_at';
