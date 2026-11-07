begin;
alter table public.bank_transactions add constraint bank_transactions_user_id_id_key unique (user_id, id);
alter table public.finance_transactions
  add column bank_transaction_id uuid,
  add column bank_reconciled boolean not null default false;
alter table public.finance_transactions add constraint finance_transaction_own_bank_fk
  foreign key (user_id, bank_transaction_id) references public.bank_transactions(user_id, id)
  deferrable initially deferred;
create unique index finance_transaction_bank_unique on public.finance_transactions(bank_transaction_id) where bank_transaction_id is not null;

create function public.validate_finance_bank_match() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.bank_transaction_id is not null and not exists(
    select 1 from public.bank_transactions b join public.finance_accounts f on f.bank_account_id = b.account_id
    where b.id = new.bank_transaction_id and b.user_id = new.user_id and f.user_id = new.user_id and f.id = new.account_id
  ) then raise exception 'Bank transaction does not belong to linked account'; end if;
  return new;
end;
$$;
revoke all on function public.validate_finance_bank_match() from public, anon, authenticated;
create trigger finance_bank_match before insert or update of bank_transaction_id, account_id, user_id
  on public.finance_transactions for each row execute function public.validate_finance_bank_match();
commit;
