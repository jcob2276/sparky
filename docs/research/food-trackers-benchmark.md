# Trackery żywności: co warto przenieść do Sparky

## Wniosek dla Jakuba

Największa szansa Sparky to połączenie wiarygodnego dziennika, Twoich sprawdzonych produktów i przepisów, szybkich poprawek oraz decyzji uwzględniających rzeczywisty trening. Sam aparat, duża baza albo kolejny model językowy nie zapewnią tej przewagi.

Rekomenduję następującą kolejność:

1. Domknąć zapis, kompletność dnia i pochodzenie danych. Bez tego adaptacja energii uczy się błędów rejestru.
2. Uporządkować porcje, jednostki, stan surowy/gotowany i wersjonowane przepisy z końcową masą.
3. Zbudować osobisty zestaw walidacyjny i zmierzyć obecny pipeline, zanim zmienimy jego silnik.
4. Ujednolicić istniejące integracje i selektywnie uzupełnić katalog referencyjny; wykorzystać polskie etykiety i Twoją historię.
5. Podłączyć istniejące, obecnie niekonsumowane elementy doprecyzowania i propozycji kolejnego posiłku.
6. Dopiero na wiarygodnych danych uruchamiać adaptację celu i szerszą analizę składników.

To rekomendacje badawcze, nie rozpoczęte zadania implementacyjne. Operacyjny backlog pozostaje wyłącznie w [BACKLOG.md](../../BACKLOG.md). W szczególności istnieją już tam zgłoszenia dotyczące atomowości Telegrama, ponowień i korekt; nie należy zakładać ich od nowa.

## Metoda i granice dowodu

Raport zastępuje poprzednią wersję w całości. Opiera się na dokumentacji producentów, dokumentacji źródeł danych, publikacjach naukowych, odczycie repozytoriów GitHub, kodzie lokalnym Sparky oraz agregujących zapytaniach SELECT do podłączonej bazy. Nie zmieniano aplikacji ani danych produkcyjnych.

Rozróżniam:

- **Dokumentowany mechanizm**: producent wyjaśnia, jak funkcja działa lub jak jej używać. Potwierdza dostępność/opis, nie skuteczność.
- **Deklaracja producenta**: np. „uczy się”, „dokładniejszy”, wielkość bazy. Bez niezależnego testu nie staje się dowodem przewagi.
- **Badanie**: dowód ograniczony populacją, protokołem, danymi i wersją badanej metody.
- **Odczyt kodu/bazy Sparky**: dowód zachowania źródła lub stanu schematu. Nie jest testem urządzenia ani potwierdzeniem zgodności wdrożenia z lokalnym kodem.
- **Rekomendacja**: własna synteza, którą trzeba zweryfikować przed wdrożeniem.

Nie wykonano zakupów subskrypcji, testu wszystkich funkcji na telefonie, pomiaru dokładności aktualnych aplikacji na posiłkach Jakuba ani laboratoryjnego pomiaru spożycia/TDEE. Nie istnieje podstawa do ogłoszenia globalnego zwycięzcy ani stwierdzenia, że Sparky jest już dokładniejszy od Fitatu.

Zmiennych liczebności, wersji rozszerzeń i daty odczytu nie utrwalam ponownie w ręcznie pisanej tabeli. Są w [wygenerowanej migawce audytu](./food-trackers-audit.json), razem z zapytaniem i identyfikatorem sprawdzonego kodu. Migawka dotyczy jednego odczytu, nie bieżącego monitoringu. Nie zawiera treści posiłków ani identyfikatorów użytkownika.

## Nawigacja

