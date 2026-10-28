-- Krok 1/2 rozdzielenia nazw: oura_enhanced.total_sleep_hours to GLOWNY sen (najdluzszy epizod), a oura_daily_summary.total_sleep_hours to suma doby.
-- Dwie rozne definicje pod ta sama nazwa myla; w oura_enhanced nowa nazwa to main_sleep_hours.
-- Kolumna generowana pozwala przepiac czytelnikow bez zmiany zapisu; po wdrozeniu frontendu (krok 2) zamieniamy ja na zwykla kolumne przez rename.
ALTER TABLE public.oura_enhanced
  ADD COLUMN IF NOT EXISTS main_sleep_hours numeric GENERATED ALWAYS AS (total_sleep_hours) STORED;
COMMENT ON COLUMN public.oura_enhanced.main_sleep_hours IS 'Najdluzszy epizod snu z dnia (glowny sen, bez drzemek). Odpowiednik dawnego total_sleep_hours z tej tabeli; NIE jest sumą doby jak oura_daily_summary.total_sleep_hours.';
