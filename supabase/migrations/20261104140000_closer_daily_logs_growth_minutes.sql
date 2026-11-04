-- Minuty self-refleksji i nauki obok liczb sprzedażowych dnia (plan listopada).
-- Refleksja tekstowa zostaje w istniejącej kolumnie `notes`; dodajemy tylko czas.
ALTER TABLE public.closer_daily_logs
  ADD COLUMN IF NOT EXISTS reflection_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS learning_minutes integer NOT NULL DEFAULT 0;

ALTER TABLE public.closer_daily_logs
  ADD CONSTRAINT closer_daily_logs_reflection_minutes_check CHECK (reflection_minutes BETWEEN 0 AND 1440),
  ADD CONSTRAINT closer_daily_logs_learning_minutes_check CHECK (learning_minutes BETWEEN 0 AND 1440);

COMMENT ON COLUMN public.closer_daily_logs.reflection_minutes IS 'Minuty self-refleksji tego dnia; tekst refleksji w notes.';
COMMENT ON COLUMN public.closer_daily_logs.learning_minutes IS 'Minuty nauki tego dnia (sprzedaż, perswazja, skille).';
