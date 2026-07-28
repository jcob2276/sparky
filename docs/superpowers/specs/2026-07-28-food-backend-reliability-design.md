# Food Backend Reliability Design

## Cel

Przebudować backend dodawania jedzenia tak, aby zapisywał semantycznie wiarygodne
produkty, porcje, kalorie i makro. Frontend pozostaje bez zmian. System ma odrzucać
lub kierować do potwierdzenia wynik, który jest matematycznie spójny, ale żywieniowo
nierealny.

## Dowody z produkcji

Audyt `daily_food_entries` z ostatnich siedmiu dni ujawnił:

- `Rosół Z Makaronem`, `2 g`, `2 kcal` — liczba porcji stała się gramaturą;
- `Bułka pszenna`, `50 g`, `53 kcal` — bezkrytyczne użycie błędnego rekordu importu;
- `Kebab box`, `215 g`, `202 kcal` — rekord części dania użyty dla całego dania;
- `ciastko ... z serem` rozbite na ciastko i osobne `Jablkami`, `18 g`;
- trzy identyczne banany zapisane w odstępach około jednej sekundy;
- dopasowania z wynikiem `0.57` oznaczane jako potwierdzone z niepewnością `10%`;
- wpisy bez `parse_meta`, których pochodzenia nie da się audytować.

Makro i kcal są na ogół arytmetycznie spójne. Problemem jest dobór produktu,
interpretacja jednostki, gramatura i nadmierne zaufanie do biblioteki.

## Architektura

Kanoniczny pipeline:

1. LLM identyfikuje produkty, ilości i jednostki, ale nie nadaje wiarygodności.
2. Normalizator zachowuje deklarowaną jednostkę oraz tekst źródłowy.
3. Matcher zbiera kandydatów z korekt użytkownika, etykiet, biblioteki, polskiej
   bazy referencyjnej, Open Food Facts i fallbacku LLM.
4. Silnik zaufania klasyfikuje źródło i dopasowanie.
5. Walidator semantyczny sprawdza porcję, kcal/100 g, kategorię i kompletność dania.
6. Wynik wysokiego zaufania może zostać zapisany automatycznie. Pozostałe wyniki
   wracają do istniejącego podglądu frontendu z czytelnym założeniem.
7. Zapis jest idempotentny i zawsze utrwala pełne `parse_meta`.

## Model zaufania

Kolejność od najwyższego zaufania:

1. jawna korekta użytkownika;
2. etykieta lub kod kreskowy z kompletnym makro;
3. zweryfikowany rekord użytkownika;
4. polska baza referencyjna;
5. Open Food Facts z kompletnymi wartościami;
6. import lub historia użytkownika;
7. oszacowanie LLM.

`yazio_import`, historia oraz cache po wcześniejszym logowaniu nie otrzymują
automatycznie poziomu `confirmed`. Dopasowanie nazwy nie dowodzi poprawności
wartości odżywczych.

Wynik poniżej progu wysokiego dopasowania albo pochodzący z importu musi mieć co
najmniej `medium` confidence. Wynik o niepewnej porcji, podejrzanej gęstości lub
niepełnym daniu ma `low` confidence i wymaga potwierdzenia.

## Jednostki i porcje

Parser zwraca `quantity`, `unit`, `grams` i informację, czy gramatura była jawna.
Obsługiwane jednostki obejmują gramy, kilogramy, mililitry, sztuki, kromki,
plastry, miski, porcje i opakowania.

- Jawne gramy i mililitry są wiążące.
- Liczba sztuk jest konwertowana tylko przy znanym przeliczniku produktu.
- `2 miski rosołu` nie może stać się `2 g`; bez profilu porcji używa zakresu
  typowej miski i oznacza założenie.
- Nieznana jednostka lub brak bezpiecznego przelicznika wymaga potwierdzenia.
- Wynik poniżej minimalnej rozsądnej porcji dla dania głównego lub zupy jest
  blokowany przed automatycznym zapisem.

## Walidacja semantyczna

Walidator działa po dopasowaniu i przed zapisem:

