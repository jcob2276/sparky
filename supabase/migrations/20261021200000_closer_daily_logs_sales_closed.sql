alter table public.closer_daily_logs add column if not exists sales_closed integer not null default 0 check (sales_closed >= 0);
comment on column public.closer_daily_logs.sales_closed is 'Liczba zamkniętych sprzedaży danego dnia (po rozmowach sprzedażowych).';
