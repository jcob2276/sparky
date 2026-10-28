-- Cele życiowe, które nie miały jeszcze właściciela w bazie (cel wyciskania i dochodu).
-- Pozostałe cele mają właścicieli: tłuszcz w nutrition_profile, majątek w finance_profile, sprzedaż w goal_kpis.
CREATE TABLE IF NOT EXISTS public.life_targets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bench_goal_kg numeric NOT NULL DEFAULT 100 CHECK (bench_goal_kg > 0),
  income_goal_net_pln numeric NOT NULL DEFAULT 15000 CHECK (income_goal_net_pln > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.life_targets IS 'Jedyny właściciel celu wyciskania (e1RM, kg) i miesięcznego dochodu netto (zł). Aplikacja czyta przez useLifeTargets; zob. docs/SINGLE_SOURCE.md.';

ALTER TABLE public.life_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY life_targets_select_own ON public.life_targets
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY life_targets_insert_own ON public.life_targets
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY life_targets_update_own ON public.life_targets
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

INSERT INTO public.life_targets (user_id)
SELECT user_id FROM public.nutrition_profile
ON CONFLICT (user_id) DO NOTHING;
