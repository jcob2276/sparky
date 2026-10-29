# Skrypty lokalne Sparky

Poza runtime Edge Functions. Komendy npm i ich argumenty definiuje
[package.json](../package.json); przy jednorazowym skrypcie przeczytaj nagłówek i skutki
przed uruchomieniem. Nie zakładaj, że skrypt analityczny jest read-only.

| Katalog | Właściciel / punkty wejścia |
|---|---|
| `ops/` | Deploy, smoke, CI, kontrakty i baza. Deploy/odbiór: [runbook](../docs/runbooks/deploy-edge-function.md); migracje: [procedura](../supabase/migrations/README.md) |
| `aw/` | Lokalny most ActivityWatch: `aw-daily-sync.cjs` (`--days=N` backfill), `aw-desktop-import.cjs <file>`, `aw-phone-import.cjs <file>` |
| `analysis/` | Evale i analizy jednorazowe. `run_eval.mjs` wywołuje eval-runner; `backfill_triads.mjs` zapisuje przez architect; `table-usage-map.mjs` generuje DATA_MAP |
| `tests/` | Testy SQL/migracji (`npm run test:sql`) |

Źródła prawdy operacji:

- `ops/smoke-manifest.mjs`: oczekiwane targety, JWT i crony; [smoke](../docs/runbooks/post-deploy-smoke.md).
- `ops/check-frontend-ratchets.mjs`, `check-backend-contract.mjs` i ich baseline:
  dług może maleć; zmiana dokumentacji nie zmienia egzekucji.
- `npm run registry:generate` / `audit:registry`: rejestr funkcji z nagłówków kodu.
- `npm run audit:readme`: zgodność README z trasami, env, skryptami i odnośnikami.
- `npm run oss:audit`: public-readiness (sekrety i dane osobowe).

Sekrety i URL bierz z env wymaganych przez konkretny skrypt, nie z dokumentacji lub argumentów
wklejanych do historii. Smoke obsługuje `SUPABASE_SERVICE_ROLE_KEY`/`SB_SECRET_KEY`;
inne skrypty mogą mieć inne wymagania — sprawdź implementację.
