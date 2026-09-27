-- SEC Form 4 research data with importer provenance and private watchlists.

CREATE TABLE public.investment_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'us',
  issuer_cik TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT investment_watchlist_market_check CHECK (market = 'us'),
  CONSTRAINT investment_watchlist_ticker_check CHECK (ticker = upper(ticker)),
  CONSTRAINT investment_watchlist_user_market_ticker_key UNIQUE (user_id, market, ticker)
);

CREATE TABLE public.investment_source_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  as_of TIMESTAMPTZ,
  documents_imported INTEGER NOT NULL DEFAULT 0,
  transactions_imported INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  CONSTRAINT investment_source_runs_source_check CHECK (source = 'sec_form4'),
  CONSTRAINT investment_source_runs_status_check CHECK (status IN ('running', 'succeeded', 'failed')),
  CONSTRAINT investment_source_runs_document_count_check CHECK (documents_imported >= 0),
  CONSTRAINT investment_source_runs_transaction_count_check CHECK (transactions_imported >= 0),
  CONSTRAINT investment_source_runs_finished_check CHECK (
    (status = 'running' AND completed_at IS NULL)
    OR (status IN ('succeeded', 'failed') AND completed_at IS NOT NULL)
  )
);

CREATE TABLE public.investment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  document_type TEXT NOT NULL,
  accession_number TEXT NOT NULL,
  issuer_cik TEXT NOT NULL,
  issuer_ticker TEXT,
  filed_at DATE NOT NULL,
  available_at TIMESTAMPTZ NOT NULL,
  source_url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  raw_payload TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT investment_documents_source_check CHECK (source = 'sec_form4'),
  CONSTRAINT investment_documents_type_check CHECK (document_type = '4'),
  CONSTRAINT investment_documents_source_accession_key UNIQUE (source, accession_number)
);

CREATE TABLE public.investment_form4_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.investment_documents(id) ON DELETE CASCADE,
  row_key TEXT NOT NULL,
  issuer_cik TEXT NOT NULL,
  issuer_ticker TEXT,
  insider_name TEXT NOT NULL,
  insider_cik TEXT,
  transaction_code TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  shares NUMERIC,
  price_per_share NUMERIC,
  shares_owned_following NUMERIC,
  ownership_nature TEXT,
  security_type TEXT NOT NULL DEFAULT 'non_derivative',
  is_derivative BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT investment_form4_transactions_code_check CHECK (transaction_code IN ('P', 'S')),
  CONSTRAINT investment_form4_transactions_security_check CHECK (
    (security_type = 'non_derivative' AND is_derivative = false)
    OR (security_type = 'derivative' AND is_derivative = true)
  ),
  CONSTRAINT investment_form4_transactions_shares_check CHECK (shares IS NULL OR shares >= 0),
  CONSTRAINT investment_form4_transactions_price_check CHECK (price_per_share IS NULL OR price_per_share >= 0),
  CONSTRAINT investment_form4_transactions_document_row_key UNIQUE (document_id, row_key)
);

CREATE INDEX investment_watchlist_active_user_idx
  ON public.investment_watchlist (user_id, market, ticker)
  WHERE is_active = true;
CREATE INDEX investment_source_runs_user_source_completed_idx
  ON public.investment_source_runs (user_id, source, completed_at DESC);
CREATE INDEX investment_documents_issuer_filed_idx
  ON public.investment_documents (issuer_ticker, filed_at DESC);
CREATE INDEX investment_form4_transactions_issuer_date_idx
  ON public.investment_form4_transactions (issuer_ticker, transaction_date DESC);
CREATE INDEX investment_form4_transactions_document_idx
  ON public.investment_form4_transactions (document_id);

ALTER TABLE public.investment_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_source_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_form4_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.investment_watchlist FROM anon, authenticated;
REVOKE ALL ON TABLE public.investment_source_runs FROM anon, authenticated;
REVOKE ALL ON TABLE public.investment_documents FROM anon, authenticated;
REVOKE ALL ON TABLE public.investment_form4_transactions FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.investment_watchlist TO authenticated;
GRANT SELECT ON TABLE public.investment_source_runs TO authenticated;
GRANT SELECT ON TABLE public.investment_documents TO authenticated;
GRANT SELECT ON TABLE public.investment_form4_transactions TO authenticated;
GRANT ALL ON TABLE public.investment_watchlist TO service_role;
GRANT ALL ON TABLE public.investment_source_runs TO service_role;
GRANT ALL ON TABLE public.investment_documents TO service_role;
GRANT ALL ON TABLE public.investment_form4_transactions TO service_role;

CREATE POLICY "Users can read their investment watchlist"
  ON public.investment_watchlist FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can add their investment watchlist entries"
  ON public.investment_watchlist FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their investment watchlist entries"
  ON public.investment_watchlist FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their investment watchlist entries"
  ON public.investment_watchlist FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can read their own investment source runs"
  ON public.investment_source_runs FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Authenticated users can read SEC Form 4 documents"
  ON public.investment_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read SEC Form 4 transactions"
  ON public.investment_form4_transactions FOR SELECT TO authenticated
  USING (true);
