# Active Work

Krótki handoff: tylko to, co jest w toku **teraz**. Plik jest nadpisywany, nie dopisywany (limit ok. 150 linii).
Zrobione plany usuwamy (historia jest w gicie), otwarte punkty trafiają do [`BACKLOG.md`](../../BACKLOG.md).
Zasada jednego źródła prawdy dla danych i celów: [`../SINGLE_SOURCE.md`](../SINGLE_SOURCE.md).

## Handoff dla Claude Code: panel closera w Sparky

Użytkownik chce teraz opublikować bieżącą pracę przez **git push**; dalszy rozwój przejmuje Claude Code.
Wybrany kierunek: osobny widok analizy z nagraniem, momentami, wskazówkami i własnymi notatkami;
część osobista ma uwzględniać przede wszystkim **energię, presję i kontekst dnia**.

### Co jest podłączone

- `src/components/lifestyle/closer/`: `CloserWeekTracker` → `useCloserWeek` (dane), czytelne podsumowanie,
  edycja kontekstu dnia, korekty liczb, biblioteka całej historii z jawnymi filtrami i wyszukiwaniem po tytule/notatkach.
  Biblioteka pokazuje licznik wszystkich/pasujących/wyświetlonych i przycisk kolejnych rozmów; wybór dnia nie filtruje jej domyślnie.
- Analiza: `CloserCallReviewView`, `CloserCallEvidence`, `useFathomPlayer`, `useCloserReviewNotes`.
  Odtwarzacz Fathom przyjmuje seek przez **Player.js postMessage** (JSON string, origin + source sprawdzane);
  parametr timestamp na iframe nie przewija filmu. Obserwacje AI są oddzielone od rzeczywistej transkrypcji.
- `closer_calls.review_notes`: prywatny wniosek z rozmowy; szkic localStorage jest izolowany po właścicielu i rozmowie.
- `closer_daily_logs.work_energy`, `work_pressure`: opcjonalne deklaracje użytkownika w skali 1–5; NULL oznacza brak deklaracji.
  Kontekst tekstowy używa istniejącego `notes`, wspólnego z formularzem liczb. Szkic kontekstu jest izolowany po właścicielu i dacie.
  Przy analizie pobierany jest kontekst **call_date nagrania**, nie dnia zaznaczonego w panelu.
- `numbers_entered_at`: rozróżnia świadomie potwierdzony dzień zerowy od samych notatek/kontekstu.
  `hasEnteredNumbers` nie uznaje już samej notatki za liczby; `rowToDraft` zachowuje opis, ale zostawia brakujące liczby puste.
- API: `src/lib/closer/closerCallsApi.ts`, `closerDayApi.ts`, `closerApi.ts`; częściowy zapis kontekstu nie nadpisuje liczników.
  Wyższy ręczny wynik i dane Fathom zachodzą na siebie — nie dodajemy ich dwukrotnie. Ograniczenie minimum jest też w bazie.

### Backend i dostęp

- Projekt Supabase: `pdvqkgfsqziqlhptatgf`; działają istniejące webhook i import Fathom.
  Funkcja `fathom-webhook` ma verify_jwt=false, ale sprawdza podpis Standard Webhooks.
  Sekret jest już skonfigurowany w Supabase; **nie twórz drugiego webhooka i nie kopiuj sekretów do repo/handoffu**.
- Model strukturalnej analizy w `_shared/closerCallAnalysis.ts` to `deepseek-chat` (poprzedni model zwracał nieprawidłowy JSON).
  Prompt: cytat + obserwacja + hipoteza + jeden eksperyment, bez założeń o finansach/ROI klienta i bez ocen emocji;
  momenty walidowane `groundCallMoments`. Każdy moment ma też etap rozmowy (`CALL_PHASES` w `@vanguard/domain`); Druga część analizy (`_shared/closerPhaseAssessment.ts`) klasyfikuje rozmowę (`ai_call_kind`: sales/training/other) i ocenia każdy etap 1–5 względem kryteriów (`ai_phases`; kryteria z tabeli `sales_playbook_criteria`, a gdy brak — `DEFAULT_PHASE_CRITERIA` w domenie). Biblioteka pokazuje kartę „Etapy rozmów” (`closerPhaseTrends.ts`, `CloserPhaseTrends.tsx`): średnia z 5 ostatnich vs poprzednie 5 na etap, najniżej oceniany etap z najczęściej brakującym kryterium, kryteria brakujące w ≥3 rozmowach, kryteria spełniane w ≥80%. Liczone tylko dla `sales`. Wszystkie 23 zapisane rozmowy przeliczone 2026-10-25 nowym promptem z etapami.
