-- Krok 2/2: oura_enhanced.total_sleep_hours (glowny sen) -> main_sleep_hours. Czytelnicy przepieci, sync/enhanced.ts zapisuje nowa nazwe.
ALTER TABLE public.oura_enhanced DROP COLUMN IF EXISTS main_sleep_hours;
ALTER TABLE public.oura_enhanced RENAME COLUMN total_sleep_hours TO main_sleep_hours;
COMMENT ON COLUMN public.oura_enhanced.main_sleep_hours IS 'Najdluzszy epizod snu z dnia (glowny sen, bez drzemek). To NIE jest suma doby jak oura_daily_summary.total_sleep_hours.';
