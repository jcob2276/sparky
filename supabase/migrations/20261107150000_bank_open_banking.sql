-- Open banking (PSD2 AIS, Enable Banking): polaczenia, rachunki i transakcje bankowe tylko do odczytu.
-- Zapisuje wylacznie edge function bank-sync (service role). Wlasciciel moze tylko czytac swoje wiersze.
-- Identyfikator sesji bankowej lezy w osobnej tabeli bez polityk, wiec nie jest dostepny z aplikacji.

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'enable_banking',
  aspsp_name text not null,
  aspsp_country text not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'expired', 'failed')),
  valid_until timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_connection_secrets (
  connection_id uuid primary key references public.bank_connections(id) on delete cascade,
  pending_state text unique,
  session_id text
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  account_uid text not null,
  iban text,
  name text,
  currency text,
  balance numeric,
  balance_type text,
  balance_synced_at timestamptz,
  history_cursor date,
  history_complete boolean not null default false,
  created_at timestamptz not null default now(),
  unique (connection_id, account_uid)
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  transaction_id text not null,
  amount numeric not null,
  currency text not null,
  direction text not null check (direction in ('debit', 'credit')),
  booking_date date,
  value_date date,
  counterparty_name text,
  counterparty_iban text,
  remittance text,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  unique (account_id, transaction_id)
);

create index if not exists bank_connections_user_idx on public.bank_connections (user_id);
create index if not exists bank_accounts_user_idx on public.bank_accounts (user_id);
create index if not exists bank_transactions_user_date_idx
  on public.bank_transactions (user_id, booking_date desc);
create index if not exists bank_transactions_account_date_idx
  on public.bank_transactions (account_id, booking_date desc);

alter table public.bank_connections enable row level security;
alter table public.bank_connection_secrets enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;

create policy bank_connections_read_own on public.bank_connections
  for select to authenticated using (user_id = auth.uid());

create policy bank_accounts_read_own on public.bank_accounts
  for select to authenticated using (user_id = auth.uid());

create policy bank_transactions_read_own on public.bank_transactions
  for select to authenticated using (user_id = auth.uid());

-- bank_connection_secrets: RLS wlaczone i brak polityk = dostep tylko dla service role.
revoke all on public.bank_connection_secrets from anon, authenticated;
revoke insert, update, delete on public.bank_connections from anon, authenticated;
revoke insert, update, delete on public.bank_accounts from anon, authenticated;
revoke insert, update, delete on public.bank_transactions from anon, authenticated;
revoke all on public.bank_connections, public.bank_accounts, public.bank_transactions from anon;
