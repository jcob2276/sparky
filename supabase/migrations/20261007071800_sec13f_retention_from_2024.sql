-- User-approved retention: keep 2024 onward; prevent rediscovery from reversing cleanup.
DELETE FROM public.sec13f_positions p USING public.filings f
WHERE p.filing_id=f.id AND f.period_of_report<'2024-01-01';
DELETE FROM public.filings WHERE period_of_report<'2024-01-01';
ALTER TABLE public.filings ADD CONSTRAINT sec13f_retained_period
  CHECK (period_of_report IS NULL OR period_of_report>='2024-01-01');
