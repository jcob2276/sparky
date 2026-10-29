# Sparky

Prywatna aplikacja-dziennik: plan dnia, zadania, kalendarz, notatki, trening,
jedzenie i biometria we wspólnym systemie. React PWA i Android (Capacitor)
korzystają z Supabase; Telegram służy zapisowi tekstu/głosu oraz rozmowie z Oracle.

**System mierzy zachowanie. Użytkownik nadaje mu znaczenie.**
Kierunek: [KIERUNEK](./docs/direction/KIERUNEK.md).
Opis obecnych modułów: [stan aplikacji](./docs/VANGUARD_STATE.md).
Dokumentacja i jej hierarchia: [indeks](./docs/README.md).

## Uruchomienie

Wymagane: Node.js/npm zgodne z lockfile oraz projekt Supabase ze schematem,
RLS i funkcjami. Do Edge Functions potrzebne jest Deno; do Androida Android Studio/JDK.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

W PowerShell zamiast `cp` możesz użyć `Copy-Item .env.example .env.local`.
Do frontendu wymagane są `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.
Pozostałe integracje konfiguruj tylko w używanym zakresie.
Dane osobiste wymagają sesji Supabase Auth.

## Powierzchnie aplikacji

<!-- README_SYNC_ROUTES_START -->

| Trasa | Powierzchnia |
|---|---|
| `/` | alias strony Dziś |
| `/dzis` | plan i wykonanie bieżącego dnia |
| `/tydzien` | plan, przegląd i kierunek tygodnia |
| `/historia` | historia zdrowia, aktywności i żywienia |
| `/keep` | Notatki |
| `/todo` | Zadania |
| `/kalendarz` | kalendarz i bloki czasu |
| `/terminy` | obowiązki życiowe z wyprzedzeniem przypomnień |
| `/links` | inbox zapisanych linków |
| `/trening`, `/sauna` | dedykowane rejestratory i widoki aktywności |
| `/dashboard` | rozbudowany kokpit desktopowy |
| `/finanse` | pulpit finansów, portfel, konta i przepływy |
| `/rozwoj` | miesięczny plan nauki i biblioteka materiałów |
| `/badania` | wyniki badań i trendy medyczne |
| `/badania/laboratorium` | widok szczegółowych wyników badań laboratoryjnych |
| `/korelacje` | zależności między zachowaniem a wynikami |
| `/oura` | pulpit biometrii i parametrów pierścienia Oura |
| `/optics` | narzędzia związane ze wzrokiem |
| `/settings` | konto, integracje, powiadomienia i konfiguracja |

<!-- README_SYNC_ROUTES_END -->

Nieznane adresy wracają do Dziś. Pełna implementacja routera jest w
[src/App.tsx](./src/App.tsx); moduły mogą mieć dodatkowe sekcje bez osobnej trasy.

## Przepływ danych

<!-- README_SYNC_FUNCTIONS_START -->

`vanguard-auto-classify` wyprowadza tarcie ze strumienia; `vanguard-architect` buduje graf, a `vanguard-wiki-compiler` kompiluje pamięć.

<!-- README_SYNC_FUNCTIONS_END -->

Oracle odczytuje bieżący strumień i pamięć pochodną; własnych interpretacji nie
zapisuje jako faktów w grafie. Szczegóły: [architektura](./docs/ARCHITECTURE.md).
Jedzenie dodaje się i poprawia w aplikacji; Telegram zachowuje suplementy,
post i odczyt `/dieta`. W południe działa Wywiad, wieczorem refleksja;
planowanie odbywa się w aplikacji/Oracle. Usunięte poranne briefy i pingi nie wracają.

## Konfiguracja

[.env.example](./.env.example) jest szablonem. Poniższe inwentarze są sprawdzane
przez `npm run audit:readme` względem kodu. Sekrety backendu ustawiaj w Supabase,
nigdy w `VITE_*` ani repozytorium.

### Frontend

<!-- README_SYNC_FRONTEND_ENV_START -->

| Zmienna | Wymagana | Konsument |
|---|---|---|
| `VITE_SUPABASE_URL` | tak | klient Supabase |
| `VITE_SUPABASE_ANON_KEY` | tak | klient Supabase |
| `VITE_GOOGLE_CLIENT_ID` | dla kalendarza | logowanie OAuth Google |
| `VITE_OPENWEATHERMAP_API_KEY` | dla pogody | prognoza w kalendarzu |
| `VITE_VAPID_PUBLIC_KEY` | dla Web Push | rejestracja subskrypcji push |

<!-- README_SYNC_FRONTEND_ENV_END -->

### Edge Functions

<!-- README_SYNC_BACKEND_ENV_START -->

| Obszar | Zmienne odczytywane przez kod |
|---|---|
| Supabase i zakres użytkownika | `SUPABASE_URL`, `SB_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VANGUARD_USER_ID`, `ALLOWED_ORIGINS` |
| Harmonogramy | `VANGUARD_CRON_SECRET` |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_SETUP_SECRET` |
| Modele | `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY` |
| Google Calendar | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| NextDNS | `NEXTDNS_API_KEY`, `NEXTDNS_PROFILE_ID` |
| Fathom (nagrania rozmów) | `FATHOM_WEBHOOK_SECRET` |
| MCP | `MCP_SERVER_SECRET` |
| Web Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| Firebase/FCM | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |

<!-- README_SYNC_BACKEND_ENV_END -->

`OPENAI_API_KEY` pozostaje w inwentarzu historycznych odwołań; transkrypcja
i embeddingi runtime używają Gemini. Dobór modeli i wyjątki: [AGENTS](./AGENTS.md).
Klucze serwisowe są alternatywami obsługiwanymi przez kernel.

## Rozwój i kontrole

```bash
npm run typecheck:ui
npm run lint
npm test
npm run build
npm run audit:readme
```

Testy Deno/SQL, ratchety i kontrole domenowe dobieraj do zmiany zgodnie z
[CONTRIBUTING](./CONTRIBUTING.md) oraz [katalogiem skryptów](./scripts/README.md).
`npm run typecheck` sprawdza Edge Functions, `typecheck:ui` frontend.
Rejestr backendu: [supabase/functions/README.md](./supabase/functions/README.md);
schemat i RLS: [migracje](./supabase/migrations/README.md).
Deploy: [runbook](./docs/runbooks/deploy-edge-function.md).

Android używa tego samego `src/`: `npm run mobile:sync` buduje i synchronizuje
projekt, `npm run mobile:open` otwiera Android Studio. Uprawnienia/FCM konfiguruje
się na urządzeniu; lokalny build nie potwierdza jego działania.

## Prywatność i licencja

Repo zawiera kod, schemat i dane syntetyczne. Nie commituj sekretów, eksportów,
nagrań ani rzeczywistych rekordów użytkownika. Zgłoszenia bezpieczeństwa:
[SECURITY](./SECURITY.md). Licencja: [MIT](./LICENSE).
Fork wymaga własnego Supabase, sekretów i konfiguracji integracji.
