-- Canonical official evidence is kept separately from the legacy duplicate-prone import.
create table public.knf_disclosed_positions (
  external_id text primary key,
  holder text not null,
  company text not null,
  isin text not null,
  ticker text,
  position_pct numeric not null check (position_pct between 0 and 100),
  position_pct_raw text not null,
  below_public_threshold boolean not null,
  position_date date not null,
  modify_date date,
  source_url text not null,
  source_system text not null check (source_system = 'knf_rss_official'),
  created_at timestamptz not null default now()
);
create index knf_disclosed_history on public.knf_disclosed_positions(isin, holder, position_date desc, modify_date desc);
create table public.knf_current_positions (like public.knf_disclosed_positions including all);
alter table public.knf_disclosed_positions enable row level security;
alter table public.knf_current_positions enable row level security;
create policy knf_disclosed_read on public.knf_disclosed_positions for select to anon, authenticated using (true);
create policy knf_current_read on public.knf_current_positions for select to anon, authenticated using (true);
revoke all on public.knf_disclosed_positions, public.knf_current_positions from anon, authenticated;
grant select on public.knf_disclosed_positions, public.knf_current_positions to anon, authenticated;
grant all on public.knf_disclosed_positions, public.knf_current_positions to service_role;

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
  delete from knf_current_positions;
  insert into knf_current_positions(external_id,holder,company,isin,ticker,position_pct,position_pct_raw,
    below_public_threshold,position_date,modify_date,source_url,source_system)
  select external_id,holder,company,isin,ticker,position_pct,position_pct_raw,
    below_public_threshold,position_date,modify_date,source_url,source_system
  from jsonb_to_recordset(p_current) as r(external_id text,holder text,company text,isin text,ticker text,
    position_pct numeric,position_pct_raw text,below_public_threshold boolean,position_date date,modify_date date,
    source_url text,source_system text);

  -- Replace the consumer cache, including companies no longer publicly shorted.
  delete from vw_gpw_shorts_agg;
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

  -- Reconstruct public aggregate history from the latest disclosed holder position on each calculation date.
  delete from vw_gpw_shorts_history;
  insert into vw_gpw_shorts_history(id,key,isin,company,ticker,position_date,total_pct,holders)
  with dates as (select distinct isin,position_date from knf_disclosed_positions), companies as (
    select distinct on(isin) isin,company,ticker from knf_disclosed_positions
    order by isin,position_date desc,modify_date desc nulls last,external_id
  ) select d.isin || ':' || d.position_date::text,d.isin,d.isin,c.company,c.ticker,d.position_date,
    coalesce(sum(p.position_pct) filter(where p.position_pct >= 0.5),0),
    count(*) filter(where p.position_pct >= 0.5)::integer
  from dates d join companies c using(isin)
  cross join lateral (
    select distinct on(holder) holder,position_pct from knf_disclosed_positions h
    where h.isin=d.isin and h.position_date <= d.position_date
    order by holder,position_date desc,modify_date desc nulls last,external_id
  ) p group by d.isin,d.position_date,c.company,c.ticker;

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