- Migracje `20261025130316_closer_fathom_daily_totals.sql`, `20261025131515_closer_call_review_notes.sql`,
  `20261025135927_closer_work_context.sql` i `20261025141203_closer_numbers_confirmation.sql` są zastosowane z tymi samymi wersjami w ledgerze.
  Typy w `src/lib/database.types.ts` i `supabase/functions/_shared/database.types.ts` są odświeżone.
- `npm run db:check-drift` wykrywa wcześniejsze rozjazdy local/remote, także dla pierwszej migracji closer_calls
  zastosowanej wcześniej innym narzędziem. **Nie stosuj wszystkiego zbiorczo w ciemno**; najpierw porównaj istniejący schemat i ledger.
- Lokalne pomocnicze `scripts/ops/fathom-register-webhook.mjs` i `fathom-set-secret.mjs` były nieśledzone przed tą częścią pracy;
  nie są potrzebne do pracy panelu. Pierwszy może założyć zdublowany webhook.

### Co warto dokończyć

1. ~~Ponowna analiza starszych rozmów~~ — zrobione: funkcja `closer-reanalyze` (przycisk „Przeanalizuj ponownie” w analizie);
   23 rozmowy przeliczone 2026-10-25 za zgodą użytkownika (wyniki: 1 closed, 9 follow_up, 13 unclear; średnia ocena procesu 5,3).
