BEGIN ISOLATION LEVEL REPEATABLE READ;
DO $test$
DECLARE differences integer;
BEGIN
  WITH h AS (
    SELECT ticker,count(DISTINCT investor_id)::integer AS holders,sum(value_usd) AS total_value,
      jsonb_path_query_array(jsonb_agg(source_urls),'$[*][*]') AS urls FROM vw_sec13f_current_holdings GROUP BY ticker
  ), c AS (
    SELECT ticker,count(DISTINCT investor_id)::integer AS compared_funds,
      count(*) FILTER(WHERE shares_delta>0)::integer AS increases,
      count(*) FILTER(WHERE shares_delta<0)::integer AS decreases,
      jsonb_path_query_array(jsonb_agg(source_urls),'$[*][*]') AS urls
    FROM vw_sec13f_verified_changes GROUP BY ticker
  ), expected AS (
    SELECT coalesce(h.ticker,c.ticker) AS ticker,coalesce(h.holders,0) AS holders,
      coalesce(h.total_value,0) AS total_value,coalesce(c.compared_funds,0) AS compared_funds,
      CASE WHEN c.compared_funds>0 THEN c.increases END AS reported_increases,
      CASE WHEN c.compared_funds>0 THEN c.decreases END AS reported_decreases,
      CASE WHEN c.compared_funds>0 THEN c.increases-c.decreases END AS net_changes,
      ARRAY(SELECT DISTINCT u FROM jsonb_array_elements_text(coalesce(h.urls,'[]')||coalesce(c.urls,'[]')) u ORDER BY u) AS sources
    FROM h FULL JOIN c USING(ticker)
  ), actual AS (
    SELECT ticker,holders,total_value,compared_funds,reported_increases,reported_decreases,net_changes,
      ARRAY(SELECT DISTINCT u FROM jsonb_array_elements_text(source_urls) u ORDER BY u) AS sources
    FROM vw_sec13f_screener
  ), diff AS (
    (SELECT * FROM expected EXCEPT SELECT * FROM actual)
    UNION ALL (SELECT * FROM actual EXCEPT SELECT * FROM expected)
  )
  SELECT count(*) INTO differences FROM diff;
  IF differences<>0 THEN RAISE EXCEPTION 'Screener differs from sourced holdings and comparisons: %',differences; END IF;
END;$test$;
ROLLBACK;
SELECT 'Passed: all screener holder counts, values, changes and source URLs match the independent verified views' AS result;
