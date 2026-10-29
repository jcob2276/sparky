# Post-deploy smoke

Po deployu uruchom z root repo:

```powershell
npm run smoke
```

To OPTIONS z/bez service-role — wykrywa niedostępność i przypadkowe gateway 401,
bez wywoływania logiki cron/LLM/Telegram. Samo OPTIONS nie potwierdza autoryzacji
POST, wykonania zadania ani zapisu danych; ostrzeżenia 5xx także wymagają analizy.

`npm run smoke:safe` dodaje POST tylko dla targetów oznaczonych safe w
[smoke-manifest.mjs](../../scripts/ops/smoke-manifest.mjs). Sprawdź tam body i oczekiwane
skutki. `--invoke-crons` może wysłać Telegram i uruchomić LLM; używaj wyłącznie w
zakresie autoryzowanego testu. Nie ponawiaj mutacji w ciemno.

Skrypt ładuje brakujące zmienne z `.env.local`, `.env`, `supabase/.env`:
URL z `SUPABASE_URL` / `VITE_SUPABASE_URL`, klucz z `SUPABASE_SERVICE_ROLE_KEY` / `SB_SECRET_KEY`.
Przy braku klucza testy service-role są pomijane — sprawdź ostrzeżenia.
`VANGUARD_USER_ID` i `VANGUARD_CRON_SECRET` są potrzebne tylko wskazanym POST w manifeście.

Cron parity sprawdzaj [cron-check.sql](../../scripts/ops/cron-check.sql) względem manifestu:
`CRON_FROM_MIGRATIONS` powinny istnieć, `CRON_DASHBOARD_ONLY` wymagają osobnego sprawdzenia,
`CRON_REMOVED` muszą być nieobecne. Ustal UTC/DST, nie zgaduj po lokalnej godzinie.

Odbiór: brak nieoczekiwanych 401/404 w logach, poprawny user/service scope, efekt w tabeli
wynikowej i konsument UI/bot. Dla Telegrama sprawdź inbox → worker → outbox,
nie tylko HTTP webhooka. Zmiany JWT wdrażaj według [runbooka](deploy-edge-function.md).
