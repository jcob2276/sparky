-- Kurator grafu wiedzy (VPS): audyt claimow, selekcja kolejki wiki, gornik wzorcow, higiena encji.
-- Domyslnie joby pisza tylko raporty (vanguard_curation_reports). Jedyny zapis w danych zrodlowych to
-- odwracalna zmiana statusu pozycji kolejki wiki (open -> resolved z adnotacja w metadata), tylko w trybie apply.

CREATE TABLE IF NOT EXISTS public.vanguard_curation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('claims_audit', 'wiki_triage', 'pattern_miner', 'entity_hygiene')),
  mode text NOT NULL DEFAULT 'dry_run' CHECK (mode IN ('dry_run', 'applied')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  content text NOT NULL DEFAULT '',
  model_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vanguard_curation_reports_kind
  ON public.vanguard_curation_reports (user_id, kind, created_at DESC);

ALTER TABLE public.vanguard_curation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access to vanguard_curation_reports"
  ON public.vanguard_curation_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "sparky_worker writes vanguard_curation_reports"
  ON public.vanguard_curation_reports FOR ALL TO sparky_worker USING (true) WITH CHECK (true);
CREATE POLICY "authenticated read own vanguard_curation_reports"
  ON public.vanguard_curation_reports FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

GRANT ALL ON TABLE public.vanguard_curation_reports TO service_role;
GRANT SELECT, INSERT ON TABLE public.vanguard_curation_reports TO sparky_worker;
GRANT SELECT ON TABLE public.vanguard_curation_reports TO authenticated;

-- Odczyt grafu i wiki przez workera VPS.
GRANT SELECT ON public.claims, public.entities, public.entity_aliases, public.relations,
  public.vanguard_behavioral_patterns, public.pattern_events, public.vanguard_wiki_pages,
  public.vanguard_wiki_review_items TO sparky_worker;
GRANT UPDATE ON public.vanguard_wiki_review_items TO sparky_worker;

CREATE POLICY "sparky_worker reads claims" ON public.claims FOR SELECT TO sparky_worker USING (true);
CREATE POLICY "sparky_worker reads entities" ON public.entities FOR SELECT TO sparky_worker USING (true);
CREATE POLICY "sparky_worker reads entity_aliases" ON public.entity_aliases FOR SELECT TO sparky_worker USING (true);
CREATE POLICY "sparky_worker reads relations" ON public.relations FOR SELECT TO sparky_worker USING (true);
CREATE POLICY "sparky_worker reads behavioral_patterns" ON public.vanguard_behavioral_patterns FOR SELECT TO sparky_worker USING (true);
CREATE POLICY "sparky_worker reads pattern_events" ON public.pattern_events FOR SELECT TO sparky_worker USING (true);
CREATE POLICY "sparky_worker reads wiki_pages" ON public.vanguard_wiki_pages FOR SELECT TO sparky_worker USING (true);
CREATE POLICY "sparky_worker reads wiki_review_items" ON public.vanguard_wiki_review_items FOR SELECT TO sparky_worker USING (true);
CREATE POLICY "sparky_worker updates wiki_review_items" ON public.vanguard_wiki_review_items FOR UPDATE TO sparky_worker USING (true) WITH CHECK (true);
