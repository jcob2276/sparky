# Jedno źródło prawdy (SSOT)

Każda informacja ma **jednego właściciela**: jedno miejsce, w którym jest zapisana. Reszta aplikacji, Oracle i agenci
AI **czytają** z niego i nie trzymają własnych kopii liczb. Rozjazd tej samej informacji w kilku miejscach jest błędem,
nawet jeśli każda kopia osobno wygląda sensownie.

## Zasady (dla ludzi i agentów)

1. Zanim wpiszesz liczbę, cel, próg albo listę wartości do kodu, promptu lub tekstu, sprawdź tabelę niżej.
2. Jeśli fakt ma właściciela, czytaj z niego (hook `useLifeTargets`, resolver `personalTargets`, stała z jednego modułu).
3. Jeśli faktu nie ma w tabeli, dopisz go tu **w tym samym commicie**, razem z właścicielem.
4. W promptach AI i w tekstach dla użytkownika nie wpisuj liczb „z głowy”: liczba pochodzi z danych albo jej nie ma.
5. Tekst opisowy (np. wizja w Fundamencie) nie jest źródłem liczb. Liczby celów żyją w tabelach i stamtąd są podawane.
6. Zmiana wartości = zmiana u właściciela. Po zmianie grepuj kod po starej wartości i nazwie.

## Cele i parametry osobiste

| Fakt | Właściciel (zapis) | Jak czytać |
|---|---|---|
| Cel tłuszczu (%) | `nutrition_profile.goal_body_fat` | `useLifeTargets().bodyFatPct` |
| Cel wyciskania (kg, e1RM) | `life_targets.bench_goal_kg` | `useLifeTargets().benchKg` |
| Cel dochodu netto (zł/msc) | `life_targets.income_goal_net_pln` | `useLifeTargets().incomeNetPln` |
| Cel majątku netto (zł) | `finance_profile.net_worth_target` | `useLifeTargets().netWorthPln` |
| Cele tygodniowe sprzedaży (umówienia, sales calle, rozmowy odebrane, godziny) | `goal_kpis` (projekt closer) | `useLifeTargets().weekly*` |
| Cel snu (h) | `nutrition_profile.sleep_target_hours` | `personalTargets.sleepTargetH` (edge), `useLifeTargets().sleepH` |
| Białko i kcal dziennie | `nutrition_targets` (najnowszy wiersz) | `personalTargets` (edge), `useLifeTargets()` |
| Wizja i tożsamość (tekst) | `user_fundament` | Oracle; bez liczb celów w treści |

## Definicje i progi (kod, jeden moduł na definicję)

| Definicja | Właściciel | Uwagi |
|---|---|---|
| Pełny dzień jedzenia (próg kcal, bez dzisiaj) | `src/lib/chronicle/nutritionDays.ts` (`MIN_FULL_DAY_KCAL`) | kopie w funkcjach edge `period-compare` i `analyze-food-quality` (osobne bundle) |
| Aktywności liczone jako bieganie | `src/lib/runSports.ts` | kopia w `period-compare` (osobny bundle) |
| Strefa czasu aplikacji | `WARSAW_TZ` w `@vanguard/domain` | dni jako klucze `YYYY-MM-DD` w Warszawie |
| Tydzień (pon–nd) | `getWeekStartWarsaw` | |
| Cele ciała jako stałe awaryjne | `src/lib/lifeGoals.ts` | tylko wartości domyślne do czasu załadowania z bazy |

## Znane rozjazdy do ujednolicenia (usuwaj wiersz, gdy naprawione)

| Temat | Gdzie się rozjeżdża | Decyzja |
|---|---|---|
| Próg „krótka noc” | kilka różnych progów (6 h, 6.5 h, 6.8 h) w recap, period-compare, Oracle, `/teraz`, `computePerDay`, a cel snu pochodzi z profilu | jedna definicja w `@vanguard/domain`: jeden próg „krótka noc” i jedno „ostrzeżenie”, cel z profilu |
| Persona AI | „Antigravity” w promptach, aplikacja nazywa się Sparky | do decyzji użytkownika |
| Portfele w Inwestycjach | zakodowane na sztywno (Jakub, Kondzio) vs `finance_holdings` | zostawione celowo, do przeniesienia do Finansów |
| Cel Duch i cel sprintu 3 | `life_goals.goal_duch` pusty, brak wpisu `sprint_goals` | do uzupełnienia przez użytkownika |
