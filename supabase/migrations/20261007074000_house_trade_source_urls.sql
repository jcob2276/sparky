-- Recover provenance only for legacy official rows with a unique indexed document URL.
WITH documents AS (
  SELECT doc_id,min(source_url) AS source_url FROM public.house_disclosures
  GROUP BY doc_id HAVING count(DISTINCT source_url)=1
)
UPDATE public.stock_act_trades t SET source_url=d.source_url FROM documents d
WHERE t.source='house_clerk' AND t.source_url IS NULL
  AND t.external_id LIKE ('house-clerk|'||d.doc_id||'|%');
