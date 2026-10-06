CREATE INDEX sec13f_positions_reported_shares ON public.sec13f_positions (filing_id,cusip)
INCLUDE (quantity,value_usd) WHERE quantity_type='SH' AND put_call IS NULL;
