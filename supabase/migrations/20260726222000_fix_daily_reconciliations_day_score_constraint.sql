-- ============================================================
-- FIX daily_reconciliations DAY SCORE CHECK CONSTRAINT
-- ============================================================
-- The frontend UI allows rating the day on a scale of 1-10 (Wynik dnia 1-10).
-- Update daily_reconciliations_day_score_check to accept day_score from 1 to 10.

ALTER TABLE public.daily_reconciliations
DROP CONSTRAINT IF EXISTS daily_reconciliations_day_score_check;

ALTER TABLE public.daily_reconciliations
ADD CONSTRAINT daily_reconciliations_day_score_check
CHECK (day_score IS NULL OR (day_score >= 1 AND day_score <= 10));
