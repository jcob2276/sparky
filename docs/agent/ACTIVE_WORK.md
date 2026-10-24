# Active Work

Krótki handoff: tylko to, co jest w toku **teraz**. Plik jest nadpisywany, nie dopisywany (limit ok. 150 linii).
Zrobione plany usuwamy (historia jest w gicie), otwarte punkty trafiają do [`BACKLOG.md`](../../BACKLOG.md).
Zasada jednego źródła prawdy dla danych i celów: [`../SINGLE_SOURCE.md`](../SINGLE_SOURCE.md).

## W toku

- **Jedno źródło prawdy dla celów i liczb** ([`../SINGLE_SOURCE.md`](../SINGLE_SOURCE.md)): rejestr faktów, tabela
  `life_targets` (bench, dochód), warstwa odczytu `lifeTargets` i usunięcie zakodowanych kopii. Kolejne kroki: patrz
  sekcja „Plan” w SINGLE_SOURCE.
- **Alarm powtórek refleksji (Telegram)**: kod jest na `main`, działa dopiero po wdrożeniu `vanguard-telegram`.

## Czeka na decyzję użytkownika

- Rozwój (`/rozwoj`): wyciąć z aplikacji czy zostawić (tabele puste, funkcja świeża).
- Cel roczny sfery Duch (`life_goals.goal_duch`) jest pusty po usunięciu „No-Drift Morning”.
- Cel bieżącego sprintu nie ma wpisu; wybór cyklu uściślania celów (rano/tydzień/sprint, tylko sprint i rok,
  tylko gdy brakuje).
- Portfele w Inwestycjach (zakodowane na sztywno: „Kondzia” i Jakuba): zostawione celowo, do przeniesienia do Finansów.

## Zablokowane tokenem `SUPABASE_ACCESS_TOKEN` (sekret GitHub, `sbp_…`)

Duże funkcje edge można wdrożyć tylko workflow `deploy-edge.yml`. Czekają na wdrożenie:
- `parse-food-nl` (przeliczanie wpisu ze zdjęciem, uczenie się z poprawek),
- `vanguard-oracle` (świeżość starych odchyleń z badań w „aktywnych odchyleniach”),
- `vanguard-telegram` (alarm powtórek), `vanguard-nightly` (wycięty detektor porannego protokołu),
- `analyze-food-quality` (próg niepełnego dnia), `recap` (prompt bez No-Drift).

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
