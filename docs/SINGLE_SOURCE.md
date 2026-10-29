# Jedno źródło prawdy (SSOT)

Każdy fakt ma jednego właściciela. UI, Oracle i agenci czytają z niego; kopia pochodna
ma jednego pisarza i sprawdzany niezmiennik. Zasady pracy: [AGENTS](../AGENTS.md).

## Zasady (dla ludzi i agentów)

1. Zanim wpiszesz liczbę, cel, próg albo listę wartości do kodu, promptu lub tekstu, sprawdź tabelę niżej.
2. Jeśli fakt ma właściciela, czytaj z niego (hook `useLifeTargets`, resolver `personalTargets`, stała z jednego modułu).
3. Jeśli faktu nie ma w tabeli, dopisz go tu **w tym samym commicie**, razem z właścicielem.
4. W promptach AI i w tekstach dla użytkownika nie wpisuj liczb „z głowy”: liczba pochodzi z danych albo jej nie ma.
5. Tekst „O mnie dla AI” nie jest źródłem liczb. Liczby celów żyją w tabelach i stamtąd są podawane.
6. `src/lib/lifeGoals.guard.test.ts` oblewa build, gdy w kodzie pojawi się wpisany na sztywno cel tłuszczu, wyciskania albo dochodu.
7. Zmiana wartości = zmiana u właściciela. Po zmianie grepuj kod po starej wartości i nazwie.

## Cele i parametry osobiste

| Fakt | Właściciel (zapis) | Jak czytać |
|---|---|---|
| Cel tłuszczu (%) | `nutrition_profile.goal_body_fat` | `useLifeTargets(userId).bodyFatPct` |
| Cel wyciskania (kg, e1RM) | `life_targets.bench_goal_kg` (edycja: Ustawienia → Cele liczbowe) | `useLifeTargets(userId).benchKg` |
| Cel dochodu netto (zł/msc) | `life_targets.income_goal_net_pln` | `useLifeTargets(userId).incomeNetPln` |
| Cel majątku netto (zł) | `finance_profile.net_worth_target`; fallback `DEFAULT_PROFILE` w `financeApi.ts` | `useFinanceBundle(userId).data.profile.net_worth_target` |
| Cele tygodniowe sprzedaży (umówienia, sales calle, rozmowy odebrane, godziny) | `goal_kpis` (projekt closer) | `useCloserTargets(userId)` |
| Cel skuteczności sprzedaży (close rate) | brak właściciela: nie wpisuj procentu do UI ani promptów | dopisz KPI w `goal_kpis` i czytaj stamtąd, jeśli ma wrócić |
| Aktualny poziom tłuszczu (%) | ostatni pomiar `body_metrics.body_fat` | `nutrition_profile.current_body_fat_est` to tylko zapas, gdy pomiaru brak (healthspan, trener żywieniowy) |
| Estymata BF Navy dla mężczyzn | obwód `belly`, awaryjnie `waist`, oraz `neck` i wzrost | `compute_navy_bf` i helper UI stosują ten sam kontrakt; zmiana samego brzucha uruchamia przeliczenie |
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
| Wyniki dnia Closera (sales calle i czas pracy) | `closer_daily_logs` | nagrania `closer_calls` wyznaczają minimum przez triggery; większy wpis ręczny zostaje, tych samych rozmów nie dodajemy drugi raz; `kpi_entries` jest projekcją tygodnia |
| Wartości awaryjne celów i formatowanie ich tekstów | `src/lib/lifeGoals.ts` | tylko do czasu załadowania z bazy; odczyt przez `lifeTargetsApi.ts` |

## Dane w bazie: właściciel, kopie pochodne i niezmienniki

Kopia pochodna jest dozwolona tylko wtedy, gdy ma jednego pisarza (trigger albo funkcja) i niezmiennik w `npm run db:check-invariants`.
Rozjazd w niezmienniku znaczy, że ktoś zapisuje obok właściciela.

