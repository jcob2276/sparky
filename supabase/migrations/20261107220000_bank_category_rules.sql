-- Ręczne wybory kategorii: gdy użytkownik przypisze nierozpoznaną transakcję, Sparky zapamiętuje wybór
-- dla tego kontrahenta i stosuje go do kolejnych transakcji przed regułami z kodu.
-- Zapisuje wyłącznie edge function bank-sync (service role); właściciel może tylko czytać swoje reguły.
create table if not exists public.bank_category_rules (
  user_id uuid not null references auth.users(id) on delete cascade,
  counterparty_key text not null check (length(counterparty_key) between 1 and 200),
  category text not null check (length(category) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id, counterparty_key)
);

alter table public.bank_category_rules enable row level security;
create policy bank_category_rules_read_own on public.bank_category_rules
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.bank_category_rules from anon;
revoke insert, update, delete on public.bank_category_rules from authenticated;
grant select on public.bank_category_rules to authenticated;
grant all on public.bank_category_rules to service_role;

-- Nierozpoznane transakcje mają zostać otwarte do przypisania, a nie wpadać do "Inne".
update public.bank_transactions
  set category = 'do_sprawdzenia'
  where category = 'inne' and category_source = 'rule';
