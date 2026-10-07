CREATE VIEW public.gpw_company_annual_reports WITH(security_invoker=true) AS
SELECT c.ticker,c.name,r.* FROM public.gpw_companies c
JOIN public.gpw_latest_annual_reports r USING(isin);
REVOKE ALL ON public.gpw_company_annual_reports FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gpw_company_annual_reports TO anon,authenticated,service_role;
