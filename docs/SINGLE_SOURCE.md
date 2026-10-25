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
| Cel majątku netto (zł) | `finance_profile.net_worth_target` (domyślnie 100 000 w bazie, lustrzany `DEFAULT_PROFILE` w `financeApi.ts`) | `useFinanceBundle(userId).data.profile.net_worth_target` |
| Cele tygodniowe sprzedaży (umówienia, sales calle, rozmowy odebrane, godziny) | `goal_kpis` (projekt closer) | `useCloserTargets(userId)` |
| Cel skuteczności sprzedaży (close rate) | brak właściciela: nie wpisuj procentu do UI ani promptów | dopisz KPI w `goal_kpis` i czytaj stamtąd, jeśli ma wrócić |
| Aktualny poziom tłuszczu (%) | ostatni pomiar `body_metrics.body_fat` | `nutrition_profile.current_body_fat_est` to tylko zapas, gdy pomiaru brak (healthspan, trener żywieniowy) |
| Cel snu (h) | `nutrition_profile.sleep_target_hours` | `derivePersonalTargets().sleepTargetH` |
| Białko i kcal dziennie | `nutrition_targets` (wiersz obowiązujący w danym dniu: `date <= dzień`, najnowszy; nie „najnowszy w ogóle”, bo trener zapisuje cel na jutro z wyprzedzeniem; frontend: `fetchNutritionTargetForDay`), awaryjnie waga × g/kg z profilu | `derivePersonalTargets` w `@vanguard/domain` (edge przez `personalTargets`, frontend wprost) |
| Wizja i tożsamość (tekst) | `user_fundament` | Oracle; liczby celów dostaje osobno z właścicieli (blok „CELE LICZBOWE” w prompcie), tekst wizji nie jest ich źródłem |

## Definicje i progi (kod, jeden moduł na definicję)

| Definicja | Właściciel | Uwagi |
|---|---|---|
| Pełny dzień jedzenia (próg kcal, bez dzisiaj) | `MIN_FULL_DAY_KCAL` w `@vanguard/domain`, filtr `completedNutritionDays` | każda średnia z dni (Kronika, Puls Tygodnia, eksport, `period-compare`) liczy tylko pełne dni |
| Aktywności sportowe (liczenie biegów, km, sesji) | widok `strava_activities_clean` z `is_oura = false` | surowa `strava_activities` zawiera biegi zapisane podwójnie (Oura + Strava); czytaj ją tylko do synchronizacji |
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
| Samodzielne aktywności z Oury (bez odpowiednika w Stravie) | pulpit desktopowy je liczy, Kronika, porównanie okresów, Puls i recap pomijają (`is_oura = false`) | do decyzji użytkownika; dziś dotyczy jednego biegu (24.05, 5,2 km) |
| Portfele w Inwestycjach | zakodowane na sztywno (Jakub, Kondzio) vs `finance_holdings` | zostawione celowo, do przeniesienia do Finansów |
| Cel Duch i cel sprintu 3 | `life_goals.goal_duch` pusty, brak wpisu `sprint_goals` | do uzupełnienia przez użytkownika |

## Jak szukać rozjazdów (metoda dla agentów)

Rozjazd to ta sama informacja w dwóch miejscach z różną wartością albo definicją. Szukaj ich po kolei w pięciu warstwach,
a każde znalezisko potwierdź danymi, zanim coś zmienisz.

1. **Literały w kodzie.** Grepuj liczby celów i progów (`14`, `100 kg`, `150`, `6.5`, `1000`, `'%sauna%'`,
   `'Europe/Warsaw'`, listy typu `['Run', 'TrailRun', ...]`) w `src`, `supabase/functions` i `packages/domain`.
   Dwa wystąpienia tej samej liczby z tym samym znaczeniem to kandydat na jedną stałą w `@vanguard/domain`.
2. **Kopie logiki.** Szukaj funkcji robiących to samo inaczej: „najnowszy wiersz” (`order desc limit 1`), średnie z dni,
   początek tygodnia, sprint, „dzisiaj”. Typowe pułapki z historii repo:
   - `order('date', desc).limit(1)` bez `lte('date', dzień)` łapie wiersze zapisane z wyprzedzeniem (cel i plan na jutro);
   - `new Date().toISOString().slice(0, 10)` to dzień w UTC, po północy czasu polskiego wczorajszy (strażnik: `warsawDay.guard.test.ts`);
   - średnie z dni bez `completedNutritionDays` wliczają dzisiejszy i niepełne dni;
   - surowa `strava_activities` zamiast widoku `strava_activities_clean` dubluje biegi Oura + Strava.
3. **Kopie danych w bazie.** Każda tabela pochodna (`kpi_entries`, `vanguard_daily_aggregates`, `daily_nutrition`,
   `oura_enhanced`) porównaj zapytaniem ze źródłem (suma dni, ten sam dzień w dwóch tabelach). Rozjazd w danych
   zwykle wskazuje błąd w kodzie zapisu, np. upsert całego wiersza nadpisujący istniejące pola `null`-em. Po naprawie
   dopisz regułę do `scripts/ops/check-db-invariants.mjs`.
4. **Pola liczone, których nikt nie czyta.** Dla każdego pola zwracanego przez hook lub API sprawdź grepem, czy ma
   konsumenta w komponencie. Knip łapie martwe eksporty, ale nie martwe pola obiektu. Martwe pola z `?? 0` to
   podwójny problem: zbędne zapytania i brak danych udający zero.
5. **Prompty AI i teksty.** Szukaj zapasów typu `x || 'wymyślony fakt'` i liczb wpisanych do promptu. Zapas w prompcie
   nigdy nie jest faktem o użytkowniku; liczby celów idą do promptu z właścicieli (blok „CELE LICZBOWE” w Oracle).

Przy każdej zmianie wartości lub nowym `useQuery` na cudzych danych sprawdź też wszystkich piszących i ich
unieważnianie cache (np. `invalidateLifeTargets`, `invalidateGoalSpineCache`), inaczej ekrany pokażą starą liczbę.
Pole wyliczone bez danych wejściowych ma być `null` („nie wiem”), a nie `false` albo `0`.

Każdą poprawkę dowodź testem odtwarzającym błąd na starym kodzie albo zapytaniem pokazującym dane przed i po.
Decyzje produktowe (która definicja jest właściwa, kasowanie danych, godziny powiadomień) zapisuj w tabeli
„Znane rozjazdy” i zostaw użytkownikowi.