- oblicza wartości na 100 g z całej porcji;
- sprawdza dodatniość, skończoność oraz zgodność kcal z makro;
- stosuje szerokie, kategoriane zakresy gęstości energetycznej i porcji;
- wykrywa podejrzanie niskie porcje dań, zup i napojów mlecznych;
- wykrywa produkt złożony dopasowany do rekordu opisującego tylko składnik;
- obniża zaufanie przy sprzeczności gramatury z historią użytkownika;
- nigdy nie „naprawia” cicho danych — zapisuje powód oraz wymaga potwierdzenia.

Progi mają zapobiegać oczywistym absurdom, nie udawać precyzji dietetycznej.

## Dania złożone

Automatyczne rozbijanie po słowach `z` i `ze` zostaje usunięte. Danie jest
rozdzielane wyłącznie wtedy, gdy wejście jawnie wymienia składniki albo parser
zwróci strukturę składników z wystarczającą pewnością.

Nazwy typu `ciastko z jabłkami`, `naleśniki z serem`, `rosół z makaronem` i
`kebab box` domyślnie pozostają jednym daniem. Składnik nie może powstać z samego
fragmentu gramatycznego, takiego jak `Jablkami`.

## Idempotencja

Klient przekazuje `request_id` dla jednej intencji zapisu. Baza przechowuje go
przy wpisie i posiada unikalność w zakresie użytkownika. Ponowienie tego samego
żądania zwraca istniejący wpis.

Dodatkowa ochrona wykrywa identyczny produkt, datę, posiłek, gramaturę i wartości
zapisane w krótkim oknie czasowym bez `request_id`. Taki zapis nie tworzy nowego
rekordu, ale zwraca informację o deduplikacji.

## Obserwowalność

Każdy nowy wpis ma `parse_meta` zawierające:

- wersję parsera;
- oryginalny tekst i znormalizowaną jednostkę;
- źródło wartości i identyfikator dopasowania;
- wynik dopasowania;
- poziom zaufania i procent niepewności;
- jawność gramatury;
- zastosowane konwersje, założenia i ostrzeżenia;
- `request_id`;
- wynik walidacji semantycznej.

Logi Edge zapisują tylko metadane diagnostyczne i skrócony tekst, bez sekretów.

## Migracja danych

Istniejące rekordy nie są automatycznie przeliczane ani usuwane. Powstaje raport
anomalii historycznych, który oznacza podejrzane wpisy do ręcznego przeglądu.
Biblioteka użytkownika otrzymuje audyt rekordów o nierealnej gęstości lub
niepewnym źródle. Podejrzane rekordy są wyłączane z automatycznego dopasowania,
ale pozostają dostępne do korekty.

## Obsługa błędów

- Brak wiarygodnego dopasowania uruchamia fallback LLM z niskim zaufaniem.
- Awaria źródła zewnętrznego nie blokuje korekty, biblioteki ani bazy referencyjnej.
- Niepoprawna jednostka lub porcja zwraca wynik do potwierdzenia zamiast zapisu.
- Błąd części kandydatów nie unieważnia pozostałych produktów w podglądzie.
- Zapis całego zatwierdzonego zestawu jest atomowy albo jawnie raportuje pozycje,
  których nie zapisano.

## Testy akceptacyjne

Obowiązkowe przypadki regresyjne:

- `2 miski rosołu z makaronem` nigdy nie daje `2 g`;
- `bułka pszenna 50 g` nie ufa błędnemu importowi tylko dlatego, że nazwa pasuje;
- `kebab box 215 g` nie używa bez ostrzeżenia rekordu części dania;
- `ciastko z jabłkami 100 g` pozostaje jednym produktem;
- `3 banany` daje jedną pozycję o gramaturze trzech sztuk;
- ponowienie tego samego `request_id` nie tworzy duplikatu;
- trzy szybkie identyczne wywołania bez `request_id` są deduplikowane;
- każde zapisane jedzenie ma pełne `parse_meta`;
- wartości jawnie podane przez użytkownika nie są zmieniane bez ostrzeżenia;
- parser Telegrama i frontend używają tego samego pipeline’u.

## Poza zakresem

- redesign istniejącego interfejsu;
- diagnozowanie kalorii ze zdjęcia całego talerza;
- automatyczne przepisywanie wszystkich historycznych kalorii;
- zastępowanie deklaracji użytkownika arbitralną decyzją systemu.
