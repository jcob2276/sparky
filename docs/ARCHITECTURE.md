# Sparky — architektura

Mapa przepływu danych. Konstytucja: [AGENTS.md](../AGENTS.md); rejestr funkcji i JWT:
[supabase/functions/README.md](../supabase/functions/README.md); czytelnicy/pisarze tabel:
[DATA_MAP.md](DATA_MAP.md). Ten dokument nie potwierdza stanu wdrożenia.

## Przepływ danych

```text
Telegram → vanguard-telegram → vanguard_telegram_inbox → vanguard-telegram-worker
                                               odpowiedzi → outbound_messages → vanguard-outbox-sender
Aplikacja / głos / vault ingest → vanguard-capture
                                     ↓
                               vanguard_stream (surowe evidence)
                                     ├→ vanguard-auto-classify → friction_events
                                     │                           ↓
                                     │                  confirmed_friction_events VIEW
                                     ├→ vanguard-architect → encje / relacje grafu
                                     └→ vanguard-wiki-compiler → wiki / kolejka weryfikacji

Oracle / analyst / syntezy ← stream, confirmed evidence, graf i pochodna wiki
Integracje / loggery domenowe → tabele domenowe → agregaty / UI / analizy
```

Vault ingest w `vanguard-capture` zapisuje chunki streamu; architect wyciąga relacje później.
Oracle nie zapisuje grafu ani wiedzy automatycznie na turze rozmowy. Wiki jest kompilowaną
pamięcią pochodną, nie dowodem źródłowym. Kontekst bieżący: stream 72h przed archiwum;
twierdzenie o wzorcu wymaga jawnego N.

Pętla dnia: capture przez cały dzień → południowy Wywiad → wieczorna refleksja.
`/koniec` może uruchomić refleksję wcześniej. Planowanie prowadzi aplikacja/Oracle przez
`daily_reconciliations.planning_summary`; wieczorny Telegram nie planuje jutra.
Poranne autonomiczne brief/ping i dawny midday check są usunięte.

## Granice domen

| Zapis | Właściciel / konsument |
|---|---|
| Swobodny tekst, kontekst | `vanguard_stream`; Telegram / capture |
| Tarcie i recovery | Wyłącznie stream → auto-classify; odczyt wzorców z confirmed VIEW |
| Zadania dnia | `daily_win_tasks`; PowerList zapisuje, Telegram `/teraz`, Oracle i recap czytają. Checkoff nie jest streamem ani embeddingiem |
| Projekty / zadania | `projects` / osobne `todo_sections`, `todo_items`; opcjonalny most `todo_sections.project_id`; milestone to `todo_items.is_milestone` |
| Nawyki, także Lenie | `habits` / `habit_logs`; bez kopii w streamie |
| Zamknięcie przeglądu zadań | `weekly_reviews.review_completed_at`; bez wpisu streamu |
| Trening / sauna | `workout_sessions` / `exercise_logs` |
| Alkohol, stres, choroba, podróż | `behavior_log` |
| Posiłki / kofeina | `daily_food_entries`; zapis i korekta tylko w aplikacji; Telegram `/dieta` czyta |
| Suplementy | `supplement_logs` |
| Obowiązki z wyprzedzeniem | `life_obligations`; Terminy i przypomnienia |

Formularze capture składa `src/components/core/DashboardFastCapture.tsx`; zapis pozostaje w API domen.
Wyłączone modele i integracje: [FEATURE_LIFECYCLE.md](FEATURE_LIFECYCLE.md).

## Granice kodu

| Ścieżka | Odpowiedzialność |
|---|---|
| `packages/domain/` | Czyste definicje i obliczenia wspólne dla Deno i UI; bez IO |
| `supabase/functions/_shared/` | Kernel backendu, auth, dostawcy, wspólny kontekst; [kontrakt](BACKEND_CONTRACT.md) |
| `supabase/functions/<nazwa>/` | Cienki router, handlery i prompty danej funkcji |
| `supabase/migrations/` | Niezmienne zastosowane migracje; [procedura](../supabase/migrations/README.md) |
| `src/lib/`, `src/hooks/`, `src/components/` | API/domena → stan React → UI; [przewodnik](FRONTEND_GUIDE.md) |
| `android/`, `src/lib/native/` | Capacitor; natywne API za guardem platformy |
| `scripts/` | Lokalne operacje i kontrole; [indeks](../scripts/README.md) |

Nie duplikuj obliczeń backendowych w UI; czystą logikę współdziel przez domenę.
Powierzchnie produktu i ich połączenia opisuje [VANGUARD_STATE.md](VANGUARD_STATE.md).

## Operacje

Oczekiwane crony i usunięte zadania definiuje [smoke-manifest.mjs](../scripts/ops/smoke-manifest.mjs).
Stan live sprawdzaj przez [cron-check.sql](../scripts/ops/cron-check.sql), nie historyczne godziny w dokumentach.
Kalendarz domenowy używa `Europe/Warsaw`; harmonogramy pg_cron weryfikuj osobno (UTC/DST).
Deploy i odbiór: [runbook](runbooks/deploy-edge-function.md).

`vector`, `pg_trgm`, `pg_net` pozostają w `public`: typy, operatory i rutyny zależą od tego
`search_path`. Ostrzeżenie `extension_in_public` jest zaakceptowane; przeniesienie wymaga
migracji wszystkich zależnych rutyn i testów.
