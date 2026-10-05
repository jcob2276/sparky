-- Persist source inputs so computed forecast ratios can be checked in the UI.
ALTER TABLE public.gpw_fin_public_teaser
  ADD COLUMN IF NOT EXISTS forward_eps NUMERIC,
  ADD COLUMN IF NOT EXISTS forward_pe_basis TEXT CHECK (forward_pe_basis IN ('provider_fy', 'rolling_fy')),
  ADD COLUMN IF NOT EXISTS quote_price NUMERIC,
  ADD COLUMN IF NOT EXISTS quote_currency TEXT,
  ADD COLUMN IF NOT EXISTS financial_currency TEXT,
  ADD COLUMN IF NOT EXISTS fx_date DATE;

COMMENT ON COLUMN public.gpw_fin_public_teaser.forward_eps IS 'TradingView rolling annual analyst EPS consensus, in financial_currency; not achieved earnings';
COMMENT ON COLUMN public.gpw_fin_public_teaser.forward_pe_basis IS 'provider_fy: supplied annual forward PE; rolling_fy: quote price divided by rolling annual EPS consensus, after currency alignment';
COMMENT ON COLUMN public.gpw_fin_public_teaser.quote_price IS 'TradingView latest closing quote used when computing forward PE';
COMMENT ON COLUMN public.gpw_fin_public_teaser.fx_date IS 'Effective date of official NBP table A used for currency alignment or PLN market cap';
