# Active Work

Krótki handoff: tylko to, co jest w toku **teraz**. Plik jest nadpisywany, nie dopisywany (limit ok. 150 linii).
Zrobione plany usuwamy (historia jest w gicie), otwarte punkty trafiają do [`BACKLOG.md`](../../BACKLOG.md).
Zasada jednego źródła prawdy dla danych i celów: [`../SINGLE_SOURCE.md`](../SINGLE_SOURCE.md).

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
