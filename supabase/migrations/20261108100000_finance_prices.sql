-- Historia cen instrumentow i dzienna wartosc portfela. Zapis wylacznie przez workera na VPS (rola sparky_worker).
-- Nie nadpisuje finance_holdings (snapshot_price_pln itd.): ceny reczne zostaja, nowe dane sa osobno.

create table if not exists public.finance_price_history (
  ticker text not null,
  price_date date not null,
  close numeric not null,
  currency text not null,
  fx_to_pln numeric not null,
  close_pln numeric not null,
  source text not null default 'yfinance',
  fetched_at timestamptz not null default now(),
  primary key (ticker, price_date)
);
comment on table public.finance_price_history is 'Dzienne zamkniecia instrumentow z finance_holdings, przeliczone na PLN. Zapis: worker VPS.';

create table if not exists public.finance_portfolio_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  as_of date not null,
  total_pln numeric not null,
  by_class jsonb not null default '{}'::jsonb,
  positions jsonb not null default '[]'::jsonb,
  source text not null default 'vps-prices',
  computed_at timestamptz not null default now(),
  primary key (user_id, as_of)
);
comment on table public.finance_portfolio_daily is 'Wartosc portfela w dniu as_of = obecne ilosci x cena zamkniecia (bez historii zmian ilosci).';

alter table public.finance_price_history enable row level security;
alter table public.finance_portfolio_daily enable row level security;

drop policy if exists finance_price_history_read on public.finance_price_history;
create policy finance_price_history_read on public.finance_price_history for select to authenticated using (true);

drop policy if exists finance_portfolio_daily_owner_read on public.finance_portfolio_daily;
create policy finance_portfolio_daily_owner_read on public.finance_portfolio_daily
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists sparky_worker_prices on public.finance_price_history;
create policy sparky_worker_prices on public.finance_price_history for all to sparky_worker using (true) with check (true);
drop policy if exists sparky_worker_portfolio on public.finance_portfolio_daily;
create policy sparky_worker_portfolio on public.finance_portfolio_daily for all to sparky_worker using (true) with check (true);
drop policy if exists sparky_worker_read_holdings on public.finance_holdings;
create policy sparky_worker_read_holdings on public.finance_holdings for select to sparky_worker using (true);

grant select, insert, update on public.finance_price_history to sparky_worker;
grant select, insert, update on public.finance_portfolio_daily to sparky_worker;
grant select (user_id, ticker, name, asset_class, quantity) on public.finance_holdings to sparky_worker;
grant usage on schema public to sparky_worker;

-- Dzienne pobranie cen: wrzuca zadanie do kolejki, ktore odbiera worker na VPS (po zamknieciu gield, 00:00 czasu polskiego).
select cron.schedule('fetch-prices-daily', '0 23 * * 1-5',
  $$select pgmq.send('sparky_jobs', '{"type":"fetch_prices","payload":{"days_back":5}}'::jsonb)$$);
