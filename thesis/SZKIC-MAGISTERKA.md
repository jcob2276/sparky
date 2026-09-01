# Izolacja wrażliwych danych na granicach zaufania w chmurowej architekturze bezpieczeństwa osobistego systemu klasy SaaS z integracją API wearables

**Szkic pracy magisterskiej (analiza białoskrzynkowa kodu źródłowego)**  
Przypadek: osobisty system chmurowy Sparky (web + Android/Capacitor + Supabase Edge + PostgreSQL).  
Status empirii dynamicznej: **do wykonania** (konto testowe). Niniejszy tekst opiera wyniki na przeglądzie implementacji — to jest legalna metoda weryfikacji architektury; pomiary HTTP uzupełniają ją, nie zastępują modelu.

---

## Karta do oceny (czytaj to pierwsze)

| Aspekt | Czy szkic to unosi | Luka |
|---|---|---|
| Pytanie badawcze = tytuł promotora | Tak — izolacja na granicach, nie „zrobiłem apkę” | — |
| Charakter magistra (WEII: problem + metoda + weryfikacja) | Tak — granice, kryteria izolacji, wnioski z kodu | Brak tabeli HTTP 1:1 z produkcji |
| n=1 / dane prywatne | Tak — zero treści snu/kartoteki | — |
| API wearables, nie BLE | Tak — `sync/oura.ts` | BLE świadomie poza zakresem |
| „Klasy SaaS” | Tak — sesja, RLS, Edge, sekrety; jeden tenant | — |
| Najgroźniejszy wniosek z kodu | Webhook Telegrama wstawia do inbox **klientem service_role**; `callback_query` bez filtra `chat_id` | Do potwierdzenia dynamicznie |

---

## Streszczenie

Praca dotyczy izolacji wrażliwych danych w osobistym systemie chmurowym o architekturze klasy SaaS (klient web i mobilny, funkcje brzegowe, relacyjna baza z RLS, integracja API urządzenia wearable). Pytanie badawcze: **w jaki sposób i na ile skutecznie architektura izoluje dane na granicach zaufania** między klientem, bazą, API wearables, kanałem komunikatora oraz orkiestracją cron/Edge.

Przedmiotem nie jest ocena kliniczna snu ani użyteczność interfejsu. Przedmiotem są **mechanizmy kontroli dostępu i zaufania między warstwami**. Metoda: (1) identyfikacja granic i klas danych w implementacji, (2) kryterium izolacji (podmiot nieuprawniony nie odczytuje ani nie zapisuje danych innego podmiotu), (3) analiza białoskrzynkowa kodu i polityk, (4) protokół prób dynamicznych.

Wniosek roboczy z kodu: izolacja **wierszy w Postgres przy żądaniu z kluczem anon i JWT użytkownika opiera się na RLS** i jest spójnie zaprojektowana (`auth.uid() = user_id`). Izolacja **wejścia Telegrama nie opiera się na RLS przy zapisie** (insert jako `service_role`), tylko na sekretcie webhooka i allowliście `chat_id`; ścieżka `callback_query` allowlisty czatu nie stosuje. Funkcje brzegowe cron w większości mają `verify_jwt: false`; pełny potok nightly wymaga `service_role`, ale wybrane `?action=` przyjmują token użytkownika. Token API Oury jest przechowywany w `user_settings` i edytowany z klienta — izolacja między użytkownikami zależy wyłącznie od RLS tej tabeli.

**Słowa kluczowe:** granica zaufania, izolacja danych, RLS, funkcje brzegowe, API wearables, webhook, osobisty system chmurowy.

---

## 1. Wstęp

### 1.1. Uzasadnienie

Osobisty system klasy SaaS spina źródła, które historycznie były osobnymi silosami (chmura dostawcy wearables, komunikator, telemetria telefonu, kartoteka laboratoryjna). Zszywanie ich w jednym tenantcie po stronie chmury **powiększa powierzchnię ataku**: każdy styk to osobna granica zaufania. Magisterka na WEII wymaga nie projektu inżynierskiego („system działa”), lecz **oceny**, czy izolacja na tych stykach jest zapewniona i czym jest mierzona.

### 1.2. Cel i teza

Cel: ocenić izolację wrażliwych danych na granicach zaufania w istniejącej architekturze chmurowej.

Teza robocza: **izolacja jest warstwowa i niejednorodna** — warstwa danych (RLS) i warstwa orkiestracji (service role / sekrety) realizują różne modele zaufania; skuteczność izolacji na granicy komunikatora zależy od logiki aplikacji, nie od polityki wiersza przy INSERT.

