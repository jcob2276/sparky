-- Self-declared work context; NULL means the user has not provided a rating.
ALTER TABLE public.closer_daily_logs
  ADD COLUMN work_energy smallint CHECK (work_energy BETWEEN 1 AND 5),
  ADD COLUMN work_pressure smallint CHECK (work_pressure BETWEEN 1 AND 5);
COMMENT ON COLUMN public.closer_daily_logs.work_energy IS 'User-declared work energy, 1 low to 5 high. Never inferred from sales performance.';
COMMENT ON COLUMN public.closer_daily_logs.work_pressure IS 'User-declared work pressure, 1 low to 5 high. NULL is unknown.';
