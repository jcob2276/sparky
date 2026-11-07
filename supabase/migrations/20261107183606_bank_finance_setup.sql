begin;

-- Pierwszy start bez ręcznych kont nie wymaga zgadywania, który rachunek jest duplikatem.
insert into public.finance_accounts(user_id, name, balance, account_type, is_liquid, bank_account_id)
select a.user_id, 'Bank · …' || right(a.iban, 4), a.balance, 'bank', true, a.id
from public.bank_accounts a
where not a.hidden and a.currency = 'PLN' and a.balance is not null
  and not exists(select 1 from public.finance_accounts f where f.user_id = a.user_id);

create function public.forget_bank_category_rule(
  p_user_id uuid, p_key text, p_transaction_id uuid, p_category text, p_related_ids uuid[]
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.bank_transactions set category = p_category, category_source = 'rule'
    where id = p_transaction_id and user_id = p_user_id;
  if not found then raise exception 'Transaction not found'; end if;
  delete from public.bank_category_rules where user_id = p_user_id
    and (counterparty_key = p_key or (p_key like 'debit:%' and counterparty_key = substring(p_key from 7)));
  update public.bank_transactions set category = null
    where user_id = p_user_id and id = any(p_related_ids) and category_source = 'rule' and id <> p_transaction_id;
end;
$$;
revoke all on function public.forget_bank_category_rule(uuid, text, uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function public.forget_bank_category_rule(uuid, text, uuid, text, uuid[]) to service_role;
commit;