1a. **Prowadzenie rozmowy (zrobione):** `call_metrics` w `closer_calls` liczone z transkryptu bez AI (`computeCallTalkMetrics` w `@vanguard/domain`; „ja" = mówca z adresem właściciela konta z `auth.users`). Karta „Prowadzenie rozmowy" (`CloserVoiceCard`, `closerVoiceTrends.ts`): udział w mówieniu, najdłuższa wypowiedź, pytania klienta, tempo. `closer-reanalyze` z `metricsOnly: true` przelicza same metryki. Nie da się zmierzyć ciszy po cenie (transkrypt ma tylko początki wypowiedzi) ani prawdziwej dykcji (potrzebny dźwięk); nie dodawaj wypełniaczy (transkrypcja wycina „yyy").
1b. **Wiedza sprzedażowa od użytkownika (czeka na materiały):** oferta (cena, pakiet, raty, obiekcje z odpowiedziami) oraz notatki Hormozjego i najlepszych sprzedawców w `docs/career/sales-knowledge/`. Zamienić je na kryteria na etap w `sales_playbook_criteria` (klucz `etap.nazwa`, `source` = źródło), potem przeliczyć rozmowy przez `closer-reanalyze`. Skalę 1–5 skalibrować: użytkownik ocenia 3–4 rozmowy sam i porównujemy.
2. Polish panelu na realnym telefonie. Skrót kontekstu dnia („Ty tego dnia: energia · presja”) jest już w nagłówku analizy,
   pełny blok zostaje pod transkryptem. Nie dodawaj ściany tekstu ani automatycznych ocen stanu psychicznego.
3. Sprawdzić zapis na zalogowanej produkcyjnej PWA i odtwarzanie na urządzeniu użytkownika (Fathom może dawać CORS odtwarzacza; jest link zewnętrzny).
4. ~~Wdrożyć `fathom-webhook`~~ — wdrożone 2026-10-25 przez MCP jako bundle (v4, test bez podpisu → 403). Kolejne `supabase functions deploy` z CLI nadpisze je tą samą wersją z repo.

### Walidacja

- Testy SQL: `npm run test:sql` — przeszły, w tym kontekst/zera, ochrona liczników i owner RLS.
- Browser: widoki panelu/analizy przy szerokości telefonu nie rozszerzają strony na boki;
  filtr dnia, rozwinięcie kolejnych nagrań, wyszukiwanie własnej notatki oraz pokazanie zapisanego kontekstu w analizie sprawdzone.
- `npm run typecheck:ui`, ESLint dla zmienionych plików, `npm run ratchet:frontend` (w tym Knip) i `npm run build` przeszły.
  Build ma wcześniejsze ostrzeżenia o kolejności importu iosPolish.css i wielkości chunków; bez błędu kompilacji.
- Po scaleniu gałęzi `fix/ssot-wymyslone-liczby` z `main` (2026-10-25): pełny `vitest` i `eslint . --max-warnings=0`
  na wspólnym stanie — wynik w opisie PR scalenia.
- Lokalny Windows: `C:\Users\jakub\Desktop\Sparky` jest junction do `D:\Przeniesione\Desktop-Sparky`.
  Narzędzia Node/Vite uruchamiaj z rzeczywistego D:. Na Windows pełny Vitest ogranicz do
  `npm test -- --maxWorkers=4 --testTimeout=30000`; testy strażników skanują pliki i wymagają czasu.

## W toku

- **Jedno źródło prawdy** ([`../SINGLE_SOURCE.md`](../SINGLE_SOURCE.md)): cele, progi i definicje mają jednego właściciela
  (`life_targets`, `goal_kpis`, `@vanguard/domain`), a strażnik `src/lib/lifeGoals.guard.test.ts` pilnuje celów w kodzie.
  Dalsze szukanie rozjazdów: literał strefy w funkcjach edge (niskie ryzyko), różne definicje „średni sen” i „treningi
  w tygodniu” na ekranach, próg węgli wpisany w macierzy, liczby w promptach AI.
- **Weryfikacja wdrożenia funkcji edge**: wdrożone ręcznie (`vanguard-nightly`, `vanguard-oracle`, `vanguard-telegram`,
  `recap`, `period-compare`, `analyze-food-quality`, `parse-food-nl`, `analyze-training-load`), ale bez sprawdzenia działania.
  Test w aplikacji: porównanie okresów AI w Kronice, Analiza tygodnia, raport tygodniowy, `/teraz` w Telegramie; przy błędzie
  logi w panelu Supabase (Edge Functions → funkcja → Logs).
- Zasady pracy: jeden temat = jeden PR; po merge'u `git checkout -B <gałąź> origin/main`; testy reguł domeny w
  `src/lib/domainRules/` (vitest zbiera tylko `src/**`); bez deno lokalnie importy funkcji edge sprawdza bundle esbuild
  z aliasem `@vanguard/domain`.

## Czeka na decyzję użytkownika

- Rozwój (`/rozwoj`): wyciąć z aplikacji czy zostawić (tabele puste, funkcja świeża).
- Cel roczny sfery Duch (`life_goals.goal_duch`) jest pusty po usunięciu „No-Drift Morning”.
- Cel bieżącego sprintu nie ma wpisu; wybór cyklu uściślania celów (rano/tydzień/sprint, tylko sprint i rok,
  tylko gdy brakuje).
- Portfele w Inwestycjach (zakodowane na sztywno: „Kondzia” i Jakuba): zostawione celowo, do przeniesienia do Finansów.

## Otwarte punkty (Finanse, Badania, Healthspan v2, Kartoteka, Notatki, iOS)

Przeniesione do [`BACKLOG.md`](../../BACKLOG.md), sekcja „Otwarte z archiwum ACTIVE_WORK”.

## Stan: Capacitor Android — Faza 5 + 6 ✅

### DONE (Faza 5 — sync w tle)

- `TelemetryForegroundService` — FGS typu `location`, powiadomienie „Sync aktywny”
- `BackgroundSyncPlugin` — start/stop, tick co ~15 min → `syncPhoneUsageToday` + `syncLocationNow`
- Wizard w ⚙️ Ustawienia: bateria, autostart (Xiaomi/OPPO/Vivo/Huawei fallback), GPS, toggle sync w tle
- `locationSync` — watchPosition nie zatrzymuje się gdy FGS aktywny
- Manifest: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`

### DONE (Faza 6 — polish)

- Ikona launchera z `public/pwa-*.png` (tło adaptive `#1C1917`)
- Share target `ACTION_SEND text/plain` → `/links` lub `/keep`
- Static shortcuts: Zadania, Linki, Notatki (`res/xml/shortcuts.xml`)
- Deep links `https://localhost/...` + `ShareIntentPlugin` + `initNativeIntents`

### NEXT

- Faza 7 (opcjonalnie): widgety
- Final: Oura Gen 3 BLE (noop slice) — wymaga FGS

### DONE wcześniej

- Faza 4 lokalizacja → `location_history`
- Faza 3 Usage Stats → `phone_usage_daily`
- Faza 2 FCM push
- Faza 1 bootstrap Capacitor
