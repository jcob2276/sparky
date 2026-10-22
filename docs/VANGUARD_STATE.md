# Sparky OS — stan aplikacji

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
- rytuał wieczornego domknięcia, w którym **liczby sprzedaży dnia są wymagane**: umówieni, rozmowy (kolumna `dials`), sales calle (0 jest poprawną wartością, jest też „dziś bez sprzedaży”) i jedno zdanie opinii, zapisywane w `closer_daily_logs`;
- poranny plan dnia zaczyna się od wczorajszych liczb, opinii i tempa tygodnia (cele 30 umówień i 10 sales calli), a gdy liczb brakuje, prosi o ich uzupełnienie;
- niedzielny przegląd zadań;
- blokada pełnego interfejsu do utworzenia dziennego planu.

Połączenia:

- `daily_wins` i Todo dostarczają wykonanie;
- Kalendarz i Terminy dostarczają ograniczenia czasu;
- Oura, trening, Garmin i żywienie zasilają strain/snapshot;
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

**Cel:** głęboka analiza regeneracji i danych z pierścienia, z naciskiem na to, **co wpływa na sen**.

Strona ma dwie zakładki (powłoka: `OuraHealthView`, tylko do odczytu, bez formularzy):

- **Dziś** (`oura/today/`): werdykt i 3 pierścienie, tylko odchylenia od normy, oś dzień→noc, pasek „co poprzedzało tę noc” (kawa, posiłek, trening, sauna, telefon po 21:30, komputer), top 3–4 zależności z silnika;
- **Szczegóły** (`oura/details/`): pełny sen (fazy, tętno, HRV), rytm i regularność, **pełna lista zależności snu wraz z pokryciem danych**, obciążenie → regeneracja, parametry życiowe i wiek biologiczny, zwijane wykresy.

Silnik zależności: `src/lib/biometrics/sleepDrivers/` (czyste funkcje + `sleepDriversApi.ts` + hook `useSleepDrivers`). Korelacja Spearmana czynnik × wynik snu (kawa, posiłek, trening, sauna, telefon, komputer) oraz sen → Top 5. Progi pewności są ostre z powodu wielu testów (`evidence.ts`): potwierdzone p<0.001, prawdopodobne p<0.01, wstępne p<0.05; bez istotności silnik mówi „jeszcze nic pewnego”.

Źródła aktywności: **Garmin** (`strava_activities` z `source='garmin_intervals'`, nazwa tabeli historyczna) i dziennik treningów; kroki z Oura. Strava nie istnieje (12 martwych wierszy do 2026-06-10). Komputer: `aw_daily_summary` (ActivityWatch), synchronizacja stoi od 2026-06-10 i silnik oznacza to jako nieświeże.

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

### Oracle — wyłącznie w Telegramie (`vanguard-telegram`)

**Cel:** cała interakcja konwersacyjna z Oracle (pamięć, stream, kontekst, pending actions) odbywa się wyłącznie przez Telegram bota.
Interfejs webowy/mobilny skupia się wyłącznie na widokach operacyjnych (Dashboard, Notatnik, Todo, Zdrowie, Trening) bez emulacji czatu wewnątrz aplikacji.

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

- zakładka Dziś: ile zostaje na dziś, plan vs wydane, szybki zapis wydatku (też gotówka), nadchodzące opłaty i wpływy;
- zakładka Przepływy: plan wydatków na miesiąc, przychody, subskrypcje, rachunki, drobne wydatki i import CSV z banku;
- konta, cele, wishlist, FIRE/Monte Carlo, alokacja, dywidendy i oś zmian zostały wycięte (brak użycia); akcje są w `/inwestycje`.

Połączenia:

- dane domeny finansowej są niezależne od evidence pipeline;
- Dziś może pokazywać tylko pilne zobowiązania;
- Kierunek może posiadać cel finansowy;
- Terminy mogą przypominać o rachunkach i odnowieniach.

### `/rozwoj` — Rozwój

**Cel:** wymusić zewnętrzny kierunek nauki: co w tym miesiącu muszę przeczytać lub opanować, bez pisania wniosków.

Funkcje:

