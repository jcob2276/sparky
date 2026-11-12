-- Append-only observation of position changes. Opening balances are not historical trades.
create table public.finance_holding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  holding_id uuid not null,
  ticker text not null,
  name text not null,
  kind text not null check(kind in ('opening','purchase','adjustment','removed')),
  quantity_before numeric not null,
  quantity_after numeric not null,
  avg_cost_before numeric,
  avg_cost_after numeric,
  cost_currency text,
  amount_pln numeric,
  funding_account_id uuid,
  recorded_at timestamptz not null default clock_timestamp()
);
create index finance_holding_events_owner_time on public.finance_holding_events(user_id,recorded_at desc,id desc);
alter table public.finance_holding_events enable row level security;
revoke all on public.finance_holding_events from public,anon,authenticated;
grant select on public.finance_holding_events to authenticated;
create policy finance_holding_events_read on public.finance_holding_events for select to authenticated
  using(user_id=(select auth.uid()));

create function public.log_finance_holding_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_row public.finance_holdings;
  v_kind text;
  v_before numeric := 0;
  v_after numeric := 0;
  v_cost_before numeric;
  v_cost_after numeric;
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
    v_kind:=case when TG_OP='INSERT' then 'opening' else 'adjustment' end;
  end if;
  if TG_OP<>'INSERT' then v_before:=old.quantity; v_cost_before:=old.avg_cost_pln; end if;
  if TG_OP='UPDATE' and v_context->>'holding_id'=new.id::text
    and new.quantity-old.quantity=(v_context->>'units')::numeric then
    v_kind:='purchase';
    v_amount:=(v_context->>'units')::numeric*(v_context->>'price')::numeric;
    v_account:=(v_context->>'account_id')::uuid;
  end if;
  insert into public.finance_holding_events(user_id,holding_id,ticker,name,kind,quantity_before,quantity_after,
    avg_cost_before,avg_cost_after,cost_currency,amount_pln,funding_account_id)
  values(v_row.user_id,v_row.id,v_row.ticker,v_row.name,v_kind,v_before,v_after,
    v_cost_before,v_cost_after,v_row.avg_cost_currency,v_amount,v_account);
  if TG_OP='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.log_finance_holding_event() from public,anon,authenticated;
create trigger finance_holdings_log_event after insert or update or delete on public.finance_holdings
  for each row execute function public.log_finance_holding_event();

insert into public.finance_holding_events(user_id,holding_id,ticker,name,kind,quantity_before,quantity_after,avg_cost_after,cost_currency)
  select user_id,id,ticker,name,'opening',0,quantity,avg_cost_pln,avg_cost_currency from public.finance_holdings;

create or replace function public.record_finance_holding_purchase(
  p_holding_id uuid, p_units numeric, p_price_pln numeric, p_account_id uuid default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_holding public.finance_holdings;
  v_quantity numeric;
  v_average numeric;
  v_previous_context text := current_setting('sparky.purchase_context',true);
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_units is null or p_price_pln is null or p_units <= 0 or p_price_pln <= 0
    or p_units in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)
    or p_price_pln in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) then raise exception 'Invalid purchase'; end if;
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
  perform set_config('sparky.purchase_context',jsonb_build_object('holding_id',p_holding_id,
    'units',p_units,'price',p_price_pln,'account_id',p_account_id)::text,true);
  update public.finance_holdings set quantity=v_quantity,avg_cost_pln=v_average,
    avg_cost_original=v_average,avg_cost_currency='PLN',updated_at=now() where id=v_holding.id and user_id=v_user;
  perform set_config('sparky.purchase_context',coalesce(v_previous_context,''),true);
end;
$$;
revoke all on function public.record_finance_holding_purchase(uuid,numeric,numeric,uuid) from public,anon;
grant execute on function public.record_finance_holding_purchase(uuid,numeric,numeric,uuid) to authenticated;
