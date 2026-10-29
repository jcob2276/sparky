# Sparky — frontend

Konstytucja i końcowa checklista: [AGENTS.md](../AGENTS.md).
Wygląd, tokeny, motion i a11y: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
Poniżej organizacja kodu i kontrakty danych dla React SPA.

## Warstwy

| Warstwa | Odpowiedzialność |
|---|---|
| `packages/domain/` | Czysta logika wspólna z Deno; bez React/Supabase/IO |
| `src/lib/` | API Supabase, domena, parsery; bez importu z `components/` |
| `src/hooks/` | Współdzielony stan React, efekty i API przeglądarki nad `lib/` |
| `src/components/<feature>/` | Właściciel domenowego UI i lokalnego CSS |
| `src/components/ui/` | Prymitywy design systemu |
| `src/components/shared/` | Struktura współdzielona przez domeny |
| `src/lib/native/`, `android/` | Capacitor; native API tylko za `isNativePlatform()` |

Grupuj po domenie danych: karta KPI projektu należy do `projects/`, uniwersalny renderer
karty do `cards/`. Przegląd powierzchni: [VANGUARD_STATE.md](VANGUARD_STATE.md).
PWA buduje `npm run build` (SW/Web Push/share target), APK `npm run mobile:sync`
(relative base, bez SW). Oba używają jednego `src/`; nie wywołuj native API w PWA.

## Dane i błędy

Server state obsługuje react-query przez domenowe `*Api.ts`; klucz zawiera użytkownika
oraz parametry zapytania, `enabled` blokuje zapytanie bez użytkownika.
Komponent nie wywołuje `supabase.from`, `supabase.storage.from` ani
`supabase.functions.invoke`. Dodaj zapytanie do API domeny; nie twórz ręcznego cache/TTL.
Zustand trzyma globalny stan sesji/ustawień/synchronizacji, nie per-feature server state.

Edge functions wywołuj przez `invokeEdge<T>()` z `src/lib/supabase.ts` z body i odpowiednim
`AbortSignal`/timeoutem. Nie kopiuj auth do raw fetch `/functions/v1/`; istniejące wyjątki GET
z query stringiem sprawdź przed migracją.

| Sytuacja | Obsługa |
|---|---|
| Nieudana akcja użytkownika | `notify(message, 'error')`, `src/lib/notify.ts` |
| Akcja destrukcyjna | `await confirmDialog(message)` z tego samego modułu |
| Błąd ładowania widoku | `error` react-query → banner/`DataStateNotice`; bez drugiego stanu błędu |
| Best-effort bez wpływu na UI | `console.warn` |

Nie używaj `window.alert`/`window.confirm` ani samego `console.error` dla błędu widocznego
użytkownikowi. Supabase zwraca `{error}` bez throw: dla select użyj `unwrap`/`unwrapList`
z `lib/supabaseUtils.ts`, a przy zapisie bez select sprawdź `error` ręcznie.
Modale treści używają `ui/Modal`, sheety `ui/Sheet`; potwierdzenia wyłącznie `confirmDialog`.
Nie twórz lokalnych overlayów `fixed inset-0`.

## Daty i helpery

`src/lib/date.ts` re-eksportuje domenowe obliczenia Warsaw: `getTodayWarsaw`,
`formatWarsawDate`, `combineDateTimeWarsawISO`, `warsawDayBoundsISO`.
Daty użytkownika i granice dnia wyznaczaj tam, nie inline przez `toLocaleDateString`.
Nie buduj ISO ze stałym `+01:00`/`+02:00` — DST obsługuje `combineDateTimeWarsawISO`.
Przed nowym helperem przeszukaj `src/lib/` i moduł; notatki używają `keepUtils.ts`,
kalendarz `calendarHelpers.ts`. Importuj z kanonicznego właściciela zamiast starej fasady.

## Wzorzec A — moduł funkcji

```text
components/<feature>/
  index.ts                   publiczna fasada
  <Feature>Container.tsx     dane, mutacje, stan i efekty → <View {...props}/>
  <Feature>View.tsx          layout i czysty JSX
  hooks/                    interakcje tej domeny
  subcomponents/            klocki używane wewnątrz
  <feature>Utils.ts          lokalne czyste funkcje
```

Rozdziel dane i JSX, gdy plik miesza odpowiedzialności, niezależnie od długości;
nowe UI pozostaje poniżej 300 linii. Przy wydzielaniu widgetów zachowaj nadrzędny flex/grid
w rodzicu. Gęsta logika kursora/selekcji/DOM może wymagać udokumentowanego wyjątku od
`max-lines`, zamiast ryzykownego mechanicznego splitu.

## Wzorzec B — rejestr typów

Renderer bez własnego stanu, „typ → komponent”, używa `Factory.tsx` i podfolderów
według taksonomii domenowej (`cards/`, `widgets/`). Nie narzucaj mu Container/View.

`*Api.ts` pozostaje przy domenie w `lib/`, nie w technicznym `lib/api/`.
Grupa przekraczająca 6–8 plików dostaje podfolder. Hook jednego feature należy do
`<feature>/hooks/`; hook cross-cutting lub integracji pozostaje globalny (oznacz właściciela).

## Style i strażnicy

Wartości tokenów i mapowanie Tailwind definiuje `src/index.css` (`:root`, `.dark`, `@theme`).
JSX używa utility classes do layoutu/typografii; style jednej domeny należą do jej CSS,
importowanego na wejściu modułu. Nie kopiuj tokenów ani nie generuj klas Tailwind ze stringów
w runtime — użyj CSS custom properties.

`eslint.config.js` egzekwuje granice Supabase, dialogów, dat i kierunku importów.
Nazwane listy wyjątków są osobne od `LEGACY_FILES`; nie dodawaj plików dla obejścia reguły.
Przy dotknięciu wyjątku usuń go, jeśli zakres na to pozwala. Ratchet i baseline w
`scripts/ops/check-frontend-ratchets.mjs` / `ratchet-baseline.json` mogą wyłącznie maleć.
ESLint flat config nadpisuje tę samą regułę ostatnim blokiem: nowe selektory
`no-restricted-syntax` dodawaj do istniejącego wspólnego bloku.

## Bezpieczny refaktor

- Zachowaj ścieżki obsługi błędów: porównaj `notify`/`console.warn`/`console.error` przed i po;
  przeniesienie nie może zgubić informacji użytkownika o failure.
- Po przenosinach popraw stringowe ścieżki w `eslint.config.js` oraz
  `scripts/ops/legacy-lines-baseline.json`; usuń martwy stary kod i re-eksporty.
- Nie duplikuj `useState`/`useEffect` przy ekstrakcji hooka.
- Gesty/DOM lub plik ponad 600 linii wymagają planu zaakceptowanego przed split i odbioru
  w przeglądarce. Powiązana logika edytora może pozostać w uzasadnionym wyjątku.
- Weryfikuj: `npm run typecheck:ui` → ESLint dotkniętych plików → odpowiednie testy →
  `npm run ratchet:frontend`; nowe warianty sprawdź w rzeczywistym UI, mobile i dark mode.
  Pre-commit nie zastępuje typechecku.

Przed zakończeniem wykonaj także checklistę frontendową z [AGENTS.md](../AGENTS.md).
