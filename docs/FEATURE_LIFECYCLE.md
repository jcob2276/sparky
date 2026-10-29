# Sparky — cykl życia funkcji

Sprawdź przed przywracaniem starej ścieżki. Aktywne powierzchnie opisuje
[VANGUARD_STATE.md](VANGUARD_STATE.md), funkcje i triggery [generowany rejestr](../supabase/functions/README.md).

- **Active** — utrzymywana ścieżka; poprawiaj w miejscu.
- **Disabled** — celowo obecna, lecz wyłączona; nie rozszerzaj bez jawnej reaktywacji.
- **Deprecated** — zastąpiona; tylko niezbędna zgodność, bez nowych konsumentów.
- **Dropped** — brak aktywnej ścieżki; nie czytaj, zapisuj ani mockuj jako bieżącego sygnału.
- **Legacy** — historyczny model, którego istniejący build musi działać; nie punkt startu nowych zachowań.

## Granice reaktywacji

| Ścieżka | Status / obowiązujący następca |
|---|---|
| Poranny brief/ping, legacy midday check, observation-only | Dropped; stream → południowy Wywiad → wieczorna refleksja. Planowanie w app/Oracle |
| Yazio, `sync-yazio` | Dropped; żywienie w aplikacji. Bez przechowywania credentiali Yazio |
| Telegram zapis/korekta posiłków i etykiet | Dropped; tylko aplikacja. Suplementy, post i read-only `/dieta` pozostają |
| Todoist | Dropped; natywne `todo_*` / `projects` |
| StayFree, `screen_time_logs/details` | Dropped; bez zastępczych zer/mocków. `phone_usage_daily` należy do aktywnych źródeł ActivityWatch/Android |
| Career (`career_projects/moves/evidence/decisions`), `goals` | Dropped; bieżące projekty w `projects`, zadania w Todo |
| `project_checkpoints` | Dropped; milestone = `todo_items.is_milestone`, FK zadań dnia wskazuje Todo; bez fallbacku do starej tabeli |
| `daily_habits` ze stałymi kolumnami | Deprecated; nowe zapisy `habits`/`habit_logs`, stary model tylko do historycznych odczytów |
| Oryginalny workout UI / `workout_*` | Legacy; stabilizuj istniejący model |
| `analyze-training` i raport Telegram plan-vs-Strava | Dropped; `analyze-training-load` pozostaje analizą w UI |
| `vanguard_correlations`, `vanguard_temporal_links`, `vanguard_youtube` | Dropped; nie przywracaj ghost prediction/intervention sygnałów |
| `vanguard_intentions` | Dropped; ewentualny następca wymaga jawnego user-controlled zapisu/statusu i guardraila deklaracji z PRODUCT_PRINCIPLES |
| `vanguard-briefing/backfill/debug-retrieval`, `vanguard-weekly-brief`, stary WeeklyReview | Dropped; rytuał Direction i `kpi_entries` zamiast równoległych raportów |
| Niezamontowane OuraWidget/OuraEnhanced/SleepDebtCard, MentorChat, GraphMind/ThoughtStream, IntentionTracker/ManifestationBoard, LocationTracker/AWImporter | Dropped; historia w Git, bez przywracania martwych widgetów ani czatu webowego |

Zmiana statusu wymaga aktualizacji tego pliku i aktywnych konsumentów. Gdy dotyczy przepływu,
popraw architekturę; gdy Edge Functions — nagłówki i generowany rejestr; gdy deploy/cron/smoke —
`config.toml`, `scripts/ops/smoke-manifest.mjs` i odpowiednie skrypty deployu.
Nie traktuj dokumentacji jako potwierdzenia wdrożenia lub świeżości integracji.
