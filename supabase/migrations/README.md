# Migracje Sparky

Pliki SQL są chronologicznym źródłem historii — listuj je `rg --files supabase/migrations -g '*.sql'`.
Nie utrzymuj ręcznego spisu. Zastosowanych migracji nie zmieniaj, nie przemianowuj ani nie przestawiaj;
poprawka dostaje nowy `YYYYMMDDHHMMSS_snake_case.sql` (14 cyfr + nazwa domenowa).

Zmiany CREATE/ALTER/DROP wyłącznie migracją, z RLS i politykami właściciela dla nowych tabel.
Przed DROP sprawdź kod, SQL/cron i [DATA_MAP.md](../../docs/DATA_MAP.md).
Kontrakty auth/constraintów: [BACKEND_CONTRACT.md](../../docs/BACKEND_CONTRACT.md).

Jedyna obsługiwana ścieżka zastosowania do linked projektu:

```powershell
npm run db:apply -- supabase/migrations/<timestamp>_<name>.sql
npm run db:update-types
npm run db:check-drift
```

Wrapper wykonuje dokładnie plik i zapisuje jego wersję w zdalnym ledgerze; wymaga linked
projektu oraz `SUPABASE_ACCESS_TOKEN` lub wcześniejszego `supabase login`.
Nie używaj SQL Editor/MCP `apply_migration`, które mogą nadać inny timestamp.
Dla błędu historii: [runbook naprawy](../../docs/runbooks/db-push-migration-repair.md);
nie naprawiaj rozjazdu zbiorczo bez porównania schematu i ledgeru.