### 1.3. Zakres

W zakresie: klient (`anon` + JWT), PostgreSQL+RLS, token i sync API Oury, webhook Telegram, cron/Edge (`verify_jwt`, `requireServiceRole`, `resolveUserScope`).

Poza zakresem: treść danych osobistych, ocena modeli LLM, stos BLE/Android jako ścieżka danych (nie karmi `oura_daily_summary`), Raspberry Pi, drugi produkt (platforma szkoleń), Zero Trust jako slogan (nie jest hipotezą — inżynierka autora już używała tej ramy w innym systemie).

### 1.4. Charakter pracy względem standardu WEII

Praca inżynierska = zadanie projektowe. Praca magisterska = zadanie badawcze: problem, metoda, weryfikacja poprawności rozwiązania. Rozwiązaniem jest **model granic + kryterium izolacji + ocena implementacji**. System jest stanowiskiem, nie celem.

---

## 2. Przegląd literatury (szkielet pod rozbudowę)

Krytyczny przegląd, nie enumeracja narzędzi.

1. **Granica zaufania** — klasyczne ujęcie w inżynierii bezpieczeństwa: komponent A nie powinien implicite ufać wejściu z B (Saltzer, Schroeder, *The Protection of Information in Computer Systems*, 1975 — najmniejsze uprawnienia, kompletna mediacja).  
2. **Broken access control** — OWASP Top 10:2021 A01; IDOR, brak egzekwowania `user_id` po stronie serwera. W modelu BaaS egzekwowanie schodzi do RLS albo do funkcji z kluczem uprzywilejowanym.  
3. **BaaS / Postgres RLS** — izolacja wiersza vs GRANT na tabeli: uprawnienie SQL (`GRANT ALL TO anon`) nie jest izolacją, jeśli RLS włączone i brak polityki dla `anon` (deny by default). Praca musi rozróżnić GRANT i POLICY.  
4. **Webhooki** — uwierzytelnianie wywołań przychodzących (współdzielony sekret w nagłówku, np. Telegram `X-Telegram-Bot-Api-Secret-Token`) oraz **idempotentne 200**, które ukrywają odrzucenie biznesowe (anti-enumeration vs observowalność).  
5. **OAuth / tokeny API stron trzecich** — RFC 6749: token jako dowód wobec API Oury; przechowywanie w bazie aplikacji czyni bazę **ekwiwalentem sejfu**. Kto czyta `oura_token`, ten impersonuje użytkownika wobec Oury.  
6. **Dane dotyczące zdrowia** — RODO art. 9 (kategorie szczególne); w pracy bez przetwarzania treści — tylko klasyfikacja klas danych i lokalizacja przechowywania.  
7. **Model odpowiedzialności chmury** — dostawca (Supabase/Vercel) chroni platformę; izolacja tenantów i sekretów crona to obowiązek aplikacji (Vault, `service_role` tylko po stronie zaufanej).  
8. **Zero Trust (NIST SP 800-207)** — użyty wyłącznie jako tło pojęciowe (nigdy nie ufać sieci). Implementacja z `verify_jwt: false` na cronie **nie jest** Zero Trust; jest modelem „sekret w Bearer zamiast JWT użytkownika”.

Luka w literaturze, którą praca wypełnia: mało opisów **osobistego** (n=1) stosu BaaS+wearable+komunikator z jawnym rozdziałem „RLS vs service_role insert”.

---

## 3. Model granic zaufania i kryterium izolacji

### 3.1. Definicje

**Granica zaufania** — miejsce, w którym dane lub polecenie przechodzą między podmiotami o różnych uprawnieniach (przeglądarka, JWT użytkownika, `anon`, `service_role`, API Oury, sieć Telegrama, pg_cron).

**Izolacja (operacyjna)** — podmiot *U₂* nie może odczytać ani zmodyfikować rekordów *U₁*; podmiot nieuwierzytelniony nie odczytuje tabel z danymi wrażliwymi; kanał zewnętrzny nie zapisuje strumienia *U₁* bez sekretu i bez zgodności z tożsamością kanału (chat_id).

**Kryterium weryfikacji** — dla każdej granicy: wektor, oczekiwany efekt (deny / allow tylko uprawniony), mechanizm w kodzie, wynik (analiza / pomiar).

### 3.2. Pięć granic (przedmiot badania)

