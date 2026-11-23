-- Własny, stały cel makro: kcal, białko i tłuszcz ustawia użytkownik, węglowodany to reszta energii.
-- Trener (vanguard-nutrition-coach) zapisuje go do nutrition_targets zamiast liczyć deficyt z trendu masy.
ALTER TABLE public.nutrition_profile
  ADD COLUMN IF NOT EXISTS fixed_kcal integer CHECK (fixed_kcal IS NULL OR fixed_kcal > 0),
  ADD COLUMN IF NOT EXISTS fixed_protein_g integer CHECK (fixed_protein_g IS NULL OR fixed_protein_g > 0),
  ADD COLUMN IF NOT EXISTS fixed_fat_g integer CHECK (fixed_fat_g IS NULL OR fixed_fat_g > 0);

ALTER TABLE public.nutrition_targets
  ADD COLUMN IF NOT EXISTS target_fat_g integer,
  ADD COLUMN IF NOT EXISTS target_carbs_g integer;

COMMENT ON COLUMN public.nutrition_profile.fixed_kcal IS 'Stały dzienny cel kcal; gdy ustawiony wraz z białkiem i tłuszczem, zastępuje wyliczony deficyt.';
COMMENT ON COLUMN public.nutrition_targets.target_carbs_g IS 'Węglowodany = (kcal − 4·białko − 9·tłuszcz) / 4, tylko przy stałym celu makro.';
