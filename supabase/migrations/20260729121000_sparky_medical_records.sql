CREATE TABLE IF NOT EXISTS public.medical_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('visit', 'lab', 'procedure', 'vaccination', 'other')),
  occurred_on date NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  specialty text,
  provider text,
  reason text,
  summary text,
  recommendations text,
  follow_up_on date,
  source_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_events_user_date
  ON public.medical_events (user_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_medical_events_user_specialty
  ON public.medical_events (user_id, specialty, occurred_on DESC);

ALTER TABLE public.medical_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage_own" ON public.medical_events
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_events TO authenticated;
GRANT ALL ON public.medical_events TO service_role;

CREATE TABLE IF NOT EXISTS public.medical_prevention_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('done', 'snoozed', 'dismissed')),
  snoozed_until date,
  rule_version text NOT NULL,
  source_url text NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, suggestion_key)
);

CREATE INDEX IF NOT EXISTS idx_medical_prevention_actions_user
  ON public.medical_prevention_actions (user_id, decided_at DESC);

ALTER TABLE public.medical_prevention_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage_own" ON public.medical_prevention_actions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_prevention_actions TO authenticated;
GRANT ALL ON public.medical_prevention_actions TO service_role;

DROP TRIGGER IF EXISTS trg_medical_events_updated_at ON public.medical_events;
CREATE TRIGGER trg_medical_events_updated_at
  BEFORE UPDATE ON public.medical_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
