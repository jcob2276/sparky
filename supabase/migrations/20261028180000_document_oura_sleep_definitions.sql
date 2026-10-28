-- Dokumentacja w schemacie: dwie różne definicje „godzin snu” w tabelach Oury.
-- Stwierdzone 2026-10-28: w 42 z 311 wspólnych dni total_sleep_hours różni się między oura_daily_summary i oura_enhanced
-- (np. 6,53 h i 0,21 h), bo summary sumuje wszystkie epizody snu z dnia (z drzemkami), a enhanced bierze najdłuższy epizod.
-- Wynik snu i gotowość są identyczne w obu tabelach (niezmiennik w db:check-invariants).
--
-- Cofnięcie: COMMENT ON COLUMN ... IS NULL;

COMMENT ON COLUMN public.oura_daily_summary.total_sleep_hours IS
  'Suma WSZYSTKICH epizodów snu z dnia (z drzemkami). Kanoniczne dobowe godziny snu (czytają je stan świata, recap, porównania okresów).';

COMMENT ON COLUMN public.oura_enhanced.total_sleep_hours IS
  'Najdłuższy epizod snu z dnia (główny sen, bez drzemek). INNA definicja niż oura_daily_summary.total_sleep_hours; nie porównywać ani nie mieszać.';

COMMENT ON TABLE public.oura_enhanced IS
  'Szczegóły nocy z Oury: osie czasu, składowe, kontrybutory. Dobowe skalary (sleep_score, readiness_score, steps) są kopią oura_daily_summary (niezmiennik w scripts/ops/check-db-invariants.mjs); godziny snu to inna definicja (główny sen).';

COMMENT ON TABLE public.oura_daily_summary IS
  'Kanoniczne wartości dobowe z Oury (wynik snu, gotowość, godziny snu jako suma epizodów, HRV, RHR, kroki).';
