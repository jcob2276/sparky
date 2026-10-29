# Sparky — powierzchnie i kontrakty domen

Mapa produktu; trasy i komponenty sprawdzaj w [src/App.tsx](../src/App.tsx),
przepływ evidence w [ARCHITECTURE.md](ARCHITECTURE.md), status wycofanych ścieżek w
[FEATURE_LIFECYCLE.md](FEATURE_LIFECYCLE.md), backend w [generowanym rejestrze](../supabase/functions/FUNCTIONS.md).
Otwarta praca jest wyłącznie w [BACKLOG.md](../BACKLOG.md).

## Powierzchnie

| Powierzchnia | Cel i połączenia |
|---|---|
| Dziś | Stan organizmu, PowerList, kalendarz/runway, szybki zapis, plan i domknięcie dnia. Wykonanie z `daily_win_tasks`/Todo, ograniczenia z Kalendarza/Terminów, biometria i żywienie z tabel domenowych |
| Tydzień | Puls ciała i żywienia, wykonanie dni, KPI/sprint, korekta zakresu i Action Center (`system_proposals`: decyzja użytkownika „Istotne / Olej”) |
| Kierunek na Dziś | Zdjęcia celów sfer Ciało/Duch/Konto → cel, dni do celu, „Dlaczego”. `projects`, `life_goals`, `goal_kpis`; bez osobnej strony projektów |
| Historia | Kronika istotnych zdarzeń, pomiary/insighty/zdjęcia; archiwum żywienia, treningów i aktywności; eksport danych. `analyze-physique` interpretuje zdjęcia |
| Notatki | Rich text, foldery/tagi, wyszukiwanie, pinowanie/kolejność, lista/galeria, kosz, blokada, eksport i triage. Share target bez URL → Keep; triage może skierować materiał do Todo/Pocket; Oracle czyta kontekst bez automatycznego nadpisywania |
| Zadania | `todo_sections`/`todo_items`: inbox, priorytety/terminy, lista/Kanban/Eisenhower, drag/drop, skan tekstu, milestones i przegląd tygodnia. Zadanie może wejść do PowerList, projektu i Kalendarza; push przypomina |
| Kalendarz | Dzień/tydzień/agenda, wydarzenia i zadania, budżety czasu. `sync` czyta Google Calendar, `calendar-write` zapisuje; Dziś konsumuje wydarzenia w runway |
| Terminy | `life_obligations`: urodziny, pojazd, polisy/dokumenty i własne obowiązki; offsety przypomnień, horyzont i archiwum |
| Pocket | Share target z URL/ręczny link, read/unread, kategorie, wyszukiwanie, triage → zachowaj/Keep/Todo/usuń. Capture zapisuje link i ślad streamu |
| Kartoteka / laboratorium | Paszport zdrowia, dokumenty, wyniki, skład ciała i oś wizyt/objawów/diagnoz/leków. Profilaktyka ma podstawę, termin i możliwość odrzucenia; statusy zaplanowane/wykonane/odroczone/odrzucone |
| Oura | Odczyt: Dziś (werdykt, odchylenia, oś dzień→noc i czynniki poprzedzające sen), Szczegóły (fazy/HR/HRV, rytm, zależności i pokrycie danych, obciążenie, parametry życiowe). Wynik zasila Dziś, Historię i analizy |
| Trening / sauna | Aktywności Garmin/Intervals/Strava, tempo/HR/strefy/obciążenie i lokalny logger. Sauna zapisuje czas/rundy/temperaturę/odczucia w modelu sesji i wraca do Dziś |
| Wzrok | Kalibracja kamery, odległość rozmycia obu oczu, przeliczenie dioptrii, dziennik, okulary i stabilność pomiaru |
| Żywienie (osadzone) | Capture na Dziś, puls w Tygodniu, archiwum w Historii: NL, wyszukiwanie lokalne/OFF, ulubione/ostatnie/korekty, makra, post, kofeina, jakość i adaptacyjne cele |
| Korelacje | Siła dowodu, pokrycie, FDR/stabilność, filtry i ręczne odświeżenie; eksperymenty N-of-1 i archiwum dowodów. Oracle traktuje zależności jako hipotezy |
| Finanse | Pulpit: budżet, plan vs wydane, szybki wydatek i nadchodzące opłaty/wpływy. Osobne widoki portfela i kont; Przepływy: plan miesiąca, przychody, subskrypcje, rachunki, wydatki i import bankowego CSV |
| Rozwój | Miesięczny plan materiałów, dzienny slot i potwierdzenie postępu; biblioteka książek/filmów/kursów, import list/Goodreads/Letterboxd, preview i dedup. Pocket dostarcza materiał, `learning_skills` opcjonalny cel |
| Ustawienia | Sesja/profil, integracje, Google Calendar, cele domenowe, kontekst AI i uprawnienia Androida |
| Desktop `/dashboard` | Osobne centrum dowodzenia: sync, alerty, intelligence, wykresy, trening/maraton, biometria, nawyki, zachowania, suplementy, sny i vision board. Służy przekrojowej analizie/planowaniu/diagnostyce |

