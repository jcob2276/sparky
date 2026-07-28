# Oura health experience — design

## Cel

Przebudować `/oura` w czytelne centrum zdrowia inspirowane aktualną aplikacją Oura,
bez kopiowania jej marki. Najpierw ekran ma wiernie pokazywać dane z jednej,
konkretnej nocy; dopiero na tej podstawie ma otrzymać nową strukturę i warstwę
wizualną.

Sukces oznacza, że wynik, przedział czasu, fazy snu, ruch oraz sumy na ekranie są
zgodne ze źródłowymi rekordami Oura. Interfejs nie może tworzyć zastępczych faz,
godzin, ruchu ani interpretacji wyglądających jak pomiar.

## Zasady produktu

- Jedna karta dnia reprezentuje jeden kanoniczny dzień Oura.
- Dane dzienne i szczegóły snu są łączone wyłącznie dla tego samego dnia lub
  jednoznacznego identyfikatora epizodu snu.
- Brak danych jest widoczny i nazwany zgodnie z kontraktem powierzchni biometrycznych.
- Podsumowania deterministiczne pochodzą z zapisanych metryk. Wnioski Vanguard są
  wyraźnie oddzielone od pomiarów.
- Aktualne 72 godziny są pierwszym kontekstem, a widoki długoterminowe podają
  jawne okno i wymagania dotyczące liczby dni.

## Architektura informacji

### Dzisiaj

Ekran otwiera się na aktualnym kanonicznym dniu i zawiera:

- przewijalne skróty do Gotowości, Snu, Aktywności, Stresu i Serca;
- główną kartę najważniejszego wyniku dnia z krótkim, deterministicznym opisem;
- aktualne sygnały wymagające uwagi;
- najważniejsze zdarzenia i zsynchronizowane aktywności;
- czytelny stan świeżości oraz synchronizacji danych.

Kolejność kart może zmieniać się według dostępności i znaczenia danych, ale nie
może ukrywać braków.

### Parametry

Stały katalog kart pogrupowanych w obszary:

- Gotowość;
- Sen;
- Aktywność;
- Stres i regeneracja;
- Serce;
- Metryki podstawowe: HRV, tętno spoczynkowe, temperatura, oddech i SpO2.

Każda karta pokazuje wynik lub status, datę pomiaru, ikonę obszaru i wejście do
szczegółu. Układ wykorzystuje miękkie, ciemne powierzchnie i dwukolumnową siatkę
na szerokich ekranach, a pojedynczą kolumnę na telefonie.

### Moje zdrowie

Widok długoterminowy pokazuje zdrowie jako kierunek, nie pojedynczy score:

- ocenę snu i regeneracji w określonym oknie;
- trendy HRV, tętna, temperatury i regularności snu;
- nawyki i rutyny liczone z jawnego okresu;
- korelacje Vanguard dopiero po spełnieniu minimalnej liczby obserwacji;
- stan „kalibracja” zamiast oceny, gdy danych jest za mało.

## Kanoniczny model dnia i nocy

Warstwa `src/lib` zwraca jeden złożony model widoku. Najpierw wybiera dzień, potem
dołącza wszystkie źródła dla dokładnie tego dnia. Nie wybiera niezależnie
„najlepszego” rekordu z każdej tabeli.

Model zawiera:

- dzień Oura i identyfikator epizodu, jeśli jest dostępny;
- podsumowanie dzienne;
- rozszerzone metryki snu;
- surową oś faz snu;
- rzeczywiste zdarzenia ruchu, HR i HRV;
- jawne informacje o brakujących źródłach i świeżości.

Jeżeli podsumowanie i szczegóły nie mogą zostać jednoznacznie połączone, UI pokazuje
podsumowanie oraz komunikat o braku szczegółów. Nie łączy rekordów z różnych dni.

## Szczegół snu

Szczegół zachowuje hierarchię znaną z Oura:

1. nagłówek z nazwą ekranu i wybranym dniem;
2. wynik snu oraz rzeczywisty przedział snu;
3. karta „Czas snu” z czasem snu i czasem w łóżku;
4. schodkowy hipnogram z surowych faz;
5. oś ruchu z prawdziwych zdarzeń;
6. podsumowanie Czuwanie, REM, Płytki i Głęboki;
7. dalsze metryki: tętno, HRV, oddech, regularność i czynniki wyniku.

Hipnogram:

- wykorzystuje `sleep_phase_5_min` albo kanoniczną tabelę osi faz;
- skaluje oś od rzeczywistego `bedtime_start` do `bedtime_end`;
- generuje etykiety czasu z zakresu nocy, a nie ze stałych godzin;
- zachowuje krótkie wybudzenia i przejścia między fazami;
- nie renderuje syntetycznego wykresu, gdy osi faz brakuje.

Różnice zaokrągleń mogą wynosić najwyżej jedną minutę i muszą pochodzić z jednej
kanonicznej funkcji formatowania. Sumy faz są sprawdzane względem całkowitego czasu
snu; istotna niespójność danych jest sygnalizowana zamiast maskowana.

