-- 1) Ukrywanie rachunków: ukryty rachunek nie jest pokazywany ani synchronizowany (oszczędza też limit
--    odczytów PSD2). Flagę ustawia właściciel danych przez service role; sync jej nie nadpisuje.
-- 2) Notatka połączenia: limit odczytów banku to nie błąd, więc dostaje osobne pole zamiast last_error.
-- 3) Pełna historia jest próbowana najwyżej raz na dobę, bo kosztuje dziesiątki odczytów.
-- 4) Kategorie transakcji liczone regułami (packages/domain/src/finance/bankCategories.ts).
alter table public.bank_accounts
  add column if not exists hidden boolean not null default false,
  add column if not exists history_attempted_at timestamptz;

alter table public.bank_connections
  add column if not exists last_note text;

alter table public.bank_transactions
  add column if not exists category text,
  add column if not exists category_source text not null default 'rule'
    check (category_source in ('rule', 'manual'));

create index if not exists bank_transactions_user_category_idx
  on public.bank_transactions (user_id, category, booking_date desc);
