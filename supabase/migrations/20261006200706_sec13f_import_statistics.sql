-- Historical 13F batches rapidly change both row counts and parsed-status distribution.
-- Refresh planner statistics earlier so anonymous screener reads keep their 3s limit.
ALTER TABLE public.filings SET (autovacuum_analyze_scale_factor=0.01, autovacuum_analyze_threshold=50);
ALTER TABLE public.sec13f_positions SET (autovacuum_analyze_scale_factor=0.01, autovacuum_analyze_threshold=500);
ANALYZE public.filings;
ANALYZE public.sec13f_positions;
