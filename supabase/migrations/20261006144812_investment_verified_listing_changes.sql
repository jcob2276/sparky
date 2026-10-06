-- Same securities and unchanged CUSIPs, verified in issuer/SEC announcements.
-- ECHO: https://ir.echostar.com/news-releases/news-release-details/echostar-changing-stocker-ticker-sats-echo-marking-companys-next
-- PPLI: https://www.sec.gov/Archives/edgar/data/1800227/000110465926070364/tm2616766d1_ex99-1.htm
UPDATE public.vw_consensus SET ticker='ECHO' WHERE ticker='SATS' AND cusip='278768106';
UPDATE public.vw_consensus SET ticker='PPLI',company_name='People Incorporated' WHERE ticker='IAC' AND cusip='44891N208';

ALTER TABLE public.companies
  ADD COLUMN listing_status text NOT NULL DEFAULT 'unknown' CHECK(listing_status IN ('unknown','active','delisted')),
  ADD COLUMN listing_status_date date,
  ADD COLUMN listing_source_url text;

INSERT INTO public.companies(ticker,name,market,listing_status,listing_status_date,listing_source_url) VALUES
  ('ECHO','EchoStar Corporation','us','active','2026-06-24','https://ir.echostar.com/news-releases/news-release-details/echostar-changing-stocker-ticker-sats-echo-marking-companys-next'),
  ('PPLI','People Incorporated','us','active','2026-06-04','https://www.sec.gov/Archives/edgar/data/1800227/000110465926070364/tm2616766d1_ex99-1.htm'),
  ('JHG','Janus Henderson Group','us','delisted','2026-06-30','https://www.janushenderson.com/corporate/press-releases/janus-henderson-completes-take-private-transaction-with-trian-general-catalyst-and-qia/'),
  ('KW','Kennedy-Wilson Holdings','us','delisted','2026-06-16','https://www.kennedywilson.com/node/1083')
ON CONFLICT(ticker) DO UPDATE SET listing_status=excluded.listing_status,
  listing_status_date=excluded.listing_status_date,listing_source_url=excluded.listing_source_url;

DO $jobs$
DECLARE job record;
BEGIN
  FOR job IN SELECT jobid,command FROM cron.job WHERE jobname IN ('sync-us-market-quotes','sync-us-price-history') LOOP
    PERFORM cron.alter_job(job.jobid,command:=replace(job.command,'WHERE ticker ~',
      'WHERE NOT EXISTS(SELECT 1 FROM public.companies c WHERE c.ticker=vw_sec13f_screener.ticker AND c.listing_status=''delisted'') AND ticker ~'));
  END LOOP;
END;$jobs$;
