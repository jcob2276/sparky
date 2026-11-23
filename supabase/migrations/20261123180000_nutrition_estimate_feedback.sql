-- Różnica między szacunkiem AI (zdjęcie, opis tekstem) a tym, co użytkownik zatwierdził po poprawce wpisu.
-- Z czasem to osobisty zestaw testowy: pokazuje, jak bardzo model myli się na Twoim jedzeniu.
CREATE TABLE IF NOT EXISTS public.nutrition_estimate_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL,
  meal_group_id uuid,
  name text NOT NULL,
  input_mode text,
  macro_source text,
  -- {amount, calories, protein, carbs, fat}; "estimated" zostaje wartością z pierwszej poprawki.
  estimated jsonb NOT NULL,
  final jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_estimate_feedback_user_created
  ON public.nutrition_estimate_feedback (user_id, created_at DESC);

ALTER TABLE public.nutrition_estimate_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own estimate feedback"
  ON public.nutrition_estimate_feedback
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Błąd szacunku kcal na wpis: różnica i procent względem zatwierdzonej wartości.
CREATE OR REPLACE VIEW public.nutrition_estimate_errors
WITH (security_invoker = true) AS
SELECT
  user_id,
  entry_id,
  name,
  input_mode,
  macro_source,
  (estimated->>'calories')::numeric AS estimated_kcal,
  (final->>'calories')::numeric AS final_kcal,
  (final->>'calories')::numeric - (estimated->>'calories')::numeric AS kcal_error,
  CASE WHEN (final->>'calories')::numeric > 0
    THEN round(abs((final->>'calories')::numeric - (estimated->>'calories')::numeric) / (final->>'calories')::numeric * 100)
  END AS kcal_error_pct,
  created_at
FROM public.nutrition_estimate_feedback;