- [Korekty wcześniejszych wniosków](#korekty-poprzedniego-researchu)
- [Rynek i konkretne mechanizmy](#rynek-czego-rzeczywiście-uczą-najlepsze-rozwiązania)
- [Audyt istniejącego Sparky](#sparky-co-już-jest-czego-brakuje-i-gdzie-wynik-nie-dociera-do-użytkownika)
- [Źródła danych i jednostki](#dane-referencyjne-i-normalizacja)
- [Badania oraz ich ograniczenia](#co-wynika-z-badań-a-czego-nie-wolno-z-nich-wywnioskować)
- [Repozytoria GitHub](#github-gotowe-elementy-i-pułapki)
- [Docelowe zachowanie](#docelowe-zachowanie-modułu-dla-jednego-użytkownika)
- [Kolejność i kryteria odbioru](#kolejność-wdrożeń-i-warunki-odbioru)
- [Benchmark osobisty](#benchmark-dla-jakuba-jak-uczciwie-zmierzyć-najlepszy-dla-mnie)
- [Otwarte kwestie](#otwarte-kwestie-i-granice-rekomendacji)

## Korekty poprzedniego researchu

| Wcześniejszy wniosek | Zweryfikowana korekta | Znaczenie |
|---|---|---|
| „Trzeba dodać kod kreskowy i OCR etykiety” | W Sparky istnieją oba przepływy oraz foto posiłku. | Sprawdzić jakość i domknięcie, nie budować duplikatu. |
| „Głosu nie ma” | Telegram ma transkrypcję; główny edytor posiłku obsługuje tekst/foto. Nie potwierdzono kompletnego, dedykowanego przepływu głos→posiłek w UI. | Podłączyć istniejące wejście do tego samego capture; sama transkrypcja nie oznacza działającego food loggera. |
| „Nikt dobrze nie personalizuje porcji” | Asken deklaruje uczenie na korektach, Fitatu — zapamiętywanie częstych produktów i porcji; Sparky już zapisuje osobiste porcje. | Przewaga wymaga wyniku na Twoich danych, nie samej nazwy funkcji. |
| „MacroFactor: bez check-inów, foto drugorzędne” | Producent dokumentuje tygodniowy check-in z oceną częściowych logów i osobne AI Food Logging. | Odróżnić ciągłą estymację wydatku od interfejsu cotygodniowej decyzji. |
| „Mamy mikroskładniki jak Cronometer” | Obecny kontrakt Sparky obejmuje błonnik, cukry, nasycone i sól; nie pełny profil witamin i minerałów. | Nazwa modułu micronutrients nie dowodzi pełnego panelu mikro. |
| „Baza referencyjna już zasila parser” | Parser korzysta z tablic TS; tabela food_reference_pl jest czytana w planowaniu posiłków. | Wypełnienie tabeli nie poprawi parsera bez podłączenia odczytu. |
| „pgvector jest, więc RAG gotowy” | Rozszerzenie istnieje, ale sprawdzone tabele produktów nie mają kolumn embeddingowych. | Potrzebne byłyby dane, indeksy i ewaluacja; nie ma powodu zaczynać od wektorów. |
| „Lab/ref > label > user_weighed” | Pochodzenie składu i pomiar porcji są odrębnymi osiami; etykieta konkretnego skyru jest trafniejsza niż ogólna analiza innego jogurtu. | Nie budować jednej drabiny dla różnych rodzajów dowodu. |
| „Odtworzymy źródła historii po nazwie” | Dzisiejsza zgodność nazwy z biblioteką nie dowodzi historycznego źródła, receptury ani ważenia. | Kandydat do przeglądu, nie automatyczne potwierdzenie historii. |
| „Domowe znaczy mniej tłuszczu/cukru” | Kod obniża szacunek LLM po wykryciu domowego kontekstu; nie znaleziono empirycznego uzasadnienia. | Usunąć tę przesłankę albo uzależnić ją od konkretnego przepisu, nie słowa „domowe”. |
| „PZH: nie wiadomo, skąd dane” | PZH oferuje pełny XLSX odpłatnie na umowie licencyjnej; normy żywienia są osobną publikacją. | Możliwa ścieżka zakupu, ale bez założenia otwartej licencji. |
| „AGPL nie wolno używać” | Licencja daje prawa, z obowiązkami zależnymi od użycia i udostępniania; prywatne użycie nie jest tym samym co dystrybucja. | Ocenić konkretny komponent i licencję, zamiast automatycznie odrzucać repo. |
| „Nie ma gotowych repo” | Są użyteczne aplikacje i backend Supabase; nie znaleziono zwalidowanego zamiennika całego Sparky. | Wykorzystać konkretne importery, schematy i wzorce. |

Źródła zewnętrzne dla tych korekt są przy odpowiednich aplikacjach i zasobach poniżej. Podstawa techniczna to pliki wskazane w audycie.

## Rynek: czego rzeczywiście uczą najlepsze rozwiązania

### MacroFactor — adaptacja i uczciwy dziennik

Producent opisuje estymację wydatku z energii wpisanej do dziennika i trendu masy, niezależnie od realizacji celu. Niedotrzymanie planu nie jest tym samym co brak danych. Przy niedostatecznej ilości obserwacji estymacja przechodzi w podtrzymanie; osobny moduł check-inu pyta o podejrzanie częściowe dni. To dokumentacja mechanizmu, nie niezależna walidacja TDEE. [Adherence neutrality](https://macrofactor.com/adherence-neutral/), [wersje estymatora](https://help.macrofactorapp.com/en/articles/74-expenditure-version), [partial logging](https://help.macrofactorapp.com/en/articles/248-coaching-module-partial-logging).

W przepisie wieloporcjowym wpisuje się składniki, a po gotowaniu końcową masę całości. Edycja definicji przepisu lub własnego produktu nie zmienia dawnych wpisów. To dwa osobne, bardzo wartościowe wzorce: właściwy mianownik porcji i zachowanie historii. [Przepisy](https://help.macrofactorapp.com/en/articles/223-tips-for-creating-recipes-for-dishes-comprised-of-multiple-servings), [historia](https://help.macrofactorapp.com/en/articles/240-does-editing-a-recipe-or-custom-food-item-affect-my-food-log-history).

AI obsługuje zdjęcie, zdjęcie z tekstem i upload, a wynik trafia do edytowalnych pozycji. Zwykłe kopiowanie działa także na grupach wpisów i datach. Nie wszystkie skróty wymagają AI. [AI Food Logging](https://help.macrofactorapp.com/en/articles/258-ai-food-logging), [kopiowanie](https://help.macrofactorapp.com/en/articles/95-copy-and-paste).

Kompletność danych mikro jest raportowana osobno dla składnika, a pełniejsze produkty ogólne są odróżniane od marek z etykiet. Polski użytkownik musi liczyć się ze zmiennym pokryciem marek; skaner etykiety producent opisuje jako najlepiej dopasowany do USA/Kanady. [Kompletność](https://help.macrofactorapp.com/en/articles/135-what-is-the-nutrient-completeness-score), [profil mikro](https://help.macrofactorapp.com/en/articles/132-how-to-log-foods-with-complete-micronutrient-information), [regiony](https://help.macrofactorapp.com/en/articles/25-how-robust-is-the-database-coverage-in-my-region), [etykiety](https://help.macrofactorapp.com/en/articles/213-label-scanner).

**Do Sparky:** kompletność przed adaptacją, snapshot przepisu i ponowne użycie wpisów. Nie kopiować niejawnego algorytmu ani marketingowej liczby dokładności.

### Cronometer — tożsamość i pochodzenie składników

Wyszukiwanie rozróżnia m.in. NCCDB/USDA i dane marek z etykiet. Własne produkty są prywatne domyślnie; do zgłoszenia błędu przydaje się opakowanie i etykieta, bo receptury jednej marki różnią się regionalnie. Nie wynika z tego, że dowolny rekord USDA jest analizą laboratoryjną konkretnego produktu. [Źródła](https://support.cronometer.com/hc/en-us/articles/360018239472-Data-Sources), [korekta danych](https://support.cronometer.com/hc/en-us/articles/360020982412-How-do-I-Report-an-Issue-with-Nutrition-data-in-Cronometer).

Końcowa masa ugotowanego przepisu koryguje gęstość porcji, ale sama nie modeluje utraty witamin ani usuniętego tłuszczu. Stan produktu musi pasować do chwili ważenia. [Masa ugotowana](https://support.cronometer.com/hc/en-us/articles/4406291608724-Set-Cooked-Recipe-Weight), [surowe/gotowane](https://support.cronometer.com/hc/en-us/articles/4405155125012-Do-I-log-my-foods-raw-or-cooked).

Photo-Logging zwraca dopasowane produkty do przeglądu: można zmienić jednostkę, ilość, produkt, dodać brakujący składnik albo utworzyć przepis. Szczególnie przydatne są propozycje niewidocznych dodatków. To pytania o typowy skład, nie pomiar oleju aparatem. [Photo-Logging](https://support.cronometer.com/hc/en-us/articles/39013533811092-Mobile-Photo-Logging).

Cel energii może obejmować bazową aktywność i aktywność importowaną z korektą podwójnego liczenia. Ten mechanizm nie jest automatycznie odpowiednikiem adaptacji MacroFactora. [Cel energii](https://support.cronometer.com/hc/en-us/articles/31975503009044-Energy-Target), [podsumowanie energii](https://support.cronometer.com/hc/en-us/articles/360060616191-Energy-Summary).

**Do Sparky:** osobno profil składu, porcja i ich kompletność; korekta konkretnego dopasowania, nie jedynie sumy kalorii.

### MyFitnessPal, Lose It!, Carbon i Noom — różne rodzaje „inteligencji”

| Aplikacja | Dokumentowany mechanizm | Praktyczny wniosek dla Sparky |
|---|---|---|
| MyFitnessPal | Meal Scan i Voice Logging tworzą edytowalne sugestie. Opisywane wejście głosowe wymaga angielskiego i nie korzysta z My Foods/My Recipes/My Meals. Zielony znacznik nie wyklucza błędów. [Foto](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-How-to-use-the-Meal-Scanner), [głos](https://support.myfitnesspal.com/hc/en-us/articles/30332897072269-How-to-log-food-with-your-voice), [znacznik](https://support.myfitnesspal.com/hc/en-us/articles/360032273292-Check-Marked-items) | U Jakuba głos po polsku musi rozumieć własne przepisy i poprawki; „zweryfikowane” nie może oznaczać bezbłędne. |
| Lose It! | Snap It pozwala zmienić produkt i porcję, korzystając również z wcześniejszych My Foods. Filtr Verified dotyczy kuracji wpisów. [Snap It](https://loseit.zendesk.com/hc/en-us/articles/47771695186580-How-to-Use-Snap-It), [korekta](https://loseit.zendesk.com/hc/en-us/articles/49210480663316-Incorrect-Food-Data) | Dopasowanie do prywatnej historii ma pierwszeństwo, gdy to rzeczywiście ten sam produkt. |
| Lose It! — aktywność | Calorie Bonus opiera się na przekroczeniu oczekiwanego wydatku; treningi mieszczące się w całodziennym wydatku zegarka nie są dodawane ponownie. [Calorie Bonus](https://loseit.zendesk.com/hc/en-us/p/caloriebonus) | Nie sumować Oury, Garmin/Strava i tego samego treningu jako niezależnych kalorii. |
| Carbon | Cotygodniowy check-in ocenia spożycie i trend masy; tydzień uznany za niekompletny/non-compliant może pozostawić cel bez zmiany. Sposób oceny trendu zależy od kolejnych check-inów. [Cele](https://help.joincarbon.com/en/articles/15826058-why-are-my-carbon-calorie-targets-so-high-or-so-low), [ocena postępu](https://help.joincarbon.com/en/articles/10338862-how-carbon-evaluates-your-progress-at-your-check-in) | Oddzielić kompletność danych od realizacji celu; nie kodować ich jedną flagą moralizującego compliance. |
| Carbon — przepisy | Końcową masę ugotowanego dania można wykorzystać jako podstawę gramowych porcji. [Przepisy](https://help.joincarbon.com/en/articles/6004820-recipes) | Potwierdza wartość prostego ważenia całości; nie potrzeba do tego modelu wizyjnego. |
| Noom | Kolory opierają się głównie na gęstości energii z wyjątkami grupowymi; nie są bezpośrednim pomiarem zdrowotności posiłku. [Kolory](https://www.noom.com/support/faqs/using-the-app/logging-and-tracking/food-and-water/2025/10/how-nooms-food-color-system-works/) | Neutralna, użyteczna informacja o posiłku; nie dodawać kolejnego pozornie obiektywnego score zdrowia. |

RCT programu Noom ocenia pakiet coachingu, edukacji i samomonitorowania, nie odrębnie kolory ani aktualne AI. Badanie amerykańskie, z ograniczeniami populacji i samoopisem masy, nie dowodzi skuteczności konkretnego modułu u Jakuba. [Badanie Noom](https://onlinelibrary.wiley.com/doi/10.1002/osp4.70122).

### Yazio, Lifesum, Foodvisor i SnapCalorie

| Aplikacja | Co potwierdza dokumentacja | Co przejąć / czego nie zakładać |
|---|---|---|
| Yazio | AI foto daje przybliżenie z edycją składników i ilości; posiłek jest innym obiektem niż przepis. [AI](https://help.yazio.com/hc/en-us/articles/39137901903889-What-is-the-AI-Calorie-Tracking-Feature-and-how-does-it-work), [posiłek/przepis](https://help.yazio.com/hc/en-us/articles/360016755618-What-s-the-difference-between-a-meal-and-a-recipe-in-Yazio) | Poprawiony wynik staje się powtarzalnym posiłkiem; nie ogłaszać zmierzonej dokładności. |
| Lifesum | Tekst, głos, foto, kod, historia i ulubione w jednym wejściu; korekty rozmową i sugestie na podstawie często logowanych produktów/pory. [AI Tracking](https://help.lifesum.com/en/article/ai-tracking-how-does-it-work-15sw7rk/) | „To samo, ale bez sosu” powinno zmieniać istniejący szkic i korzystać z historii, zamiast parsować od zera. |
| Foodvisor | Zdjęcie prowadzi do edycji produktów i całego posiłku; dostępne są też zwykłe wejścia. [Dodanie posiłku](https://foodvisor.zendesk.com/hc/en-us/articles/360013100720-How-to-add-a-meal), [zakres planu](https://foodvisor.zendesk.com/hc/en-us/articles/360013600800-Is-Foodvisor-free) | Aparat jest wejściem do tego samego dziennika. Publiczny opis nie wystarcza do potwierdzenia obecnego czatu z dietetykiem. |
| SnapCalorie | Dostawca opisuje użycie głębi/objętości i dodatkowych wskazówek. Niewidoczny olej pozostaje estymacją z typowego składu. [FAQ](https://www3.snapcalorie.com/faq.html) | Głębia pomaga w geometrii; nie rozwiązuje ukrytej receptury. Aktualna aplikacja nie jest tym samym co benchmark Nutrition5k. |

### Polska — Fitatu, Dine4Fit i DiabScale

Fitatu dokumentuje zdjęcie, głos i tekst, wiązanie wyników z własną bazą oraz doprecyzowanie po opisie. Deklaruje zapamiętywanie częstych produktów i porcji w wejściu głosowym; nie ujawnia tu mierzalnej skuteczności tego uczenia. [Obecna pomoc AI](https://www.fitatu.com/pl/help/jakie-funkcje-ai-oferuje-aplikacja-fitatu/).

Aktualna pomoc zdjęciowa opisuje także wybór z galerii, podczas gdy starszy artykuł mówi o ograniczeniu tej opcji. Przy sporze źródeł pierwszeństwo ma obecna instrukcja funkcji. Katalog przepisów pozwala korzystać z receptury lub jej składników oraz zmieniać porcje. [Foto](https://www.fitatu.com/pl/help/czym-jest-funkcja-%22szacowanie-kalorii-ai-ze-zdjecia%22), [przepisy](https://www.fitatu.com/pl/help/co-znajde-w-%22przepisach%22).

Istnieje raport Fitatu × Kantar porównujący wybrane aplikacje na określonym zestawie produktów i dań. Koryguje to wcześniejsze ogólne „Fitatu nie ma metryk”. Nie jest niezależnym globalnym rankingiem ani testem aktualnego Sparky; bez pełnej metodologii nie przenosimy wyniku na nasze potrawy. W tej sesji bezpośredni odczyt pliku przez narzędzie web zwrócił 403; identyfikacja raportu nie zastępuje jego samodzielnej reprodukcji. [Raport Fitatu × Kantar](https://www.fitatu.com/blog/wp-content/uploads/Kantar_Fitatu_Zdrowie-w-erze-AI_raport_20260210_int.pdf).

Dine4Fit dokumentuje prywatne zestawy, ulubione, kod, foto i dyktowanie oraz ostrzega przed pomijaniem oleju i myleniem stanu produktu. To dobre wzorce regionalnego UX, bez potwierdzenia przewagi modelu zdjęciowego. VitaScale jest obecnie prezentowane jako DiabScale; strona rozdziela dostępne funkcje od rozwijanych algorytmów AI. [Dine4Fit](https://blog.dine4fit.pl/2026/01/jak-zaczac-korzystac-z-dine4fit-kompletny-przewodnik-dla-poczatkujacych/), [DiabScale](https://diabscale.ai/pl/strona-glowna/).

**Do Sparky:** własne polskie produkty i receptury, korekty po polsku i prywatna pamięć. Nie potwierdzono publicznego API umożliwiającego import baz konsumenckich Fitatu, Asken czy Calomiru.

### Japonia — Asken i Calomiru

Asken rozdziela standardowe rozpoznanie zdjęcia od analizy Plus z estymacją ilości. Użytkownik może zamienić potrawę na kandydata z wyszukiwarki, zmienić ilość, dodać niewidoczne danie i usunąć błędne. Producent deklaruje uczenie na korektach. Plus działa asynchronicznie i oferuje opcjonalny autozapis; nie oznacza to, że autozapis jest właściwym domyślnym wyborem dla Sparky. My Recipe pozwala zbudować recepturę albo zmienić podobną, lecz opisuje też ograniczenie do ogólnych składników zamiast produktów handlowych. [Analiza zdjęć](https://asken.tayori.com/q/s-faq/detail/904657/), [My Recipe](https://asken.tayori.com/q/s-faq/detail/904695/).

Calomiru oddziela rozpoznanie potrawy od OCR etykiety zapisywanego do My Menu. Dokumentuje analizę zdjęć z galerii i zmiany ilości, także pozostawionej zupy. Ograniczenia korekty składników zależą od pochodzenia wpisu; sama funkcja „edytuj” nie gwarantuje identycznych możliwości dla każdej ścieżki. [OCR](https://support.calomeal.com/hc/ja/articles/21891546497561), [tryby zdjęć](https://support.calomeal.com/hc/ja/articles/6699556027801), [ilość i korekty](https://support.calomeal.com/hc/ja/articles/4416802992025).

**Do Sparky:** niepewność wskazana na konkretnej pozycji, prywatny wariant przepisu, ilość podana i rzeczywiście zjedzona oraz wygodna poprawka resztek.

### Chiny — Boohee i lepiej opisane ograniczenia fotografii

Boohee przedstawia regionalną bazę i analizę zdjęciową, ale wielkości katalogów aplikacji i oferty biznesowej nie należy mieszać. Publiczny opis nie pozwolił potwierdzić obecnego algorytmu oleju, skuteczności korekt ani dokładności na polskich daniach. Historyczne studium Baidu dokumentuje integrację rozpoznawania potraw i OCR; nie dowodzi obecnej architektury aplikacji. [Boohee](https://www.iboohee.com/), [Baidu × Boohee](https://cloud.baidu.com/aicustomer/boohee).

Huawei Health w chińskim FAQ jawnie opisuje mylenie wizualnie podobnych dań, gorsze rozpoznanie wielu produktów naraz i błąd porcji bez punktu odniesienia. Zmiana rozpoznanej nazwy wybiera odpowiednie dane z bazy; ilość można poprawić. [Huawei](https://consumer.huawei.com/cn/support/content/zh-cn16080608/).

Mniejsze 吃有数 deklaruje zdjęcie przed/po dla resztek oraz kontekst oleju i sposobu przygotowania. To ciekawy wzorzec opcjonalnego wejścia, bez znalezionej niezależnej walidacji. [吃有数](https://chiyoushu.com/).

**Do Sparky:** lokalna semantyka potraw i jawne założenia o obróbce. Nie ma dowodu, że niewidoczny tłuszcz da się niezawodnie odczytać ze zdjęcia.

## Sparky: co już jest, czego brakuje i gdzie wynik nie dociera do użytkownika

### Inwentarz istniejących możliwości

| Obszar | Potwierdzone w źródłach Sparky | Ocena |
|---|---|---|
| Dodawanie | Tekst i zdjęcie w MealComposer, skaner kodu, OCR etykiety, wyszukiwanie prywatne i jawnie uruchamiane zewnętrzne | Zachować jeden edytor i jeden wynik; nie budować kolejnego loggera. |
| Szybkie ponowienie | Ostatnie produkty, ulubione, kopiowanie posiłku/dnia, pamięć osobistych porcji | Rozbudowywać ich pochodzenie i semantykę ilości, zamiast dodawać równoległą „pamięć AI”. |
| Zdjęcia | Przygotowanie zdjęcia, analiza, zapis fotografii powiązanej z posiłkiem | Zapis zdjęcia i zapis spożycia są różnymi zdarzeniami; potrzebny czytelny status i sprzątanie osieroconych szkiców. |
| Parser | Nazwa/gramy → uzgodnienie z biblioteką, statycznymi referencjami i OFF → fallback LLM | Kierunek ugruntowania już istnieje. Potrzeba lepszych danych i identyfikacji, nie przebudowy od zera. |
| Audyt | Spójność energii/makro, proweniencja wybranych składników, kwarantanna i historia napraw | Fundament użyteczny, ale zgodność arytmetyczna nie dowodzi zgodności z prawdziwym posiłkiem. |
| Planowanie | Cele, profil, preferencje, plan posiłków, produkty do planu i lista zakupów | Plan jest deklaracją; nie może automatycznie stać się zjedzonym posiłkiem. |
| Kalibracja | Wspólna funkcja domenowa oraz blokada na brak kompletnych dni | Zachować blokadę. Dane kompletności są zbyt ubogie do gotowej osobistej adaptacji. |
| Kontekst | Dane ciała, treningu, regeneracji i medyczne w coachu | Cenne źródła kontekstu, nie automatyczna zgoda na zwiększanie dawek lub deficytu. |

Podstawa: [MealComposer](../../src/components/core/nutrition/MealComposer.tsx), [wyszukiwanie](../../src/components/core/nutrition/hooks/useFoodEntrySearch.ts), [etykieta](../../src/lib/health/foodLabelScan.ts), [parser](../../supabase/functions/_shared/foodParseCore.ts), [cele i coach](../../supabase/functions/vanguard-nutrition-coach/nutritionCompute.ts), [plan posiłków](../../src/lib/health/mealPlanApi.ts).

### Najważniejsze ustalenia z kodu i schematu

Poniższe pozycje są obserwacjami z odczytu. Nie wszystkie zostały odtworzone w żywym UI; weryfikacja wdrożenia jest kryterium późniejszego odbioru.

**Kompletność dnia ma odbiorców, ale nie odnaleziono aktywnego zapisu przez użytkownika.** Tabela nutrition_day_reviews oraz jej odczyty istnieją w analityce i coachu. W sprawdzonych źródłach aplikacji i Edge Functions nie znaleziono ścieżki INSERT/UPDATE ani wywołania RPC zapisującego tę decyzję. To ważniejszy problem od nowego algorytmu TDEE: nawet poprawny estymator nie otrzymuje sygnału, którego wymaga. Nie wolno automatycznie uznać całej historii za kompletną. [Kalibracja](../../packages/domain/src/training/nutritionCalibration.ts), [odczyt reviews](../../src/lib/health/nutritionTrackerApi.ts), [schemat i RLS](../../supabase/migrations/20260809145537_nutrition_adaptive_tracker.sql).

**Doprecyzowanie zdjęcia jest częściowo niepodłączone.** GuidedMealReview i selectGuidedQuestions istnieją, ale wyszukiwanie odwołań poza definicjami i testami nie wykazało aktywnych konsumentów. Obecna ścieżka useMealComposerCapture przekazuje do szkicu draft.items; nie konsumuje pytań i przedziału analizy tym istniejącym komponentem. Nie opisujemy więc tej funkcji jako w pełni działającego prowadzonego przeglądu. [Capture](../../src/components/core/nutrition/hooks/useMealComposerCapture.ts), [niewykorzystany przegląd](../../src/components/core/nutrition/GuidedMealReview.tsx), [wybór pytań](../../src/lib/health/nutritionTracker.ts).

**„Co zjeść dalej” ma funkcję rankingu bez aktywnego wywołania.** rankMealMemoriesForGap jest zdefiniowane, ale nie odnaleziono użycia produkcyjnego. Szybkie chipy i zwykłe kopiowanie działają inną ścieżką. Wpięcie tej funkcji w aktualny ekran jest kandydatem o większej wartości niż kolejny generator planów. [Ranking](../../src/lib/health/nutritionTracker.ts), [szybkie wejście](../../src/components/core/nutrition/MealComposerQuick.tsx).

**Masa znana w parserze ginie jako typ danych dziennika.** daily_food_entries ma tekstowe amount, a nie dedykowane pole masy liczbowej. Gramy są obecne w payloadach i pamięci posiłku, więc nie oznacza to, że system nigdy ich nie znał. Przy kopiowaniu parseAmountGrams odczytuje pierwszą liczbę z tekstu; np. „1 porcja” jest interpretowana jak masa liczbowa, chociaż to inny rodzaj ilości. Historycznej masy nie odtwarzamy z samej liczby. [Schemat w migawce](./food-trackers-audit.json), [kopiowanie i przeliczanie](../../src/lib/health/mealComposerUtils.ts).

**Jawne gramy nie oznaczają ważenia.** foodBaseToDraft ustawia explicitGrams również dla gramatury podsuniętej z domyślnej porcji. user_portions przechowuje ostatnią ilość per nazwa, nie pary „szacunek przed korektą → rzeczywisty pomiar”. Potrzeba rozdzielić masę wpisaną, zapamiętaną, domyślną, oszacowaną i zważoną. [Tworzenie szkicu](../../src/lib/health/mealComposerUtils.ts), [porcje osobiste](../../src/lib/health/userPortionsApi.ts).

**Identyfikacja produktu ulega spłaszczeniu.** buildCaptureItems wpisuje brand i barcode jako null. Nawet gdy kod pomaga odnaleźć produkt, ta ścieżka nie zachowuje jego identyfikatora w payloadzie. OCR etykiety jest w macroSource mapowany do off mimo innego dataSource. To utrudnia późniejszą odpowiedź „skąd dokładnie wzięły się te liczby?”. [Payload capture](../../src/lib/health/nutritionTrackerApi.ts), [mapowanie źródeł](../../src/lib/health/mealComposerUtils.ts).

**Biblioteka nie jest niezależnym dowodem jakości.** searchPrivateFoodLibrary wybiera dane bez odczytania źródła i zwraca source=confirmed. Historia zawiera znaczący udział importowanych danych; zapis w prywatnej bibliotece nie podnosi ich automatycznie do pomiaru. W innych ścieżkach macroSource bywa zachowywane poprawniej, więc problemem jest niespójność, nie całkowity brak proweniencji. [Prywatne wyszukiwanie](../../src/lib/health/foodSearch.ts), [zaufanie](../../src/lib/health/foodTrust.ts), [migawka źródeł](./food-trackers-audit.json).

**Procenty niepewności są heurystyką.** foodTrust używa stałych zależnych od źródła i sposobu wejścia; składanie błędów przez hypot zakłada niezależność, której nie zweryfikowano. nutritionAudit sumuje rozstępy dnia i nadaje jakościowe etykiety na podstawie reguł. To może być wskaźnik do triage, ale nie skalibrowany przedział prawdopodobieństwa ani dowód „bardzo pewnych danych”. [Heurystyki](../../src/lib/health/foodTrust.ts), [audyt dnia](../../src/lib/health/nutritionAudit.ts).

**Tabela referencyjna i parser mają różne źródła.** reconcile importuje lookupReferencePl ze statycznej tablicy TS. Tabela food_reference_pl jest czytana przez planowanie. Komentarz „PZH-style” w kodzie nie dowodzi, że wartości pochodzą z licencjonowanej bazy PZH. Każda obecna pozycja wymaga rzeczywistego source record, zanim oznaczymy ją jako dane PZH. [Referencje TS](../../supabase/functions/_shared/foodReferencePl.ts), [uzgadnianie](../../supabase/functions/_shared/foodParse/reconcile.ts), [katalog planowania](../../src/lib/health/mealPlanApi.ts).

**Ścieżki OFF różnią się zachowaniem.** lookup-food ma nowszy serwer wyszukiwania, identyfikujący User-Agent i osobne mapowanie produktu; reconcile korzysta z CGI i ogólnego User-Agent. Różnią się też obsługą braków makro, soli i nasyconych. lookupOffFast zamienia niektóre brakujące makro na zero, a wynik dopasowania może otrzymać wysoką pewność. Należy współdzielić klienta i normalizację, zachowując null. Samo użycie starszego endpointu nie dowodzi awarii, a wspólny hosting nie dowodzi faktycznej blokady IP — tego nie zmierzono. [lookup-food](../../supabase/functions/lookup-food/index.ts), [reconcile](../../supabase/functions/_shared/foodParse/reconcile.ts).

**Nie ma pełnego kontraktu ml ↔ g.** lookup-food interpretuje liczby serving_quantity/quantity jako domyślne gramy także dla ml, a szybki parser traktuje ml jak masę bez gęstości. Dla danych per 100 ml można liczyć objętością; przeliczanie na masę wymaga gęstości lub pomiaru. [Adapter OFF](../../supabase/functions/lookup-food/index.ts), [szybki parser](../../supabase/functions/_shared/foodParseCore.ts).

**„Domowe” obniża energię bez dowodu receptury.** applyHomemadeAdjustment zmienia tłuszcz/cukier w szacunkach LLM po rozpoznaniu kontekstu domowego. Gdy domowa receptura jest bardziej tłusta, mechanizm wprowadza błąd w przewidywalnym kierunku. Również stałe proporcje rozbijania dań złożonych są założeniami, a nie pomiarami. [Korekta domowa](../../supabase/functions/_shared/foodParse/matching.ts), [rozbijanie dań](../../supabase/functions/_shared/foodParse/reconcile.ts).

**Telegram nadal ma osobną semantykę zapisu posiłku.** foodMeal zapisuje pozycje pętlą add_food_entry, po błędzie pomija pozycję i może usunąć pending przed pełnym sukcesem. Interfejs aplikacji korzysta z confirm_nutrition_meal_capture. Ponowienie po utracie odpowiedzi musi używać stabilnego identyfikatora; nowe losowe ID nie gwarantuje idempotencji. To są już tematy istniejącego backlogu. [Telegram foodMeal](../../supabase/functions/vanguard-telegram/_handlers/foodMeal.ts), [capture aplikacji](../../src/lib/health/nutritionTrackerApi.ts).

**Budżet tygodnia może pokazywać pozornie wolne kalorie.** computeWeekBalance podstawia zero przy brakujących dniach i oblicza pozostały budżet; raportuje missingDays, lecz sama arytmetyka nie używa kompletności. Niepełny dzień z kilkoma wpisami również nie jest tym samym co pełny. Odbiór powinien wymagać wstrzymania wiążącego „zostało do zjedzenia”, dopóki zakres nie jest kompletny. [Bilans tygodnia](../../src/lib/health/weekBalance.ts).

### Co te luki znaczą dla Ciebie

Większa baza może poprawić dobór produktów, ale nie naprawi błędnego mnożnika porcji, zgubionego identyfikatora, częściowego zapisu ani braku kolacji w dzienniku. Priorytetem jest ścieżka od Twojej intencji do poprawnego, widocznego wpisu i jego późniejszej korekty. To zastosowanie konstytucyjnej zasady ostatniej mili, nie argument za rezygnacją z ambitnych funkcji.

## Dane referencyjne i normalizacja

### Dobór źródła zależy od rodzaju jedzenia

| Przypadek | Pierwszy kandydat | Potrzebna kontrola |
|---|---|---|
| Dokładnie znane opakowanie | Właściwa etykieta/kod, kraj i receptura; następnie potwierdzony snapshot prywatny | Masa zjedzona, dane na 100 g/ml, data źródła i kompletność. |
| Prosty produkt bez marki | Dopasowana tabela składu z odpowiednim stanem przygotowania | Część jadalna, odmiana, metoda przygotowania; brak ślepej zamiany surowy/gotowany. |
| Twój domowy posiłek | Własna wersjonowana receptura z ważeniem całości i porcji | Woda, dodany/usunięty tłuszcz, wywar/resztki i liczba porcji. |
| Znana polska sieć restauracyjna | Aktualna oficjalna polska pozycja menu | Wariant, rozmiar, sos i napój; publikowana porcja jest wartością typową. |
| Nieznane danie restauracyjne | Edytowalna estymacja z jawnym składem i pytaniem o istotną niewiadomą | Nie podnosić źródła do „zmierzone” przez samo zatwierdzenie. |
| Produkt lub składnik niepasujący do źródeł | Jawne unknown albo oszacowanie z opisem zamiennika | Brak trafnego dopasowania jest lepszy niż fałszywa precyzja. |

To proponowana polityka Sparky. Nie ma jednej drabiny, w której dowolna analiza laboratoryjna wygrywa z prawidłową etykietą konkretnego produktu.

### USDA FoodData Central

FDC rozdziela Foundation Foods, FNDDS, Branded Foods, SR Legacy i dane eksperymentalne. Foundation dotyczy produktów podstawowych z analizami i metadanymi, FNDDS — produktów/porcji do badań spożycia, Branded — przede wszystkim etykiet, a SR Legacy jest historycznym wydaniem. Nie wolno wszystkich rekordów nazywać laboratoryjnymi. Dane są public domain/CC0; API i pliki do pobrania mają różne koszty operacyjne, nie odrębne „poziomy prawdziwości”. [Typy danych](https://fdc.nal.usda.gov/data-documentation/), [API i licencja](https://fdc.nal.usda.gov/api-guide/).

**Decyzja:** zacząć od dopasowanego katalogu referencyjnego Foundation/SR/FNDDS i miar domowych, z oryginalnymi ID, jednostkami i metadanymi. Nie importować całego Branded ani materiałów eksperymentalnych tylko po to, by powiększyć licznik rekordów. Dostępność pobrania nie czyni importu semantycznie bezproblemowym.

W danych amerykańskich „carbohydrate by difference” może obejmować błonnik; nie jest to automatycznie ten sam kontrakt co węglowodany na polskiej etykiecie. Potrzebne jest zachowanie definicji, nie wyłącznie identycznej nazwy pola. [Dokumentacja Foundation](https://fdc.nal.usda.gov/docs/Foundation_Foods_Documentation_Apr2024.pdf).

### Open Food Facts

OFF jest przydatne dla kodów i opakowań, lecz rekord społecznościowy wymaga kontroli dopasowania i kompletności. Aktualne limity, format User-Agent i zakaz search-as-you-type są w dokumentacji dostawcy; nie należy kopiować limitów do kodu bez ponownej kontroli. Obecny interfejs Sparky słusznie używa lokalnych podpowiedzi, a wyszukiwanie zewnętrzne uruchamia oddzielnie. [Dokumentacja API](https://openfoodfacts.github.io/openfoodfacts-server/api/).

**Decyzja:** jeden klient OFF dla parsera i wyszukiwarki, wspólny mapper, cache wybranych produktów, ograniczone ponowienia, rozróżnienie „nie znaleziono”, „brak danych” i „usługa niedostępna”. Duży światowy dump nie jest domyślnym rozwiązaniem dla jednego użytkownika.

Baza ma ODbL, treści rekordów DbCL, fotografie CC BY-SA; licencja klienta SDK tego nie zmienia. Prywatny dziennik i zewnętrzny katalog trzeba rozdzielić, a obowiązki zależą od tego, czy powstaje i jest publicznie używana baza pochodna. Nie wynika stąd automatyczna publikacja Twoich osobistych zapisów. [Licencje OFF](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/), [ODbL](https://opendatacommons.org/licenses/odbl/1-0/).

Nie zmierzono pokrycia polskiego rynku. Liczba produktów z tagiem Poland ani poprawny wynik dla kilku popularnych kodów nie wystarcza. Użyteczne pokrycie mierzymy na rzeczywistym koszyku Jakuba: trafny produkt, aktualna etykieta, kompletne kluczowe pola i czas korekty.

### PZH/IŻŻ oraz normy żywienia

Pełna polska baza składu jest oferowana jako XLSX na umowie licencyjnej. Warunki hostingu w Supabase, kopii zapasowych, modyfikacji i ewentualnej publikacji trzeba znać przed zakupem/importem; nie ustalono ich z licencjodawcą i nie wysyłano zapytania. [Oferta PZH](https://www.pzh.gov.pl/uslugi/tabele-wartosci-odzywczej-produktow/baza-danych-wersja-pelna/).

Normy żywienia opisują potrzeby grup populacyjnych i rodzaje wartości referencyjnych. Są innym zasobem niż skład produktów. RDA/AI/EAR/UL nie są zamiennymi celami, a brak osiągnięcia wartości w niepełnym dzienniku nie diagnozuje niedoboru. [Normy PZH](https://www.pzh.gov.pl/normy-zywienia-2024/), [EFSA: znaczenie DRV](https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values).

**Decyzja:** otwarte źródła i własne dane pozwalają ruszyć bez oczekiwania na umowę PZH. Zakup PZH warto ocenić, jeżeli analiza Twojego koszyka wykaże luki w polskich potrawach, które ta baza rzeczywiście pokrywa.

### Komercyjne API: kandydaci do pilota, nie zakup w ciemno

| Dostawca | Zweryfikowane zastosowanie / ograniczenie | Decyzja |
|---|---|---|
| fatsecret Platform | Dokumentuje lokalizację region=PL/language=pl, z dostępem zależnym od konta/pakietu. Sama obecność parametru nie dowodzi kompletności Twoich marek. [Lokalizacja](https://platform.fatsecret.com/docs/guides/localization), [produkt API](https://platform.fatsecret.com/platform-api) | Dobry kandydat do małego pilota polskiego koszyka; wymaga dostępu, warunków cache/eksportu i pomiaru. |
| Edamam | Rozdziela produkty ogólne, opakowane, dania i miary; cache jest dostępny na wybranych planach, a MCP ma inne ograniczenia. [Dokumentacja](https://developer.edamam.com/food-database-api-docs), [warunki cache API/MCP](https://www.edamam.com/blog/2026/09/16/food-database-api-vs-food-mcp/) | Nie zakładać prawa do trwałego zrzutu odpowiedzi. Brak dowodu, że rozwiąże polskie etykiety lepiej niż obecne źródła. |
| Nutritionix / NCCDB | To źródła używane przez inne produkty, ale ich obecność w Cronometerze nie daje Sparky sublicencji ani potwierdzonego dostępu. [Źródła Cronometera](https://support.cronometer.com/hc/en-us/articles/360018239472-Data-Sources) | Nie wybierać bez oferty dostępu i pilota. Nie zweryfikowano tu indywidualnego kontraktu ani polskiego pokrycia. |

Brak limitu budżetu nie uzasadnia równoległego utrzymywania wszystkich baz. Najpierw wspólny zestaw zapytań i pomiar zysku względem istniejącej integracji.

### Oficjalne polskie menu restauracji

Bieżąca strona McDonald’s PL prowadzi do aktualnie publikowanej tabeli; KFC PL udostępnia tabelę wartości odżywczych i alergenów oraz osobny wykaz składników. Nie należy używać starego, wysoko pozycjonowanego PDF zamiast aktualnego odsyłacza producenta. W tej sesji aktualny plik McDonald’s nie został odczytany, a pobieranie aktualnego PDF KFC kończyło się timeoutem; nie importowano żadnych wartości. [McDonald’s PL](https://mcdonalds.pl/zamow-i-odbierz-tabela-wartosci-odzywczych/), [KFC PL](https://kfc.pl/kcal-wartosci-odzywcze-alergeny-skladniki).

**Decyzja:** snapshot konkretnej polskiej pozycji z URL, datą publikacji/odczytu i jednostką. Zestaw rozbić na elementy. Zmiana menu tworzy nową wersję katalogu, nie przepisuje dawnych wpisów. Publicznie dostępna tabela nie jest automatycznie otwartą licencją na redystrybucję.

### Jednostki i energia: warunek przed importem

Unijna deklaracja energii nie ogranicza się do 4/4/9: uwzględnia m.in. błonnik, poliole, alkohol i odrębnie erytrytol. Polska etykieta może być prawidłowa mimo rozjazdu z uproszczonym wzorem. [Rozporządzenie 1169/2011, załączniki XIV–XV](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32011R1169).

W Sparky assessEnergyConsistency ma tolerancję i wyjątek alkoholowy; enforceMacroMath przelicza szacunki LLM z podstawowych makro. To kontrola błędów, nie dowód energii metabolizowalnej. Nie wolno automatycznie „naprawiać” prawidłowych etykiet tylko dlatego, że różnią się od tego wzoru. [Walidacja energii](../../packages/domain/src/health/foodEnergy.ts), [przeliczanie LLM](../../supabase/functions/_shared/foodParse/normalize.ts).

Kontrakt importu powinien zachować podstawę 100 g/100 ml/porcja, definicję węglowodanów, sól versus sód, g/mg/µg, stan przygotowania i brakujące wartości. Mapa nutrient ID i jednostek wymaga walidacji na próbkach źródła. Dopiero potem można składać szeroki panel witamin i minerałów. USDA osobno wyjaśnia, że brak wartości oznacza brak danych, a etykietowe zero może wynikać z zaokrąglenia. [Interpretacja braków w Branded Foods](https://fdc.nal.usda.gov/GBFPD_Documentation/#bkmk-7).

## Co wynika z badań, a czego nie wolno z nich wywnioskować

### DietAI24: architektura jest dobrym wzorcem, procent poprawy nie jest obietnicą

DietAI24 łączy multimodalny model z odszukiwaniem produktu i porcji w FNDDS oraz obliczeniem składników. Raportowana redukcja MAE o 63% dotyczy porównań konkretnego badania; nie oznacza 63% dokładności ani błędu dowolnego polskiego obiadu. Wyliczanie 65 składników nie jest ich pomiarem ze zdjęcia ani pełną walidacją laboratoryjną.

Autorzy wskazują ograniczenia kontrolowanych fotografii ASA24, amerykańskich stołówek Nutrition5k, dań mieszanych, nieobecnych regionalnych produktów i propagacji błędu porcji. Badano określone modele GPT, więc nie przenosimy wyniku na obecny pipeline Gemini/DeepSeek. Nature i PMC publikują ten sam artykuł, nie dwie niezależne walidacje. Bezpośrednie pobieranie bywało blokowane; dostępne były indeksowane fragmenty źródła pierwotnego. [Artykuł i metody](https://www.nature.com/articles/s43856-025-01159-0), [ta sama publikacja w PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12589391/).

**Wniosek projektowy:** powtórzyć rozdzielenie identyfikacji, porcji i obliczeń. Skuteczność ocenić lokalnie.

### Nutrition5k: ważone składniki, nie „aparat lepszy od dietetyka we wszystkim”

Zbiór obejmuje talerze ze stołówek z masami składników, obrazami/wideo i częściowo głębią. Dane odżywcze są adnotacjami opartymi na składnikach i danych USDA, a nie analizą chemiczną każdego talerza. Oryginalny test ludzi dotyczył wizualnego szacowania porcji na niewielkim zestawie obrazów; nie odpowiada pracy dietetyka dysponującego recepturą i wagą. [CVPR: publikacja pierwotna](https://openaccess.thecvf.com/content/CVPR2021/html/Thames_Nutrition5k_Towards_Automatic_Nutritional_Understanding_of_Generic_Food_CVPR_2021_paper.html), [sekcja porównania ludzi](https://openaccess.thecvf.com/content/CVPR2021/papers/Thames_Nutrition5k_Towards_Automatic_Nutritional_Understanding_of_Generic_Food_CVPR_2021_paper.pdf).

Powiązane skany danego talerza trzeba trzymać w tym samym podziale train/test. Własny test polskich dań pozostaje konieczny. Nie pobieramy całego zbioru automatycznie, skoro do pierwszej regresji wystarczy dobrana próbka. [Dokumentacja zbioru](https://github.com/google-research-datasets/Nutrition5k/blob/main/README.md).

### Obecne modele nadal mylą rozpoznanie z ilością

Porównanie VLM opublikowane w Current Research in Food Science opisuje, że rozpoznawanie głównych składników nie usuwa dużych błędów wartości odżywczych. Dodatkowy widok zwiększa widoczność części składników, ale nie daje dostępu do ukrytej receptury. Wyniki dotyczą badanych modeli i Nutrition5k, nie uniwersalnego rankingu aktualnych usług. [Wang i współautorzy: badanie pierwotne](https://pmc.ncbi.nlm.nih.gov/articles/PMC13092701/).

W walidacji rejestracji obrazowej SNAQ wykorzystano porównanie z podwójnie znakowaną wodą, a protokół uwzględniał poprawki i resztki. Oceniano cały proces rejestracji, nie tylko estetyczne rozpoznanie jednego zdjęcia. To argument za osobnym mierzeniem kompletności dziennika. [Walidacja SNAQ](https://pmc.ncbi.nlm.nih.gov/articles/PMC10556674/).

Badanie dzienniczków sportowców porównujące Cronometer i MyFitnessPal wspiera znaczenie kuracji źródeł, ale dotyczy starszych wersji, kanadyjskich danych i wpisów przygotowywanych przez oceniających. Nie bada dzisiejszego AI ani polskiego koszyka. [Morello i współautorzy](https://onlinelibrary.wiley.com/doi/10.1111/jhn.70148).

### Przepisy: masa końcowa i retencja to różne rzeczy

FAO/INFOODS oraz EuroFIR rozróżniają zgodność produktu, część jadalną, zmianę masy podczas obróbki oraz zmianę zawartości składników. Ugotowanie ryżu z wodą zmienia kcal na 100 g; odlanie tłuszczu albo wywaru może zmienić również sumę składników. Nie ma podstaw do jednego uniwersalnego przelicznika „surowy → ugotowany”. [FAO: dopasowanie produktów](https://www.fao.org/4/ap805e/ap805e.pdf), [EuroFIR: yield i retention](https://www.eurofir.org/report-on-collection-of-rules-on-use-of-recipe-calculation-procedures-including-the-use-of-yield-and-retention-factors-for-imputing-nutrient-values-for-composite-foods/).

**Decyzja dla Sparky:** najpierw rzeczywista masa końcowa i jawne dodatki/usunięcia. Modelowanie retencji witamin dopiero z odpowiednimi danymi; bez udawania, że sama utrata wody wymaga zmniejszenia całych makro.

### Adaptacyjna energia: model Halla nie naprawia braków logowania

Hall i współautorzy pokazują, że statyczna reguła około 7700 kcal na kilogram nie opisuje długoterminowej zmiany masy, ponieważ zmieniają się wydatek i skład traconej tkanki. Nie dowodzi to konieczności natychmiastowego wdrażania pełnego modelu fizjologicznego. [Hall i współautorzy](https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/), [podstawa Body Weight Planner i równania](https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner).

**Wniosek matematyczny, nie pomiar:** w przybliżeniu estymowany wydatek to zapisane spożycie pomniejszone o energię odpowiadającą zmianie zapasów ciała. Jeżeli systematycznie brakuje oleju lub przekąsek, estymowany wydatek spadnie. Z tej samej masy i tego samego błędnego dziennika nie da się jednoznacznie rozdzielić metabolizmu, niedologowania i retencji wody.

Obecny Sparky używa zmiany między krańcowymi pomiarami, a nie wygładzonej regresji całej serii. Najpierw potrzebuje kompletnych dni i pomiarów w rzeczywistym czasie, następnie porównania prostego trendu z bardziej złożonym modelem. [Implementacja domenowa](../../packages/domain/src/training/nutritionCalibration.ts). Zmiana pojedynczej stałej na filtr Kalmana nie daje automatycznie lepszej identyfikowalności.

### Glikemia, samopoczucie i badania laboratoryjne

Badanie Zeeviego i współautorów wskazuje różnice osobniczej odpowiedzi glikemicznej przy podobnych posiłkach, wykorzystując rzeczywiste pomiary glukozy i bogaty zestaw cech. Nie uzasadnia traktowania HRV lub senności jako zastępczego pomiaru glikemii. [Publikacja autorów w Cell](https://www.wisdom.weizmann.ac.il/~eran/zeevi_cell_2015.pdf).

**Decyzja:** bez glukozy Sparky może analizować deklarowane samopoczucie po posiłkach, z okresem, liczbą obserwacji i zmiennymi zakłócającymi. Nazywać to samopoczuciem. IG/ŁG z tabeli pozostaje estymacją populacyjną, nie osobistą krzywą ani dawką insuliny.

Wycofuję wcześniejszą rekomendację automatycznego podnoszenia celów składników z niskiej ferrytyny/D3/B12. Dziennik i wyniki badań mogą wspierać przegląd z klinicystą; nie dają prostego algorytmu „niski marker → wyższa dawka”. Docelowy moduł ma przechowywać zalecenie i jego źródło, a nie przepisywać suplementację. Rozróżnienie norm populacyjnych i potrzeb klinicznych jest opisane przez [EFSA](https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values).

### Nutri-Score i NOVA

Nutri-Score odnosi ocenę do 100 g/ml i wersji algorytmu, nie do całej zjedzonej porcji. Nie powinien być główną miarą jakości obiadu Jakuba. [Santé publique France](https://www.santepubliquefrance.fr/index.php/nutrition-et-activite-physique/nutri-score).

Odnaleziono pismo MZ z 24.09.2026 opisujące uzgodniony okres przejściowy wycofywania oznaczenia na produktach wytworzonych w Polsce: wprowadzanie do końca 2028, obrót do wyczerpania zapasów, najwyżej do końca 2030, z odrębnym traktowaniem odpowiednio oznakowanych produktów z innych państw UE. To dokument ministerialny udostępniony przez organizację branżową; nie przedstawiam go jako odnalezionej ustawy ani pełnej analizy obowiązywania prawa. [Pismo MZ, strona 2](https://mleczarstwopolskie.pl/wp-content/uploads/2026/09/Pismo-Ministerstw.pdf).

**Decyzja:** ewentualnie zachowywać ocenę produktu z jej pochodzeniem i wersją. NOVA bez wiarygodnego składu nie powinna być pewną diagnozą. Priorytet obu oznaczeń jest niższy niż poprawność ilości, receptury i dziennika.

## GitHub: gotowe elementy i pułapki

Sprawdzano istniejące repozytoria i ich pliki licencji, nie liczbę gwiazdek jako miarę jakości. Nie kopiowano kodu i nie uruchamiano importerów przeciwko Sparky.

| Repozytorium | Licencja / dowód | Co jest użyteczne | Warunek wykorzystania |
|---|---|---|---|
| OpenNutriTracker-Backend | [GPLv3](https://github.com/simonoppowa/OpenNutriTracker-Backend/blob/main/LICENSE) | Backend Supabase; model food/nutrient/portion/translation, konwerter USDA i walidacja danych źródłowych. [README i skrypty](https://github.com/simonoppowa/OpenNutriTracker-Backend/blob/main/README.md) | Najbliższy technicznie wzorzec. Nie przenosić całego schematu; uważać na operacje zastępowania katalogu i licencje danych wejściowych. |
| OpenNutriTracker | [GPLv3](https://github.com/simonoppowa/OpenNutriTracker/blob/main/LICENSE) | Prywatne przepisy, snapshoty, import/eksport i szybkie logowanie. [Repo](https://github.com/simonoppowa/OpenNutriTracker) | Flutter/Dart nie pasuje wprost do Reacta. Kalkulator upraszcza relację ml/g i sumowanie częściowo brakujących składników. |
| wger | [AGPLv3; README opisuje or later](https://github.com/wger-project/wger/blob/master/LICENSE.txt) | Normalizacja porcji i źródeł OFF, kJ/kcal, kontrola jakości. [Parser](https://github.com/wger-project/wger/blob/master/wger/nutrition/extract_info/off.py) | Duży produkt Django, nie gotowy moduł Sparky. Katalog danych ma własne warunki; nie dziedziczy automatycznie licencji kodu. |
| Oficjalny OFF JS/TS SDK | [Apache-2.0](https://github.com/openfoodfacts/openfoodfacts-js/blob/develop/LICENSE) | Typowany klient i odpowiedzi. [README](https://github.com/openfoodfacts/openfoodfacts-js/blob/develop/README.md) | Rozważyć tylko jeśli redukuje utrzymywany kod; sprawdzić konkretną wersję, fetch w Deno i używane endpointy. ODbL danych nadal obowiązuje. |
| NutriTrace | [AGPLv3](https://github.com/TraceApps/nutritrace/blob/main/LICENSE) | Przepływ propozycja→potwierdzenie, osobisty katalog, rozdzielenie as sold/as prepared. [Obsługa OFF](https://github.com/TraceApps/nutritrace/blob/main/src/lib/off-nutrition.js) | Nie traktować adaptive TDEE jako naukowo zwalidowanego silnika. |
| Nutrition5k | Dane CC BY 4.0 według [README](https://github.com/google-research-datasets/Nutrition5k/blob/main/README.md) | Zbiór regresji, podział powiązanych skanów, raportowanie błędu. [Skrypt metryk](https://github.com/google-research-datasets/Nutrition5k/blob/main/scripts/compute_eval_statistics.py) | Deklaracja licencji danych nie potwierdza automatycznie licencji całego kodu. Nie jest bazą polskich produktów. |
| DietAI24 | README deklaruje MIT, nie potwierdzono osobnego LICENSE w sprawdzonym katalogu. [Repo](https://github.com/Runz96/DietAI24) | Referencja ugruntowania modelu i eksperymentów; publikacja wskazuje także starszy adres Runz96/DietAI. | Przed kopiowaniem wyjaśnić zakres licencji. Nie przenosić promptów jako gwarancji aktualnej skuteczności. |

Dwie konkretne obserwacje pokazują, dlaczego trzeba audytować nawet pasujące repo:

- NutriTrace używa stałej energetycznej, heurystyki confidence i regresji po indeksie odfiltrowanych pomiarów. Przy lukach indeks może kompresować czas. To wynik przeglądu kodu, nie kompletnego audytu działania. [adaptive-tdee.js](https://github.com/TraceApps/nutritrace/blob/main/server/lib/adaptive-tdee.js).
- OpenNutriTracker dokumentuje naprawę wcześniej zapisanych błędów jednostek mikro. To argument za walidacją g/mg/µg i wersją snapshotu przed rozbudową panelu, a nie dowód, że jego importer jest bezbłędny. [Naprawa mikro](https://github.com/simonoppowa/OpenNutriTracker/blob/main/lib/core/utils/off_micronutrient_repair.dart).

GPL/AGPL nie oznacza zakazu prywatnego użycia. GPL dopuszcza prywatne modyfikacje; AGPL dodaje warunek udostępnienia źródła użytkownikom zdalnie korzystającym z objętej nim zmodyfikowanej aplikacji. Zakres skutków dla połączonego systemu zależy od sposobu integracji i udostępnienia. Nie kopiować kodu bez zrozumienia tego zakresu, ale też nie odrzucać licencji jako nielegalnej. [FAQ GNU](https://www.gnu.org/licenses/gpl-faq.en.html), [AGPL, sekcja 13](https://www.gnu.org/licenses/agpl-3.0.en.html).

**Wybór:** zacząć od przeglądu importera i kontraktu danych OpenNutriTracker-Backend oraz prostego wspólnego adaptera OFF. Żadne repo nie jest powodem do wymiany działającego backendu Sparky.

## Docelowe zachowanie modułu dla jednego użytkownika

Poniższa specyfikacja jest rekomendacją wynikającą z researchu. Nie stanowi jeszcze zaakceptowanego schematu migracji ani gotowej implementacji.

### Jeden wynik niezależnie od wejścia

Tekst, głos, kod, etykieta, foto, powtórzenie i przepis powinny tworzyć ten sam szkic pozycji. Każda pozycja zachowuje tożsamość produktu, rodzaj ilości, pochodzenie składu oraz założenia. Kod skaluje wartości, a korekta zmienia odpowiedni fragment szkicu. Zapis odbywa się istniejącym atomowym mechanizmem; inne ekrany i Telegram konsumują ten sam kontrakt.

Dla znanego produktu szybka ścieżka powinna omijać LLM. Przy „moje śniadanie, ale mniej płatków” najpierw odszukujemy własny wariant, potem zmieniamy płatki. Nie rozpoznajemy ponownie całego posiłku i nie nadpisujemy jego składników losowymi danymi ogólnymi.

Nie tworzymy kolejnego bota, drugiego klasyfikatora, osobnego silnika porad ani autonomicznych pingów. Rozszerzenia należą do istniejącego parse-food-nl, loggera, klienta danych i coacha. Nie ingerują w kanoniczny zapis friction/recovery.

### Tożsamość produktu i pochodzenie: oddzielne osie

| Informacja | Dlaczego jest potrzebna |
|---|---|
| Identyfikator źródła i produktu, region, marka/kod | Pozwala rozróżnić podobne nazwy i wrócić do właściwego rekordu. |
| Oryginalna definicja składu i podstawa: 100 g/100 ml/porcja | Zapobiega zmianie jednostki i błędnemu mnożnikowi. |
| Stan: surowy, ugotowany, odsączony, przygotowany, produkt sprzedawany | Ten sam produkt po obróbce nie ma tej samej gęstości. |
| Rodzaj wartości: analiza, etykieta, przepis, wyliczenie, estymacja | „Z bazy” jest zbyt ogólne. |
| Dopasowanie tożsamości | Dobra tabela błędnego produktu nadal daje błędny wpis. |
| Ilość, jednostka i metoda ustalenia porcji | Zważona porcja nie jest tym samym co domyślne 100 g albo standardowa łyżka. |
| Snapshot wartości i wersja receptury/źródła | Aktualizacja katalogu nie zmienia dawnego tygodnia. |
| Dla każdego składnika: wartość, jednostka, źródło, status braku | Pozwala sumować znane dane bez udawania kompletności. |
| Korekta użytkownika i zakres jej obowiązywania | Jednorazowe „dziś pół porcji” nie zmienia każdej przyszłej porcji. |

Nie wymaga to osobnego rozbudowanego frameworka. Najpierw rozszerzyć istniejące typy i zapis o brakujące informacje, bez drugiej kopii tego samego kontraktu. Wybór kolumn versus strukturalnego JSON wymaga obejrzenia istniejących RPC, migracji i konsumentów podczas implementacji.

W UI użytkownik powinien zobaczyć krótki, prawdziwy opis, np. „etykieta • porcja ważona” albo „typowy przepis • ilość ze zdjęcia”. To są dwa różne dowody. „Zatwierdziłem wpis” oznacza zgodę na zapis, a nie chemiczne potwierdzenie składu.

### Własne przepisy z rzeczywistą wydajnością

Przepisu nie zastępuje szablon gotowych pozycji. Potrzebne są składniki i ich snapshoty, gramatura jadalna, sposób przygotowania, końcowa masa dania oraz wersja receptury.

Przykład rachunkowy: garnek ma łącznie 1800 kcal i po gotowaniu waży 1500 g. Zjedzone 300 g daje 360 kcal. Odparowanie wody nie odejmuje energii całego garnka. Jeżeli część oleju lub wywaru została usunięta, to osobne założenie z własnym zakresem niepewności. To ilustracja obliczeń, nie dane o konkretnej potrawie Jakuba.

Edytowanie przepisu tworzy nową wersję na przyszłość. Historia pozostaje snapshotem; świadoma naprawa historycznego wpisu wymaga audytu i przeliczenia jego dnia. To samo dotyczy producenta zmieniającego skład produktu.

UI powinien umożliwiać logowanie w gramach gotowego dania, ułamku całości i znanej porcji. „Zjadłem połowę” oznacza połowę zdefiniowanej porcji lub opakowania, a nie domyślne pół ze 100 g bez widocznej podstawy.

### Zdjęcie oraz jedno wartościowe pytanie

Najpierw rozpoznać kandydatów, potem sprawdzić, co najbardziej zmieni wynik. Pytanie o sos lub stan ryżu może dać więcej niż pytanie o kilka gramów warzyw.

Zasady:

- Dodatki niewidoczne są hipotezą. Nie dopisujemy automatycznie oleju jako faktu.
- Gotowy profil smażonej potrawy albo własny przepis może już zawierać olej. Dodanie drugiej pozycji „tłuszcz kulinarny” nie może liczyć go ponownie.
- Pytanie ma opcję „nie wiem”. Odpowiedź nieznana zachowuje przedział/etykietę estymacji, zamiast wymuszać fałszywą dokładność.
- Osobno można poprawić produkt, stan, ilość i dodatki. Zmiana ilości skaluje skład, a zmiana produktu wybiera właściwy profil.
- Korekta „bez sosu” nie jest skalowaniem wszystkich makro całego dania.
- Zdjęcie resztek lub dodatkowy kąt są opcjonalne, gdy rozwiązują konkretny problem.
- Istniejący mechanizm guided questions należy najpierw podłączyć i zmierzyć, dopiero potem oceniać, czy potrzebuje nowego modelu.

Nie należy uzasadniać automatycznego zapisu samym confidence=high zwróconym przez model lub znalezieniem podobnej nazwy. Szybki zapis znanego własnego posiłku i zatwierdzenie nieznanej restauracyjnej estymacji mogą mieć różne reguły, ale oba muszą pozwalać łatwo cofnąć zapis.

### Pamięć osobista bez samopotwierdzania błędów

Obecne user_portions jest dobrym miejscem startowym. Uczenie wymaga jednak rozróżnienia preferencji porcji od pomiaru błędu.

- „Zwykle jem 200 g” to osobisty domyślny wybór.
- „Model oszacował 150 g, potem zważyłem 210 g” to para do oceny estymatora.
- „Potwierdziłem bez ważenia” nie jest etykietą ground truth.
- „Dziś mniej, bo zostało na talerzu” to zmiana konkretnego spożycia.
- „Ten wariant gulaszu ma inną recepturę” tworzy nowy wariant, nie ogólny bias nazwy „gulasz”.

Korekty statystyczne włączać dopiero po powtarzalnych parach pomiarowych, z jawnym N, rozrzutem, kontekstem oraz prostym wyłączeniem. Nie uczyć procentowej poprawki z historii różniącej się daniami, ani nie pozwalać, żeby szacunki modelu stały się własnymi „prawdziwymi” etykietami treningowymi.

### Kompletność dnia i następny ruch

Na istniejącym ekranie Jedzenie potrzebna jest prosta decyzja „dzień kompletny / jeszcze brakuje”. Potwierdzony post i pełny dzień oszacowany powinny mieć jawne znaczenie; na początku można zachować obecne enum i dopisać uzasadnienie zamiast od razu mnożyć stany w bazie.

Pełny dzień oznacza kompletność rejestracji, nie precyzję każdego składnika. Te dwie oceny muszą być osobne. Edycja po zamknięciu wymaga spójnej aktualizacji daty/przeglądu i agregatu.

Propozycja kolejnego posiłku powinna wykorzystywać obecny ranking pamięci, cele i preferencje. Przykład działania: pokazanie kilku znanych opcji, które pasują do pozostałego białka/energii, z możliwością zmiany porcji i przyciskiem przeniesienia do tego samego edytora. Alergie i wykluczenia muszą obowiązywać przed rankingiem. Czas przygotowania, dostępność i tolerancje mają sens dopiero wtedy, gdy są zapisane, a nie zgadywane przez model.

W dniu częściowym można proponować zwykły posiłek, ale nie twierdzić z pewnością, że została dokładnie określona ilość kalorii do zjedzenia. Zakupy i plan pozostają planem do czasu świadomego logowania spożycia.

### Adaptacja: czytelny stan i możliwość cofnięcia

Docelowy ekran adaptacji powinien pokazywać zakres danych, liczbę kompletnych dni, aktualność ważeń, trend, źródło estymacji oraz stan „zbieram / aktualizuję / podtrzymuję poprzednią wartość”.

Zacząć od prostego, odpornego trendu po rzeczywistych datach. Porównać go poza próbą dopasowania z obecną metodą krańcowych ważeń. Dopiero gdy model dynamiczny wnosi mierzalny zysk, rozważyć dodatkowe stany fizjologiczne. Bez wiarygodnego dziennika nie interpretować rozjazdu jako „wolnego metabolizmu”.

Cel powinien uwzględniać aktywny cel Jakuba i istniejące ograniczenia treningu/regeneracji. Ten sam wysiłek ma jeden wpływ na energię; nie dodajemy kalorii z aktywności ponownie, jeżeli bazowy wydatek już je zawiera. Zmiana celu jest wyjaśniona, ograniczona i odwracalna, a deklarowane cele pozostają pod kontrolą użytkownika.

## Kolejność wdrożeń i warunki odbioru

To mapa decyzji do przyszłego wdrożenia. Przed rozpoczęciem odpowiednie pozycje należy związać z istniejącym BACKLOG.md, bez tworzenia drugiego backlogu badawczego.

| Priorytet / zależność | Zakres | Konsument i definicja odbioru | Wysiłek względny |
|---|---|---|---|
| P0: niezawodność zapisu | Wspólny atomowy zapis aplikacji i Telegrama, stabilny identyfikator ponowienia, korekta po ID | Utrata odpowiedzi i retry nie tworzą dubla; błąd jednej pozycji nie udaje sukcesu całego posiłku; szkic można odzyskać. Wykorzystać istniejące RPC i zgłoszenia backlogu. | Średni |
| P0: kompletność | Podłączyć zapis nutrition_day_reviews; niepełny tydzień nie tworzy pozornego budżetu | Użytkownik zamyka i otwiera dzień w UI, coach i statystyki widzą tę samą decyzję; dzień pusty nie staje się postem. | Mały–średni |
| P0: masa i identyfikacja | Jawna jednostka/metoda porcji, bezpieczne kopiowanie amount, zachowanie kodu/marki/źródła | „1 porcja” nie zamienia się w 1 g; 100 ml nie staje się automatycznie 100 g; domyślna masa nie jest ważeniem; kopia nie podnosi pewności. | Średni |
| P0: baseline | Mały, reprezentatywny zestaw ważonych własnych posiłków i pomiar obecnego pipeline’u | Wynik jest odtwarzalny; rozpoznanie, ilość, skład i tarcie raportowane osobno. Nie trzeba czekać na pełny zbiór, by naprawić deterministyczne błędy zapisu. | Średni, częściowo zależny od zbierania posiłków |
| P1 po kontrakcie źródeł | Jeden klient OFF i mapper, selektywny katalog FDC, prawdziwe źródła obecnych referencji | Ten sam produkt zachowuje ten sam skład i jednostki w wyszukiwaniu, parserze i planowaniu. UI pokazuje pochodzenie. Brak dopasowania pozostaje jawny. | Średni–duży |
| P1 po masie/źródłach | Prywatne wersjonowane przepisy i końcowa masa po gotowaniu | Twój obiad loguje się w gramach; zmiana receptury nie zmienia dawnych dni; olej nie liczy się dwa razy. | Średni |
| P1 po baseline | Podłączyć pytania zdjęciowe i korektę naturalnym językiem | Istotne pytanie zmniejsza błąd lub liczbę poprawek przy akceptowalnym czasie. Wynik trafia do istniejącego szkicu. | Średni |
| P1 po istniejącej pamięci | Następny posiłek, własne aliasy i ponowne użycie korekt | Propozycję da się zjeść i zapisać z obecnego ekranu; respektuje wykluczenia, nie stwarza drugiego planera. | Mały–średni |
| P2 po pokryciu danych | Profil witamin/minerałów i normy z właściwymi jednostkami | Dla każdego składnika suma znana i kompletność; brak nie staje się zerem; suplementy liczone oddzielnie; cele mają pochodzenie. | Duży |
| P2 po pełnych dniach i ważeniach | Adaptacyjna energia i uzasadniona korekta celu | Testy braków, retencji i przerw nie produkują pewnych diagnoz metabolizmu; holdout wykazuje poprawę nad prostym baseline. | Duży |
| Warunkowo | PZH, komercyjne API, menu sieci, CGM | Uruchamiać po wykazaniu rzeczywistej luki i uzyskaniu danych/licencji; po imporcie rezultat jest widoczny i mierzalny. | Zależny od dostępu |

Najpierw jakość i połączenie istniejących elementów. Nie należy zaczynać od fine-tuningu, nowego magazynu wektorowego ani importu wszystkiego. Wyszukiwanie hybrydowe z embeddingiem jest kandydatem dopiero wtedy, gdy zbiór niedopasowanych nazw pokazuje przewagę nad kodem, aliasami PL, wyszukiwaniem leksykalnym i istniejącymi indeksami.

## Benchmark dla Jakuba: jak uczciwie zmierzyć „najlepszy dla mnie”

### Dwa osobne pytania

**Czy przeliczamy poprawnie znany posiłek?** Test deterministyczny: jednostki, receptura, skalowanie, źródła, snapshoty, zapis i korekta.

**Czy dobrze odtwarzamy nieznany posiłek i całe spożycie?** Test empiryczny: rozpoznanie, niewidoczne składniki, porcja, resztki, opuszczone napoje i kompletność dnia.

Idealne 4/4/9 ani wysoka zgodność sumy dnia z bazą nie odpowiadają na drugie pytanie.

### Materiał i referencja

Zbierać naturalny koszyk użytkownika, a nie tylko łatwe, fotogeniczne talerze. Roboczy punkt startu to około 100 przypadków, lecz liczebność nie jest certyfikatem jakości: liczy się rozkład trudności, niezależność i niepewność wyniku.

Każdy przypadek powinien zawierać zdjęcie/opis dostępny parserowi, niezależny zapis składników i ich stanów, masy zważone przed korektą, końcową masę potrawy, ilość rzeczywiście spożytą, etykiety oraz opis braków. Restauracyjna wartość z oficjalnego menu ma inny status niż samodzielnie przygotowany i zważony przepis. Kalorie z etykiety lub tabeli są referencją porównania, nie laboratoryjną prawdą o energii wchłoniętej przez ciało.

Nie nadpisywać pierwotnej odpowiedzi po korekcie — potrzebne są obie. To pozwala rozdzielić zysk samego algorytmu od wkładu użytkownika.

### Przypadki, które muszą się pojawić

| Klasa | Przykład do testu | Błąd, który test ma ujawnić |
|---|---|---|
| Opakowanie | Skyr/twaróg, pół opakowania, zmiana receptury tej samej marki | Kod ≠ dowolny podobny produkt; 100 g ≠ całe opakowanie. |
| Jednostki UE | Napój w ml, oliwa, sól/sód, przecinek dziesiętny, energia kJ/kcal | Brak niejawnego ml=g i błędów jednostki. |
| Stan produktu | Ryż/makaron suchy i ugotowany | Ważenie musi pasować do profilu. |
| Domowy przepis | Garnek zupy, bigos lub gulasz, porcje z różnych dni | Masa po gotowaniu i wersja receptury. |
| Niewidoczne dodatki | Olej na patelni, dressing, masło, mleko w kawie | Czy pytanie ujawnia istotny składnik; brak podwójnego oleju. |
| Danie złożone | Pierogi o innym nadzieniu, schabowy z dodatkami, sałatka | Podobny obraz nie wystarcza do wyboru składu. |
| Restauracja | Polski zestaw z osobnym napojem i sosem | Rozmiary, region i aktualność menu. |
| Resztki | Niedopita zupa, pół talerza, niejadalna skórka/kość | Podana masa nie jest spożytą masą jadalną. |
| Historia | „1 porcja”, „2 sztuki”, powtórzenie dawnego wpisu | Brak fabrykowania gramów. |
| Braki danych | Nieznany błonnik/magnez, znane zero i etykietowe zero po zaokrągleniu | Unknown ≠ zero; częściowa suma jest częściowa. |
| Przerwa/awaria | Offline, dwuklik, ponowienie webhooka, utrata odpowiedzi | Jeden zamiar tworzy jeden posiłek, żadna część nie ginie. |
| Dzień/tydzień | Pusty dzień, niepełny dzień, potwierdzony post, przeniesienie daty przez północ | Braki nie zwiększają deficytu i nie zmieniają celu. |
| Adaptacja | Skok wody, długa przerwa w ważeniach, systematycznie pominięty olej | Stan „za mało dowodów”, zamiast pewnej zmiany metabolizmu. |

Nie zakładamy, że wszystkie przykłady odpowiadają Twoim preferencjom. Zastąpić je odpowiednikami z rzeczywistego koszyka; są klasami testów.

### Podział danych i porównania

Oddzielić zestaw do rozwoju od zamkniętego testu i późniejszych, prospektywnych posiłków. Powiązane zdjęcia, ta sama partia garnka i warianty tej samej etykiety nie mogą przeciekać między częściami jako niezależne przykłady. Dla personalizacji osobno badać powtarzalne własne dania i całkowicie nowe dania.

Porównywać na tych samych wejściach: obecny parser Sparky, proponowany wariant, prostą referencję bez LLM tam, gdzie wystarcza kod/przepis, oraz wynik po doprecyzowaniu przez użytkownika. Dodatkowo można wykonać test wybranej konkurencji, jeżeli jej regulamin pozwala i funkcja jest dostępna. API i ręczny UI nie są automatycznie tą samą wersją produktu.

Przy usługach niedeterministycznych rejestrować wersję modelu, prompt, datę, parametry, odpowiedź i powtórzenia. Stała temperatura nie gwarantuje niezmienności zewnętrznej usługi w kolejnych miesiącach.

### Metryki i decyzja o wdrożeniu

- **Tożsamość:** trafne dokładne dopasowanie, trafność pierwszych kandydatów, pominięte i dopisane składniki; osobno marka i stan przygotowania.
- **Porcja:** MAE i podpisany błąd w gramach/ml, osobno ważone, opisane, domyślne i foto. Nie mieszać objętości i masy.
- **Skład:** MAE kcal oraz białka/tłuszczu/węgli w gramach; mediana, ogon błędów i rozbicie po klasach. Procentowy błąd przy bardzo małej wartości wymaga osobnej interpretacji.
- **Kompletność:** pominięte składniki, napoje i całe epizody jedzenia; to odrębny problem od dokładności sfotografowanego talerza.
- **Niepewność:** empiryczny udział referencji mieszczących się w deklarowanym zakresie i szerokość zakresu; sam szeroki przedział nie oznacza użyteczności.
- **Tarcie:** czas od zamiaru do poprawnego zapisu, liczba kliknięć/poprawek, odsetek porzuconych szkiców; osobno pierwszy wpis i ponowienie znanego posiłku.
- **Niezawodność:** utracone/dublowane wpisy, pełna zgodność wpisów i agregatu, spójność po edycji/usunięciu/zmianie daty.
- **Operacje:** opóźnienie typowe i wysoki percentyl, koszt jednego zaakceptowanego wpisu, zachowanie przy niedostępnym API.

Przed otwarciem końcowego holdoutu ustalić progi istotne dla Jakuba i brak dopuszczalnej regresji klas krytycznych. Nie dobierać progów po obejrzeniu wyników, nie wygrywać średniej kosztem rzadkich ogromnych pomyłek. W miarę możliwości raportować sparowane różnice i niepewność grupowaną po daniu/dniu, nie po niemal identycznych zdjęciach.

Przewaga „najlepszy dla mnie” będzie udowodniona, gdy Sparky daje mniej istotnych pomyłek, krótszy czas poprawnego zapisu i bardziej przydatne decyzje na Twoim naturalnym koszyku. Nie wymaga wygrania tabeli liczby funkcji.

## Co świadomie odkładamy

- Społeczności, rankingi, marketplace i rozbudowę dla wielu użytkowników.
- Fine-tuning bez niezależnych prawdziwych par pomiarowych.
- Globalny import wszystkiego i embeddingi bez wykazanej luki wyszukiwania.
- Automatyczne wsteczne „uwiarygodnienie” historii po podobnej nazwie.
- Automatyczne dawkowanie suplementów, diagnozy niedoborów i osobistą glikemię z HRV/senności.
- Score zdrowia wyprowadzony ze zbyt ubogiego albo niepełnego profilu.
- Obowiązkowe zdjęcie przed i po każdym jedzeniu.
- Reimplementację funkcji już dostępnych w loggerze, zanim domkniemy ich odbiór przez UI/Telegram.

Nie odkładamy ochrony przed utratą wpisu, błędnych jednostek, proweniencji i dostępności. Prywatne zdjęcia mogą być użyteczne do korekty; powinny mieć kontrolę użytkownika i rozróżnienie szkicu od posiłku, zamiast niejawnego, bezterminowego gromadzenia.

## Otwarte kwestie i granice rekomendacji

| Co pozostaje nieustalone | Jak to rozstrzygnąć | Czy blokuje wskazane pierwsze kroki |
|---|---|---|
| Faktyczna dokładność bieżącego Sparky i konkurencji u Jakuba | Własny sparowany benchmark i późniejsze naturalne dni | Nie blokuje napraw zapisu, jednostek i kompletności. Blokuje deklarację przewagi. |
| Pokrycie polskich kodów przez OFF/FDC/fatsecret | Koszyk rzeczywistych produktów i porównanie z etykietą; uprawniony pilot API | Nie blokuje wspólnego adaptera ani prywatnej biblioteki. |
| Pełna umowa i cena PZH dla prywatnego hostowanego narzędzia | Oferta licencjodawcy przed zakupem | Blokuje ten import, nie pozostałe źródła. |
| Aktualne komercyjne taryfy, cache, eksport, training rights | Warunki konkretnego planu w chwili pilota | Blokuje zależną od nich integrację, nie cały moduł. |
| Bieżące pliki tabel McDonald’s/KFC i prawa dalszego wykorzystania | Odczyt aktualnego pliku z oficjalnego linku oraz kontrola warunków | Nie wpisywać wartości ze starych kopii jako bieżących. |
| Parzystość lokalnych Edge Functions z wdrożeniem | Odczyt wdrożonych źródeł i testy kontraktu przed wdrażaniem zmian | Obserwacje kodu lokalnego nie zastępują tego testu. |
| Zachowanie na rzeczywistym Androidzie i po utracie sieci | Test na urządzeniu, również po ubiciu i wznowieniu aplikacji | Wymagane do odbioru loggera; nie wykonano w tym researchu. |
| Czy pełny model dynamiczny wnosi wartość | Porównanie poza próbą nad prostym trendem, po zebraniu kompletnych dni | Nie uzasadnia zaczynania od rozbudowanego estymatora. |
| Prawny stan oznakowania Nutri-Score poza odczytanym pismem | Aktualny komunikat organu/obowiązujące akty przed publikacją porady prawnej | Nie blokuje funkcji dziennika. |
| Wybór licencji fragmentu z GitHub | Przegląd konkretnego pliku, źródeł danych i sposobu integracji | Nie kopiować fragmentów z nieustalonymi warunkami. |

Research daje wystarczającą podstawę do wybrania pierwszych wdrożeń i odrzucenia błędnych założeń poprzedniego raportu. Pozostające pomiary są pracą walidacyjną, której nie da się uczciwie zastąpić kolejną stroną marketingową ani deklaracją pewności.
