# Vanguard OS — stan aplikacji

Dokument opisuje aktualne powierzchnie produktu, ich przeznaczenie i połączenia.
Stan backendu jest generowany z kodu w
[`supabase/functions/FUNCTIONS.md`](../supabase/functions/FUNCTIONS.md).

## Główna pętla

```text
capture → Dziś → wykonanie → refleksja → Historia/Wiedza → korekta Tygodnia
```

- Telegram, czat, share target i szybkie formularze zbierają wejście.
- `Dziś` łączy stan organizmu, plan, kalendarz, zadania i szybki zapis.
- `Tydzień` reguluje zakres i pokazuje odchylenia.
- `Kierunek` utrzymuje cele i projekty.
- `Historia` oddziela znaczące zdarzenia od pełnego archiwum danych.
- Oracle, nightly, analyst, graf i wiki interpretują dane w tle.

## Powierzchnie globalne

| Powierzchnia | Przeznaczenie | Połączenia |
|---|---|---|
| Logowanie | Sesja Supabase i ochrona wszystkich danych użytkownika | Każda produkcyjna trasa |
| Quick Capture | Stały przycisk czatu/capture dostępny ponad routerem | `vanguard-capture`, stream, linki, transkrypcja |
| Fast Capture | Jedzenie, trening, sauna i pomiar wzroku | Żywienie, trening, Kartoteka/Historia |
| Action Center | Decyzja „Istotne / Olej” dla propozycji systemu | `vanguard-analyst` → `system_proposals` → Tydzień |
| Wyszukiwanie/Command Center | Przejście do głównych narzędzi oraz undo/redo | Router, historia odwracalnych akcji |
| Flux Overlay | Globalne ocieplenie ekranu według ustawień | Ustawienia, lokalny harmonogram |
| Service Worker / APK | PWA, powiadomienia, natywne intencje i synchronizacja | Push, lokalizacja, Usage Stats, Oura BLE |

## Główny shell

### `/` i `/dzis` — Dziś

**Cel:** odpowiedzieć, jaki jest stan i co zrobić dalej.

Funkcje:

- status dnia i najważniejszy ruch;
- PowerList i plan dnia;
- dzisiejszy runway z kalendarza i zadań;
- szybkie logowanie jedzenia;
- strain, recovery i główny limiter;
- dzienny snapshot;
- rytuał wieczornego domknięcia;
- niedzielny przegląd zadań;
- blokada pełnego interfejsu do utworzenia dziennego planu.

Połączenia:

- `daily_wins` i Todo dostarczają wykonanie;
- Kalendarz i Terminy dostarczają ograniczenia czasu;
- Oura, trening, Strava i żywienie zasilają strain/snapshot;
- zakończenie dnia zapisuje refleksję używaną przez Historię i Oracle.

### `/tydzien` — Tydzień

**Cel:** zobaczyć przebieg tygodnia i skorygować pozostały zakres.

Funkcje:

- tygodniowy puls ciała;
- tygodniowy puls żywienia;
- mapa wykonanych dni;
- Direction: przegląd, KPI, sprint, plan i refleksja;
- wejście do Action Center.

Połączenia:

- agreguje Dziś, Oura, żywienie, KPI i projekty;
- zatwierdzone decyzje wpływają na kolejne dni;
- system proposals z analityka trafiają tu do ludzkiej decyzji.

### `/projekty` — Kierunek

**Cel:** utrzymywać trzy sfery życia, aktywne projekty i mierzalne postępy.

Funkcje:

- cele długoterminowe;
- projekty i ich stan;
- KPI;
- kamienie milowe zapisane jako zadania;
- dowody postępu;
- Top 5 / priorytety kierunku.

Połączenia:

- projekt może grupować sekcję Todo;
- wykonanie PowerList może zasilać KPI projektu;
- Tydzień wybiera zakres z Kierunku;
- Historia pokazuje rezultaty, a Oracle czyta projekty jako kontekst.

### `/historia` — Historia

**Cel:** zobaczyć zmianę w czasie i pełne dane źródłowe.

Funkcje:

- Kronika: znaczące zdarzenia, pomiary ciała, insighty i zdjęcia;
- Archiwum: żywienie, treningi, statystyki oraz Strava;
- eksport statystyk i danych Oura.

Połączenia:

