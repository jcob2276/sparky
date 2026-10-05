-- Match the read contract and record provenance; missing metrics remain NULL.
ALTER TABLE public.gpw_fin_public_teaser
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS mcap NUMERIC,
  ADD COLUMN IF NOT EXISTS div_yield NUMERIC,
  ADD COLUMN IF NOT EXISTS net_margin NUMERIC,
  ADD COLUMN IF NOT EXISTS revenue_yoy NUMERIC,
  ADD COLUMN IF NOT EXISTS fcf_yield NUMERIC,
  ADD COLUMN IF NOT EXISTS net_debt_ebitda NUMERIC,
  ADD COLUMN IF NOT EXISTS forward_pe NUMERIC,
  ADD COLUMN IF NOT EXISTS quarters8 JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS refreshed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_system TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

COMMENT ON COLUMN public.gpw_fin_public_teaser.mcap IS 'Market capitalization in PLN';
COMMENT ON COLUMN public.gpw_fin_public_teaser.div_yield IS 'Fractional dividend yield; 0.05 means 5 percent';
COMMENT ON COLUMN public.gpw_fin_public_teaser.roe IS 'Fractional ROE; 0.15 means 15 percent';
COMMENT ON COLUMN public.gpw_fin_public_teaser.net_margin IS 'Fractional TTM net margin';
COMMENT ON COLUMN public.gpw_fin_public_teaser.revenue_yoy IS 'Fractional TTM revenue growth year over year';
COMMENT ON COLUMN public.gpw_fin_public_teaser.fcf_yield IS 'TTM free cash flow divided by market capitalization in the same currency';
COMMENT ON COLUMN public.gpw_fin_public_teaser.quarters8 IS 'Up to eight actual quarterly revenues, oldest first; no synthetic history';

-- After the Warsaw market closes, including winter time. Writes require the service role.
SELECT cron.schedule('sync-gpw-fundamentals', '10 16 * * 1-5', $cron$
  SELECT net.http_post(
    url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=gpw_fundamentals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'vanguard_cron_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$cron$);
