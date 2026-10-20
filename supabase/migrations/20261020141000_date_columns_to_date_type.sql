-- Day columns stored as text -> real date. All existing values verified as YYYY-MM-DD.
-- Dependent unique indexes / constraints are rebuilt by ALTER TYPE; no views, functions or
-- policies reference these columns. Client types stay `string`.
ALTER TABLE public.aw_daily_summary  ALTER COLUMN date TYPE date USING date::date;
ALTER TABLE public.fasting_logs      ALTER COLUMN date TYPE date USING date::date;
ALTER TABLE public.nutrition_targets ALTER COLUMN date TYPE date USING date::date;
ALTER TABLE public.supplement_logs   ALTER COLUMN date TYPE date USING date::date;

COMMENT ON COLUMN public.workout_sessions.workout_day IS
  'Session title / day label (e.g. "Push A", "Sauna"), NOT a date. The calendar day is workout_sessions.date.';
