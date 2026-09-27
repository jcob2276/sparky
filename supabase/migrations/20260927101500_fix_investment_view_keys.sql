-- Fix primary keys on consensus and shorts history caches

DROP TABLE IF EXISTS public.vw_consensus;
CREATE TABLE public.vw_consensus (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cusip TEXT,
  ticker TEXT,
  company_name TEXT,
  buyers INTEGER DEFAULT 0,
  sellers INTEGER DEFAULT 0,
  new_positions INTEGER DEFAULT 0,
  holders INTEGER DEFAULT 0,
  net_buyers INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  buyer_names JSONB,
  seller_names JSONB
);

DROP TABLE IF EXISTS public.vw_gpw_shorts_history;
CREATE TABLE public.vw_gpw_shorts_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT,
  isin TEXT,
  company TEXT,
  ticker TEXT,
  position_date DATE,
  total_pct NUMERIC,
  holders INTEGER
);

ALTER TABLE public.vw_consensus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_gpw_shorts_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vw_consensus_read" ON public.vw_consensus FOR SELECT USING (true);
CREATE POLICY "vw_consensus_service" ON public.vw_consensus FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
GRANT SELECT ON TABLE public.vw_consensus TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vw_consensus TO service_role;

CREATE POLICY "vw_gpw_shorts_history_read" ON public.vw_gpw_shorts_history FOR SELECT USING (true);
CREATE POLICY "vw_gpw_shorts_history_service" ON public.vw_gpw_shorts_history FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
GRANT SELECT ON TABLE public.vw_gpw_shorts_history TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vw_gpw_shorts_history TO service_role;
