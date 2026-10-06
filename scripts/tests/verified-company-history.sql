BEGIN ISOLATION LEVEL REPEATABLE READ;
DO $test$
DECLARE differences integer;
BEGIN
  WITH expected AS (
    SELECT ticker,period_of_report,count(DISTINCT investor_id)::integer AS reported_holders,
      sum(shares) AS reported_shares,sum(value_usd) AS reported_value_usd,
      max(filing_date) AS latest_filing_date,jsonb_agg(DISTINCT filing_url) AS source_urls
    FROM vw_sec13f_verified_holdings WHERE ticker IN ('AMZN','NVDA') GROUP BY ticker,period_of_report
  ), actual AS (
    SELECT ticker,period_of_report,reported_holders,reported_shares,reported_value_usd,latest_filing_date,source_urls
    FROM vw_sec13f_company_history WHERE ticker IN ('AMZN','NVDA')
  ), differences AS (
    (SELECT * FROM actual EXCEPT SELECT * FROM expected)
    UNION ALL (SELECT * FROM expected EXCEPT SELECT * FROM actual)
  )
  SELECT count(*) INTO differences FROM differences;
  IF differences<>0 THEN RAISE EXCEPTION 'Company history differs from verified source holdings: %',differences; END IF;
END;$test$;
ROLLBACK;
SELECT 'AMZN and NVDA history totals, counts, dates and sources match verified holdings' AS result;
