-- Preserve foreign-currency corrections; older events remain unknown rather than inferred.
alter table public.finance_holding_events
  add column avg_cost_original_before numeric,
  add column avg_cost_original_after numeric,
  add column cost_currency_before text,
  add column cost_currency_after text;

create or replace function public.log_finance_holding_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_row public.finance_holdings;
  v_kind text;
  v_before numeric := 0;
  v_after numeric := 0;
  v_cost_before numeric;
  v_cost_after numeric;
  v_original_before numeric;
  v_original_after numeric;
  v_currency_before text;
  v_currency_after text;
  v_context jsonb := nullif(current_setting('sparky.purchase_context',true),'')::jsonb;
  v_amount numeric;
  v_account uuid;
begin
  if TG_OP='UPDATE' and old.quantity is not distinct from new.quantity
    and old.avg_cost_pln is not distinct from new.avg_cost_pln
    and old.avg_cost_original is not distinct from new.avg_cost_original
    and old.avg_cost_currency is not distinct from new.avg_cost_currency
    and old.ticker is not distinct from new.ticker then return new; end if;
  if TG_OP='DELETE' then v_row:=old; v_kind:='removed';
  else v_row:=new; v_after:=new.quantity; v_cost_after:=new.avg_cost_pln;
    v_original_after:=new.avg_cost_original; v_currency_after:=new.avg_cost_currency;
    v_kind:=case when TG_OP='INSERT' then 'opening' else 'adjustment' end;
  end if;
  if TG_OP<>'INSERT' then v_before:=old.quantity; v_cost_before:=old.avg_cost_pln;
    v_original_before:=old.avg_cost_original; v_currency_before:=old.avg_cost_currency; end if;
  if TG_OP='UPDATE' and v_context->>'holding_id'=new.id::text
    and new.quantity-old.quantity=(v_context->>'units')::numeric then
    v_kind:='purchase';
    v_amount:=(v_context->>'units')::numeric*(v_context->>'price')::numeric;
    v_account:=(v_context->>'account_id')::uuid;
  end if;
  insert into public.finance_holding_events(user_id,holding_id,ticker,name,kind,quantity_before,quantity_after,
    avg_cost_before,avg_cost_after,cost_currency,amount_pln,funding_account_id,
    avg_cost_original_before,avg_cost_original_after,cost_currency_before,cost_currency_after)
  values(v_row.user_id,v_row.id,v_row.ticker,v_row.name,v_kind,v_before,v_after,
    v_cost_before,v_cost_after,v_row.avg_cost_currency,v_amount,v_account,
    v_original_before,v_original_after,v_currency_before,v_currency_after);
  if TG_OP='DELETE' then return old; end if;
  return new;
end;
$$;
