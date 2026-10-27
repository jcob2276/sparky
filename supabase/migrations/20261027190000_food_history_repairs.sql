-- Dziennik napraw historii jedzenia: pełny stan wiersza przed i po każdej poprawce lub usunięciu,
-- żeby naprawę można było odtworzyć i cofnąć (restore = wstawienie `before` z powrotem).
CREATE TABLE IF NOT EXISTS public.food_history_repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('energy_fix', 'duplicate_removed', 'micronutrient_fix', 'favorite_quarantine')),
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  before jsonb NOT NULL,
  after jsonb,
  reason text NOT NULL,
  repaired_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS food_history_repairs_user_batch_idx
  ON public.food_history_repairs (user_id, batch, kind);

COMMENT ON TABLE public.food_history_repairs IS
  'Kopia „przed i po” napraw historii jedzenia (korekty kcal z makro, usunięte duble, poprawki składników). after = NULL oznacza usunięcie wiersza.';

ALTER TABLE public.food_history_repairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own food history repairs" ON public.food_history_repairs
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.food_history_repairs FROM anon, authenticated;
GRANT SELECT ON public.food_history_repairs TO authenticated;
