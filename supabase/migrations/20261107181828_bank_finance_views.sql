begin;

alter table public.bank_accounts
  add column transactions_synced_at timestamptz,
  add column transactions_from date;

-- Trwała tożsamość rachunku przy ponownym udzieleniu zgody.
create unique index bank_accounts_user_iban_unique on public.bank_accounts(user_id, iban) where iban is not null;
alter table public.bank_accounts add constraint bank_accounts_user_id_id_key unique (user_id, id);
alter table public.finance_accounts add column bank_account_id uuid;
alter table public.finance_accounts add constraint finance_accounts_own_bank_fk
  foreign key (user_id, bank_account_id) references public.bank_accounts(user_id, id)
  deferrable initially deferred;
create unique index finance_accounts_bank_unique on public.finance_accounts(bank_account_id) where bank_account_id is not null;

-- Trigger chroni też starszy wdrożony mapper w czasie przejścia. ID wiersza/kategoria nie zmieniają się.
create function public.normalize_bank_transaction_identity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if nullif(new.raw->>'entry_reference', '') is not null then
    new.transaction_id := 'entry:' || (new.raw->>'entry_reference');
  elsif nullif(new.raw->>'transaction_id', '') is not null then
    new.transaction_id := 'detail:' || (new.raw->>'transaction_id');
  end if;
  return new;
end;
$$;
revoke all on function public.normalize_bank_transaction_identity() from public, anon, authenticated;
create trigger bank_transaction_identity before insert or update of raw, transaction_id
  on public.bank_transactions for each row execute function public.normalize_bank_transaction_identity();
update public.bank_transactions set transaction_id = transaction_id;

-- Wybór dla transakcji i opcjonalna reguła są jednym zapisem. Wywołuje tylko bank-sync po resolveUserScope.
create function public.set_bank_transaction_category(
  p_user_id uuid, p_transaction_id uuid, p_category text, p_source text,
  p_remember boolean default false, p_counterparty_key text default null
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_source not in ('rule', 'manual') or p_category is null then
    raise exception 'Invalid category source';
  end if;
  update public.bank_transactions set category = p_category, category_source = p_source
    where id = p_transaction_id and user_id = p_user_id;
  if not found then raise exception 'Transaction not found'; end if;
  if p_remember and nullif(p_counterparty_key, '') is not null then
    insert into public.bank_category_rules(user_id, counterparty_key, category)
      values(p_user_id, p_counterparty_key, p_category)
      on conflict(user_id, counterparty_key) do update set category = excluded.category;
  end if;
end;
$$;
revoke all on function public.set_bank_transaction_category(uuid, uuid, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.set_bank_transaction_category(uuid, uuid, text, text, boolean, text) to service_role;

commit;