Mobile służy capture, decyzji i wykonaniu w ruchu. Desktop ma własną gęstość i architekturę
informacji; oba współdzielą API, definicje metryk, statusy i mutacje. Zmiany muszą być widoczne
w obu trybach. Wszystkie trasy danych wymagają sesji Supabase.
Fast Capture otwiera formularze domenowe; share target kieruje URL do Pocket, tekst do Keep.

## Kontrakty wymagające zachowania

**Dzień i sprzedaż.** Plan dnia otwiera pełny interfejs. Domknięcie wymaga liczb umówień,
odebranych rozmów (`dials`, nazwa legacy) i sales calli oraz zdania opinii w `closer_daily_logs`.
Zero i „dziś bez sprzedaży” są poprawne; brak deklaracji nie jest zerem. Plan poranny używa
wczorajszych liczb/opinii i tempa tygodnia, a braki każe uzupełnić. Cele czytaj z
[SINGLE_SOURCE.md](SINGLE_SOURCE.md), nie z kopii w promptach/dokumentach.

**Tożsamość.** Ustawienia „O mnie dla AI” edytują świadomie `user_fundament`:
`identity` (Ja), `philosophy` (Ciało), `vision` (Wizja). Do streamu trafiają tylko zmienione pola;
Oracle używa ich jako kontekstu. Dawny `/fundament` nie jest osobną powierzchnią.

**Żywienie.** Posiłki/zdjęcia etykiet i korekty zapisuje wyłącznie aplikacja.
Telegram zachowuje suplementy, post i odczyt `/dieta`. Oura, trening, masa i zatwierdzone dane
medyczne mogą zasilać trenera żywieniowego. Źródła produktów i cele mają właścicieli według
[SINGLE_SOURCE.md](SINGLE_SOURCE.md).

**Nauka.** `learning_assignments` i `learning_progress_log`; postęp zapisuje wyłącznie
RPC `log_learning_progress` (idempotentny na dzień; 0 cofa, aktualizuje done/status i wpis biblioteki).
`library_items` dopuszcza brak daty lub sam rok, ma źródło manual/paste/csv/plan i unikalność
po tytule+autorze+rodzaju. Ukończenie materiału planu dopisuje go do biblioteki; historia miesięcy
pokazuje niedokończone/odpuszczone. Nie wracaj do blobów biblioteki w `vanguard_identity`.

**Sen.** `src/lib/biometrics/sleepDrivers/` liczy Spearmana czynnik × wynik snu oraz sen → Top 5.
Progi N/efektu/istotności definiuje `evidence.ts`; brak istotności to „jeszcze nic pewnego”.
Czynniki obejmują kawę, posiłki, trening, saunę, telefon i komputer.
`strava_activities` może zawierać `source='garmin_intervals'` (nazwa tabeli nie dowodzi źródła);
komputer pochodzi z `aw_daily_summary`, kroki z Oura. Pokazuj świeżość i pokrycie danych;
nie zastępuj braku pomiaru zerem.

**Android Usage Stats.** `phone_usage_daily.usage_buckets` to 48 półgodzinnych kubełków minut
pierwszoplanowych: indeks 0 = 00:00–00:30, `Europe/Warsaw`, lokalna godzina ścienna.
Powtórzona godzina DST sumuje się do kubełka (limit 30 min); brakująca nie ma danych z tej godziny.
Plugin ogranicza sumę do zmierzonego czasu dziennego. `late_night_minutes` ma osobne okno 23:00–04:00;
inny próg wieczorny oblicza aplikacja z kubełków. Historyczne NULL nie daje się odtworzyć z sumy dnia;
kubełki wymagają APK zapisującego ten format.

## Telegram i interpretacja

Oracle konwersacyjny działa w Telegramie. Zwykły tekst/głos jest wejściem do streamu
oraz rozmowy; routing `chat` zapisuje w streamie tryb `stream`. `?` wybiera chat, `!!` deep,
`@` report, `##` / `Poprawka:` kontrolowaną ścieżkę wiedzy/korekty. Wywiad uzupełnia luki,
`/koniec` uruchamia refleksję, odpowiedź na oczekującą refleksję zapisuje wynik dnia.
Szczegóły pierwszeństwa komend i ingestu: `vanguard-telegram/_router/interceptors/`.
Webhook potwierdza trwały inbox, worker wykonuje przetwarzanie, outbox dostarcza odpowiedzi.
Diagnostyka: [bot](runbooks/bot-not-responding.md), [timeout](runbooks/telegram-webhook-timeout.md).

Evidence i reasoning pozostają oddzielone; brak danych nie dowodzi braku zdarzenia.
Korelacja jest hipotezą, nie diagnozą. Rekomendacja medyczna pokazuje podstawę, datę i pewność.
Każdy producent ma aktywnego konsumenta; graf/wiki/metabolism interpretują i kondensują evidence,
a Oracle nie zapisuje automatycznie „prawdy o użytkowniku”. Dostawcy/model choices: [AGENTS.md](../AGENTS.md).
