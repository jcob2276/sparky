# Sparky — backlog

Jedyna kolejka otwartej pracy. Kierunek: [KIERUNEK](docs/direction/KIERUNEK.md).
Bieżący handoff: [ACTIVE_WORK](docs/agent/ACTIVE_WORK.md).
Zasady i dokumenty domenowe: [indeks](docs/README.md).

- **RÓB** — jedyna aktywna kolejka, w kolejności poniżej.
- **PRZY OKAZJI** — tylko przy potrzebnej zmianie danego modułu.
- **ZAMROŻ** — wymaga świadomego przywrócenia do RÓB; obecność kodu nie oznacza odbioru.
- Zamknięcie wymaga konsumenta wyniku i dowodu działania. Blokady bezpieczeństwa i zależności mają pierwszeństwo.
- Zakończone zadania i dawne audyty zachowuje Git. Nie odtwarzać z nich kolejki ani stanu produkcji.

<a id="rob"></a>

## RÓB — kolejność wykonania

1. [DC-06 — aktualne źródło przed snapshotem i cache](#dc-06)
2. [DC-09 — korekta treningu przelicza właściwe dni](#dc-09)
3. [DC-12 — zakończony replay odświeża konsumentów](#dc-12)
4. [Zakład C / Etap 1 — kontrola sum, agregatów i izolacji](#kontrola-agregatow)
5. [Zakład C — Jedzenie ze zdjęcia i tekstu](#jedzenie-capture)
6. [Telegram inbox — równoczesne powtórzenia i timeout](#telegram-inbox)
7. [Zakład C — Dyktowanie](#dyktowanie)
8. [Porządkowanie — BLE, nagranie i offline na urządzeniu](#odbior-urzadzenia)
9. [Porządkowanie — regresja wspólnego drzewa i przegląd](#regresja-drzewa)
10. [Zakład C / Etap 2 — rzeczywiste odpowiedzi Oracle](#odbior-oracle)
11. [Zakład C / Etap 3 — zgodność celu BF](#cel-bf)
12. [Zakład C — Pamięć celów, preferencji i ograniczeń](#pamiec-deklaracji)
13. [Kartoteka — MedicalRecordsView / medical_events](#kartoteka)
14. [Zakład C — Kontekst wyników badań](#kontekst-badan)
15. [Zakład C — Objawy i możliwe czynniki towarzyszące](#objawy)
16. [Zakład C — Podsumowania dnia, tygodnia i miesiąca](#podsumowania)
17. [Zakład C — Luki żywieniowe i składniki odżywcze](#skladniki-odzywcze)
18. [Zakład C — Zależności sen–HRV, stres–HRV i zachowania–wyniki](#zaleznosci)
19. [Zakład C — Analizy i własne wykresy](#analizy)

### Część III / DC-06 — aktualne źródło przed snapshotem i cache
<a id="dc-06"></a>

- [ ] Żywe wartości źródłowe mają pierwszeństwo w `dashboardApi.ts` i `_shared/worldState.ts`.
  Rozróżnić zero, brak i błąd; cache musi mieć ważność/rewizję oraz unieważnianie dotkniętych dat.
  Nie opierać poprawności na odświeżeniu Telegrama bez await.
  **Zrobione 2026-10-29 (828b2d71):** cache world state ma TTL 15 min także dla przeszłych dni
  (`isWorldStateCacheFresh`) i jest unieważniany po korekcie posiłku i treningu (best-effort).
  **Zostaje:** `dashboardApi.ts` używa world state bez kontroli `updated_at`; fallback białka.
  **Odbiór:** białko 0 nie staje się dawnym dodatnim wynikiem; korekta historii odświeża
  Dashboard, tydzień i Oracle z tego samego źródła.

### Część III / DC-09 — korekta treningu przelicza właściwe dni
<a id="dc-09"></a>

- [ ] W `workoutApi.ts`, `useStatsData.ts` i `strainRefresh.ts` przekazać stare i nowe daty
  zmiany do istniejących przeliczeń oraz unieważnić zależne okna i odczyty.
  **Odbiór:** edycja, przeniesienie, usunięcie i zapis wstecz dają zgodne strain/world state
  oraz podsumowania dotkniętych i zależnych dni; nie wystarcza `days: 1`.

### Część III / DC-12 — replay odświeża konsumentów
<a id="dc-12"></a>

- [ ] Po potwierdzonym zapisie w `offlineQueue.ts` unieważnić klucze dotkniętych domen.
  Enqueue nie oznacza zatwierdzenia operacji.
  **Odbiór:** wolny replay i wyścig z wcześniejszym refetch kończą się zgodnym UI/bazą
  po reconnect, bez dodatkowego kliknięcia.

### Zakład C / Etap 1 — kontrola agregatów
<a id="kontrola-agregatow"></a>

- [ ] Sprawdzić testy po poprawkach, kontrolny SELECT sum `daily_food_entries` vs
  `daily_nutrition` oraz izolację użytkowników. Rozszerzać istniejące RPC/projekcje,
  bez trzeciego agregatora. Daty i stany danych muszą być zgodne w UI i Oracle.

### Zakład C — Jedzenie ze zdjęcia i tekstu
<a id="jedzenie-capture"></a>

- [ ] Odebrać istniejący capture/`parse-food-nl`: porcja → podgląd → potwierdzenie →
  atomowy zapis → zgodne sumy → korekta. Sprawdzić jednostki, niepewne dopasowania,
  dania złożone, pochodzenie `parse_meta` oraz retry z tym samym ID.
  Jawne ilości i korekty użytkownika mają pierwszeństwo; import nie jest potwierdzonym źródłem.
  Podejrzane wartości kierować do potwierdzenia, bez cichego przepisywania historii.
  Jedzenie dodaje się i poprawia wyłącznie w aplikacji; Telegram tylko odczytuje `/dieta`.

### Część III — Telegram inbox
<a id="telegram-inbox"></a>

- [ ] Potwierdzić równoczesne powtórzenia oraz niejednoznaczny timeout po INSERT
  do `vanguard_telegram_inbox`. Błąd zapisu ma być ponawialny i audytowany.
  Guard wiadomości nie dowodzi atomowej deduplikacji inbox; nie obiecywać exactly-once.

### Zakład C — Dyktowanie
<a id="dyktowanie"></a>

- [ ] Odebrać istniejące voice/Gemini: transkrypcja → rozpoznanie polecenia →
  właściwa odpowiedź/operacja i czytelny błąd. Zachować tekst oraz zasoby mikrofonu
  przy przerwaniu, bez równoległego transkrybera.

### Porządkowanie — odbiór na urządzeniu
<a id="odbior-urzadzenia"></a>

- [ ] Na fizycznym urządzeniu sprawdzić ponowne połączenie BLE, przerwanie nagrania
  i offline → online w APK. Osobno odebrać zapis kontekstu/notatek closera oraz
  odtwarzanie Fathom na zalogowanej PWA; zachować link zewnętrzny przy błędzie playera.
  Porównać tę samą noc Oura: datę, przedział, sumy/fazy, ruch i HR/HRV lub nazwane braki;
  kontrakt: [BIOMETRICS](docs/surface-contracts/BIOMETRICS.md).

### Porządkowanie — regresja wspólnego drzewa
<a id="regresja-drzewa"></a>

- [ ] Po zakończeniu równoległej pracy uruchomić pełną regresję i niezależny przegląd.
  Zestawy kontroli: [CONTRIBUTING](CONTRIBUTING.md), [backend](docs/BACKEND_CONTRACT.md)
  i [frontend](docs/FRONTEND_GUIDE.md). Lokalny test nie potwierdza wdrożenia.
  Przed odbiorem produkcyjnym sprawdzić w ledgerze migrację
  `20261029120000_dc_consistency_morning_supplements.sql`; ewentualne zastosowanie
  tylko przez `npm run db:apply`, bez zbiorczego odtwarzania starych migracji.

### Zakład C / Etap 2 — odpowiedzi Oracle
<a id="odbior-oracle"></a>

- [ ] Odebrać rzeczywiste „oceń treningi po zawodach” / „co dziś?” bez ponownego
  pytania o dane już w bazie. Wspólny `HealthCoachContext` pokazuje te same sesje,
  ograniczenia, daty, źródła i braki we wszystkich konsumentach.
  Sprawdzić też porównanie okresów w Kronice, analizę/raport tygodnia i `/teraz`.
  Przy błędzie sprawdzić logi konkretnej funkcji.

### Zakład C / Etap 3 — zgodność celu BF
<a id="cel-bf"></a>

- [ ] Jawna zmiana celu synchronizuje `nutrition_profile` i KPI przez goal spine;
  sprzeczne stare deklaracje pozostają widoczne, a historia jest zachowana.
  Nie tworzyć drugiego magazynu celów.

### Zakład C — pamięć deklaracji
<a id="pamiec-deklaracji"></a>

- [ ] Potwierdzone cele, preferencje i ograniczenia mają źródło, aktualność i korektę
  oraz są odczytywane w następnej sesji. Core memory jest skrótem, nie kopią SSOT.
  Porada modelu nie staje się faktem o użytkowniku.

### Część V — Kartoteka
<a id="kartoteka"></a>

- [ ] Testy i rzeczywisty zapis/odczyt `MedicalRecordsView` / `medical_events`,
  w tym izolacja właściciela.

### Zakład C — kontekst wyników badań
<a id="kontekst-badan"></a>

- [ ] Odebrać Kartotekę i `medicalContext`: źródło, data, jednostki i kontekst wyniku,
  bez diagnozy i zaleceń dawkowania. Nie budować konkurencyjnego raportera badań.

### Zakład C — objawy
<a id="objawy"></a>

- [ ] Istniejący capture/stream zachowuje zgłoszony objaw i kontekst zdrowia.
  Hipoteza o czynnikach towarzyszących pozostaje oddzielona od zgłoszenia użytkownika.

### Zakład C — podsumowania
<a id="podsumowania"></a>

- [ ] Odebrać istniejące recap/refleksje dnia, tygodnia i miesiąca:
  wspólny kontekst zdrowia, jawne okno danych i zgodne sumy, bez kolejnego raportera.

### Zakład C — składniki odżywcze
<a id="skladniki-odzywcze"></a>

- [ ] Odczyt makr/błonnika i analizy jakości tylko z wystarczająco kompletnych dni
  i rzeczywiście dostępnych składników. Brak wartości jest jawny; dziennik jedzenia
  nie rozpoznaje niedoborów ani dawek suplementów.

### Zakład C — zależności
<a id="zaleznosci"></a>

- [ ] Odebrać istniejące korelacje/katalog metryk: sen–HRV, stres–HRV, zachowania–wyniki.
  Pokazać N, okno, kompletność i confoundery. Brak automatycznej przyczynowości
  lub diagnozy przetrenowania.

### Zakład C — analizy
<a id="analizy"></a>

- [ ] Odebrać istniejące read-only SQL, karty i wykresy: kontrola zakresu użytkownika,
  źródła, dat i mianownika. Brakujące dane nie stają się zerem.

<a id="przy-okazji"></a>

## PRZY OKAZJI — utrzymanie przy dotyku

- **Zakład A / Część 0:** mobile i desktop zachowują różne układy, wspólne API,
  definicje metryk i mutacje. Usuwać duplikaty fetch/obliczeń i katalogów nawigacji
  dopiero po sprawdzeniu konsumentów.
- **Zakład B:** cele → tydzień → zadania → plan dnia mają jednego właściciela stanu.
  Nie tworzyć nowych modeli zadania ani drugiego planera.
- **Zakład C / Etap 5:** przy potrzebnej zmianie oddzielić dane `TrainingHubView` od widoku.
- **Zakład C / Etap 7:** przepis/menu/załącznik jest danymi, nie instrukcją dla narzędzi;
  stosować dozwolone źródła i limity, bez wykonywania poleceń i dowolnych URL.
- **Część III / helpery:** zapisy Todo i KPI kierować przez kanoniczną warstwę;
  wkład KPI zmieniać transakcyjnie, nie przez lokalny fallback +1.
- **Część III / daty:** usuwać duplikaty formatterów, w tym `LeniePanelMini`,
  korzystając z właścicieli wskazanych w [SINGLE_SOURCE](docs/SINGLE_SOURCE.md).
- **Część III / offline:** starszych wpisów bez `ownerId` nie przypisywać bieżącemu
  kontu ani odtwarzać bez ustalenia właściciela; błąd dead-letter nie usuwa oryginału.
- **Część III / deploy:** kontrolować dryf kodu wdrożonych funkcji niezależnie od
  dryfu migracji; testy edge dobierać do rzeczywiście zmienionych ścieżek.
- **Część IV / PD1–PD3, P6, DS1/DS4:** przy dotyku usuwać `as any`, najpierw
  regenerując nieaktualne typy; używać wspólnych modali, tokenów i empty states.
  Limity/wyjątki mają właściciela w ESLint i baseline, nie w ręcznej liście LOC.
- **Zakład D / Część II:** poprawiać istniejącą ekstrakcję/pamięć: walidacja triad,
  propagacja `finishReason`, liczenie potwierdzonych zapisów i unikalnych epizodów.
  Retry tego samego źródła nie zwiększa `evidence_count`. Zachować historię korekt,
  pochodzenie i istniejący graf/wektory/FTS; nie dodawać drugiego profilu ani bazy.
- **Część II / jakość AI:** przy zmianie promptu sprawdzić realne dobre/złe wyniki
  oraz przypadki małej próby, sugestii psychologicznych i nieliniowych refleksji;
  rosnąca pewność bez nowych danych nie jest postępem.

<a id="zamroz"></a>

## ZAMROŻ — poza aktywną kolejką

Poniżej zachowano zamiar, nie instrukcję budowy. Przed odmrożeniem sprawdzić
aktualny kod, dane i konsumenta. Nie przywracać usuniętych porannych pingów
ani loggera jedzenia w Telegramie. Istniejących danych nie kasować w ramach freeze.

### Zakład C — program prowadzenia treningu i żywienia

| Etap | Zachowany zakres i warunek odbioru |
|---|---|
| 3 — standardy celów | Trwałe cele przez goal spine, baseline i wersjonowany standard. Sekundy ≠ minuty, podchwyt ≠ nachwyt, e1RM ≠ wykonanie z zapasem, wizja ≠ zmierzony BF; subiektywny wynik potwierdza użytkownik. Pytać tylko o brakujące dane. |
| 4 — wersje i joby | Idempotentne żądania, lease workera, owner RLS, konflikt rewizji i jedna atomowa aktywacja. Zmieniać tylko przyszłe nierozpoczęte sesje; zachować wykonanie/szkice i legacy ID. Undo tworzy rewizję przyszłości; status pending/error/retry ma konsumenta. |
| 5 — wspólny plan | Bieganie/siła/skill uwzględniają czas, sprzęt, ból, konflikty i brak baseline; preview → akceptacja → wypełniony logger → wykonanie raz. Rozgrzewka i przerwy liczą się do czasu. Tydzień czyta ten sam plan, bez klonowania sesji do Todo i przenoszenia zewnętrznego kalendarza. |
| 6 — adaptacja | Brak pomiaru i niepełne jedzenie nie uzasadniają progresji. Ból blokuje automatyczne zwiększenie. Propozycja ma policzone powody, before/after, rewizję, retry i undo; większe zmiany wymagają preview. Automatyka tylko w uprzednio przyjętej regule; bez fikcyjnych procentów bezpieczeństwa. |
| 7 — żywienie | Cele energii/białka zgodne w UI/Oracle; kalibracja tylko na kompletnych dniach i aktualnych pomiarach. Menu/liczby porcji liczone z produktów, nie arytmetyki LLM; plan nie tworzy spożycia ani nie znika po przeliczeniu targetów. Bez nieograniczonego odjadania kalorii zegarka. |
| 8 — przegląd | Rozróżnić brak wpisu od niewykonania i progres od skuteczności porady. Zmiana standardu nie przepisuje historii; preferencje mają kolejnego konsumenta. Porady pozostają w historii decyzji. Akceptacja rewizji lub jawne „bez zmian”. |
| 9 — materiały | Prywatne zdjęcia/nagrania, zgoda i retencja; usunięcie oryginału, kadrów, miniaturek i analizy. Brak widoczności nie daje oceny; obcy user nie uzyskuje signed URL. Migracja publicznych zdjęć dopiero po sprawdzeniu wszystkich konsumentów. Wizja/BF/postawa to ograniczony szacunek, bez diagnozy. |
| 10 — ewaluacja | Pełny flow cele → szkic → akceptacja → start → zapis/import → korekta → undo → tydzień, na PWA/APK, mobile/desktop, offline/reconnect, klawiaturze i wygasłej sesji. Scenariusze bólu, podróży, zawodów, braków i równoległej edycji. Modele porównywać na tych samych danych; reguły ocenia kod i człowiek. Pilot/wyłączenie automatyki zachowuje ręczny logger. |

Kontrakty już istniejące w `packages/domain/src/training/coachTypes.ts`,
`training_plan_workouts`, `training_plan_versions`, `health_coach_jobs`
i pending actions są punktem wyjścia; nie odtwarzać dawnych planów od zera.
Wdrożenie wymaga adekwatnych testów Vitest/Deno/SQL/RLS, typechecków, lint,
ratchetów, contracts i buildów web/Android, następnie smoke/logów i realnego odbioru.
Nie deklarować pełnego prowadzenia na podstawie samej obecności implementacji.

### Pozostały zakres odłożony

| Oznaczenie / domena | Zachowany zamiar |
|---|---|
| Zakład C / przypomnienia | Wybrane przez użytkownika check-iny: edycja, wyłączenie, cykliczność i deduplikacja przez istniejący outbox. |
| Zakład C / posiłki | Menu restauracji, lodówka → propozycje, jadłospis i lista zakupów. Wybór nie oznacza spożycia; bez automatycznych zamówień. |
| Zakład C / estymacje | Model glikemii nie jest pomiarem; regeneracja partii i prognozy wyników wymagają jawnego okna, ograniczeń oraz walidacji. |
| Zakład C / import | Plan ze zdjęcia: OCR → korekta → preview, bez automatycznej aktywacji rozpoznanych ciężarów. |
| Zakład C / pogoda | Kontekst miejsca i czasu rzeczywistej aktywności, nie bieżąca prognoza innego miasta. |
| Zakład C / wiedza i nawigacja | Publikacje na żądanie z weryfikowalnymi źródłami; jawny kontekst oglądanego ekranu; pomoc z istniejącego katalogu tras. |
| Część 0 / użycie | Pomiar wejść i wykonanych akcji przed dalszym zamrażaniem modułów. |
| Część I / Rozwój | Okładki, oceny, grupowanie; import ukończonych materiałów tylko za zgodą i z preview; `/nauka`, slot kalendarza, przegląd miesiąca i powiązanie Pocket wymagają potwierdzonego użycia. |
| Część II / dane | Backup DB/bucketów z testem odtworzenia; historyczny backfill/replay, `algo_version`, pokrycie metryk, korekty i confoundery/cykliczność przed rozbudową analityki. Najpierw sprawdzić istniejącą implementację. |
| Część II / Auth | Sprawdzić bieżący stan ochrony przed ujawnionymi hasłami; dawny wpis nie dowodzi aktualnej konfiguracji ani uprawnia do zmiany ustawień konta. |
| Część II / wiedza | `claims`, encje, aliasy i bitemporalność już istnieją: sprawdzić tożsamości, historię i konsumentów; dopiero potem dossier celu, diff pamięci lub eksport raportu dla trenera. Bez automatycznego merge różnych pojęć i nowego magazynu faktów. |
| Część III / offline | Rozszerzenia poza istniejącą kolejką wymagają odtworzonego problemu; stare niepewne ścieżki/numery linii nie są zadaniem. |
| Część V / Finanse | Import brokera, dywidendy, TWR/MWR, PSD2 i widget; przeniesienie portfeli z Inwestycji dopiero po sprawdzeniu obecnych konsumentów. |
| Część V / Healthspan v2 | Kalibracja, wersja metody, coverage i źródła, szczegół N/dat oraz walidacja na prawdziwym profilu Garmin/Oura. |
| Część V / Notatki i iOS | Szeroki odbiór folderów, gestów i układów dopiero dla konkretnego odtworzonego problemu. |
| Closer | Materiały oferty/sprzedaży → kryteria etapów w `sales_playbook_criteria`; kalibracja ocen AI na rozmowach ocenionych przez użytkownika. |
| Android | Nowe widgety i dalsza integracja BLE wymagają potrzeby; odbiór istniejących ścieżek pozostaje w RÓB. |
| Dawne inspiracje / planowanie | Rollover/pruning, estymacja czasu i pojemności, focus/time tracking, przenoszenie celów, dynamiczne nawyki, rescheduling, deadline i bufory — tylko przez istniejące zadania/kalendarz i po decyzji o zakresie. |
| Dawne inspiracje / ergonomia | Filtry, szablony, tagi, heatmapy i referencje do istniejących ID; nowe rutyny Telegrama lub kanały email/iOS dopiero przy realnym użyciu. |
| Dawny audyt UX | Czytelność, motyw, kontrast, przepełnienie, ruch i dotyk sprawdzać przy dotyku. Osobny redesign Dziś, globalny hero, nowe wykresy, gęstość, podobne dni, plakaty i widgety pozostają pomysłami, nie kolejką. |

Odrzucone: kolejny autonomiczny profil użytkownika, nowy silnik agentowy/baza grafowa
bez wykazanej potrzeby, efekty muzyczne i dekoracyjne widgety bez konsumenta.
Nie kupować nowych usług ani infrastruktury na podstawie samej możliwości technicznej.