- zbiera rezultaty z Dziś, treningu, żywienia, Oura i Kartoteki;
- insighty korzystają z danych pochodnych nightly;
- zdjęcia mogą zostać przeanalizowane przez `analyze-physique`.

## Workspace

### `/keep` — Notatki

**Cel:** trwałe przechowywanie i opracowywanie własnych materiałów.

Funkcje:

- edytor rich text i inline;
- foldery, tagi, wyszukiwanie, pinowanie i kolejność;
- widok listy/galerii;
- kosz, przywracanie i trwałe usuwanie;
- blokowanie notatki hasłem;
- eksport pojedynczej notatki lub całego archiwum;
- triage notatek.

Połączenia:

- share target bez URL trafia do Keep;
- `vanguard-keep-triage` klasyfikuje materiał jako keep/archive/todo;
- notatka może przejść do Todo lub Pocket;
- Oracle czyta notatki jako kontekst, ale nie nadpisuje ich automatycznie.

### `/todo` — Zadania

**Cel:** jedna kolejka wykonawcza.

Funkcje:

- sekcje, inbox, priorytety i terminy;
- szybkie dodawanie;
- lista, Kanban i macierz Eisenhowera;
- drag and drop;
- wyszukiwanie;
- wydarzenia dnia;
- skanowanie tekstu do zadań;
- kamienie milowe projektów;
- tygodniowy przegląd.

Połączenia:

- zadania trafiają do PowerList/Dziś;
- mogą należeć do projektu;
- Kalendarz pokazuje zadania w czasie;
- Telegram i Oracle mogą proponować lub tworzyć działania przez kontrolowane ścieżki;
- push reminder obsługuje przypomnienia.

### `/kalendarz` — Kalendarz

**Cel:** zobaczyć realne ograniczenia czasu i umieścić w nich wydarzenia oraz zadania.

Funkcje:

- dzień, tydzień i agenda;
- tworzenie i edycja wydarzeń;
- zadania nakładane na kalendarz;
- tygodniowe budżety czasu;
- synchronizacja Google Calendar, Oura i Strava.

Połączenia:

- `sync` pobiera wydarzenia;
- `calendar-write` zapisuje zmiany do Google;
- Todo dostarcza zadania;
- Dziś używa wydarzeń do runway;
- Terminy mogą generować przypomnienia i działania.

### `/terminy` — Terminy

**Cel:** nie przegapić cyklicznych i odległych obowiązków.

Funkcje:

- urodziny;
- przeglądy pojazdu i urządzeń;
- polisy oraz dokumenty;
- własne terminy;
- offsety przypomnień;
- horyzont nadchodzących spraw i archiwum.

Połączenia:

- `life_obligations` jest źródłem prawdy;
- push reminder wysyła przypomnienia;
- sprawa może prowadzić do Kalendarza, Todo albo Kartoteki;
- Dziś powinno konsumować tylko terminy wymagające działania.

### `/links` — Pocket

**Cel:** zebrać link i podjąć decyzję, zanim stanie się martwym archiwum.

Funkcje:

- PWA share target;
- ręczne dodawanie;
- odczytane/nieprzeczytane;
- kategorie, wyszukiwanie i widok lista/karty;
- automatyczny triage AI;
- decyzja zachowaj/przenieś/usuń.

Połączenia:

- share target z URL trafia tutaj;
- `vanguard-capture` zapisuje link i ślad w streamie;
- materiał może przejść do Keep lub Todo;
- wiedza pochodna może być konsumowana przez Oracle.

### `/fundament` — Fundament

**Cel:** świadomie zapisać stały kontekst tożsamości, misji i granic.

Funkcje:

- misja długoterminowa;
- filary;
- wyzwalacze unikania;
- baseline zachowania;
- Identity Vault;
- Data Hub i synchronizacja.

Połączenia:

- Oracle używa Fundamentu jako kontekstu, nie jako bieżącej prawdy;
- Kierunek i refleksje mogą konfrontować deklaracje z zachowaniem;
- zapis do Fundamentu jest świadomy, nie automatyczny.

## Zdrowie i sprawność

### `/badania` — Kartoteka

**Cel:** zachować historię zdrowia i wskazać otwarte działania.

Funkcje:

