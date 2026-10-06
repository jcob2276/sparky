-- KNF caches are derived by the service job. Browser roles only consume them.
revoke insert,update,delete,truncate,references,trigger on public.vw_gpw_shorts_agg,public.vw_gpw_shorts_history from anon,authenticated;
grant select on public.vw_gpw_shorts_agg,public.vw_gpw_shorts_history to anon,authenticated;
grant all on public.vw_gpw_shorts_agg,public.vw_gpw_shorts_history to service_role;