| Id | Granica | Podmioty | Mechanizm deklarowany w kodzie |
|---|---|---|---|
| G1 | Klient → API PostgREST | `anon` / `authenticated` | JWT, `auth.uid()` |
| G2 | Wiersz w Postgres | użytkownicy A vs B | RLS `USING` / `WITH CHECK` |
| G3 | Aplikacja → API Oury | proces backend vs klient | token w `user_settings`, sync Edge |
| G4 | Telegram → system | sieć, bot, chat | sekret nagłówka + allowlista chat_id |
| G5 | Wywołanie Edge/cron | Internet → funkcja | `verify_jwt`, `requireServiceRole`, `resolveUserScope` |

### 3.3. Klasy danych (bez treści)

| Klasa | Reprezentacja w schemacie |
|---|---|
| Biometria agregowana (sen, gotowość) | `oura_daily_summary` |
| Sekret wobec Oury | `user_settings.oura_token` |
| Kartoteka | `medical_lab_results`, `medical_documents` |
| Telemetria urządzenia | `location_history`, `phone_usage_daily` |
| Strumień tekstowy z komunikatora | `vanguard_telegram_inbox` → dalszy `vanguard_stream` |

Te klasy uzasadniają, *dlaczego* izolacja na G1–G5 ma znaczenie. Nie stanowią osobnych hipotez medycznych.

---

## 4. Architektura przypadku (implementacja)

System: SPA React (klucz `VITE_SUPABASE_ANON_KEY` w `src/lib/supabase.ts`), klient Android (Capacitor; telemetria lokalizacji i użycia telefonu), backend Supabase (Postgres, RLS, Edge Functions w Deno, pg_cron, Vault).

### 4.1. G1 — klient

Klient nie posiada `service_role`. Tożsamość to sesja Supabase Auth. Wywołania PostgREST idą z JWT.

### 4.2. G2 — RLS

Wzorzec konsolidacji (`supabase/migrations/20260712160000_rls_consolidate_crud.sql`): polityki `FOR ALL` z `USING (auth.uid() = user_id)` i `WITH CHECK (auth.uid() = user_id)` m.in. dla danych medycznych.

Doprecyzowania:

- `location_history`: `20260721201000_location_history_rls_with_check.sql`
- `phone_usage_daily`: `20260721193000_phone_usage_daily_rls_with_check.sql`
- `user_settings`: baseline — `"Users manage own settings" … USING (auth.uid() = user_id)` **bez** osobnego `WITH CHECK` w cytowanym DDL.

Obserwacja GRANT: baseline nadaje `GRANT ALL … TO anon` m.in. na `oura_daily_summary`, `medical_lab_results`, `location_history`, `user_settings`. Przy **włączonym RLS** i braku polityki dla `anon` skuteczny dostęp `anon` powinien być pusty. GRANT nie jest izolacją — jest szerokim uprawnieniem SQL, które RLS musi zdjąć. To element oceny (obrona w głąb vs sama polityka).

### 4.3. G3 — API wearables

Ścieżka produkcyjna snu: `supabase/functions/sync/oura.ts` — `createServiceClient()`, odczyt `user_settings.oura_token`, żądania do `https://api.ouraring.com/v2/usercollection`. Token jest wpisywany z UI (`src/components/settings/SettingsView.tsx`, pole `oura_token`).

Wniosek architektoniczny: **klient uprawniony (właściciel wiersza) zna token**. Izolacja G3 między użytkownikami = G2 na `user_settings`. Izolacja wobec Oury = poufność bazy i backupów (poza pomiarem HTTP w tej pracy, do wzmianki w ograniczeniach).

### 4.4. G4 — Telegram

Funkcja `vanguard-telegram` jest serwowana z `auth: 'none'` (`index.ts` + `serveJson`). Kontekst `jsonCtx.supabase` to **zawsze** `createServiceClient()` (`_shared/http.ts`) — zapis inbox omija RLS użytkownika.

Kolejność kontroli na ścieżce webhooka:

1. Puste ciało / zły JSON → `200 OK` (anty-retry / szum).  
2. Gałęzie `save_link` / `setup_commands` / `fix_webhook` **przed** weryfikacją sekretu webhooka — `setup`/`fix` wymagają Bearer równego `TELEGRAM_SETUP_SECRET` lub kluczowi serwisowemu; `save_link` wymaga `resolveUserScope` (JWT użytkownika lub service role).  
3. `verifyTelegramSecret`: nagłówek `X-Telegram-Bot-Api-Secret-Token` vs `TELEGRAM_WEBHOOK_SECRET`; brak konfiguracji → 503; mismatch → **403 Forbidden**.  
4. `callback_query`: insert do `vanguard_telegram_inbox` **bez** porównania `chat.id` z `TELEGRAM_CHAT_ID`.  
5. `message`: insert tylko gdy `message.chat.id === authorizedChatId`; w przeciwnym razie **200 OK bez insertu**.

