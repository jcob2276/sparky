-- Migration: Create insider_trades table for US Congress, Senate and insider trading tracking
CREATE TABLE IF NOT EXISTS public.insider_trades (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  filer_id TEXT,
  filer_name TEXT NOT NULL,
  branch TEXT,
  chamber TEXT,
  party TEXT,
  state TEXT,
  ticker TEXT,
  asset_name TEXT,
  asset_type TEXT,
  transaction_type TEXT NOT NULL,
  amount_low NUMERIC,
  amount_high NUMERIC,
  amount_label TEXT,
  transaction_date DATE,
  filing_date DATE,
  days_to_file INTEGER,
  doc_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_insider_trades_filing_date ON public.insider_trades(filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_trades_filer_name ON public.insider_trades(filer_name);
CREATE INDEX IF NOT EXISTS idx_insider_trades_ticker ON public.insider_trades(ticker);
CREATE INDEX IF NOT EXISTS idx_insider_trades_amount_high ON public.insider_trades(amount_high DESC);
CREATE INDEX IF NOT EXISTS idx_insider_trades_transaction_type ON public.insider_trades(transaction_type);

-- Enable RLS
ALTER TABLE public.insider_trades ENABLE ROW LEVEL SECURITY;

-- Read policy for all authenticated and service role (and anon for readonly dashboard/bot)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'insider_trades' AND policyname = 'insider_trades_read_all'
  ) THEN
    CREATE POLICY "insider_trades_read_all" ON public.insider_trades
      FOR SELECT USING (true);
  END IF;
END $$;

-- Write policy for service_role
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'insider_trades' AND policyname = 'insider_trades_service_role'
  ) THEN
    CREATE POLICY "insider_trades_service_role" ON public.insider_trades
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

GRANT SELECT ON TABLE public.insider_trades TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.insider_trades TO service_role;