- Paszport zdrowia;
- dokumenty i wyniki laboratoryjne;
- skład ciała;
- wizyty, badania, diagnozy, objawy, zabiegi, leki i notatki;
- jedna oś zdrowia;
- szybkie dodanie wpisu;
- propozycje profilaktyczne z podstawą, terminem i możliwością odrzucenia;
- statusy: zaplanowane, wykonane, odroczone i odrzucone.

Połączenia:

- `medical_documents`, `medical_lab_results` i pomiary ciała tworzą kontekst kliniczny;
- Oracle i trener żywieniowy mogą czytać zatwierdzone dane;
- Terminy/Kalendarz powinny konsumować zaplanowane wizyty i kontrole;
- Historia pokazuje medyczne zdarzenia w szerszej chronologii.

### `/oura` — Oura

**Cel:** głęboka analiza regeneracji i danych z pierścienia.

Funkcje:

- sen, readiness, HRV, RHR, stres i aktywność;
- szczegółowe fazy snu i timeline tętna/HRV;
- trendy i wybór zakresu dat;
- korelacje związane z Oura;
- status synchronizacji i BLE.

Połączenia:

- `sync` zapisuje dane Oura;
- nightly wykorzystuje je do strain, recovery, illness, agregatów i korelacji;
- Dziś pokazuje skompresowany wynik;
- Historia i Korelacje pokazują dłuższy kontekst.

### `/trening` — Centrum Analityki Biegowej

**Cel:** analizować bieganie i obciążenie treningowe.

Funkcje:

- aktywności Garmin/Intervals/Strava;
- dystans, tempo, tętno i strefy;
- obciążenie oraz trend;
- rozkład intensywności;
- podsumowanie planu i wykonania;
- wejście do lokalnego Workout Loggera.

Połączenia:

- Strava/Garmin/Intervals dostarczają aktywności;
- Oura dostarcza regenerację;
- `analyze-training-load` interpretuje obciążenie;
- nightly i Dziś używają treningu do strain;
- cel maratoński łączy trening z Kierunkiem.

### `/sauna` — Sauna

**Cel:** szybko zapisać sesję sauny jako zachowanie wellness/trening.

Funkcje:

- czas, rundy, temperatura i odczucia;
- zapis sesji i natychmiastowy powrót do Dziś.

Połączenia:

- zapis trafia do modelu sesji treningowych;
- Historia i analityka mogą porównywać saunę z HR, snem i regeneracją;
- Oura dostarcza sygnały przed/po.

### `/optics` — Wzrok

**Cel:** mierzyć zmianę ostrości wzroku i przechowywać kontekst korekcji.

Funkcje:

- kalibracja kamery;
- automatyczny pomiar odległości rozmycia dla obu oczu;
- przeliczenie dioptrii;
- dziennik wzroku;
- gabinet okularów;
- ocena stabilności pomiaru.

Połączenia:

- pomiary tworzą historię EndMyopia;
- Fast Capture prowadzi bezpośrednio do pomiaru;
- wyniki powinny być widoczne w Kartotece i Historii.

### Żywienie — powierzchnie osadzone

**Cel:** rejestrować jedzenie i regulować plan na podstawie realnego spożycia.

Funkcje:

- szybki zapis i pełny modal;
- język naturalny;
- wyszukiwanie lokalne/Open Food Facts;
- ulubione, ostatnie i korekty;
- makra, kalorie, post i kofeina;
- jakość jedzenia;
- cele adaptacyjne TDEE.

Połączenia:

- Dziś służy do capture;
- Tydzień pokazuje puls;
- Historia przechowuje archiwum;
- Oura, trening, masa i dane medyczne zasilają `vanguard-nutrition-coach`.

## Analityka i wiedza

### `/korelacje` — Korelacje i eksperymenty N-of-1

**Cel:** rozdzielić stabilne czynniki wpływu od przypadkowych zbieżności.

Funkcje:

- potwierdzone, prawdopodobne, słabe i odrzucone zależności;
- filtry i ręczne odświeżenie;
- FDR, stabilność i opis dowodu;
- tworzenie eksperymentu N-of-1;
- aktywne eksperymenty i archiwum dowodów.

Połączenia:

- nightly buduje szeregi z Oura, treningu, żywienia, zachowania i wykonania;
- istotne wyniki mogą zasilać claims/wiedzę;
- Oracle używa ich jako hipotez, nie diagnoz;
- działanie powinno trafić do Tygodnia lub Todo.

