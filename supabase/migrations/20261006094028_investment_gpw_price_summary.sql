-- Server-side sampling keeps the complete last-year coverage without client row caps.
create or replace view public.vw_gpw_price_summary with (security_invoker=true) as
with ordered as (
  select ticker,date,close_raw,source_url,
    row_number() over(partition by ticker order by date) as n,
    count(*) over(partition by ticker) as total,
    lag(close_raw) over(partition by ticker order by date) as previous_close
  from public.prices_daily
  where ticker like '%.WA' and currency='PLN' and close_raw>0
    and date between (now() at time zone 'Europe/Warsaw')::date-366
      and (now() at time zone 'Europe/Warsaw')::date
)
select ticker,
  max(close_raw) filter(where n=total) as close,
  max(date) as price_date,
  max(source_url) filter(where n=total) as source_url,
  max(case when previous_close>0 then (close_raw/previous_close-1)*100 end) filter(where n=total) as change_pct,
  min(date) as history_start,max(date) as history_end,
  jsonb_agg(jsonb_build_object('date',date,'price',close_raw) order by date)
    filter(where n=1 or n=total or mod(n-1,greatest(ceil(total/16.0)::bigint,1))=0) as points
from ordered group by ticker;
revoke all on public.vw_gpw_price_summary from anon,authenticated;
grant select on public.vw_gpw_price_summary to anon,authenticated,service_role;
