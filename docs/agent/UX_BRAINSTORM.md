# UX / Art Direction Brainstorm — Sparky (Vanguard OS)

> Autor: audyt dyrektora artystycznego / UX research. Data: 2026-10-23.
> Tryb: tylko odczyt kodu, jedyny utworzony plik to ten dokument.
> Podstawa: `docs/DESIGN_SYSTEM.md`, `docs/PRODUCT_PRINCIPLES.md`, `docs/VANGUARD_STATE.md`, kod `src/components/**`, `src/index.css`.

## 0. Metodologia i uczciwe ograniczenia (przeczytaj najpierw)

- Dev server (`vanguard-dev`, port 5199) działał. Przeszedłem go w viewport mobile 375x812, jasny i ciemny motyw.
- **Za logowaniem nie wszedłem.** Aplikacja wymaga sesji Supabase, a w repo nie ma konta testowego ani trybu bypass. Nie wpisuję prawdziwego hasła Jakuba (reguła bezpieczeństwa), więc widoki Dziś / Tydzień / Kronika / Todo / Keep / Kalendarz / Trening / Oura / Finanse / Badania / Ustawienia **nie były oglądane na żywo**.
- Zweryfikowane na żywo (screenshoty): ekran logowania, `/dev/design-system`, `/inwestycje` (jasny + ciemny), `/poker`. Pomiary DOM na `/inwestycje`.
- Pozostałe widoki ocenione **statycznie, ilościowo** (liczniki wzorców w kodzie per katalog) oraz przez czytanie komponentów-liderów. Ranking poniżej oznacza wiarygodność: "obserwowane" vs "wnioskowane z kodu". Zalecenie: dodać do repo konto seed + `VITE_E2E_SESSION` albo fixture sesji, żeby kolejny audyt mógł zrobić pełny przegląd wizualny (patrz poprawka #25).
- Dark mode: aplikacja nie podąża za `prefers-color-scheme` (klasa `.dark` ustawiana z `localStorage`, domyślnie `light`, patrz `Auth.tsx`, `useDashboardTheme.ts`). Przełączałem klasę ręcznie.

### Twarde liczby z kodu (tokeny typograficzne)

| Wskaźnik | Wartość | Uwaga |
|---|---|---|
| `text-3xs` efektywny | **7px** | `src/index.css` ~L1103 (`@theme`); blok `:root` z L1522 nadpisuje tylko `xs..3xl`, więc `2xs/3xs` zostają stare. Doc mówi 9px. |
| `text-2xs` efektywny | **9px** | Doc mówi 11px. Etykieta zakładki dolnego paska (`DashboardNavBar.tsx`) ma 9px. |
| Użyć `text-3xs`/`text-2xs` | core 213, investments 351, biometrics 140, desktop 152, medical 124, lifestyle 96 | Cała aplikacja czyta się jak drobny druk. |
| `/inwestycje` mobile | 103 z 247 węzłów tekstu < 11px; min 7px; 19 z 54 celów dotykowych < 44px | Pomiar DOM. |
| `font-black` | core 184, investments 111, medical 104, biometrics 97, lifestyle 74; **finance 0** | Waga 900 + uppercase + `tracking-widest` jako domyślna "hierarchia". |
| `uppercase` | investments 140, core 127, medical 90, biometrics 80 | Doc: "Uppercase i mikroetykieta nie mogą zastępować hierarchii". |
| Duże promienie (`rounded-2xl/3xl`, `[24-39px]`) | investments 145, core 84, biometrics 45 | Doc: grouped 14px, hero 22px. `--radius-2xl: 32px`, `--radius-3xl: 40px` nadal istnieją. |
| Lokalne motywy | `treningTheme.css` (277 l.), `ouraTheme.css`, `calendar.css`, `notes.css` (2489 l.), `auth.css`, forced-dark w Finansach | 6 równoległych "mini design systemów". |
| `EmptyState` użyty | todo 9, terminy 2, investments 2, medical 1, biometrics 1, **core/lifestyle/calendar/growth/identity: 0** | Puste stany pisane ad hoc. |
| Dev galeria vs doc | Galeria pokazuje skalę 56/48/30/24/20/18/15/13/11/9/7 i "Cabinet Grotesk / Plus Jakarta Sans", doc mówi SF + 9..56 inną skalą | Dwa źródła prawdy, żadne nie jest prawdą. |

---

## 1. Ranking ekranów: od najbrzydszych/niespójnych do najlepszych

Skala: 1 = największy dług wizualny. Oznaczenie: **[OBS]** oglądane na żywo, **[KOD]** wnioskowane z kodu.

### 1. `/poker` (Poker Decision Lab) — [OBS], awaria
- Strona to `PokerDecisionPage.tsx` (90 linii) osadzająca **iframe** `/poker/index.html` i `/libregto/index.html`. Efekt na 375px: **podwójny nagłówek** (nagłówek Reacta + wewnętrzny nagłówek statycznej strony), poziomy scroll, przycinane zakładki ("Decyzje & EV" ucięte przy krawędzi), wysokość `h-[calc(100vh-53px)]` przy zawijanym nagłówku (3 wiersze tytułu "Poker Decision Lab") zostawia pustą szarą połowę ekranu.
- Nagłówek: 7 elementów w jednym wierszu bez zawijania, `text-3xs` badge "Mental Models", cele dotykowe ~28px.
- Motyw: iframe ma własny ciemny motyw (granat + fiolet) wewnątrz jasnej powłoki; zero wspólnych tokenów.
- Brak stanu ładowania iframe, brak błędu, brak zachowania ciemnego trybu.
- Werdykt: najgorszy ekran, nadaje się do przepisania lub ukrycia na mobile.

### 2. `/inwestycje` (Insiderzy, GPW/USA) — [OBS] jasny + ciemny
- **Nagłówek wypada poza ekran**: przycisk odświeżania jest przycięty na prawej krawędzi (375px), obok `SP Sparky` (inny lockup niż `BrandTitle` "SPARKY" w reszcie aplikacji), hamburger, szukaj i pigułka GPW/USA. Cztery warianty "chrome" w jednym pasku.
- Eyebrow `PULPIT PT., 23 PAŹ 2026 · 10:44 · EUROPE/WARSAW` — mono, uppercase, szary, zawija się w 2 linie; to metadana pokazana jak nagłówek.
- Karty mają promień ~32px (`rounded-3xl` x145), kontra doc 14px; każda "metryka" to osobna pływająca karta z 9px etykietą nad 40px monospace'owym numerem i 9px opisem. Efekt: 5 niemal pustych kart w kolumnie, wysoki scroll, niska gęstość informacji.
- Hierarchia: tytuły sekcji `AKTYWNOŚĆ ŹRÓDEŁ 14 DNI` w uppercase font-black, liczba `2068` w niebieskim mono 28px konkuruje z tytułem; legenda wykresu w mono 9px.
- Wykres słupkowy: słupki w pigułkach o pełnym promieniu (ciekawe), ale oś X ma 3 etykiety 9px, bez wartości i bez tooltipu dotykowego; kolory (niebieski, pomarańcz) niesemantyczne względem DS (pomarańcz = "kierunek", niebieski = akcja).
- Strumień ujawnień: wiersze o 9px dacie, chipie `FORM 4`, logo, ticker i **ucięty** `Lord…`/`BAN…` do 4 znaków — użytkownik nie widzi nazwy ani wartości transakcji; tabela wciśnięta w wąski rząd, z własnym wewnętrznym scrollem (scroll-w-scrollu).
- Pusty stan watchlisty: duży blok "Dodaj spółki…" ~340px wysokości z jednym przyciskiem, powtórzony drugi raz na dole jako "Zbuduj pierwszą watchlistę".
- Ciemny motyw: czytelny, ale karty `#1C1C1E`-podobne na czerni bez rozróżnienia warstw; separatory prawie niewidoczne; pomarańcz słupków świeci nadmiernie.
- Wada systemowa: 118 plików, 12 tys. linii, 351 użyć 7-9px. To największy dług.

### 3. Kartoteka / Badania / Wzrok (`/badania`, `/optics`) — [KOD]
- `medical`: 104x `font-black`, 90x `uppercase`, 83x `text-3xs`. Gęste laboratoryjne wiersze z mikroetykietami. Własne tokeny w `GlassesCabinet`/`PrescriptionCard` używają fontów "Cabinet Grotesk" (stare). Ryzyko: wyniki (liczby) mają mniejszą wagę wizualną niż ich etykiety — odwrotność zasady "treść jest bohaterem".

### 4. Dziś (`/`, `/dzis`) — [KOD], najczęściej oglądany, więc najważniejszy
- Dziennie renderuje **8 kart w stosie**: `VisionHeroCard`, `ThreeSpheresGoalsCard`, `UrgentObligationsBanner`, `PowerList`, `FoodQuickCapture`, `TodayRunwayCard`, `DailyStrainCard`, `DailySnapshotCard` (+ nudge niedzielny). Doc: "najwyżej jedna karta hero". Tu każda karta walczy o uwagę, każda ma inny promień (`rounded-2xl`, `rounded-3xl`, `card`) i inną grubość ramki.
- `VisionHeroCard`: etykieta 9px black uppercase primary, pasek postępu `h-1`, emoji `🎯` w tekście, cytat kursywą z `line-clamp-3` — trzy typy tekstu w 4 liniach.
- `TodayRunwayCard` ("Wolna Przestrzeń"): `text-3xs font-black uppercase tracking-widest` jako tytuł, 7px opis "Czas na skupioną pracę głęboką lub regenerację." (nieczytelny).
- `DailyStrainCard`: `rounded-3xl`, gradient/ring wg statusu, `animate-pulse` ikona Sparkles (animacja bez znaczenia), stany ładowania jako tekst a nie skeleton.
- Nagłówek (`DashboardHeader.tsx`): kropka `animate-ping` pulsuje **bez końca** na statycznym nagłówku (ruch bez znaczenia, zasada 6 DS); przyciski ikon 36px (< 44px); data 9px w kolorze muted pod logo; dwa przyciski ikon (motyw, desktop) bez etykiet.
- Dolny pasek (`DashboardNavBar.tsx`): świetna idea pływającego paska z sunącą pigułką (GPU), ale etykiety 9px, tylko 3 cele + FAB; "Tydzień/Kronika" ikony `Calendar`/`Sparkles` — Sparkles jako ikona historii jest semantycznie nieczytelna.
- Układ: `p-5 pb-32`, `ui-stagger`, `ui-rise` na każdej karcie — wejściowa animacja stagger na ekranie otwieranym 20x dziennie (zasada 6: frequent = prawie żadna animacja).

### 5. Trening / Centrum analityki (`/trening`, `/cwiczenie`) — [KOD]
- Własny motyw `treningTheme.css` (277 linii): neonowa limonka `#c1ff2c` w dark, oliwka `#4d7c0f` w light, własne promienie `--tren-radius-card: 1.25rem`, klasy `trening-panel`, `trening-hero-cta`. Najbardziej "nie z tej aplikacji" tożsamość poza Finansami; bez tokenu w DS.
- `TrainingHubView`: `font-black uppercase tracking-widest text-3xs` jako eyebrow, `text-xl font-black` jako H2 — spójnie wewnętrznie, niespójnie z Dziś.
- `iosPolish.css` + `muscleHeatmap.css` + `BodyMap` — mocny element (mapa mięśni) schowany w gąszczu paneli; 140 użyć małych rozmiarów w `biometrics`.

### 6. `/dashboard` (Desktop Scoreboard) — [KOD]
- 152 użycia małych rozmiarów w 33 plikach; zaprojektowany na desktop (poza zakresem mobile), ale linkowany z nagłówka mobilnego bez etykiety.

### 7. Oura (`/oura`) — [KOD]
- `OuraMetricCard`: **na sztywno** `bg-surface-2`, `border-white/5`, `text-white`, `font-light text-4xl` — w jasnym motywie biały tekst na jasnej karcie (kontrast poniżej 2:1). 6x `text-white` w katalogu. `ouraTheme.css` (54 linii) próbuje to naprawić lokalnie.
- Wykresy dzień/noc (`OuraDayNight*`) wyglądają na przemyślane (własna siatka, tooltip, lanes), brakuje im jednego głównego wyniku "Dziś: gotowość 82" jak w Apple Health.

### 8. Tydzień / Kierunek (`lifestyle`: WeekHub, Direction, PowerList) — [KOD]
- 74x `font-black`, 43x tracking-widest, 5719 linii. Spójny wewnętrznie język "piksel-etykiet", ale tryby Direction (Planning/Monthly/Sprint) to trzy osobne układy z własną nawigacją.

### 9. Kalendarz (`/kalendarz`) — [KOD]
- `calendar.css` 201 linii, 63 użycia małych rozmiarów w siatce; ostatnio łatane (commit "calendar-free label wrap"). Siatka tygodnia na 375px wymaga własnej mobilnej agendy (nie miniaturowej siatki).

### 10. Todo (`/todo`) — [KOD]
- Lepiej: 9 użyć `EmptyState`, `TodoMobileNavigation`, tylko 2x `text-3xs`. 77 plików, własny `todo.css` (18 linii — OK). Zbyt wiele chromu: Sidebar + SearchBar + QuickCapture + CommandPalette + AppleRemindersSmartGrid.

### 11. Fundament / Tożsamość / Zdjęcia — [KOD]
- `identity`: 33x uppercase na 1018 liniach (najwyższy współczynnik uppercase/linię w aplikacji), karty przeglądu zdjęć.

### 12. Ustawienia — [KOD]
- Mało kodu (435 linii), prawie bez długu (1x `text-3xs`). Do weryfikacji na żywo: czy układ to `GroupedList` w stylu iOS Settings.

### 13. Notatki / Keep — [KOD]
- Najczystszy kod typografii (8x małe, 4x uppercase), ale `notes.css` ma **2489 linii** lokalnego CSS — dług w innym miejscu. Pakiet "Apple Notes organization" jest w toku (ACTIVE_WORK).

### 14. Finanse (`/finanse`) — [KOD] wzorzec do naśladowania
- 0x `font-black`, 0x uppercase, 0x małe rozmiary. Hero w stylu Revolut: segmenty (pigułki), duża liczba `tabular-nums` z tokenami `--finance-display-size`, `--tracking-display`, dzienna zmiana z kolorem, szybkie akcje w kółkach 56px, `FinanceBottomNav`. To jest kierunek, w którym powinna iść cała aplikacja.
- Wady: wymuszony ciemny motyw (`useForcedDarkTheme`) łamie preferencję użytkownika i jest jedynym widokiem z tym zachowaniem; brak skeletonów (0), 1 spinner; `rounded-3xl` w kilku kartach.

### Ekran logowania (`Auth`) — [OBS]
- Dobry: szklana karta, logo w kółku, duży przycisk primary, niebieskie rozmycie tła. Wady: tytuł "Sparky" w wadze 900 w innej kroju niż reszta (zbyt ciężki, kontrast do podtytułu), pola z cieniem i szarymi placeholderami o niskim kontraście (`twoj@email.pl` ~2.3:1), brak "Pokaż hasło" etykiety dla czytników, brak biometrii/passkey.

### `/dev/design-system` — [OBS]
- Dobra galeria ("Rytuał startu": hero pomarańczowy + grouped list z checkboxami wygląda jak iOS Reminders) — najładniejszy zrzut w całym przeglądzie, dowód że DS działa, gdy się go używa. Wada: galeria dokumentuje inny system niż doc (patrz tabela), ma bardzo długi pusty obszar przy przewijaniu (lazy sekcje bez placeholderów).

### Wady przekrojowe (dotyczą wszystkich ekranów)
1. **Skala typografii jest złamana u źródła** (7px/9px). Każda poprawka stylu w ekranach jest podważana przez token.
2. **Uppercase + font-black jako domyślny nagłówek**: brak realnej hierarchii. Zasada DS łamana ~600 razy.
3. **Promienie**: 14/22/28 w doc vs 32/40 w kodzie.
4. **Gęstość odwrócona**: dużo pustych kart z jedną liczbą (inwestycje) i jednocześnie 9px mikrodruku wokół nich.
5. **Ładowanie**: miks `Skeleton`, `Spinner`, `animate-pulse`, tekstów "Ładuje…" i `DataStateNotice`; core/finance prawie bez skeletonów.
6. **Puste stany**: `EmptyState` ma na sztywno `border-white/10 bg-white/[0.02]` — w jasnym motywie jest niewidoczny; przyjmuje `icon: string` (emoji) zamiast ikony Lucide, co łamie zasadę 5 (jeden system ikon).
7. **Ruch**: nieskończone `animate-ping`/`animate-pulse` (60 wystąpień w core/biometrics/lifestyle), stagger na każdym otwarciu.
8. **Brak sygnatury**: nie ma jednego rozpoznawalnego "ruchu" produktu (jak Revolut — duża liczba; Linear — pasek skrótów). Aplikacja wygląda jak sześć aplikacji.
9. **Motyw**: nie podąża za systemem; Finanse wymuszają ciemny.

---

## 2. Benchmark: czego uczą Revolut, Apple Health, Linear, Arc, Things 3

### Revolut — liczba jest bohaterem, akcje pod kciukiem
- Lekcje: jeden duży `tabular-nums` na ekran; segmenty (pigułki) zamiast zakładek; dzienna zmiana w kolorze obok liczby; okrągłe akcje szybkie (Dodaj / Wyślij / Więcej) bezpośrednio pod liczbą; widoczne zero-stany z jedną sugestią.
- Zastosowanie: `FinanceHomeHero` jest już tak zrobiony — **skopiować wzorzec** do Dziś (jedna liczba: "Gotowość dnia" lub "Zadania 3/7") i Trening (obciążenie tygodnia). Wprowadzić `StatHero` (`ui/StatHero.tsx` istnieje, mało używany) jako obowiązkowy szkielet hero. Animowany licznik (`ui/NumberTicker.tsx` istnieje) tylko przy pierwszym wejściu dnia.

### Apple Health — podsumowanie → szczegół, kolor = kategoria, trendy wiodą
- Lekcje: ekran główny to **kafle kategorii** z jedną liczbą, mini-sparkline i datą ostatniego pomiaru; "Pins/Favorites"; drill-down z wykresem 1T/1M/6M/1R i średnią w zakresie; kolor kategorii niesie tożsamość (Sen = indygo, Aktywność = pierścienie).
- Zastosowanie: Oura i Trening dostają jedno "Podsumowanie" (pierścienie: sen, gotowość, obciążenie) + kafle z sparklinem (`OuraRhythmTiles` istnieje); `/korelacje` jako "Highlights" ("To zauważyliśmy") z widocznym `n`. Przypisać każdej domenie jeden kolor semantyczny w tokenach (zdrowie, finanse, nauka, praca) zamiast lokalnych motywów.

### Linear — gęstość z dyscypliną, klawiatura, ruch niemal niewidoczny
- Lekcje: 13px base, 4 wagi, bardzo mała liczba kolorów, stany (hover/focus/selected) identyczne wszędzie; paleta komend jako główna nawigacja; animacje 100-150ms; zero ozdobników; spójne ikony 16px; **zawsze** optymistyczne UI i skeletony dokładnie w kształcie treści.
- Zastosowanie: `TodoCommandPalette`/`commandCatalog` rozszerzyć do globalnej palety ("Cmd+K" na desktop, "przeciągnij w dół" na mobile — jest `SearchModal`). Zasada "jedna skala, jedna waga nagłówka" — usunąć `font-black` z 90% miejsc. Skeletony kształtu (`Skeleton variant="stat"` już istnieje) zamiast spinnerów.

### Arc — personalizacja przestrzeni, lekkie tożsamości, boczne panele
- Lekcje: każda "przestrzeń" (Space) ma własny kolor/gradient tła i ikonę, ale wspólny szkielet; Boosts; mały wskaźnik kontekstu.
- Zastosowanie: **jedno** legalne miejsce na lokalny kolor — "akcent domeny" jako token (`--domain-accent`) nadpisywany na poziomie `PageShell`, zamiast osobnych 277 linii `treningTheme.css`. Trening = limonka, Oura = indygo, Finanse = zieleń, Wiedza = niebieski — ale wszystko przez ten sam token i te same komponenty.

### Things 3 — spokój, miejsce na oddech, mikrointerakcje z sercem
- Lekcje: ogromny whitespace, jedna czcionka, ikony subtelne, checkbox z sprężystą animacją i delikatnym dźwiękiem/hapticiem; ekran Dziś z sekcjami "Dziś / Wieczorem"; "Magic Plus" (przeciągany przycisk dodawania, który wstawia zadanie w wybranym miejscu); duże, miękkie nagłówki.
- Zastosowanie: Dziś = lista Things-podobna (PowerList) jako **jedyny** główny blok; reszta za "Więcej" (zwijane). Checkbox w `TodoCardCollapsedRow` z hapticiem + animacją 150ms; "Wieczorem" ↔ `DailyShutdownModal`. Dla FAB w `DashboardNavBar` rozważyć przeciąganie do konkretnej sekcji.

### Wspólny mianownik benchmarków dla Sparky
1. Jedna liczba / jeden wynik na ekran. 2. Jedna skala typografii (13/15/17/20/28/34). 3. Gęstość przez rząd listy, nie przez karty. 4. Kolor = rola. 5. Ruch rzadki i znaczący. 6. Puste stany jako zaproszenie do działania, nie plakat.

---

## 3. 25 poprawek o największym wpływie "wow", sortowane wg stosunku efekt/wysiłek

Legenda: Wysiłek S (<= 2h) / M (pół dnia) / L (dzień+). Efekt 1-5. Sortowanie malejąco po efekt/wysiłek.

| # | Poprawka | Pliki | Wysiłek | Efekt |
|---|---|---|---|---|
| 1 | **Naprawić skalę tokenów**: ustawić `--text-3xs: 10px`, `--text-2xs: 11px` (zgodnie z docem) w jednym miejscu (`@theme` L1103-1115) i scalić duplikat w `:root` L1522; `text-3xs` zostaje tylko jako "status techniczny" | `src/index.css` | S | 5 |
| 2 | **Podążanie motywu za systemem** (`prefers-color-scheme`) z opcją Auto/Jasny/Ciemny; zdjąć wymuszony dark z Finansów (zostaje preferencja) | `src/components/core/hooks/useDashboardTheme.ts`, `core/Auth.tsx`, `finance/useForcedDarkTheme.ts`, `index.css` | S | 4 |
| 3 | **Naprawić `EmptyState`**: tokeny (`border-separator`, `bg-surface-2`), ikona Lucide zamiast emoji (`icon: ReactNode`), jedna akcja `tonal`, wariant `compact` | `src/components/ui/EmptyState.tsx` + 14 miejsc użycia | S | 4 |
| 4 | **Nagłówek inwestycji mieści się w 375px**: 1 wiersz = tytuł + 2 ikony; GPW/USA jako segment pod tytułem; usunąć `SP Sparky` na rzecz `BrandTitle` | `src/components/investments/` (nagłówek strony; `InvestmentsPage.tsx`, `ConvergenceHeader.tsx`, `AnalystHeaderBanner.tsx` do weryfikacji, który jest nagłówkiem) | S | 4 |
| 5 | **Poker: zamienić iframe-chrome na jeden pasek**; na mobile `h-dvh`, nagłówek w 1 wierszu, ukryć wewnętrzny nagłówek iframe przez `?embed=1`, przełącznik jako `Tabs` | `src/components/poker/PokerDecisionPage.tsx`, `public/poker/index.html`, `public/libregto/index.html` | S | 4 |
| 6 | **Przyciski ikonowe 44px** (nagłówek, inwestycje, poker): `IconButton` z min 44px hit-area (`::after` inset -4px) | `src/components/ui/IconButton.tsx`, `core/DashboardHeader.tsx` | S | 3 |
| 7 | **Usunąć nieskończone `animate-ping`/`animate-pulse`** z nagłówka i kart (zostawić tylko dla realnego "live") | `core/DashboardHeader.tsx`, `biometrics/DailyStrainCard.tsx`, grep `animate-ping\|animate-pulse` w core/biometrics/lifestyle | S | 3 |
| 8 | **Jedna reguła nagłówka sekcji**: nowy `<SectionTitle>` (15/17px, 600, sentence-case, bez uppercase), zamiast `text-3xs font-black uppercase tracking-widest`; codemod na core/medical/biometrics | `src/components/shared/Section.tsx`, `ui/` (nowy komponent), potem 4 paczki | M | 5 |
| 9 | **Dziś: jeden hero + reszta jako grouped list**. Hero = "Najbliższy ruch" (dane z `buildTodayRunway`); `VisionHeroCard` i `ThreeSpheresGoalsCard` scalić w pasek "Kierunek"; `DailyStrain` i `DailySnapshot` jako zwijane wiersze | `core/DashboardDzisTab.tsx`, `core/VisionHeroCard.tsx`, `core/ThreeSpheresGoalsCard.tsx`, `core/TodayRunwayCard.tsx` | M | 5 |
| 10 | **Skeleton kształtu zamiast spinnerów** w Dziś/Finanse/Oura/Trening (`variant="stat"`/`"card"`); `FALLBACK_SPINNER` w `App.tsx` zastąpić szkieletem powłoki z dolnym paskiem | `src/App.tsx`, `ui/Skeleton.tsx`, `core/DashboardDzisTab.tsx` (`ViewFallback`), `biometrics/DailyStrainCard.tsx` | M | 4 |
| 11 | **Promienie: usunąć `--radius-2xl/3xl`** z użycia; codemod `rounded-3xl`→`rounded-[var(--radius-hero)]` / `rounded-2xl`→grouped; spójne ramki | `src/index.css`, grep `rounded-(2xl\|3xl)` (investments 145, core 84, biometrics 45) | M | 4 |
| 12 | **Dolny pasek**: etykiety 11px, ikona historii zamiast `Sparkles` (`BookOpen`/`History`), badge na Tygodniu (zaległe), długie przytrzymanie = skrót do ostatniego widoku, haptyka przy zmianie | `core/DashboardNavBar.tsx`, `core/Dashboard.tsx` (navItems L132) | S | 3 |
| 13 | **Hero-liczba w stylu Revolut na Dziś/Trening/Oura** przez wspólny `StatHero` + `NumberTicker` (tylko pierwsze wejście w ciągu dnia) | `ui/StatHero.tsx`, `ui/NumberTicker.tsx`, `core/DashboardDzisTab.tsx`, `biometrics/workout/TrainingHubView.tsx`, `biometrics/oura/OuraScoreRings.tsx` | M | 5 |
| 14 | **Oura: usunąć `text-white`/`border-white/5`**, tokeny + akcent domeny; w jasnym motywie karty `surface-1` | `biometrics/oura/OuraMetricCard.tsx` (+ 5 plików z `text-white`), `oura/ouraTheme.css` | S | 4 |
| 15 | **Inwestycje: 5 kart metryk → jeden `GroupedList` z 5 wierszami** (etykieta 13px, wartość 17px semibold tabular, opis 13px muted); wysokość ekranu -60% | `investments/DashboardBottomCards.tsx`, `investments/DashboardActivityChart.tsx`, `investments/DashboardDisclosureStream.tsx` (+ plik z kartami KPI "ZGŁOSZENIA / 14 DNI") | M | 4 |
| 16 | **Strumień ujawnień jako dwuliniowy wiersz** (ticker + nazwa pełna w linii 1, strona/kwota/data w linii 2), bez wewnętrznego scrolla; skrót pełnej nazwy w tooltipie/sheet | `investments/DashboardDisclosureStream.tsx`, `investments/CongressStreamTable.tsx` | M | 4 |
| 17 | **Wspólny `PageHeader` (large title 34px → collapsing 17px on scroll)** jak iOS; wszystkie widoki mają ten sam nagłówek (`WorkspaceHeader`/`PageShell`/`PageToolbar` scalone) | `shared/WorkspaceHeader.tsx`, `shared/PageToolbar.tsx`, `shared/PageTemplateBoundary.tsx`, `core/DashboardHeader.tsx` | L | 5 |
| 18 | **Tokeny domen zamiast lokalnych motywów**: `--domain-accent` ustawiany w `PageShell`; `treningTheme.css`, `ouraTheme.css` zredukować do 20 linii każdy | `biometrics/workout/treningTheme.css`, `biometrics/oura/ouraTheme.css`, `index.css`, `shared/PageTemplateBoundary.tsx` | L | 4 |
| 19 | **Mikrointerakcje checkboxa i ukończenia zadania**: sprężysty tick 150ms, haptyka `success`, wiersz zsuwa się do "Zrobione" z cofnięciem (toast "Cofnij" 4s) | `todo/TodoCardCollapsedRow.tsx`, `lifestyle/PowerListTask.tsx`, `ui/ToastHost.tsx`, `hooks/useHaptics.ts` | M | 4 |
| 20 | **Wykresy: wspólny `MiniChart`** (oś Y 2 etykiety, tooltip dotykowy z wartością, kolor semantyczny, `prefers-reduced-motion`), użyty w inwestycjach, Oura, Chronicle, Finanse | nowy `ui/MiniChart.tsx`, `investments/DashboardActivityChart.tsx`, `core/chronicle/ChronicleLineChart.tsx`, `finance/FinanceHoldingsHeatmap.tsx` | L | 4 |
| 21 | **Ekran logowania**: tytuł w 700 zamiast 900, placeholdery z kontrastem >= 4.5:1, `autocomplete`, "Zaloguj się przez passkey/Face ID" jeśli natywne | `core/Auth.tsx`, `core/auth.css` | S | 2 |
| 22 | **Galeria DS = doc**: zsynchronizować `DesignSystemGalleries.tsx` z tokenami (skala 11/13/15/17/20/28/34, fonty systemowe), dodać stronę "Zakazane wzorce" i "Puste stany/Ładowanie" | `src/components/dev/DesignSystemPage.tsx`, `dev/DesignSystemGalleries.tsx`, `docs/DESIGN_SYSTEM.md` | M | 3 |
| 23 | **Kalendarz mobile: agenda zamiast siatki** poniżej 480px (grupowanie po dniach, "teraz" jako linia, kolor kategorii jako pasek), siatka tygodnia tylko na tablet+ | `calendar/CalendarView.tsx`, `calendar/CalendarGrid.tsx`, `calendar/calendarView/*`, `calendar/calendar.css` | L | 4 |
| 24 | **Kronika/Historia jako oś czasu Apple Health "Highlights"**: karty "Co zauważyłem" z `n=`, zakresem dat i przyciskiem "To nie ja" (korekta = sygnał) | `core/DashboardHistoriaTab.tsx`, `core/chronicle/ChronicleSummary.tsx`, `core/WeeklyWinsMap.tsx` | M | 4 |
| 25 | **Infrastruktura audytu wizualnego**: konto seed + `VITE_E2E_SESSION`, skrypt Playwright robiący screenshoty 375x812 jasny/ciemny dla ~20 tras do `docs/agent/screens/`, test progowy (min font-size >= 11px, overflow-x = 0, cele >= 44px) w CI | nowe: `scripts/ux-audit.mjs`, `e2e/`, `src/hooks/useAppAuthSession.ts` (tylko DEV) | M | 5 (dla procesu) |

Uwaga do #1: **to jest poprawka numer 1 niezależnie od wszystkiego** — zmienia wygląd każdego `text-3xs`/`text-2xs` w 1100+ miejscach jedną linią CSS. Bezpieczna kolejność: najpierw ustawić `2xs: 11px`, `3xs: 10px`, uruchomić testy wizualne/ratchet, a dopiero potem codemodem usuwać `3xs` z etykiet na korzyść `text-xs`.

### Szybki zwycięski pakiet (jedna sesja, ~4 h, efekt widoczny natychmiast)
#1, #2, #3, #6, #7, #12, #14, #21 — wszystkie S, dotykają współdzielonych plików, razem poprawiają czytelność, kontrast i spójność.

---

## 4. Podział na 4-5 rozłącznych paczek plików (równoległe agenty bez konfliktów)

**Warunek wstępny (Paczka 0, sekwencyjnie, najpierw, ~1 sesja):** fundament — tylko tokeny i prymitywy. Reszta agentów **nie wolno** dotykać tych plików. Po jej wmergowaniu startują równolegle paczki A-E.

### Paczka 0 — Fundament (blokująca)
- `src/index.css`, `src/components/ui/**`, `src/components/shared/**` (w tym `PageTemplateBoundary`, `WorkspaceHeader`, `PageToolbar`, `Section`, `DataCard`), `src/components/dev/**`, `docs/DESIGN_SYSTEM.md`, `eslint.config.js`, `src/App.tsx`.
- Zawartość: poprawki #1, #3, #6, #8 (komponent `SectionTitle`), #10 (szkielet fallbacku), #11 (promienie), #17 (`PageHeader`), #22. Dodać do ESLint zakaz `text-3xs` poza allowlistą i `uppercase` bez `SectionTitle`.

### Paczka A — "Dziś" i powłoka
- `src/components/core/**` (w tym `core/nutrition`, `core/morningPlan`, `core/shutdown`, `core/chronicle`, `core/visionHero`, `core/sphereGoals`), `src/components/desktop/**`, `src/components/memory/**`, `src/components/ai/**`.
- Poprawki: #2 (część Dashboard theme), #7 (nagłówek), #9, #12, #13 (część Dziś), #21, #24.
- Granica: A **konsumuje** `lifestyle/PowerList`, `biometrics/DailyStrainCard`, `terminy/UrgentObligationsBanner` tylko przez propsy/importy — nie edytuje ich.

### Paczka B — Zdrowie i ciało
- `src/components/biometrics/**`, `src/components/medical/**`.
- Poprawki: #7 (DailyStrainCard), #13 (Trening/Oura), #14, #18 (`treningTheme.css`, `ouraTheme.css`), puste stany/skeletony Oura/Trening.
- Uwaga: `DailyStrainCard` używany w A — B jest właścicielem pliku, A nie.

### Paczka C — Planowanie i praca
- `src/components/todo/**`, `src/components/calendar/**`, `src/components/terminy/**`, `src/components/lifestyle/**`, `src/components/projects/**`, `src/components/growth/**`.
- Poprawki: #19, #23, upraszczanie chromu Todo, Tydzień/Kierunek (trzy tryby → jeden układ z segmentem), `PowerList`.
- Granica: `lifestyle/PowerList` jest zależnością A — C jest właścicielem.

### Paczka D — Wiedza, tożsamość, ustawienia, poker
- `src/components/notes/**`, `src/components/identity/**`, `src/components/settings/**`, `src/components/integrations/**`, `src/components/correlations/**`, `src/components/poker/**`, `public/poker/**`, `public/libregto/**`.
- Poprawki: #5, `notes.css` redukcja (2489 linii), Korelacje jako "Highlights" z `n`, Settings jako `GroupedList`.

### Paczka E — Pieniądze
- `src/components/finance/**`, `src/components/investments/**`.
- Poprawki: #2 (część Finanse — usunięcie forced dark), #4, #15, #16, #20 (mini-wykres użyty tu), skeletony Finansów.
- Najlepszy kandydat na wzorzec: odwrócić kierunek — Inwestycje dostają język Finansów (hero + segmenty + `GroupedList`).

### Reguły koordynacji
1. Żaden agent nie edytuje plików spoza swojej paczki; potrzebna zmiana w `ui/`/`shared/` = zgłoszenie do paczki 0 (lub osobny, mały PR do tej paczki po jej wmergowaniu).
2. Zasada Skauta (pliki > 300 linii) obowiązuje: przy dotknięciu pliku z listy legacy wydzielić hook/subkomponent (`docs/FRONTEND_GUIDE.md`).
3. Każda paczka kończy: `lessons.md` update, jeden commit na temat, czyste drzewo, ratchet frontend nie rośnie.
4. Wspólne punkty styku do zamrożenia kontraktów propsów **przed** startem: `PowerList` (C→A), `DailyStrainCard` (B→A), `UrgentObligationsBanner` (C→A), `FoodQuickCapture` (A, wewn.), `EmptyState` (0→wszyscy).
5. Kolejność merge: 0 → (A, B, C, D, E w dowolnej kolejności, rozłączne zbiory plików).

---

## 5. Nieoczywiste pomysły produktowe

Wszystkie zgodne z `PRODUCT_PRINCIPLES.md` (rewizja 2026-07-02): coach tylko z policzonych efektów i widocznym `n`, "pull nie push", korekta użytkownika jako sygnał, bez diagnoz.

1. **"Dzień w jednym zdaniu" (Evidence Sentence)** — jedno zdanie na górze Dziś, składane z faktów: "Sen 6h12, gotowość 71, 3 z 5 zadań, 2 odłożone po raz trzeci." Każdy fragment dotyka źródła (tap = skąd). Zero interpretacji, maksymalna wartość wizualna na hero.
2. **Rollover jako widoczny ciężar** — zadanie odłożone 3x ma wizualnie "grubszy" wiersz (nie czerwony alarm), a w niedzielę Pruning Flow w `WeeklyReviewModal` (z backlogu S-tier). Wizualizacja długu uwagi zamiast listy wstydu.
3. **Cichy kalendarz energii** — pas pod "Dziś" pokazujący okna wysokiej/niskiej gotowości (z Oura + historia efektów) naniesione na kalendarz. Pull: widoczny, gdy użytkownik otworzy planowanie; bez powiadomień.
4. **"Kontra-dzień"** — przycisk w kronice: "Pokaż mi dzień, który wyglądał podobnie". Podobieństwo liczone z danych (sen, obciążenie, liczba zadań), wynik: dwa dni obok siebie z różnicą. Uczy użytkownika zaufania do własnych danych (cel: "ufa danym bardziej niż narracji").
5. **N-of-1 eksperymenty jako kafelki** — z `/korelacje`: "Eksperyment: sauna po 20:00 → sen (n=9/14 dni)". Start/stop jednym tapem, wynik z przedziałem i napisem "za mało danych" do osiągnięcia progu. Wizualnie jak karta Apple Health Highlights.
6. **Rewers Kronika: "To nie ja"** — przy każdym zdarzeniu/wzorcu przycisk korekty (już zasadą produktu); wizualizować **liczbę korekt** jako metrykę zaufania do systemu w ustawieniach ("Precyzja Twoich potwierdzeń: 87%").
7. **Okno zapisu "brudne i prawdziwe"** — tryb szybkiego strumienia bez struktury (głosówka → surowy tekst), z ostrzeżeniem telemetry corruption: jeśli wpisy stają się "ładniejsze" (rosnąca długość/formalność), delikatny wskaźnik "ostatnio piszesz pod system". Chroni jakość danych.
8. **Kontekstowy FAB** — przycisk `+` zmienia akcję zależnie od pory i miejsca: rano = plan dnia, po treningu = RPE, po 21:00 = refleksja, w kuchni (lokalizacja) = posiłek. Dane już są (`locationSync`, `usageStatsSync`).
9. **Majątek jako "dni wolności"** — w Finansach druga jednostka obok PLN: "ile miesięcy kosztów życia pokrywa Twój majątek netto" (poduszka + inwestycje / średnie miesięczne wydatki). Jedna liczba, ogromna wartość motywacyjna, bez porady inwestycyjnej.
10. **Insider-feed jako "dlaczego to ważne dla Ciebie"** — w Inwestycjach pokazuj ujawnienia tylko dla spółek z watchlisty/portfela jako pierwszy poziom, a resztę zwiniętą; każdy wiersz z "n transakcji w 14 dniach" i datą zgłoszenia (nie wykonania). Redukuje szum 2068→kilka.
11. **Kapsuła czasu tygodnia** — w niedzielę automatyczny, jednoekranowy "plakat tygodnia" (zrzut liczb + jedno zdanie + jedno zdjęcie z `identity`), zapisywany w Kronice; do udostępnienia lub archiwum. Rytuał zamknięcia, który ma estetyczną nagrodę (Things 3-owy spokój).
12. **Widget "następny ruch" na ekran blokady** — jeden wiersz: najbliższy blok z `buildTodayRunway` + czas do niego. Natywny (Android: istnieje infrastruktura widgetów `widget_tokens`). Dostarcza wartość bez otwierania aplikacji, nie jest alertem prewencyjnym (użytkownik sam patrzy).
13. **Przełącznik "Gęstość"** — Komfort / Standard / Kompakt w Ustawieniach, sterowany jednym tokenem `--density` (rozmiar wierszy i odstępów). Użytkownik z aplikacją na co dzień dostaje gęstość Linear, nowy użytkownik Things.
14. **Sprawdzanie świeżości danych na hero** — mała kropka statusu (zielona/pomarańczowa) "Dane z Oura sprzed 3 h" przy każdej liczbie z syncu. Wzmacnia zasadę "transparency" i rozwiązuje stan "7 z 9 źródeł wymaga uwagi" w Inwestycjach bez dużych bannerów.

---

## Załącznik: priorytety w jednym zdaniu

Najpierw naprawić skalę tokenów i dwa kluczowe prymitywy (EmptyState, nagłówek sekcji) — to zmienia wygląd ~1100 miejsc; potem uczynić Dziś ekranem z **jednym** bohaterem na wzór Finansów; potem uciszyć ruch i uporządkować promienie. Poker i Inwestycje wymagają osobnych napraw responsywności, bo są dziś ewidentnie niedopasowane do 375px.
