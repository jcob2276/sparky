-- Add reported SEC data without rewriting legacy Congress records.
-- Official evidence must not be replaceable by anonymous browser clients.
drop policy if exists insider_trades_upsert_all on public.insider_trades;
drop policy if exists insider_trades_service_role on public.insider_trades;
revoke insert, update, delete, truncate, references, trigger on public.insider_trades from anon, authenticated;
grant select on public.insider_trades to anon, authenticated;
grant all on public.insider_trades to service_role;
alter table public.insider_trades
  add column if not exists accession text,
  add column if not exists form_type text,
  add column if not exists issuer_cik text,
  add column if not exists insider_title text,
  add column if not exists reporting_owners jsonb,
  add column if not exists security_title text,
  add column if not exists transaction_code text,
  add column if not exists shares numeric,
  add column if not exists price_usd numeric,
  add column if not exists value_usd numeric,
  add column if not exists acquired_disposed text,
  add column if not exists is_derivative boolean,
  add column if not exists ownership_nature text,
  add column if not exists shares_after numeric;
create index if not exists insider_trades_sec_filed_idx on public.insider_trades (filing_date desc) where source_id = 'sec_form4';
create table public.sec_form4_filings (
  accession text primary key,
  filing_date date not null,
  form_type text not null check (form_type in ('4','4/A')),
  submission_url text not null check (submission_url like 'https://www.sec.gov/Archives/edgar/data/%'),
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  attempts integer not null default 0,
  error text,
  transaction_count integer,
  processed_at timestamptz,
  discovered_at timestamptz not null default now()
);
alter table public.sec_form4_filings enable row level security;
revoke all on public.sec_form4_filings from anon, authenticated;
grant select on public.sec_form4_filings to anon, authenticated;
create policy "Public SEC filing provenance" on public.sec_form4_filings for select to anon, authenticated using (true);
grant all on public.sec_form4_filings to service_role;
-- Existing insider_trades policies continue to govern access through this invoker view.
create view public.vw_sec_form4_public with (security_invoker = true) as
 select id, accession, filer_id, filer_name, insider_title, reporting_owners,
 ticker, asset_name as company_name, issuer_cik, security_title, transaction_code,
 transaction_date, filing_date, shares, price_usd, value_usd, acquired_disposed,
 is_derivative, ownership_nature, shares_after, form_type, doc_url, source_id, created_at
 from public.insider_trades where source_id = 'sec_form4' and branch = 'executive';
grant select on public.vw_sec_form4_public to anon, authenticated, service_role;
create view public.vw_sec_form4_status with (security_invoker = true) as
 select count(*) as discovered_filings,
 count(*) filter (where status = 'processed') as processed_filings,
 count(*) filter (where status <> 'processed') as queued_filings,
 count(*) filter (where status = 'failed') as failed_filings,
 max(filing_date) as latest_discovered_filing,
 max(filing_date) filter (where status = 'processed') as latest_processed_filing,
 max(processed_at) as last_processed_at
 from public.sec_form4_filings;
grant select on public.vw_sec_form4_status to anon, authenticated, service_role;
