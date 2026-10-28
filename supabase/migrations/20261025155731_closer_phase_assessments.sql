-- Ocena etapów rozmowy sprzedażowej (1-5 względem kryteriów) i typ rozmowy; kryteria edytowalne przez użytkownika.
ALTER TABLE public.closer_calls
  ADD COLUMN IF NOT EXISTS ai_phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_call_kind TEXT;

ALTER TABLE public.closer_calls
  ADD CONSTRAINT closer_calls_ai_call_kind_check CHECK (ai_call_kind IS NULL OR ai_call_kind IN ('sales', 'training', 'other'));

COMMENT ON COLUMN public.closer_calls.ai_phases IS 'Oceny etapów rozmowy: [{phase, score 1-5, met[], missed[], evidence}]; tylko dla rozmów sprzedażowych.';
COMMENT ON COLUMN public.closer_calls.ai_call_kind IS 'Typ rozmowy wg AI; trendy etapów liczą tylko sales.';

CREATE TABLE IF NOT EXISTS public.sales_playbook_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  criterion_key TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sales_playbook_criteria_phase_check CHECK (phase IN ('otwarcie', 'potrzeby', 'prezentacja', 'cena', 'obiekcje', 'zamkniecie')),
  CONSTRAINT sales_playbook_criteria_user_key UNIQUE (user_id, criterion_key)
);

COMMENT ON TABLE public.sales_playbook_criteria IS 'Kryteria dobrej rozmowy na etap (z notatek, kursów, oferty). Gdy brak aktywnych dla etapu, analiza używa domyślnych z @vanguard/domain.';

ALTER TABLE public.sales_playbook_criteria ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales_playbook_criteria' AND policyname = 'sales_playbook_criteria_owner'
  ) THEN
    CREATE POLICY "sales_playbook_criteria_owner" ON public.sales_playbook_criteria
      FOR ALL USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

GRANT ALL ON TABLE public.sales_playbook_criteria TO authenticated, service_role;
