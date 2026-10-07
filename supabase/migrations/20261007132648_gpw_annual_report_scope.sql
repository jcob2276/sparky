ALTER TABLE public.gpw_financial_reports ADD COLUMN reporting_scope text NOT NULL DEFAULT 'consolidated'
CHECK(reporting_scope IN ('consolidated','standalone'));
CREATE OR REPLACE VIEW public.gpw_latest_annual_reports WITH (security_invoker=true) AS
SELECT DISTINCT ON(isin) * FROM public.gpw_financial_reports
WHERE period_end=report_period_end
ORDER BY isin,report_period_end DESC,publication_date DESC;
CREATE OR REPLACE VIEW public.gpw_company_annual_reports WITH(security_invoker=true) AS
SELECT c.ticker,c.name,r.* FROM public.gpw_companies c
JOIN public.gpw_latest_annual_reports r USING(isin);
