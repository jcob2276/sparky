-- Dossier dlugoterminowej pamieci Wyroczni (Faza 2).
-- Nocny job na VPS (context_cache_builder -> dossier_builder) kompresuje 90 dni danych do zwartego
-- opisu wzorcow; Wyrocznia (vanguard-oracle) wstrzykuje najnowszy dossier do promptu.
-- Jawny Gemini Context Caching wymaga billingu, wiec dossier to droga bez dodatkowych kosztow na zapytanie.

CREATE TABLE IF NOT EXISTS public.vanguard_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'life_90d',
  content text NOT NULL CHECK (length(content) BETWEEN 200 AND 40000),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  model_name text NOT NULL,
  source_chars integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vanguard_dossiers_latest
  ON public.vanguard_dossiers (user_id, kind, created_at DESC);

ALTER TABLE public.vanguard_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access to vanguard_dossiers"
  ON public.vanguard_dossiers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "sparky_worker writes vanguard_dossiers"
  ON public.vanguard_dossiers FOR ALL TO sparky_worker USING (true) WITH CHECK (true);
CREATE POLICY "authenticated read own vanguard_dossiers"
  ON public.vanguard_dossiers FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

GRANT ALL ON TABLE public.vanguard_dossiers TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.vanguard_dossiers TO sparky_worker;
GRANT SELECT ON TABLE public.vanguard_dossiers TO authenticated;
