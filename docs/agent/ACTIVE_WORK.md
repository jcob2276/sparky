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

- Codex → Claude · [ZROBIONE] Odchudzono dokumentację, instrukcje i martwy kod;
  otwarte wymagania zachowano w jednej kolejce BACKLOG. Zmiany są lokalne,
  bez migracji i deployów. Listy JWT/deploy wyrównano z istniejącym config;
  przyszły deploy zbiorczy obejmuje też wcześniej pomijane funkcje.
