# Bevel → Sparky: przepływy i decyzje

Materiał porównawczy produktu, nie specyfikacja prywatnego API ani kolejna kolejka.
Otwarte decyzje należą do [BACKLOG](../../BACKLOG.md); reguły produktu do
[PRODUCT_PRINCIPLES](../PRODUCT_PRINCIPLES.md). Żywienie ma własny
[benchmark](food-trackers-benchmark.md).

## Jak czytać dowody

- **Opis producenta:** instrukcja konkretnego zachowania. Nie dowodzi dokładności,
  skuteczności zdrowotnej, algorytmu ani obecności w każdej wersji aplikacji.
- **Obserwacja ekranu:** faktycznie obejrzany ekran z publicznego
  [teardownu](https://github.com/ChakshuGautam/bevel-teardown). Materiał historyczny,
  kuratorowany przez Mobbin; nie kopiujemy ilustracji, tekstów ani brandingu do Sparky.
- **Obserwacja klienta:** kod publicznie pobranego niezalogowanego klienta webowego.
  Wywołanie zapisane w JS nie dowodzi działającego endpointu ani kontraktu backendu.
- **Hipoteza:** proponowany backend/OpenAPI autora teardownu. Nie jest odzyskanym
  kodem Bevel i nie uzasadnia dodawania analogicznych tabel czy usług do Sparky.

## Porównanie głównych przepływów

| Przepływ | Dowód Bevel | Sparky: właściciel i istniejące zachowanie | Wniosek dla Sparky |
|---|---|---|---|
| Poranny podgląd | [Edycja Home](https://help.bevel.health/en/articles/10417089): widoczność, kolejność, zapis, anulowanie i reset. Obejrzany ekran `screens/bevel-402.png` pokazuje edycję kart oraz Cancel/Save. | [Dziś](../../src/components/core/DashboardDzisTab.tsx) i [widok](../../src/components/core/DashboardDzisView.tsx), [regeneracja](../../src/components/biometrics/DailyStrainBrief.tsx), cele, posiłki i agenda. | Własna kolejność i widoczność istniejących sekcji pozwala wysunąć codzienne zadanie użytkownika na pierwszy plan. Zachować pilne przypomnienia oraz aktualne znaczenie planu dnia. |
| Sen i regeneracja | [Recovery](https://help.bevel.health/en/articles/11258177): poranny wynik i opis składników. Ekran `bevel-274.png`: wynik, HRV/RHR, wgląd i oś czasu. | [SleepDetailView](../../src/components/biometrics/oura/SleepDetailView.tsx) ma realną noc, fazy, HR/HRV; [DetailsDriversSection](../../src/components/biometrics/oura/details/DetailsDriversSection.tsx) i [SplitBars](../../src/components/biometrics/oura/details/SplitBars.tsx) już pokazują porównania grup, N i pokrycie. | Nie dodawać następnego silnika snu ani kolejnego procentu gotowości. Priorytetem jest dostęp do istniejących wyników; nie odzyskano wag modelu Bevel. |
| Zapis jedzenia | [Logowanie](https://help.bevel.health/en/articles/11247745): zdjęcie, opis, kod, wyszukiwanie, własne produkty; propozycja AI wymaga przeglądu i zatwierdzenia. | [MealComposer](../../src/components/core/nutrition/MealComposer.tsx) już łączy opis, zdjęcie, skaner, wyszukiwanie, szkic, historię i korektę. | Najpierw poprawiać dostęp do obecnych wejść. Odbiór poprawności pozostaje w istniejącej kolejce; nie przywracać loggera posiłków w Telegramie. |
| Dziennik → osobiste zależności | [Journal](https://help.bevel.health/en/articles/13318977): wpisy manualne tak/neutralnie/nie oraz dane liczbowe i automatyczne. Obejrzany `bevel-414.png` pokazuje te osobne wejścia. [Insights](https://help.bevel.health/en/articles/13319041) wymaga obserwacji w obu grupach i opisuje korelacje. | [habitsApi](../../src/lib/health/habitsApi.ts) zapisuje zaznaczenie jako `completed=true`, a odznaczenie usuwa rekord. [Silnik snu](../../src/lib/biometrics/sleepDrivers/nightFeatures.ts) zachowuje nieznane wartości jako NULL. [compute-behavior-effects](../../supabase/functions/compute-behavior-effects/index.ts) oddzielnie porównuje wystąpienie wpisu z brakiem wpisu. | Jawne „nie” wymaga zmiany semantyki wszystkich czytelników danego dziennika. Brak wpisu nie staje się potwierdzonym brakiem zachowania. Nie przenosić progu statystycznego Bevel jako gwarancji jakości. |
| Trening → zapis → postęp | [Strength](https://help.bevel.health/en/articles/14206849): konfigurowalne wykresy ćwiczeń/mięśni, historia pod wykresem, miary obciążenia. | [TrainingRoute](../../src/components/biometrics/TrainingRoute.tsx) prowadzi do huba i aktywnej sesji; [TrainingHubView](../../src/components/biometrics/workout/TrainingHubView.tsx) ma szablony, rekordy i prognozy; [workoutApi](../../src/lib/health/workoutApi.ts) udostępnia historię i korekty. | Istniejących ścieżek nie zastępować nowym trenerem. Wskaźniki modelowe wymagają kalibracji, nie deklaracji diagnozy przetrenowania. |

Bevel dokumentuje też [priorytety i ukrywanie źródeł](https://help.bevel.health/en/articles/10416897).
To odniesienie do jawnego pochodzenia danych, a nie dowód, że każda kategoria
ma pełną automatyczną hierarchię fallbacków.

## Trzy wybrane ulepszenia

| Priorytet | Zmiana i konkretny scenariusz | Zakres / warunek odbioru |
|---|---|---|
| Pierwszy | **Własny układ Dziś.** Użytkownik przesuwa „Najbliższy ruch” przed regenerację i ukrywa kartę wizji; po zapisie i ponownym wejściu widzi wybrany układ. | Istniejące sekcje, kontrolki góra/dół dostępne dotykiem i klawiaturą, widoczność, lokalny szkic, anulowanie/reset/zapis. Preferencje konta zamiast nowego modelu danych. Pilne terminy i pomiary poza listą. Ukrycie nie usuwa zapisów domenowych. |
| Drugi | **Szybkie akcje użytkownika.** Pod „+” użytkownik przypina często używane akcje, np. dodanie notatki, jedzenia, treningu; odpala istniejący formularz. | Rozszerzyć obecne menu i właścicieli formularzy. Odbiór: wybrana akcja otwiera właściwe wejście bez szukania modułu, preferencja przeżywa ponowne wejście, każdy zapis pozostaje przy obecnym API. |
| Trzeci | **Jawna odpowiedź w dzienniku.** „Nie było alkoholu” pozostaje odróżnione od pominięcia pytania, także w porównaniu następnej nocy. | Rozszerzyć istniejący dziennik, bez kopii nawyków w stream. Odbiór: tak/nie/brak odpowiedzi i korekty mają trwały zapis; do obu grup analizy trafiają tylko odpowiednio udokumentowane dni, z N, datami i ograniczeniami. Wymaga sprawdzenia SQL, Oracle i agregatów, nie tylko nowych przycisków. |

Pierwszeństwo układu wynika z powtarzalnego kosztu nawigacji i gotowych konsumentów,
nie z założenia, że Sparky nie ma analiz snu. Dwa kolejne zakresy są propozycjami
do istniejącej kolejki, nie automatycznym upoważnieniem do przebudowy wszystkich modułów.

## Własny układ: kontrakt implementacji

- Źródło: `vanguard_preferences`, klucz `ui:today_layout`, unikalność `user_id,key`.
  `is_active=false` utrzymuje techniczną konfigurację poza aktywnymi deklaracjami Oracle.
- [Normalizator](../../src/lib/todayLayout.ts) rozpoznaje wersję i identyfikatory sekcji,
  odrzuca duplikaty/obce ID, uzupełnia nowe sekcje i zachowuje jawne ukrycie wszystkich.
- [API](../../src/lib/todayLayoutApi.ts) sprawdza błędy zapisu/odczytu.
  [Hook](../../src/components/core/hooks/useTodayLayout.ts) wiąże cache z właścicielem.
  [Edytor](../../src/components/core/TodayLayoutEditor.tsx) zachowuje szkic po błędzie.
- Widoczność dotyczy zawartości Dziś po rozpoczęciu dnia. Dotychczasowy ekran
  rozpoczynania dnia oraz osobny kokpit `/dashboard` mają własne zachowanie.
- Przy błędzie odczytu dostępna treść pozostaje widoczna, a edycja wymaga ponowienia.
  Przy zmianie konta lokalny edytor jest odmontowywany.
- Konfiguracja widoku nie jest wyłączeniem synchronizacji ani przechowywania danych.
  Ukryte komponenty nie są renderowane; globalne procesy aplikacji pozostają aktywne.

## Co rzeczywiście ujawnił klient i REA

Pobrano publiczne skrypty niezalogowanej strony `app.bevel.health/sign-in`.
Uruchomiono oficjalne `rea-agents` do statycznej analizy lokalnych plików.
Analiza całego zestawu zakończyła się `provider_timeout` na pliku frameworka;
zachowano częściowe Evidence, status każdego źródła i jego SHA-256.
Osobna analiza dwóch plików zawierających logowanie zakończyła się poprawnie.
Ich składnia została odczytana bez błędów, ale graf semantyczny osiągnął ustawione
limity i pozostał częściowy; pozostałe pliki były poza zakresem tego przebiegu.
Raport nie stanowi kompletnej analizy Bevel.

Ręcznie sprawdzone wystąpienia kodu, także w przeanalizowanych plikach:

| Metoda | Ścieżka | Publiczny plik źródłowy |
|---|---|---|
| POST | `/api/auth/refresh` | `07998-61yj22t.js` |
| POST | `/api/auth/apple-sign-in` | `2fg74f_dhw6yz.js` |
| POST | `/api/authentication/v2/magic-link/request` | `2fg74f_dhw6yz.js` |
| POST | `/api/auth/magic-link/verify` | `2fg74f_dhw6yz.js` |

Nie wykonywano tych żądań. Nie ustalono prywatnych endpointów danych zdrowotnych,
kształtu ich odpowiedzi ani algorytmów serwerowych. Nie było pakietu mobilnego,
konta ani sesji Bevel. Ekrany i instrukcje umożliwiają analizę produktu, ale nie
dekompilację brakującego klienta. Materiały źródłowe i generowany raport z analizy
pozostają w lokalnych artefaktach rozmowy, poza repozytorium Sparky.

## Odbiór zmiany

Automatyczne scenariusze obejmują uszkodzoną konfigurację, nowe/obce/zdublowane ID,
ukrycie wszystkich sekcji, trwały zapis i ponowny odczyt przez klienta SDK,
filtr właściciela, błędy HTTP, szkic, anulowanie, reset, kolejność realnego
renderera i stałe przypomnienia. Osobno sprawdzać wyścig refetch–zapis,
skróty przy ukrytej sekcji oraz dialog otwarty podczas obsługi klawiatury.

Lokalny odbiór przeglądarkowy używa danych syntetycznych i kontrolowanego HTTP.
Nie dowodzi działania na fizycznym telefonie, wdrożenia ani polityk RLS żywej bazy.
Nie przypisujemy zmianie zmierzonej oszczędności czasu bez pomiaru użycia.
