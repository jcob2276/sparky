CREATE OR REPLACE VIEW public.vw_sec13f_current_holdings WITH (security_invoker=true) AS
WITH snapshot AS MATERIALIZED (SELECT * FROM public.vw_sec13f_verified_holdings),
period AS MATERIALIZED (SELECT max(period_of_report) AS latest FROM public.vw_sec13f_verified_reports)
SELECT s.* FROM snapshot s CROSS JOIN period p WHERE s.period_of_report=p.latest;