Polityka RLS inbox: `"Allow service role access" … TO service_role USING (true) WITH CHECK (true)`. Klient `authenticated` nie ma polityki SELECT — nie czyta kolejki z PostgREST.

### 4.5. G5 — Edge / cron

`supabase/config.toml`: większość funkcji `verify_jwt = false`; wyjątek m.in. `lookup-food` (`true`). Uzasadnienie inżynierskie: wywołania pg_cron / webhook. Skutek: **sieć może trafić w URL funkcji**; izolacja musi być w handlerze.

- Pełny `vanguard-nightly` (brak `action`): `requireServiceRole` — Bearer/apikey == `SUPABASE_SERVICE_ROLE_KEY` / `SB_SECRET_KEY` (`_shared/auth.ts`).  
- `?action=` / `body.action`: `resolveUserScope` — token użytkownika **albo** service role; `userId` w body niezgodny z JWT → Forbidden. Użytkownik może odpalić wycinek potoku (strain, korelacje, …) na **swoim** `userId`.  
- pg_cron: `Authorization: Bearer` z Vault (`20260711212750_cron_secrets_to_vault.sql`).  
- Trigger classify: `20260714181210_secure_auto_classify_trigger.sql` — `net.http_post` z kluczem z `_trigger_secrets`, `REVOKE` funkcji triggera od `anon`/`authenticated`.

---

## 5. Metoda

1. **Identyfikacja granic** — przegląd ścieżek zapisu/odczytu klas danych.  
2. **Mapowanie kontroli** — RLS, GRANT, JWT, sekrety, allowlisty.  
3. **Analiza białoskrzynkowa** — każdy wektor z tab. 1 oceniony względem kryterium z 3.1.  
4. **Protokół dynamiczny** (do wykonania na projekcie testowym, nie na dzienniku produkcyjnym):

| ID | Wektor | Oczekiwanie z kodu |
|---|---|---|
| D1 | `anon` SELECT `oura_daily_summary` | 0 wierszy (RLS) |
| D2 | JWT B SELECT `location_history` WHERE `user_id`=A | 0 wierszy |
| D3 | POST nightly bez Bearer service | 401 |
| D4 | POST telegram bez sekretu, ciało webhooka | 403 |
| D5 | sekret OK, `message.chat.id` obcy | 200, 0 insertów inbox |
| D6 | JWT B SELECT `user_settings.oura_token` A | 0 wierszy |
| D7 | sekret OK, `callback_query` z obcego czatu | **insert możliwy** (hipoteza z kodu) |
| D8 | POST nightly `?action=compute-daily-strain` z JWT A i `userId`=B | Forbidden (mismatch) |

Metryka: zgodność wyniku z oczekiwaniem (tak/nie) + krótki komentarz mechanizmu.

---

## 6. Wyniki (analiza kodu)

### 6.1. Tabela oceny izolacji

| Granica | Wektor | Izolacja odczytu | Izolacja zapisu | Komentarz |
|---|---|---|---|---|
| G1/G2 | anon vs tabele medyczne/Oura/lokalizacja | **Tak (RLS)** | **Tak (RLS)** | GRANT ALL dla `anon` jest zdejmowany przez brak polityki |
| G2 | user B vs wiersze A | **Tak (RLS)** | **Tak**, tam gdzie jest WITH CHECK | `user_settings` — potwierdzić WITH CHECK dynamicznie |
| G3 | token Oury | **Tak między userami, jeśli D6** | właściciel widzi własny token w UI | Token w SPA = przyjęty model n=1 |
| G4 | webhook bez sekretu | n.d. | **Tak (403)** | — |
| G4 | zły chat, typ `message` | n.d. | **Tak (brak insertu)** | Odpowiedź 200 — brak sygnału dla atakującego |
| G4 | `callback_query` | n.d. | **Słaba** | Brak filtra chat_id; insert jako service_role |
| G5 | pełny nightly | n.d. | **Tak (401 bez klucza)** | `verify_jwt: false` zrzuca ciężar na `requireServiceRole` |
| G5 | `?action=` | n.d. | **Częściowa** | Zaufany jest dowolny zalogowany user (własny zakres) |
| G4 inbox RLS | SELECT z klienta | **Tak** | insert tylko service_role | Zapis z Edge świadomie omija RLS |

### 6.2. Najważniejsze ustalenia

