ALTER TABLE public.closer_daily_logs ADD COLUMN numbers_entered_at timestamptz;
COMMENT ON COLUMN public.closer_daily_logs.numbers_entered_at IS 'Explicit confirmation of daily sales numbers, including a deliberately entered zero. Context alone does not confirm numbers.';
-- Preserve legacy days whose note previously served as confirmation.
UPDATE public.closer_daily_logs SET numbers_entered_at = updated_at
WHERE dials + appointments + sales_calls + sales_closed > 0 OR nullif(btrim(notes), '') IS NOT NULL;