### `/czat` — Oracle w aplikacji

**Cel:** rozmowa z systemem przy zachowaniu artefaktów i akcji w aplikacji.

Funkcje:

- historia rozmowy;
- Oracle RAG;
- tekst, głos i zdjęcie;
- szybki zapis jedzenia;
- skróty Wywiad/Koniec dnia;
- kopiowanie i usuwanie wiadomości.

Połączenia:

- `vanguard-oracle` czyta bieżący stan, wiedzę, projekty, zdrowie i historię;
- `vanguard-capture` obsługuje głos/plik;
- Telegram jest drugim klientem tej samej warstwy rozumowania;
- pending actions wymagają potwierdzenia przed wykonaniem.

### Warstwa wiedzy bez osobnej głównej trasy

- Stream przechowuje surowe dowody.
- `vanguard-auto-classify` jako jedyny zapisuje tarcie.
- Architect buduje encje i relacje.
- Graph embedder umożliwia wyszukiwanie semantyczne.
- Wiki compiler tworzy pochodne strony i kolejkę weryfikacji.
- Metabolism kondensuje historię.
- Eval interview pyta o luki i niepewne twierdzenia.
- Oracle odczytuje wynik, ale nie zapisuje automatycznie „prawdy o użytkowniku”.

## Pozostałe samodzielne powierzchnie

### `/finanse` — Finanse

**Cel:** widzieć przepływy, zobowiązania i cele finansowe.

Funkcje:

- szybki zapis wydatku;
- przychody i wydatki;
- rachunki i subskrypcje;
- konta oraz portfel;
- cele, wishlist i budżet;
- import CSV;
- runway/FIRE i wynik finansowy;
- oś zmian.

Połączenia:

- dane domeny finansowej są niezależne od evidence pipeline;
- Dziś może pokazywać tylko pilne zobowiązania;
- Kierunek może posiadać cel finansowy;
- Terminy mogą przypominać o rachunkach i odnowieniach.

### `/rozwoj` — Rozwój

**Cel:** prowadzić rozwój umiejętności przez praktykę i dowody.

Funkcje:

- tożsamość rozwojowa;
- mapa pojemności;
- aktywna ścieżka;
- biblioteka umiejętności i materiałów;
- praktyka oraz dowody;
- tygodniowy przegląd;
- eksperymenty rozwojowe.

Połączenia:

- aktywna umiejętność powinna być projektem Kierunku;
- konkretna praktyka trafia do Todo/Tygodnia;
- dowody trafiają do Historii;
- Fundament dostarcza świadomy kontekst.

### `/budzik` — Budzik

**Cel:** lokalnie uruchomić alarm i wymusić świadome wyłączenie.

Funkcje:

- wiele alarmów;
- harmonogram i drzemki;
- test alarmu;
- misje: ruch, kod, matematyka lub pamięć;
- lokalny ekran dzwonienia.

Połączenia:

- stan jest lokalny w store;
- nie jest obecnie niezawodnym serwerowym reminderem;
- serwerowe przypomnienia Todo/Terminy obsługuje osobno `vanguard-push-reminder`.

### `/settings` — Ustawienia

**Cel:** skonfigurować źródła danych, kontekst i zachowanie aplikacji.

Funkcje:

- profil użytkownika;
- Oura i integracje;
- Google Calendar;
- strefa/cel zdrowotny i ustawienia domenowe;
- kontekst AI;
- Flux;
- uprawnienia APK: powiadomienia, Usage Stats, lokalizacja i praca w tle.

Połączenia:

- `user_settings`, tokeny i lokalne storage;
- `sync`, Calendar, Oura BLE i natywne procesy;
- Oracle czyta wybrany kontekst AI.

### `/dashboard` — Desktop Scoreboard

**Cel:** rozszerzone centrum dowodzenia do pracy na komputerze — nie desktopowa kopia
wersji mobilnej.

Funkcje:

- hero i alerty;
- ręczna synchronizacja źródeł;
- heatmapa treningów i maraton;
- intelligence, score i wykresy;
- nawyki, zachowania i suplementy;
- sny i vision board;
- biometria, Kartoteka, Fundament i trening;
- stan zdrowia pipeline’u.

Połączenia:

