create table public.knf_short_snapshots (
  isin text not null,
  company text not null,
  ticker text,
  observed_date date not null,
  observed_at timestamptz not null,
  total_pct numeric not null check (total_pct >= 0),
  holders integer not null check (holders >= 0),
  primary key (isin, observed_date)
);
alter table public.knf_short_snapshots enable row level security;
revoke all on public.knf_short_snapshots from anon, authenticated;
grant select on public.knf_short_snapshots to anon, authenticated;
grant all on public.knf_short_snapshots to service_role;
create policy knf_snapshots_read on public.knf_short_snapshots for select to anon,authenticated using(true);
create view public.vw_knf_shorts_baseline_14d with (security_invoker=true) as
  select distinct on(isin) isin,company,ticker,observed_date as position_date,total_pct,holders,observed_at
  from public.knf_short_snapshots
  where observed_date <= (now() at time zone 'Europe/Warsaw')::date - 14
  order by isin,observed_date desc;
grant select on public.vw_knf_shorts_baseline_14d to anon,authenticated,service_role;
create or replace function public.replace_knf_snapshot(p_current jsonb, p_history jsonb, p_checked_at timestamptz)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare latest_date date;
begin
  perform pg_advisory_xact_lock(hashtext('sparky:knf-snapshot'));
  if exists(select 1 from investment_source_status where source = 'knf_shorts' and last_success_at >= p_checked_at) then
    return jsonb_build_object('ignoredOlderSnapshot', true);
  end if;
  if jsonb_typeof(p_current) is distinct from 'array' or jsonb_typeof(p_history) is distinct from 'array'
    or p_checked_at is null or jsonb_array_length(p_current) > 100000 or jsonb_array_length(p_history) > 100000 then
    raise exception 'Invalid KNF snapshot';
  end if;
  if exists(select 1 from jsonb_array_elements(p_current || p_history) r
    where r->>'external_id' !~ '^knf:[0-9a-f]{64}$'
      or r->>'source_system' is distinct from 'knf_rss_official'
      or r->>'source_url' is distinct from 'https://rss.knf.gov.pl/rss_pub/'
      or r->>'isin' !~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$') then
    raise exception 'Invalid KNF provenance';
  end if;
  if exists(select 1 from jsonb_array_elements(p_current) r where (r->>'position_pct')::numeric < 0.5)
    or exists(select 1 from jsonb_array_elements(p_current) r group by r->>'holder',r->>'isin' having count(*) > 1) then
    raise exception 'Inconsistent current KNF positions';
  end if;
  insert into knf_disclosed_positions(external_id,holder,company,isin,ticker,position_pct,position_pct_raw,
    below_public_threshold,position_date,modify_date,source_url,source_system)
  select distinct on(external_id) external_id,holder,company,isin,ticker,position_pct,position_pct_raw,
    below_public_threshold,position_date,modify_date,source_url,source_system
  from jsonb_to_recordset(p_history || p_current) as r(external_id text,holder text,company text,isin text,ticker text,
    position_pct numeric,position_pct_raw text,below_public_threshold boolean,position_date date,modify_date date,
    source_url text,source_system text)
  on conflict(external_id) do update set ticker = excluded.ticker, company = excluded.company;
  delete from knf_current_positions where external_id is not null;
  insert into knf_current_positions(external_id,holder,company,isin,ticker,position_pct,position_pct_raw,
    below_public_threshold,position_date,modify_date,source_url,source_system)
  select external_id,holder,company,isin,ticker,position_pct,position_pct_raw,
    below_public_threshold,position_date,modify_date,source_url,source_system
  from jsonb_to_recordset(p_current) as r(external_id text,holder text,company text,isin text,ticker text,
    position_pct numeric,position_pct_raw text,below_public_threshold boolean,position_date date,modify_date date,
    source_url text,source_system text);

  -- Replace the consumer cache, including companies no longer publicly shorted.
  delete from vw_gpw_shorts_agg where company is not null;
  insert into vw_gpw_shorts_agg(company,ticker,total_pct,public_holders,below_threshold,last_change,top_holder,top_holder_pct)
  with companies as (
    select distinct on(isin) isin,company,ticker,position_date from knf_disclosed_positions
    order by isin,position_date desc,modify_date desc nulls last,external_id
  ), active as (
    select isin,sum(position_pct) total_pct,count(*) holders,max(position_date) last_change,
      (array_agg(holder order by position_pct desc,holder))[1] top_holder,
      max(position_pct) top_holder_pct from knf_current_positions group by isin
  ) select c.company,max(c.ticker),coalesce(sum(a.total_pct),0),coalesce(sum(a.holders),0)::integer,
    0,max(coalesce(a.last_change,c.position_date)),
    (array_agg(a.top_holder order by a.top_holder_pct desc nulls last))[1],max(a.top_holder_pct)
  from companies c left join active a using(isin) group by c.company;

  -- The public archive omits below-threshold closure dates. Only observed current registers prove aggregate history.
  insert into knf_short_snapshots(isin,company,ticker,observed_date,observed_at,total_pct,holders)
  with companies as (
    select distinct on(isin) isin,company,ticker from knf_disclosed_positions
    order by isin,position_date desc,modify_date desc nulls last,external_id
  ), active as (
    select isin,sum(position_pct) total_pct,count(*) holders from knf_current_positions group by isin
  ) select c.isin,c.company,c.ticker,(p_checked_at at time zone 'Europe/Warsaw')::date,p_checked_at,
    coalesce(a.total_pct,0),coalesce(a.holders,0)::integer
  from companies c left join active a using(isin)
  on conflict(isin,observed_date) do update set company=excluded.company,ticker=excluded.ticker,
    observed_at=excluded.observed_at,total_pct=excluded.total_pct,holders=excluded.holders;
  delete from vw_gpw_shorts_history where id is not null;
  insert into vw_gpw_shorts_history(id,key,isin,company,ticker,position_date,total_pct,holders)
    select isin || ':' || observed_date::text,isin,isin,company,ticker,observed_date,total_pct,holders
    from knf_short_snapshots;
  select max(modify_date) into latest_date from knf_disclosed_positions;
  insert into investment_source_status(source,checked_at,last_success_at,latest_disclosure_date,status,error)
    values('knf_shorts',p_checked_at,now(),latest_date,'ok',null)
  on conflict(source) do update set checked_at=excluded.checked_at,last_success_at=excluded.last_success_at,
    latest_disclosure_date=excluded.latest_disclosure_date,status='ok',error=null;
  return jsonb_build_object('currentPositions',jsonb_array_length(p_current),'historyPositions',
    (select count(*) from knf_disclosed_positions),'companies',(select count(*) from vw_gpw_shorts_agg));
end;
$$;
revoke all on function public.replace_knf_snapshot(jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.replace_knf_snapshot(jsonb,jsonb,timestamptz) to service_role;


