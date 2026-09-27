-- Migration: Core Investment Tables for 100% Self-Contained Sparky Investment Hub
-- Replaces any external dependency with native Supabase tables and storage.

-- 1. Investors (13F Superinvestors)
CREATE TABLE IF NOT EXISTS public.investors (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  display_name TEXT NOT NULL,
  fund_name TEXT,
  cik TEXT,
  description TEXT,
  bio_md TEXT,
  category TEXT,
  tier TEXT DEFAULT 'free',
  curve_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  inception_date DATE,
  consensus_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Politicians (US Congress & Senate STOCK Act)
CREATE TABLE IF NOT EXISTS public.politicians (
  id TEXT PRIMARY KEY,
  slug TEXT,
  display_name TEXT NOT NULL,
  chamber TEXT,
  party TEXT,
  state TEXT,
  bioguide_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. STOCK Act Trades
CREATE TABLE IF NOT EXISTS public.stock_act_trades (
  id TEXT PRIMARY KEY,
  politician_id TEXT REFERENCES public.politicians(id) ON DELETE SET NULL,
  ticker TEXT,
  asset_description TEXT,
  transaction_date DATE,
  disclosure_date DATE,
  transaction_type TEXT,
  amount_low NUMERIC,
  amount_high NUMERIC,
  source TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. GPW Companies
CREATE TABLE IF NOT EXISTS public.gpw_companies (
  isin TEXT PRIMARY KEY,
  ticker TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. GPW Short Positions (KNF Rejestr Krotkiej Sprzedazy)
CREATE TABLE IF NOT EXISTS public.gpw_short_positions (
  id BIGINT PRIMARY KEY,
  holder TEXT NOT NULL,
  company TEXT NOT NULL,
  isin TEXT,
  ticker TEXT,
  position_pct NUMERIC,
  position_pct_raw TEXT,
  below_public_threshold BOOLEAN DEFAULT false,
  position_date DATE,
  modify_date DATE,
  source_url TEXT,
  source_system TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Filings (SEC 13F & Reports)
CREATE TABLE IF NOT EXISTS public.filings (
  id TEXT PRIMARY KEY,
  investor_id TEXT REFERENCES public.investors(id) ON DELETE SET NULL,
  accession_no TEXT,
  period_of_report DATE,
  filing_date DATE,
  filing_url TEXT,
  total_value NUMERIC,
  total_positions INTEGER,
  is_amendment BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Consensus Cache Table (vw_consensus)
CREATE TABLE IF NOT EXISTS public.vw_consensus (
  cusip TEXT,
  ticker TEXT PRIMARY KEY,
  company_name TEXT,
  buyers INTEGER DEFAULT 0,
  sellers INTEGER DEFAULT 0,
  new_positions INTEGER DEFAULT 0,
  holders INTEGER DEFAULT 0,
  net_buyers INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  buyer_names JSONB,
  seller_names JSONB
);

-- 8. Consensus Ticker Cache (vw_consensus_ticker)
CREATE TABLE IF NOT EXISTS public.vw_consensus_ticker (
  ticker TEXT PRIMARY KEY,
  company_name TEXT,
  cusip_count INTEGER DEFAULT 0,
  buyers INTEGER DEFAULT 0,
  sellers INTEGER DEFAULT 0,
  new_positions INTEGER DEFAULT 0,
  holders INTEGER DEFAULT 0,
  net_buyers INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0
);

-- 9. GPW Shorts Aggregated Cache (vw_gpw_shorts_agg)
CREATE TABLE IF NOT EXISTS public.vw_gpw_shorts_agg (
  company TEXT PRIMARY KEY,
  ticker TEXT,
  total_pct NUMERIC,
  public_holders INTEGER,
  below_threshold INTEGER,
  last_change DATE,
  top_holder TEXT,
  top_holder_pct NUMERIC
);

-- 10. GPW Shorts History Cache (vw_gpw_shorts_history)
CREATE TABLE IF NOT EXISTS public.vw_gpw_shorts_history (
  key TEXT PRIMARY KEY,
  isin TEXT,
  company TEXT,
  ticker TEXT,
  position_date DATE,
  total_pct NUMERIC,
  holders INTEGER
);

-- 11. Holdings Changes Cache (vw_holdings_changes)
CREATE TABLE IF NOT EXISTS public.vw_holdings_changes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  investor_id TEXT,
  cusip TEXT,
  ticker TEXT,
  company_name TEXT,
  shares_now NUMERIC,
  shares_prev NUMERIC,
  shares_delta NUMERIC,
  value_now NUMERIC,
  weight_pct NUMERIC,
  change_type TEXT
);

-- 12. Companies directory
CREATE TABLE IF NOT EXISTS public.companies (
  ticker TEXT PRIMARY KEY,
  name TEXT,
  sector TEXT,
  industry TEXT,
  market TEXT DEFAULT 'us',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for blazing fast read queries
CREATE INDEX IF NOT EXISTS idx_stock_act_trades_pol ON public.stock_act_trades(politician_id);
CREATE INDEX IF NOT EXISTS idx_stock_act_trades_disc ON public.stock_act_trades(disclosure_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_act_trades_ticker ON public.stock_act_trades(ticker);
CREATE INDEX IF NOT EXISTS idx_gpw_shorts_ticker ON public.gpw_short_positions(ticker);
CREATE INDEX IF NOT EXISTS idx_gpw_shorts_company ON public.gpw_short_positions(company);
CREATE INDEX IF NOT EXISTS idx_gpw_shorts_date ON public.gpw_short_positions(position_date DESC);
CREATE INDEX IF NOT EXISTS idx_filings_investor ON public.filings(investor_id);
CREATE INDEX IF NOT EXISTS idx_holdings_changes_investor ON public.vw_holdings_changes(investor_id);
CREATE INDEX IF NOT EXISTS idx_holdings_changes_ticker ON public.vw_holdings_changes(ticker);

-- Enable Row Level Security (RLS)
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_act_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpw_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpw_short_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_consensus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_consensus_ticker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_gpw_shorts_agg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_gpw_shorts_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_holdings_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Read policies for public / authenticated app access
DO $$ 
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'investors', 'politicians', 'stock_act_trades', 'gpw_companies',
    'gpw_short_positions', 'filings', 'vw_consensus', 'vw_consensus_ticker',
    'vw_gpw_shorts_agg', 'vw_gpw_shorts_history', 'vw_holdings_changes', 'companies'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_read_policy" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "%s_read_policy" ON public.%I FOR SELECT USING (true);', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "%s_service_policy" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "%s_service_policy" ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'');', t, t);
    
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated, service_role;', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role;', t);
  END LOOP;
END $$;
