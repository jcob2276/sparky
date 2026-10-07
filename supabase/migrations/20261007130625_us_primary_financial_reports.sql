CREATE TABLE public.us_financial_reports (
  cik bigint NOT NULL CHECK (cik BETWEEN 1 AND 9999999999),
  accession text NOT NULL CHECK (accession ~ '^[0-9]{10}-[0-9]{2}-[0-9]{6}$'),
  form_type text NOT NULL CHECK (form_type IN ('10-K','10-K/A','10-Q','10-Q/A','20-F','20-F/A','40-F','40-F/A')),
  period_start date NOT NULL,
  period_end date NOT NULL CHECK (period_end >= '2024-01-01'),
  publication_date date NOT NULL,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics)='object' AND pg_column_size(metrics)<4000),
  source_url text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(cik,accession),
  CHECK (period_end-period_start BETWEEN 60 AND 400),
  CHECK (publication_date >= period_end),
  CHECK (source_url LIKE 'https://www.sec.gov/Archives/edgar/data/' || cik::text || '/' || replace(accession,'-','') || '/%')
);
ALTER TABLE public.us_financial_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.us_financial_reports FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.us_financial_reports TO anon,authenticated;
GRANT ALL ON public.us_financial_reports TO service_role;
CREATE POLICY us_financial_reports_read ON public.us_financial_reports FOR SELECT TO anon,authenticated USING(true);

CREATE TABLE public.us_report_import_coverage (
  cik bigint PRIMARY KEY CHECK (cik BETWEEN 1 AND 9999999999),
  checked_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','complete','unavailable','error')),
  error text CHECK(length(error)<=2000),
  report_count integer NOT NULL DEFAULT 0 CHECK(report_count>=0)
);
ALTER TABLE public.us_report_import_coverage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.us_report_import_coverage FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.us_report_import_coverage TO service_role;

CREATE FUNCTION public.seed_us_report_import_coverage() RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$
 INSERT INTO public.us_report_import_coverage(cik)
 SELECT DISTINCT cik::bigint FROM public.us_security_catalogue WHERE cik ~ '^[0-9]{1,10}$' AND cik::bigint>0
 ON CONFLICT(cik) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.seed_us_report_import_coverage() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seed_us_report_import_coverage() TO service_role;
SELECT public.seed_us_report_import_coverage();

CREATE VIEW public.us_company_financial_reports WITH(security_invoker=true) AS
SELECT c.ticker,r.* FROM public.us_security_catalogue c
JOIN public.us_financial_reports r ON r.cik::text=ltrim(c.cik,'0');
REVOKE ALL ON public.us_company_financial_reports FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.us_company_financial_reports TO anon,authenticated,service_role;