| Fakt | Właściciel (zapis) | Kopia pochodna i kto ją utrzymuje | Niezmiennik |
|---|---|---|---|
| Epizod nawyku „Lenie” (komenda `/lenie`) | `habit_logs` + `habits` (jeden zapis: `recordLenieEpisode`) | brak kopii; analizy czytają `habit_logs` (widok `vanguard_consolidated_activities`, `compute-behavior-effects` przez `lenieAsBehaviorRows`) | `behavior_log` nie ma klucza `lenie` |
| Dzienny agregat jedzenia | `daily_food_entries` | `daily_nutrition` (trigger) | kcal i białko = suma wpisów dnia |
| Zadania dnia (sloty 1–5) | `daily_win_tasks` (wiersze) | `task_N`/`done_N` są adapterem odczytu (`adaptDailyWinTasks` / `withLegacySlots`), nie kolumnami `daily_wins`; RPC planu zapisuje tylko wiersze zadań | tytuł i done slotów zgodne z wierszami zadań |
| Wynik snu i gotowość dobowa | `oura_daily_summary` | `oura_enhanced.sleep_score/readiness_score` | równe w obu tabelach |
| Kroki Oury | `oura_daily_summary.steps` | `oura_enhanced.steps`: projekcja w bazie; import szczegółów nie zapisuje niezależnej liczby kroków | równe po właścicielu/dacie; obciążenie czyta źródło kanoniczne, zero jest znaną wartością |
| Godziny snu | `oura_daily_summary.total_sleep_hours` = suma epizodów z dnia | `oura_enhanced.main_sleep_hours` = najdłuższy epizod (inna definicja, nie kopia) | nie porównujemy |
| Powiązania grafu wiedzy | `vanguard_entity_links` (model zapisu) | `claims` + `entities` + `relations` (trigger; Oracle czyta `claims`) | źródło powiązania istnieje w `entities` |
| Lista relacji i aliasy encji grafu | `relations` (lista, opis, klucz obcy z powiązań) i `entity_aliases` (aliasy) | brak; nie przywracać dawnych kopii `vanguard_relation_ontology` / `vanguard_entity_aliases` | FK `vanguard_entity_links.relation` → `relations(name)` |
| Cel żywieniowy w dniu | `nutrition_targets` (wiersz `date <= dzień`) | brak; odczyt wyłącznie przez `fetchNutritionTargetForDay` (frontend) i `targetForDay` (funkcje brzegowe) | reguła w testach obu warstw |
| Biometria stanu świata | `oura_daily_summary` | brak; wartości dnia tylko z dokładnej daty, wcześniejszy pomiar osobno (`last_available` z własną datą) | testy `worldStateOura` |

Klucze obce są obowiązkowe dla każdej kolumny `*_id`, która wskazuje wiersz innej tabeli (`NOT VALID`, potem `VALIDATE`, `ON DELETE SET NULL` dla powiązań opcjonalnych).
Pominięte celowo: `vanguard_pipeline_runs.run_id` (identyfikator korelacji) i kolumny z logicznym grupowaniem bez tabeli rodzica (`meal_group_id`, `request_id`).

## Znane rozjazdy do ujednolicenia (usuwaj wiersz, gdy naprawione)

| Temat | Gdzie się rozjeżdża | Decyzja |
|---|---|---|
| Samodzielne aktywności z Oury (bez odpowiednika w Stravie) | różne zakresy desktopu i konsumentów `is_oura = false` | przed ujednoliceniem sprawdzić rzeczywiste rekordy i uzgodnić zakres z użytkownikiem |
| Portfele w Inwestycjach | stałe portfele vs `finance_holdings` | sprawdzić obecnych konsumentów przed przeniesieniem do Finansów |
| Cel Duch i cel sprintu | brak deklaracji nie uprawnia do automatycznego uzupełnienia | użytkownik wybiera cel i rytm jego aktualizacji |

## Jak szukać rozjazdów (metoda dla agentów)

1. **Literały:** szukaj celów/progów w `src/`, funkcjach i domenie; liczba o tym samym znaczeniu ma jednego właściciela.
2. **Definicje:** porównaj wybór daty, najnowszego obowiązującego wiersza, pełnych dni i aktywności; pułapki oraz helpery wskazano wyżej i w [lessons](../lessons.md).
3. **Projekcje:** porównaj dane ze źródłem po userze/dacie; poprawkę utrwal w `db:check-invariants`.
4. **Konsumenci:** sprawdź także zwracane pola obiektów — Knip nie wykrywa wszystkich nieużywanych pól.
5. **Prompty/cache:** fikcyjny fallback nie jest faktem. Sprawdź pisarzy i wspólną invalidację (`invalidateLifeTargets`, `invalidateGoalSpineCache`, `queryKeys`). Brak wejścia daje NULL, nie zero/false.

Zmianę udowodnij testem odtwarzającym błąd lub zapytaniem przed/po. Definicje produktu,
kasowanie danych i godziny powiadomień wymagają decyzji użytkownika.

## Odrębne magazyny i retencja

- `vanguard_knowledge` czytają architect i `_shared/vanguardCoreMethods`; explicit Telegram zapisuje fakty, compiler kopiuje strony. Nie scalać z wiki bez przepięcia obu czytelników.
- `v_day` budować dopiero razem z rzeczywistym konsumentem; sama wspólna data nie uzasadnia nowego widoku.
- Retencję `vanguard_oracle_runs`, `view_events` i `vanguard_raw_events` definiuje `cleanup_old_logs`; nie utrzymuj kopii harmonogramu/liczników w instrukcjach.
