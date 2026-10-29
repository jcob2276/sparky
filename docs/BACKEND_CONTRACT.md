# Sparky — kontrakt backendu

Konstytucja i modele: [AGENTS.md](../AGENTS.md). Przepływ: [ARCHITECTURE.md](ARCHITECTURE.md).
Reguły mechaniczne i ich wyjątki: `scripts/ops/check-backend-contract.mjs` oraz
`backend-contract-baseline.json`; liczniki mogą wyłącznie maleć. Nowej regule mechanicznej
musi towarzyszyć kontrola w skrypcie. Nie kopiuj tutaj aktualnych wyników ratcheta.

## Kernel zamiast duplikatów

Ścieżki poniżej są względem `supabase/functions/`.

| Potrzeba | Użyj |
|---|---|
| HTTP, OPTIONS, CORS, auth, JSON i logowanie błędów | `serveJson(handler, {auth})`, `_shared/http.ts` |
| Klient DB / klucz service-role | `createServiceClient()` / `getServiceRoleKey()`, `_shared/supabase.ts` |
| Cron / trigger | `requireServiceRole(req)`, `_shared/auth.ts` lub `serveJson` z `auth: 'service'` |
| UI / mixed user+service | `resolveUserScope(req, requestedUserId)` lub `serveJson` z `auth: 'user'` |
| Dziś i granice czasu | `@vanguard/domain`, `_shared/time.ts`: `getWarsawDateString`, `getWarsawDayBoundaries`, `getStreamCutoffs` |
| DeepSeek / parsing odpowiedzi | `deepseekChat`, `deepseekStream`, `parseJsonFromContent`, `_shared/deepseek.ts` |
| Gemini audio, embeddingi, vision | `_shared/openai.ts` (shim) / `transcribeAudio` z `_shared/telegram.ts` |
| Telegram | `_shared/telegram.ts` |
| Kontekst streamu | `_shared/streamContext.ts` |
| Audyt błędu krytycznego | `logCriticalError`, `_shared/errorLogging.ts` |
| Zapytanie DB z throw | `safeExecute(query)` — zwraca bezpośrednio `data`, nie `{data}` |

`serveJson` przyjmuje zwykłą wartość (opakowuje w JSON 200) lub `Response` (zachowuje status
oraz body, dodaje CORS). Błąd zgłoś przez throw/odpowiedni 4xx–5xx, nie przez 200 z `{error}`.
Wyjątek: worker/outbox wywoływany przez DB może potwierdzić 200, ale musi utrwalić failure
w kolejce i audycie. Samo 200 takiego workera nie oznacza wykonania zadania.

Supabase JS zwraca `{error}` dla błędów SQL/RLS — `try/catch` ich sam nie wykryje.
Każdy zapis bez `safeExecute` musi sprawdzić i rzucić `error`; nie zwracaj sukcesu po `console.error`.
Zapisów wymaganych przed odpowiedzią nie powierzaj `EdgeRuntime.waitUntil`.

Nazwane wyjątki od centralizacji:

- prywatny bez-zależnościowy helper dat w `_shared/vanguardCore.ts`;
- bezpośrednie Telegram API w admin bootstrap `setup_commands` / `fix_webhook`;
- przekazanie service bearer między funkcjami (np. parser jedzenia), zamiast tworzenia drugiego klienta DB;
- formatowanie dat do wyświetlenia, odrębne od wyznaczania dnia i granic.

Nie dodawaj raw provider fetch, `createClient`, `as any`, sekretów ani ręcznego JSON framingu
w handlerach. Wyjątki i wartości zastane sprawdź w ratchecie, zamiast rozszerzać baseline.

## Struktura i dostęp

- `index.ts` routuje; akcje należą do `handlers/`, prompty do osobnych modułów.
- Kroki pipeline przyjmują `{supabase, userId, date}`, nie sztucznie odtworzony `Request`.
- Wspólna czysta logika należy do `packages/domain/`; IO i dostawcy do kernela.
- UI czyta tabele wynikowe. Nie uruchamiaj kosztownej analizy przy każdym otwarciu zakładki.
- Przy dotknięciu pliku ponad 300 linii wydziel moduł; typy wygenerowane z DB są wyjątkiem ratcheta.
- Service-role ma jawny zakres zadania. UI ma zweryfikowanego użytkownika; `requestedUserId`
  musi pasować do tokenu. Gateway `verify_jwt` nie zastępuje kontroli dostępu do danych.
- Webhook może użyć `auth: 'none'` tylko z własną kontrolą podpisu/sekretu i nadawcy.
- Nie hardkoduj użytkownika ani sekretów; używaj kontekstu auth / `getVanguardUserId()`.

## Baza i migracje

Zmiany schematu tylko przez [migracje](../supabase/migrations/README.md). Nowa tabela wymaga
RLS i polityk właściciela (odczyt/mutacje oraz sprawdzenie właściciela przy zapisie).
Nie ufaj samemu service clientowi: omija RLS, więc auth i scope muszą być sprawdzone przed IO.
Widoki dostępne użytkownikowi wymagają świadomego kontraktu uprawnień; używaj
`security_invoker = true`, gdy mają respektować RLS tabel źródłowych.

Przed zapisem sprawdź constrainty i enumy. Przed DROP przeszukaj `src/`, funkcje, SQL/cron
oraz [DATA_MAP.md](DATA_MAP.md): pusta kolumna nie jest dowodem braku konsumentów.
`planning_status` przyjmuje `pending | active | completed`.

## Odbiór zmiany

1. Znajdź istniejący kernel/helper, producentów i konsumentów przed edycją.
2. Utrzymaj aktywnego konsumenta wyniku. Przy zmianie auth sprawdź wszystkich callerów:
   UI, crony, triggery i inne funkcje; przetestuj dozwolony i zabroniony dostęp.
3. Uruchom odpowiednie testy, `npm run ratchet:backend` i `npm run typecheck`.
4. Nagłówek `@trigger/@reads/@writes/@consumer` ma opisywać kod; po jego zmianie
   `npm run registry:generate` oraz `npm run audit:registry`.
5. Po autoryzowanym deployu wykonaj [smoke i odbiór](runbooks/post-deploy-smoke.md),
   sprawdź logi i rzeczywisty zapis/zmianę w tabeli docelowej, nie tylko JSON odpowiedzi.
   Deploy prowadź według [runbooka](runbooks/deploy-edge-function.md).

Otwarte zadania należą do [BACKLOG.md](../BACKLOG.md), incydenty do [lessons.md](../lessons.md).
Tymczasowe wyłączenie wymaga jawnego statusu i powodu w [FEATURE_LIFECYCLE.md](FEATURE_LIFECYCLE.md);
martwego kodu nie przechowuj w zakomentowanych blokach — historia Git zachowuje implementację.