- agreguje prawie wszystkie domeny;
- służy do przekrojowej analizy, syntezy, planowania i diagnostyki systemu;
- mobile służy do szybkiego capture, decyzji i wykonania w ruchu;
- oba tryby muszą współdzielić API, definicje metryk, statusy i mutacje, ale mogą mieć
  zupełnie różną gęstość oraz architekturę ekranu;
- zmiana wykonana w centrum dowodzenia jest natychmiast widoczna w Dziś i odwrotnie.

### `/dev/design-system` — Design System

**Cel:** deweloperski katalog komponentów i tokenów.

- Dostępny bez sesji tylko w środowisku developerskim.
- Nie jest powierzchnią produktu.

### `/korealcje`

Historyczny błąd w adresie. Przekierowuje do `/korelacje`.

## Telegram

| Wejście | Efekt |
|---|---|
| Zwykły tekst / krótki głos | Zapis do streamu |
| `?` | Oracle chat |
| `!!` | Oracle deep reasoning |
| `##` | Świadomy zapis wiedzy |
| Długi głos | Vault ingest |
| Odpowiedź na Wywiad | Uzupełnia lukę wiedzy |
| Koniec dnia | Uruchamia refleksję |
| Jedzenie / trening / zadanie | Parser domenowy i zapis |

Webhook zapisuje wiadomość do inboxu, worker ją przetwarza, a wiadomości wychodzące
przechodzą przez outbox. Telegram i czat w aplikacji współdzielą Oracle, ale nie są
jeszcze jednym w pełni zunifikowanym wątkiem.

## Funkcje backendowe

Pełna lista wraz z triggerem, odczytami, zapisami i konsumentem:
[`supabase/functions/FUNCTIONS.md`](../supabase/functions/FUNCTIONS.md).

Grupy:

- **capture i komunikacja:** `vanguard-capture`, `vanguard-telegram`,
  `vanguard-telegram-worker`, `vanguard-outbox-sender`, `vanguard-push-reminder`;
- **Oracle i wiedza:** `vanguard-oracle`, `vanguard-architect`,
  `vanguard-graph-embedder`, `vanguard-wiki-compiler`, `vanguard-metabolism`,
  `vanguard-eval-interview`, `vanguard-eval-runner`, `vanguard-mcp-server`;
- **analiza dobowa:** `vanguard-auto-classify`, `vanguard-analyst`,
  `vanguard-nightly`, `vanguard-backtester`, `recap`;
- **zdrowie i sport:** `sync`, `analyze-training-load`, `compute-behavior-effects`,
  `analyze-physique`;
- **żywienie:** `lookup-food`, `parse-food-nl`, `analyze-food-quality`,
  `vanguard-librarian`, `vanguard-nutrition-coach`;
- **planowanie i workspace:** `parse-workout-nl`, `calendar-write`,
  `vanguard-keep-triage`, `vanguard-kpi-suggest`.

## Integracje

| System | Dane / rola | Główni konsumenci |
|---|---|---|
| Oura | sen, readiness, HRV, RHR, stres, aktywność, timeline | Dziś, Oura, Historia, strain, Oracle |
| Strava/Garmin/Intervals | aktywności, tempo, HR, strefy, obciążenie | Trening, Historia, strain, maraton |
| Google Calendar | wydarzenia i ograniczenia czasu | Kalendarz, Dziś, planowanie |
| Telegram | capture, rozmowa, wywiad, refleksja, powiadomienia | Stream, Oracle, Todo, żywienie |
| DeepSeek | klasyfikacja i większość rozumowania tekstowego | Oracle, analyst, parsery, wiki |
| OpenAI | Whisper, embeddingi i analiza zdjęć sylwetki | Capture, graf, Historia |
| Open Food Facts | informacje o produktach | Food logger |
| ActivityWatch / Android Usage Stats | użycie urządzeń | zachowanie i korelacje |
| Android lokalizacja | kontekst miejsca | stream/agregaty po podłączeniu konsumenta |

## Zasady interpretacji

- Evidence i reasoning są oddzielone.
- Tarcie zapisuje wyłącznie stream → auto-classify.
- Brak danych nie oznacza, że zdarzenie nie wystąpiło.
- Korelacja jest hipotezą, nie diagnozą.
- Rekomendacja medyczna musi pokazać podstawę, datę i poziom pewności.
- Każdy producent danych musi mieć konsumenta w UI, Telegramie albo w kolejnym kroku
  pipeline’u.
