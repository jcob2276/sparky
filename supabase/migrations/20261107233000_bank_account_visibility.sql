-- Bezpieczna funkcja RPC do ukrywania i odkrywania rachunku przez właściciela
create or replace function public.set_bank_account_visibility(p_account_id uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.bank_accounts
  set hidden = p_hidden
  where id = p_account_id and user_id = (select auth.uid());
  if not found then
    raise exception 'Rachunek nie istnieje lub brak uprawnień';
  end if;
  -- Jeśli rachunek zostaje ukryty, odłączamy go od podsumowania w finance_accounts
  if p_hidden then
    update public.finance_accounts
    set bank_account_id = null
    where bank_account_id = p_account_id and user_id = (select auth.uid());
  end if;
end;
$$;

revoke all on function public.set_bank_account_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_bank_account_visibility(uuid, boolean) to authenticated;

-- Zezwolenie właścicielowi na odczyt własnych rachunków (w tym ukrytych),
-- żeby aplikacja mogła pokazać sekcję ukrytych rachunków i umożliwić ich przywrócenie.
alter policy bank_accounts_read_own on public.bank_accounts
  using (user_id = (select auth.uid()));