**U1.** Izolacja danych w Postgres przy dostępie PostgREST jest kanoniczna i powtarzalna (`auth.uid() = user_id`). To jest główny pozytyw architektury klasy SaaS przy n=1 (gotowość na drugiego użytkownika testowego).

**U2.** Granica Telegrama jest **aplikacyjna**. `service_role` przy INSERT oznacza: błąd w filtrze czatu = zapis wrażliwego payloadu. Ścieżka `message` filtr ma; `callback_query` — nie.

**U3.** `verify_jwt: false` nie jest równoznaczne z „otwartą funkcją”, o ile handler wymusza sekret. Jest równoznaczne z **brakiem tarczy platformy JWT** — każdy błąd w handlerze jest krytyczny.

**U4.** Gałęzie administracyjne na tym samym URL co webhook (`fix_webhook`, `setup_commands`) są za Bearer setup; `save_link` za JWT. To poszerza powierzchnię G4, ale nie jest równoznaczne z bypassem sekretu webhooka dla ścieżki `message`.

**U5.** Dualizm Oury: token w bazie + sync uprzywilejowany. Kradzież JWT właściciela = kradzież tokena Oury (G3 spada do G1).

---

## 7. Dyskusja

Wyniki są zgodne z tezą: izolacja **nie jest jednym mechanizmem**. RLS izoluje tenantów na G1–G2. G4 i G5 izolują **wejścia uprzywilejowane** sekretami. Mieszanie obu w jednym systemie jest typowe dla BaaS; błąd polega na założeniu, że RLS chroni też zapis z Edge.

Ograniczenia: n=1 (brak ról admin/kursant); analiza kodu ≠ pentest sieciowy; nie oceniano wycieku z backupów i logów platformy; BLE poza zakresem.

Porównanie z gatunkiem prac WEII: to samo zadanie co „architektura bezpieczeństwa na przykładzie systemu X”, z jawnym kryterium izolacji zamiast opisu funkcji produktu.

Wkład projektowy (nie druga teza): pokazanie, że osobisty stos spina API wearables, telemetrię i komunikator w jednej chmurze — stanowi **motywację klas danych**, nie hipotezę „da się szybko”.

---

## 8. Wnioski

1. Pytanie promotora da się operacjonalizować na pięciu granicach istniejącego kodu.  
2. Najsilniejsza izolacja: RLS na danych wrażliwych przy kliencie `anon`/`authenticated`.  
3. Najsłabszy zidentyfikowany punkt: zapis inbox Telegrama jako `service_role` przy `callback_query` bez allowlisty czatu.  
4. `verify_jwt: false` + `requireServiceRole` / sekret webhooka to spójny model cron/webhook — pod warunkiem braku luk w handlerze.  
5. Do zamknięcia magistry brakuje powtórzenia tab. z rozdz. 5 jako pomiarów HTTP (D1–D8) na koncie testowym.

---

## Literatura (do uzupełnienia numeracją w tekście przy redakcji APD)

1. Saltzer J.H., Schroeder M.D., The Protection of Information in Computer Systems, 1975.  
2. OWASP Top 10:2021, A01 Broken Access Control.  
3. NIST SP 800-207, Zero Trust Architecture.  
4. RFC 6749, The OAuth 2.0 Authorization Framework.  
5. Rozporządzenie (UE) 2016/679 (RODO), art. 9.  
6. Dokumentacja Supabase: Row Level Security; Service Role.  
7. Telegram Bot API: setWebhook `secret_token`.  
8. Cloud Security Alliance, Security Guidance (shared responsibility).  

---

## Załącznik A — mapowanie plików

| Element | Ścieżka |
|---|---|
| Klient Supabase | `src/lib/supabase.ts` |
| Token Oury (UI) | `src/components/settings/SettingsView.tsx` |
| Sync Oury | `supabase/functions/sync/oura.ts` |
| Lokalizacja | `src/lib/native/locationSync.ts`, `src/lib/locationHistoryApi.ts` |
| Usage | `src/lib/native/usageStatsSync.ts`, `src/lib/phoneUsageApi.ts` |
| Telegram | `supabase/functions/vanguard-telegram/index.ts` |
| HTTP/auth kernel | `supabase/functions/_shared/http.ts`, `auth.ts`, `supabase.ts` |
| Nightly | `supabase/functions/vanguard-nightly/index.ts` |
| RLS | `supabase/migrations/20260712160000_rls_consolidate_crud.sql` i migracje WITH CHECK |
| JWT flagi | `supabase/config.toml` |
