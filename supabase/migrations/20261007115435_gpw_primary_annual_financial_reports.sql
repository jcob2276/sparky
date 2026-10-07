CREATE TABLE public.gpw_financial_reports (
  isin text NOT NULL REFERENCES public.gpw_companies(isin),
  report_period_end date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  publication_date date NOT NULL,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics) = 'object' AND pg_column_size(metrics) < 20000),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  report_page_url text NOT NULL CHECK (report_page_url ~ '^https://'),
  document_member text NOT NULL,
  package_sha256 text NOT NULL CHECK (package_sha256 ~ '^[a-f0-9]{64}$'),
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (isin, report_period_end, period_end),
  CHECK (period_end >= '2024-01-01' AND period_end <= report_period_end),
  CHECK (period_end - period_start BETWEEN 350 AND 380),
  CHECK (publication_date >= report_period_end)
);
ALTER TABLE public.gpw_financial_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_reports_public_read ON public.gpw_financial_reports
FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.gpw_financial_reports TO anon, authenticated;
GRANT ALL ON public.gpw_financial_reports TO service_role;

CREATE VIEW public.gpw_latest_annual_reports WITH (security_invoker = true) AS
SELECT DISTINCT ON (isin) * FROM public.gpw_financial_reports
WHERE period_end = report_period_end
ORDER BY isin, report_period_end DESC, publication_date DESC;
GRANT SELECT ON public.gpw_latest_annual_reports TO anon, authenticated, service_role;
