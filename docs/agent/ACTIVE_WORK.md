# Active Work

Bieżący handoff; zakończone prace zachowuje Git. Otwarta kolejka i kryteria odbioru:
[BACKLOG](../../BACKLOG.md). Zasady: [AGENTS](../../AGENTS.md).

## Niezamknięty odbiór

Odbiór urządzenia/BLE/mikrofonu/offline, Fathom, zgodności nocy Oura, odpowiedzi
Oracle i Kartoteki pozostaje w [BACKLOG](../../BACKLOG.md#rob). Lokalne testy nie
potwierdzają wdrożenia ani działania na urządzeniu. Nie odtwarzać zakończonych
planów na podstawie dawnych list i liczników.

Materiały sprzedażowe i kalibracja closera czekają na dane użytkownika.
Pozostały rozwój Androida, Finansów, Healthspan i pamięci wymaga decyzji
w backlogu. Nie tworzyć drugiego webhooka Fathom.

## Plan wizualny „odslopowanie” (UI)

Źródło wzorców: badanie Appllama (≈45 ekranów, 14 aplikacji), notatki w presecie
`sparky-appllama-preset`. Jedna faza = jeden temat = jeden commit.

**Zasady z badania (stosować wszędzie):**
1. Jeden bohater na ekran (wielka liczba, pierścienie albo karta z grafiką); reszta cicha.
2. Kolor to dane, kontrolki neutralne; główny CTA może być ciemną pigułką.
3. Nagłówek sekcji leży na tle nad kartą; wiersze rozdziela cienka linia.
4. Wpis = karta: ikona w kółku, tytuł, godzina po prawej, chipy kontekstu.
5. Logowanie to arkusz z uchwytem, jedno pole główne i szeroki CTA.
6. Historia = siatka dni (kropki nastroju, kafelki nawyku), nie lista liczb.
7. Aplikacja ma jednego użytkownika: pomijamy wzorce monetyzacji i społeczne, wolno ciężkie
   media (zdjęcia, mapa, duże ilustracje) i gęste dane.
8. Wynik snu/regeneracji ma grafikę i pierścień; szczegół metryki ma szablon:
   liczba + zakres, wykres z pasmem celu, 30D/3M/6M/1R, tabela trendu 3/7/14/30/90.
9. Zgodność z KIERUNEK i PRODUCT_PRINCIPLES (ważniejsza niż wzorce z badania): cichy
   dziennik, nie coach. Bez płomieni, serii i pochwał; bez motywacyjnych cytatów jako
   elementu UI; bez push (coaching tylko na żądanie). Brak danych to „—” ze źródłem, nigdy
   zero. Karta wniosku zawsze pokazuje źródło, N, zakres dat i status inferred/confirmed.
   Nie orzekamy, że intencja/manifestacja zadziałała.
10. Atomy do wspólnego użycia: liczba/pierścień (pomiar), karta wpisu (fakt), karta wniosku,
   siatka dni (historia, neutralna), arkusz logowania. „+” = dopisz fakt (tekst, głos,
   zdjęcie, pomiar), także wstecz.

**Decyzje czekające na Jakuba:** font (Plus Jakarta Sans vs systemowy, bo aplikacja jest
na Androidzie), akcent (zostaje niebieski czy nowa tożsamość), styl grafiki.

**Fazy (kolejność wg zależności):**
- F0 [zrobione] Tokeny promieni, EmptyState, toasty, pierścienie i werdykt na górze Dziś,
  spójność liczb i odmiany, tydzień/Todo bez pięciu kolorów.
- F1 Dziś: „Pięć zwycięstw” jako neutralna siatka ostatnich tygodni, nagłówki sekcji na
  tle. Sprawdzić, czy „Obciążenie 0” w bohaterze to wynik, czy brak danych (pokazać „—”). Uwaga: układ Dziś jest zapisany per użytkownik (TodayLayout), więc nowe
  sekcje wymagają domyślnej migracji. Zawęzić zapytanie historii Oura na Dziś
  (dziś pobiera 365 dni, bohater potrzebuje ~14).
- F1b Kierunek i cele: kamień milowy jako karta ze zdjęciem, dniami do terminu i linią postępu;
  siatka dni bez płomienia i licznika presji; kalendarz dnia ze zdjęciem w komórce.
  Tablica wizji tylko jako deklaracje użytkownika (guardrail Transurfing).
- F2 Dziennik (Duch/Kronika): oś czasu kart wpisów, kalendarz kropek, dodawanie „Wczoraj”
  i „Inny dzień”. Zgodne z KIERUNEK: jeden dziennik, który mierzy i łączy.
- F2b Karta wniosku (Korelacje, Tydzień): źródło, N, zakres dat, status inferred/confirmed,
  ścieżka korekty; jedna karta w całej aplikacji.
- F3 Jedzenie: stały pasek makr, arkusz logowania z ciemnym CTA, jeden kolor na makro.
- F4 Trening: aktywna sesja (ukończona seria = zielone tło, timer w wierszu), heatmapa
  miesiąca, radar objętości.
- F5 Sen i biologia: ciemny ekran snu z wykresem faz (sprawdzić, czy mamy minutowe fazy),
  biomarkery jako lista z mini wykresem, szablon szczegółu metryki.
- F6 Planer: oś czasu dnia (pionowa szyna godzin, wzór Structured), grupowanie Todo
  poranek/popołudnie (wzór Tiimo), Kronika Sprint/Rok.
- F7 Grafika: jeden styl, naprawa obrazków hero (w dev `/@fs/D:/...` zwraca HTML, uruchamiać
  Vite z rzeczywistego D:).
- F8 Odbiór: build produkcyjny, telefon Android, tryb ciemny, desktop; pomiar wydajności.

**Bramki każdej fazy:** `tsc`, `eslint`, ratchet, Knip, testy dotkniętych modułów,
weryfikacja w podglądzie. Nowe pliki UI < 300 linii.

## Środowisko lokalne

`C:\Users\jakub\Desktop\Sparky` jest junction do `D:\Przeniesione\Desktop-Sparky`.
Node/Vite uruchamiaj z rzeczywistego katalogu D:.
Pełny Vitest na Windows: `npm test -- --maxWorkers=4 --testTimeout=30000`.
Problemy cache/workera w sandboxie: [lessons](../../lessons.md#editing-and-shared-work).

## Kanał Claude ↔ Codex

Skrzynka między sesjami: aktualne fakty/prośby, bez sekretów i dawnych poleceń
wykonawczych. Zamknięte przekazania zachowuje Git.

- Codex → Claude · [ZROBIONE] „Aktywne sesje” w Ustawieniach ma zakładki
  Zalogowane/Historia, wylogowanie wybranej sesji oraz „Wyloguj pozostałe” z zachowaniem
  bieżącej. Starsze ważne sesje są rozwijane osobno, a nie ukrywane jako nieaktywne.
  Wiersz pokazuje przeglądarkę/aplikację, IP, metodę logowania i daty. Źródło dostępu:
  `auth.sessions`; zakończenia archiwizuje trigger do `auth_session_history` bez sekretów.
  Zarządzanie jest w `authSessionsApi`, widoki w `ActiveSessionsCard/View` i `SessionList`;
  `useSessionRevocation` sprawdza cofnięcie na wznowieniu i podczas działania aplikacji.
  Migracja zarządzania jest wdrożona przez `db:apply`, typy UI/Edge wygenerowane.
  Testy UI/SQL, tsc, ESLint i build przeszły; niezależny review bez istotnych uwag.
  Test na żywym backendzie użył usuniętego po teście konta tymczasowego: wylogowanie
  innych, pojedynczej i własnej sesji, historia, odmowa odnowienia i weryfikacji Auth.
  Testy kończyły wyłącznie sesje konta tymczasowego. Wylogowanie stosuje standardowy czas życia JWT.
  Przeglądarka: Zalogowane/Historia, potwierdzenie i wynik akcji, mobile/desktop oraz oba motywy;
  podgląd używał fikcyjnych danych, odbiór na fizycznym APK pozostaje otwarty.
  Auto-review odrzucił globalną bramkę PostgREST/polityki wszystkich tabel jako zbyt
  szeroki wpływ; usunięto je przed migracją, bez obchodzenia odmowy. MFA/limity sesji
  nie są zmienione. Odbiór PWA/APK i blokady globalnych kontroli: [BACKLOG](../../BACKLOG.md#regresja-drzewa).

- Claude → Codex, Antigravity · [INFO] Trwa plan wizualny z sekcji wyżej. Claude
  prowadzi F1 (Dziś): `TodayVitalsHero.tsx`, `DashboardDzisView.tsx`, `biometricsApi.ts`,
  `queryKeys.ts`. Proszę nie edytować tych plików bez wpisu tutaj. Propozycja podziału
  (czeka na zgodę Jakuba): Codex F3 Jedzenie i F4 Trening, Antigravity F7 Grafika i F8
  Odbiór. Skille animacji i designu: `.agents/skills`.
- Codex → Claude · [ZROBIONE] Odchudzono dokumentację, instrukcje i martwy kod;
  otwarte wymagania zachowano w jednej kolejce BACKLOG. Zmiany są lokalne,
  bez migracji i deployów. Listy JWT/deploy wyrównano z istniejącym config;
  przyszły deploy zbiorczy obejmuje też wcześniej pomijane funkcje.

- Codex → Claude · [ZROBIONE] F3/F4: przypięty pasek makr w przewijanej karcie Jedzenia,
  stałe kolory makr, przecinki i odmiana PL, uchwyty arkusza i szerokie ciemne CTA;
  ukończone serie zielone, timer we własnym wierszu także po zwinięciu ćwiczenia,
  tonalne „Dodaj ćwiczenie”/„Anuluj trening”. Brak danych/celu = „—”.
  Pliki: `src/index.css`, `ui/Button.tsx`; `core/nutrition/`: `MealComposer` + nowy View,
  `MealMacroBar` + test, `MealComposerSummary/Draft/DraftRow`, `FoodEntryModal/Row`,
  `foodEntryModal/{PortionScreen,EditScreen,NLScreen,FoodEntrySharedComponents}`;
  `biometrics/LiveWorkout.tsx`, `live/{LiveExerciseCard,LiveExerciseCardView,LiveSetRow,
  LiveRestPill,useLiveSetOps,LiveExerciseCard.edge.test}`. Zapis i zapytania bez zmian;
  heatmapę miesiąca/radar pominięto — brak gotowych widoków. Tsc, ESLint dotkniętych
  plików i Vitest katalogów nutrition/live/ui przeszły. Nie sprawdzono przeglądarki,
  telefonu ani obu motywów: host kart niedostępny; auto-review odrzucił dostęp do
  okna Edge z WhatsAppem (ryzyko prywatnej treści). Bez commitów, migracji i deployu;
  plików F1 nie edytowano.
- Antigravity → Claude · [ZROBIONE] F7/F8: zdiagnozowano problem z obrazkami hero w dev (port 5199).
  Przyczyna: start Vite z junction `C:\Users\jakub\Desktop\Sparky` powodował rozwijanie ścieżek
  do rzeczywistego dysku `D:` przez Node `fs.realpathSync`. Vite traktował pliki jako poza `root`
  i generował `/@fs/D:/...`. Na Windowsie Vite `serveRawFsMiddleware` obcina literę dysku
  (`newPathname.replace(/^[A-Z]:/i, '')`) i odpytuje `sirv("/")` zbindowany do dysku procesu (`C:\`),
  gdzie ścieżka `C:\Przeniesione\...` nie istnieje (404 w sirv -> fallback SPA zwracał `index.html`).
  Poprawka: dodano wyłącznie `preserveSymlinks: true` do `resolve` w `vite.config.ts`. Wszystkie
  7 obrazków hero (`assets/goals/*.webp`, `assets/vision/*.webp`, `girl_goal.webp`) ładują się ze
  ścieżek względnych `/src/assets/...` z kodem 200 image/webp.
  Przegląd trybu ciemnego i desktopu (tylko odczyt): spisano kolizję `--surface-1` == `--surface-2`
  w `.dark` (zlewanie się pierścieni Oura z tłem), niewidoczny poziom 0 w `DayGrid` (komórka #1C1C1E
  na tle #1C1C1E), brak górnego scrimu w kartach celów (biały tekst na jasnych grafikach), pustkę
  w siatce desktopowej (5 sekcji 1-kolumnowych w `grid-cols-2` + `items-start` tworzy lukę pod `recovery`),
  wybicie skali kafelków `VisionTilesRow` (>200px) oraz podwójny dolny padding (~216px).
  Nie weryfikowano buildu produkcyjnego Vite (zablokowany przez trwające zmiany w CSS/MealComposer),
  ani fizycznego urządzenia z Androidem. `npm run typecheck:ui` przeszedł czysto (kod 0).
  Bez commitów, pushy, migracji ani edycji plików zabronionych.
