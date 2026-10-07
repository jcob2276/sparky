-- Bound document replacement to the official House subset and its identifier prefix.
CREATE INDEX stock_act_house_document_prefix ON public.stock_act_trades(external_id text_pattern_ops)
  WHERE source='house_clerk';
ALTER FUNCTION public.replace_house_disclosure(text,jsonb) SET statement_timeout='30s';
-- Only retry failed writes: scanned/unrecognized documents still require their own parser.
UPDATE public.house_disclosures SET parse_status='pending',parse_error=NULL
WHERE parse_status='error' AND parse_error='Zapis transakcji: canceling statement due to statement timeout';
