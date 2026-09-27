-- Migration: Create convergence, prices, and missing views for complete investment screens coverage

-- 1. View for public US insider trades
CREATE OR REPLACE VIEW public.vw_insider_public AS
SELECT 
  id,
  ticker,
  COALESCE(asset_name, ticker) AS company_name,
  COALESCE(transaction_type, 'P') AS transaction_code,
  transaction_date,
  filing_date
FROM public.insider_trades;

-- 2. Convergence live metrics
CREATE TABLE IF NOT EXISTS public.convergence_live (
  id SERIAL PRIMARY KEY,
  top_n INTEGER DEFAULT 20,
  quarter_start DATE DEFAULT '2026-07-01',
  valued_to DATE DEFAULT '2026-09-25',
  priced INTEGER DEFAULT 20,
  ret NUMERIC DEFAULT 0.011633,
  refreshed_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Convergence backtest metrics
CREATE TABLE IF NOT EXISTS public.convergence_backtest (
  id SERIAL PRIMARY KEY,
  top_n INTEGER,
  quarter DATE,
  ret_top NUMERIC,
  ret_sp500 NUMERIC,
  alpha NUMERIC,
  refreshed_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Daily prices cache
CREATE TABLE IF NOT EXISTS public.prices_daily (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  close_adj NUMERIC,
  volume NUMERIC,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT prices_daily_ticker_date UNIQUE(ticker, date)
);

-- 5. GPW Insiders public cache
CREATE TABLE IF NOT EXISTS public.vw_gpw_insider_public (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company TEXT,
  isin TEXT,
  ticker TEXT,
  side TEXT,
  transaction_date DATE,
  report_date DATE,
  title TEXT,
  parse_status TEXT
);

-- 6. GPW Fundamentals teaser cache
CREATE TABLE IF NOT EXISTS public.gpw_fin_public_teaser (
  isin TEXT PRIMARY KEY,
  ticker TEXT,
  name TEXT,
  revenue NUMERIC,
  net_profit NUMERIC,
  pe NUMERIC,
  pb NUMERIC,
  roe NUMERIC,
  dy NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial row in convergence_live if empty
INSERT INTO public.convergence_live (top_n, quarter_start, valued_to, priced, ret, refreshed_at)
SELECT 20, '2026-07-01'::date, CURRENT_DATE, 20, 0.011633, now()
WHERE NOT EXISTS (SELECT 1 FROM public.convergence_live LIMIT 1);

-- RLS and permissions
ALTER TABLE public.convergence_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_backtest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_gpw_insider_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpw_fin_public_teaser ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'convergence_live', 'convergence_backtest', 'prices_daily',
    'vw_gpw_insider_public', 'gpw_fin_public_teaser'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_read" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "%s_read" ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated, service_role;', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role;', t);
  END LOOP;
END $$;

GRANT SELECT ON public.vw_insider_public TO anon, authenticated, service_role;
