-- Usunięcie modułu Inwestycje (13F, Kongres, GPW, KNF, insiderzy).
-- Kopia kodu i danych (JSONL): Desktop/Sparky-Inwestycje. Przywrócenie = migracje z tamtej kopii + import danych.

-- 1. Crony modułu
do $$
declare j text;
begin
  foreach j in array array[
    'sync-knf-shorts','sync-market-quotes','sync-senate-trades','sync-insider-trades',
    'sync-gpw-fundamentals','sync-house-disclosures','sync-sec13f-positions','sync-sec13f-discovery',
    'sync-us-market-quotes','sync-us-price-history','sync-sec-us-catalogue'
  ] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;

-- 2. Widoki
drop view if exists
  public.gpw_company_annual_reports, public.gpw_latest_annual_reports, public.vw_gpw_price_summary,
  public.vw_insider_public, public.vw_knf_shorts_baseline_14d, public.vw_sec13f_cached_report_documents,
  public.vw_sec13f_cached_reports, public.vw_sec13f_company_history, public.vw_sec13f_current_holdings,
  public.vw_sec13f_effective_positions, public.vw_sec13f_fund_positions, public.vw_sec13f_fund_reports,
  public.vw_sec13f_report_documents, public.vw_sec13f_screener, public.vw_sec13f_verified_changes,
  public.vw_sec13f_verified_holdings, public.vw_sec13f_verified_reports, public.vw_sec_form4_public,
  public.vw_sec_form4_status cascade;

-- 3. Funkcje (wszystkie przeciążenia)
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname in (
      'replace_house_disclosure','replace_knf_snapshot','replace_sec13f_filing','replace_sec13f_positions',
      'replace_sec13f_positions_with_summary','replace_senate_disclosure','replace_us_security_catalogue',
      'sec13f_amendment_counts','seed_us_report_import_coverage')
  loop
    execute 'drop function if exists ' || f.sig || ' cascade';
  end loop;
end $$;

-- 4. Tabele
drop table if exists
  public.sec13f_positions, public.filings, public.investors,
  public.stock_act_trades, public.politicians, public.house_disclosures, public.senate_disclosures,
  public.insider_trades, public.sec_form4_filings,
  public.gpw_financial_reports, public.gpw_report_import_coverage, public.gpw_fin_public_teaser, public.gpw_companies,
  public.knf_short_snapshots, public.knf_current_positions, public.knf_disclosed_positions,
  public.vw_gpw_insider_public, public.vw_gpw_shorts_agg, public.vw_gpw_shorts_history, public.vw_holdings_changes,
  public.us_financial_reports, public.us_security_catalogue, public.prices_daily, public.market_quotes,
  public.investment_source_status cascade;
