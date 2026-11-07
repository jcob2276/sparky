create function public.record_finance_holding_purchase(
  p_holding_id uuid, p_units numeric, p_price_pln numeric, p_account_id uuid default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_holding public.finance_holdings;
  v_quantity numeric;
  v_average numeric;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_units is null or p_price_pln is null or p_units <= 0 or p_price_pln <= 0
    or p_units = 'NaN'::numeric or p_price_pln = 'NaN'::numeric then raise exception 'Invalid purchase'; end if;
  select * into v_holding from public.finance_holdings where id=p_holding_id and user_id=v_user for update;
  if not found then raise exception 'Holding not found'; end if;
  if v_holding.avg_cost_currency <> 'PLN' then raise exception 'Historical PLN cost required'; end if;
  if p_account_id is not null then
    update public.finance_accounts set balance=balance-p_units*p_price_pln
      where id=p_account_id and user_id=v_user and bank_account_id is null
        and account_type in ('cash','bank','broker_cash') and balance >= p_units*p_price_pln;
    if not found then raise exception 'Funding account missing or insufficient balance'; end if;
  end if;
  v_quantity := v_holding.quantity+p_units;
  v_average := (v_holding.quantity*v_holding.avg_cost_pln+p_units*p_price_pln)/v_quantity;
  update public.finance_holdings set quantity=v_quantity,avg_cost_pln=v_average,
    avg_cost_original=v_average,avg_cost_currency='PLN',updated_at=now() where id=v_holding.id and user_id=v_user;
end;
$$;
revoke all on function public.record_finance_holding_purchase(uuid,numeric,numeric,uuid) from public,anon;
grant execute on function public.record_finance_holding_purchase(uuid,numeric,numeric,uuid) to authenticated;
