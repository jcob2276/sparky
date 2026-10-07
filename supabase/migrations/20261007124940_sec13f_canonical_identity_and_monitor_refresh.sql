LOCK TABLE public.filings IN SHARE ROW EXCLUSIVE MODE;
DELETE FROM public.filings legacy
WHERE legacy.positions_status='error' AND legacy.filing_url IS NULL
  AND NOT EXISTS(SELECT 1 FROM public.sec13f_positions p WHERE p.filing_id=legacy.id)
  AND EXISTS(
    SELECT 1 FROM public.filings canonical
    WHERE canonical.investor_id=legacy.investor_id AND canonical.id<>legacy.id
      AND canonical.accession_no=replace(legacy.accession_no,'-','')
      AND canonical.period_of_report=legacy.period_of_report
      AND canonical.filing_date=legacy.filing_date
      AND canonical.is_amendment=legacy.is_amendment
      AND canonical.positions_status='parsed' AND canonical.verified_entry_count IS NOT NULL
      AND canonical.filing_url ~ '^https://www\.sec\.gov/Archives/edgar/data/[0-9]+/[0-9]{18}/$'
  );
UPDATE public.filings SET accession_no=replace(accession_no,'-','') WHERE accession_no LIKE '%-%';
ALTER TABLE public.filings ADD CONSTRAINT filings_canonical_accession CHECK(accession_no IS NULL OR accession_no ~ '^[0-9]{18}$');
CREATE UNIQUE INDEX filings_investor_accession_identity ON public.filings(investor_id,accession_no)
  WHERE investor_id IS NOT NULL AND accession_no IS NOT NULL;
SELECT cron.schedule('sync-sec13f-positions','*/5 * * * *',$job$
  SELECT net.http_post(
    url := 'https://pdvqkgfsqziqlhptatgf.supabase.co/functions/v1/sync?service=sec_13f',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vanguard_cron_service_role_key' LIMIT 1
    )),body := '{"limit":10}'::jsonb,timeout_milliseconds := 90000
  );
$job$);
