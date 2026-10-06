-- Completed corporate actions. Halted is distinct from formal exchange removal.
ALTER TABLE public.companies DROP CONSTRAINT companies_listing_status_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_listing_status_check
  CHECK(listing_status IN ('unknown','active','delisted','halted'));

INSERT INTO public.companies(ticker,name,market,listing_status,listing_status_date,listing_source_url) VALUES
 ('ORLA','Orla Mining','us','delisted','2026-08-11','https://www.sec.gov/Archives/edgar/data/1143313/000114331326000045/ruleprovisionnotice.htm'),
 ('EA','Electronic Arts','us','halted','2026-08-04','https://www.ea.com/amp/news/ea-announces-completion-of-acquisition'),
 ('QRVO','Qorvo','us','halted','2026-10-05','https://ir.qorvo.com/static-files/97184275-c23b-40b6-8c00-fab7ad1c2258'),
 ('WBD','Warner Bros. Discovery','us','halted','2026-10-05','https://www.nasdaqtrader.com/TraderNews.aspx?id=ECA2026-710')
ON CONFLICT(ticker) DO UPDATE SET listing_status=excluded.listing_status,
 listing_status_date=excluded.listing_status_date,listing_source_url=excluded.listing_source_url;

DO $jobs$
DECLARE job record;
BEGIN
 FOR job IN SELECT jobid,command FROM cron.job WHERE jobname IN ('sync-us-market-quotes','sync-us-price-history') LOOP
  PERFORM cron.alter_job(job.jobid,command:=replace(job.command,
    'c.listing_status=''delisted''','c.listing_status IN (''delisted'',''halted'')'));
 END LOOP;
END;$jobs$;
