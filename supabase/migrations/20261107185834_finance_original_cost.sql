alter table public.finance_holdings
  add column avg_cost_currency text not null default 'PLN' check (avg_cost_currency in ('PLN','USD','EUR')),
  add column avg_cost_original numeric check (avg_cost_original >= 0),
  add column snapshot_price_pln numeric check (snapshot_price_pln > 0),
  add column snapshot_source text,
  add column snapshot_as_of date;

comment on column public.finance_holdings.avg_cost_original is 'Średni koszt jednostki w oryginalnej walucie; nie przeliczać historycznego kosztu po bieżącym FX.';
comment on column public.finance_holdings.snapshot_price_pln is 'Ostatnia jawnie dostarczona wycena jednostki; fallback ze wskazanym źródłem, nie notowanie live.';