- **plan nauki miesiąca**: maksymalnie 3 pozycje (książka, kurs, artykuł, wideo, podcast) z ilością (strony, minuty, lekcje, sztuki), terminem i opcjonalną umiejętnością z drzewa `learning_skills`;
- **dzienny slot** liczony z tego, co zostało, i dni do terminu („str. 41–59, ok. 48 min”), jedno kliknięcie „Zrobione?” (ponowne cofa); status tempa: przed planem, zgodnie, za planem;
- materiały wybierane z nieprzeczytanych w Pocket (`vanguard_links`) albo własne; z Pocket także przyciskiem „Do planu nauki” w szczegółach linku;
- **biblioteka (wirtualna półka)**: książki, filmy, kursy z całego życia jako grzbiety na półkach (grubość książki z liczby stron, kolor z tytułu, film jako płaskie pudełko), statystyki „razem / w tym roku”, filtr Książki/Filmy, karta wybranej pozycji; nowa pozycja wsuwa się na półkę z animacją (raz, z wyłączeniem przy ograniczonym ruchu);
- biblioteka wypełnia się bez pracy: **import hurtem** (wklejona lista z nagłówkami „Książki:”, „Filmy 2019:”, wypunktowania, „Tytuł — Autor”, oceny, strony; albo CSV z Goodreads i Letterboxd, z podglądem i wykrywaniem duplikatów), **automatycznie z planu** (ukończona pozycja miesiąca sama trafia na półkę) i szybki dopis pojedynczej pozycji (poza tytułem wszystko opcjonalne, data może być samym rokiem);
- historia poprzednich miesięcy pokazuje tylko niedokończone i odpuszczone (ukończone są na półce).

Dane: `learning_assignments` (pozycje) i `learning_progress_log` (ilość na dzień); zapis postępu tylko przez RPC `log_learning_progress` (idempotentny na dzień, 0 cofa, sam ustawia `done`/`status` i dopisuje lub zdejmuje wpis z biblioteki). `library_items` to biblioteka (data opcjonalna lub sam rok, ocena, źródło manual/paste/csv/plan, unikalność tytuł+autor+rodzaj). Stare bloby `library_items` i `practice_evidences` w `vanguard_identity` były puste i nie są już używane.

Połączenia:

- poranny plan dnia pokazuje „Nauka na dziś” z jednym kliknięciem, a bez planu przypomina o jego ustawieniu;
- Pocket dostarcza materiały, a drzewo umiejętności daje cel pozycji;
- planowane: Telegram (`/nauka`, przycisk „Zrobione”), blok w kalendarzu, zamknięcie miesiąca z przeniesieniem niedokończonych, wirtualna półka z ukończonymi pozycjami.

### `/settings` — Ustawienia

**Cel:** skonfigurować źródła danych, kontekst i zachowanie aplikacji.

Funkcje:

- profil użytkownika;
- Oura i integracje;
- Google Calendar;
- strefa/cel zdrowotny i ustawienia domenowe;
- kontekst AI;
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

Android Usage Stats → `phone_usage_daily`: oprócz sum dziennych i `late_night_minutes` (okno 23:00–04:00
zaszyte w Javie) plugin zapisuje `usage_buckets` — 48 półgodzinnych kubełków minut pierwszoplanowych
(indeks 0 = 00:00–00:30, strefa `Europe/Warsaw`, kubełek wg lokalnej godziny ściennej; w dniach DST
powtórzona godzina sumuje się do kubełka, max 30 min). Dowolny próg wieczorny (np. 21:30) liczy aplikacja
z kubełków. Wiersze sprzed wdrożenia nowego APK mają `usage_buckets = NULL` i nie da się ich odtworzyć;
dane godzinowe pojawiają się dopiero od pierwszego synca ze zbudowanym nowym APK.

## Zasady interpretacji

- Evidence i reasoning są oddzielone.
- Tarcie zapisuje wyłącznie stream → auto-classify.
- Brak danych nie oznacza, że zdarzenie nie wystąpiło.
- Korelacja jest hipotezą, nie diagnozą.
- Rekomendacja medyczna musi pokazać podstawę, datę i poziom pewności.
- Każdy producent danych musi mieć konsumenta w UI, Telegramie albo w kolejnym kroku
  pipeline’u.
