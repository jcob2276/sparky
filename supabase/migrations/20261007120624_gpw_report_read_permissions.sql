-- Supabase default privileges can grant DML before an explicit SELECT grant.
-- Public roles may read report evidence only; service-role importer owns writes.
REVOKE ALL ON public.gpw_financial_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.gpw_latest_annual_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.gpw_financial_reports, public.gpw_latest_annual_reports TO anon, authenticated;
