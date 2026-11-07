begin;
alter table public.finance_accounts drop constraint finance_accounts_account_type_check;
alter table public.finance_accounts add constraint finance_accounts_account_type_check
  check (account_type in ('cash','bank','broker_cash','etf','stocks','btc','bonds','other'));
commit;
