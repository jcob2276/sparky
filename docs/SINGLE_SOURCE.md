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
6. `src/lib/lifeGoals.guard.test.ts` oblewa build, gdy w kodzie pojawi się wpisany na sztywno cel tłuszczu, wyciskania albo dochodu.
7. Zmiana wartości = zmiana u właściciela. Po zmianie grepuj kod po starej wartości i nazwie.

## Cele i parametry osobiste

| Fakt | Właściciel (zapis) | Jak czytać |
|---|---|---|
| Cel tłuszczu (%) | `nutrition_profile.goal_body_fat` | `useLifeTargets(userId).bodyFatPct` |
| Cel wyciskania (kg, e1RM) | `life_targets.bench_goal_kg` (edycja: Ustawienia → Cele liczbowe) | `useLifeTargets(userId).benchKg` |
| Cel dochodu netto (zł/msc) | `life_targets.income_goal_net_pln` | `useLifeTargets(userId).incomeNetPln` |
| Cel majątku netto (zł) | `finance_profile.net_worth_target` | `useLifeTargets().netWorthPln` |
| Cele tygodniowe sprzedaży (umówienia, sales calle, rozmowy odebrane, godziny) | `goal_kpis` (projekt closer) | `useLifeTargets().weekly*` |
| Cel snu (h) | `nutrition_profile.sleep_target_hours` | `derivePersonalTargets().sleepTargetH` |
| Białko i kcal dziennie | `nutrition_targets` (wiersz obowiązujący w danym dniu: `date <= dzień`, najnowszy; nie „najnowszy w ogóle”, bo trener zapisuje cel na jutro z wyprzedzeniem; frontend: `fetchNutritionTargetForDay`), awaryjnie waga × g/kg z profilu | `derivePersonalTargets` w `@vanguard/domain` (edge przez `personalTargets`, frontend wprost) |
| Wizja i tożsamość (tekst) | `user_fundament` | Oracle; bez liczb celów w treści |

## Definicje i progi (kod, jeden moduł na definicję)

| Definicja | Właściciel | Uwagi |
|---|---|---|
| Pełny dzień jedzenia (próg kcal, bez dzisiaj) | `MIN_FULL_DAY_KCAL` w `@vanguard/domain` | frontend i funkcje edge importują tę samą stałą |
| Aktywności liczone jako bieganie | `RUN_SPORT_TYPES` / `isRunSport` w `@vanguard/domain` | `src/lib/runSports.ts` tylko re-eksportuje |
| Próg „krótka noc” i „ostrzeżenie o śnie” | `HEALTH_THRESHOLDS.SLEEP_SHORT_H` / `SLEEP_WARNING_H` w `@vanguard/domain` | frontend i funkcje edge importują; nie wpisuj literału godzin w kodzie |
| Sprint 12-tygodniowy od 1 marca | `getSprintInfoForDate` w `@vanguard/domain` | `getSprintInfo()` we froncie tylko dokłada dzisiejszą datę |
| Nazwa aplikacji i persony AI w promptach | `APP_NAME` w `@vanguard/domain` | nie wpisuj nazwy asystenta w treści promptu |
| Strefa czasu aplikacji | `TIMEZONE` (`WARSAW_TZ`) w `@vanguard/domain` | dni jako klucze `YYYY-MM-DD` w Warszawie; nie wpisuj literału strefy; `src/lib/warsawDay.guard.test.ts` zabrania „dzisiaj” z UTC |
| Tydzień (pon–nd) | `getWeekStartWarsaw` | |
| Wartości awaryjne celów i formatowanie ich tekstów | `src/lib/lifeGoals.ts` | tylko do czasu załadowania z bazy; odczyt przez `lifeTargetsApi.ts` |

## Znane rozjazdy do ujednolicenia (usuwaj wiersz, gdy naprawione)

| Temat | Gdzie się rozjeżdża | Decyzja |
|---|---|---|
| Portfele w Inwestycjach | zakodowane na sztywno (Jakub, Kondzio) vs `finance_holdings` | zostawione celowo, do przeniesienia do Finansów |
| Cel Duch i cel sprintu 3 | `life_goals.goal_duch` pusty, brak wpisu `sprint_goals` | do uzupełnienia przez użytkownika |
