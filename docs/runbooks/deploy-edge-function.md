# Deploy Edge Function

1. Sprawdź target, trigger i JWT w [rejestrze](../../supabase/functions/README.md) oraz
   `supabase/config.toml`. Nie wdrażaj nazw usuniętych (`CRON_REMOVED` w smoke manifest).
2. Testy/ratchet i nagłówki funkcji muszą odpowiadać zmianie; wymagania:
   [BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md).
3. Po autoryzacji wdrożenia i z czystego drzewa uruchom z root repo:

```powershell
node scripts/ops/deploy-guard.mjs <function-name>
```

Jawny target zachowuje JWT zadeklarowany w config. Cron/webhook ma gateway
`verify_jwt = false` i własną walidację auth; standardowy endpoint użytkownika zachowuje
swój kontrakt tokenu/scope. Nie wyłączaj JWT zbiorczo, by naprawić pojedynczy błąd.
Ścieżka bulk bez targetów używa `deploy-no-jwt.ps1`; sprawdź zakres przed uruchomieniem.
Przy deployu MCP dołącz wszystkie zależności/importy i ten sam kontrakt JWT.

Guard po udanym deployu próbuje zapisać SHA i funkcje w `audit_events`; sprawdź komunikat
zapisu, bo failure audytu jest ostrzeżeniem. Nie prowadź drugiego ręcznego ledgeru
pre-deploy. Stan live sprawdzaj `list_edge_functions` / `supabase functions list`, a nie historią notatek.

Następnie wykonaj [post-deploy smoke](post-deploy-smoke.md), sprawdź logi przez pierwsze
5 minut i rzeczywistego konsumenta/zapis. 401: porównaj caller auth z config i kodem;
cron/webhook z błędnym gateway JWT wymaga redeployu z poprawioną deklaracją.
500: sprawdź logi oraz brakujące sekrety dostawców — bez wypisywania wartości do repo.