## Język wizualny

Kierunek to około 90% spokoju i hierarchii Oura oraz 10% charakteru Sparky:

- grafitowe tło i powierzchnie o niewielkiej różnicy jasności;
- chłodne błękity dla faz snu, zieleń dla regeneracji i subtelny fiolet dla stresu;
- duże, lekkie liczby zamiast ciężkiego dashboardowego boldowania;
- ikony liniowe przypisane do obszarów zdrowia;
- duże promienie kart i wyraźne grupowanie bez nadmiaru ramek;
- dolna nawigacja modułu na telefonie, górna na szerokim ekranie;
- cele dotykowe minimum 44 px i pełna obsługa `prefers-reduced-motion`.

Kolory i powierzchnie używają istniejących tokenów semantycznych. Nowe tokeny
powstają tylko wtedy, gdy istniejący system nie potrafi opisać faz snu.

### Wariant Oura-first

Widok `/oura` ma własny, izolowany kontekst ciemnego motywu. Nie może dziedziczyć
jasnych powierzchni aktywnego motywu całej aplikacji. Izolacja obejmuje tło,
powierzchnie kart, tekst, obramowania i nawigację, ale nie zmienia globalnych
tokenów ani wyglądu innych modułów.

- tło strony jest niemal czarne, a karty używają kilku bliskich sobie odcieni
  grafitu;
- biały lub kremowy panel nie może być domyślną powierzchnią żadnej karty;
- treść tworzy wyśrodkowaną kolumnę aplikacyjną o maksymalnej szerokości 720 px,
  również na szerokim ekranie;
- skróty wyników zachowują mobilny charakter Oura: są zwarte, przewijane poziomo
  i nie rozciągają się, aby wypełnić desktop;
- główny wynik dnia jest ciemnym hero z subtelnym, chłodnym gradientem i dużą,
  lekką typografią;
- karty kontekstu Sparky pozostają wizualnie wtórne wobec pomiarów Oura;
- na telefonie nawigacja jest przyklejona u dołu, a na szerokim ekranie pozostaje
  w obrębie kolumny aplikacyjnej;
- ekran nie używa logo ani chronionych zasobów Oura, lecz zachowuje jej spokojną
  hierarchię, proporcje i sposób prezentacji danych.

## Granice komponentów

- Kontener strony pobiera i składa model widoku, po czym przekazuje go czystym
  prezenterom.
- `OuraTodayView`, `OuraVitalsView` i `OuraHealthView` odpowiadają wyłącznie za układ.
- Szczegóły domenowe, w tym `SleepDetailView` i hipnogram, są osobnymi komponentami
  poniżej 300 linii.
- Obliczenia osi czasu, sum i etykiet są czystymi funkcjami w warstwie domenowej,
  pokrytymi testami.
- Komponenty nie wykonują zapytań Supabase i nie zawierają wartości zastępczych
  udających pomiar.

## Obsługa błędów i braków

- Błąd źródła wskazuje nazwę niedostępnego źródła oraz pozostawia dostępne dane.
- Brak osi faz pokazuje „Brak szczegółowego przebiegu faz dla tej nocy”.
- Brak ruchu pokazuje „Oura nie udostępniła pomiaru ruchu dla tej nocy”, bez
  dekoracyjnych znaczników.
- Karty kontekstu nigdy nie pokazują nazw tabel, kolumn ani innych identyfikatorów
  technicznych. Brak wpisu kofeiny pokazuje „Nie zapisano kofeiny”; analogiczne
  braki używają krótkiego języka użytkownika bez powtarzania „Brak danych”.
- Rekordy z różnych dni nigdy nie są łączone po cichu.
- Długoterminowa ocena bez minimalnego okna pokazuje stan kalibracji oraz liczbę
  dostępnych dni.

## Weryfikacja

Testy obejmują:

- wybór jednej daty i brak mieszania rekordów dzisiaj/wczoraj;
- mapowanie znaków faz oraz zachowanie krótkich wybudzeń;
- rzeczywisty zakres osi i etykiety przekraczające północ;
- brak syntetycznego hipnogramu, ruchu i godzin;
- sumy faz, czas snu i czas w łóżku;
- stany braków, błędów i kalibracji;
- responsywność telefonu oraz szerokiego ekranu;
- klawiaturę, fokus, kontrast i ograniczenie ruchu.

Końcowa brama to testy domenowe, `npm run typecheck:ui`, focused lint,
`npm run ratchet:frontend`, produkcyjny build oraz wizualne porównanie tej samej
nocy z aplikacją Oura.

## Poza zakresem

- Kopiowanie marki, tekstów marketingowych lub chronionych zasobów graficznych Oura.
- Funkcje zdrowia kobiet, glukozy lub inne obszary bez dostępnego, wiarygodnego źródła.
- Nowy równoległy pipeline synchronizacji.
- Autonomiczne diagnozy lub wnioski medyczne.
