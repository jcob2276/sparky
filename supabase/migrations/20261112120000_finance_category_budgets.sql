-- Miesięczne limity (koperty) na kategorie wydatków bankowych. Właściciel czyta i zmienia tylko swoje wiersze.
create table if not exists public.finance_category_budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (length(category) between 1 and 40),
  monthly_limit numeric(12, 2) not null check (monthly_limit > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.finance_category_budgets enable row level security;
create policy finance_category_budgets_owner on public.finance_category_budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.finance_category_budgets from anon;
grant select, insert, update, delete on public.finance_category_budgets to authenticated;
grant all on public.finance_category_budgets to service_role;
