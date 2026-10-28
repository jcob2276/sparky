-- Wyniki analiz AI (Analiza tygodnia, Porównanie okresów) zapisane na koncie,
-- żeby wracały od razu na każdym urządzeniu zamiast tylko w pamięci jednej przeglądarki.
CREATE TABLE IF NOT EXISTS public.ai_insight_results (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('week-insight', 'period-compare')),
  cache_key text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, cache_key)
);

COMMENT ON TABLE public.ai_insight_results IS 'Zapisane wyniki analiz AI (week-insight, period-compare) per użytkownik i klucz (wersja analizy + okres + dzień). Zapis z aplikacji po udanym wywołaniu funkcji; odczyt przy otwarciu karty.';

CREATE INDEX IF NOT EXISTS ai_insight_results_user_kind_created_idx
  ON public.ai_insight_results (user_id, kind, created_at DESC);

ALTER TABLE public.ai_insight_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_insight_results_select_own ON public.ai_insight_results
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY ai_insight_results_insert_own ON public.ai_insight_results
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY ai_insight_results_update_own ON public.ai_insight_results
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
