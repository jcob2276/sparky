# Trackery żywności — wnioski dla Sparky

Materiał referencyjny do decyzji o loggerze, źródłach i walidacji; nie opis bieżącego wdrożenia ani drugi backlog. Zadania są w [BACKLOG.md](../../BACKLOG.md), właściciele danych w [SINGLE_SOURCE.md](../SINGLE_SOURCE.md).

**Wniosek:** przewaga Sparky wymaga wiarygodnego zapisu, własnych produktów/receptur i szybkiej korekty. Większa baza, aparat czy nowy model nie naprawią złej jednostki, niepełnego dnia i utraty wpisu. Kolejność zależności: zapis i kompletność → tożsamość/porcja/pochodzenie → pomiar jakości → ewentualne rozszerzenie katalogu i adaptacji.

**Decyzja użytkownika: app-only.** Dodawanie i korekta jedzenia pozostają w aplikacji. Telegram zachowuje suplementy, post i odczyt `/dieta`, bez loggera posiłków, OCR etykiet i potwierdzania zapisu. Historyczne wpisy pozostają; dawnego loggera nie odbudowujemy.

## Co jest dowodem

Research obejmował dokumentację producentów i źródeł danych, publikacje, repozytoria oraz lokalny kod Sparky i agregujące SELECT-y. [Migawka audytu](food-trackers-audit.json) zachowuje `client_date`, `code_commit`, oryginalne zapytanie, liczniki, źródła i metadane schematu. Nie zawiera treści posiłków ani identyfikatorów użytkownika; nie została tu zmieniona.

- Opis producenta potwierdza opisany mechanizm, nie jego dokładność. „Uczy się” i wielkość katalogu to deklaracje bez niezależnego pomiaru.
- Badanie dotyczy własnego protokołu, populacji, zbioru i wersji modelu. Artykuł na stronie wydawcy i jego kopia w PMC to jedno badanie.
- Lokalny kod/schemat nie dowodzą zgodności produkcji ani działania na telefonie. Ustalenia poniżej odnoszą się do migawki; przed naprawą trzeba sprawdzić obecny kod.
- Nie kupowano subskrypcji, nie testowano wszystkich aplikacji na urządzeniu ani na ważonych posiłkach Jakuba. Nie zmierzono laboratoryjnie spożycia/TDEE. Nie ma podstaw do rankingu „najdokładniejsza aplikacja” ani przewagi Sparky nad Fitatu.

## Mechanizmy warte zachowania

Poniższe odnośniki były podstawą researchu; dostępność i warunki usług wymagają ponownego sprawdzenia przed użyciem.

| Źródło | Użyteczna obserwacja i jej granica |
|---|---|
| MacroFactor | Oddziela realizację celu od kompletności dziennika; estymuje wydatek ze spożycia i trendu masy, a check-in sprawdza częściowe logi. To opis mechanizmu, nie niezależna walidacja TDEE. [Adherence neutrality](https://macrofactor.com/adherence-neutral/), [częściowe dni](https://help.macrofactorapp.com/en/articles/248-coaching-module-partial-logging). |
| MacroFactor / Cronometer | Końcowa masa ugotowanej całości ustala mianownik porcji; edycja receptury nie powinna zmieniać historii. Sama masa końcowa nie modeluje utraty witamin/usuniętego tłuszczu. [Przepisy](https://help.macrofactorapp.com/en/articles/223-tips-for-creating-recipes-for-dishes-comprised-of-multiple-servings), [snapshot historii](https://help.macrofactorapp.com/en/articles/240-does-editing-a-recipe-or-custom-food-item-affect-my-food-log-history), [surowe/gotowane](https://support.cronometer.com/hc/en-us/articles/4405155125012-Do-I-log-my-foods-raw-or-cooked). |
| Cronometer | Rozróżnia dane ogólne i marki z etykiet; rozpoznanie foto prowadzi do przeglądu produktu, porcji i dodatków. Propozycja niewidocznego oleju jest pytaniem o skład, nie pomiarem aparatem. [Źródła](https://support.cronometer.com/hc/en-us/articles/360018239472-Data-Sources), [Photo-Logging](https://support.cronometer.com/hc/en-us/articles/39013533811092-Mobile-Photo-Logging). |
| Fitatu | Dokumentowało foto/głos/tekst, wiązanie z bazą i zapamiętywanie częstych produktów/porcji; nie zmierzono skuteczności personalizacji. Sprzeczne starsze/nowe instrukcje galerii nie uzasadniają trwałego zakazu uploadu. [Pomoc AI](https://www.fitatu.com/pl/help/jakie-funkcje-ai-oferuje-aplikacja-fitatu/), [foto](https://www.fitatu.com/pl/help/czym-jest-funkcja-%22szacowanie-kalorii-ai-ze-zdjecia%22). |
| Asken / Calomiru | Korekta konkretnej pozycji, prywatna receptura, osobne OCR etykiety i ilość rzeczywiście zjedzona. Deklarowane uczenie oraz opcjonalny autozapis Asken nie dowodzą trafności ani właściwego domyślnego zachowania dla Sparky. [Asken foto](https://asken.tayori.com/q/s-faq/detail/904657/), [My Recipe](https://asken.tayori.com/q/s-faq/detail/904695/), [Calomiru OCR](https://support.calomeal.com/hc/ja/articles/21891546497561), [ilość/resztki](https://support.calomeal.com/hc/ja/articles/4416802992025). |
| Lifesum / MyFitnessPal | Korekta rozmową może zmieniać istniejący szkic zamiast parsować wszystko ponownie. W opisanej ścieżce głosowej MFP wymagany był angielski, bez My Foods/Recipes/Meals — samo istnienie głosu nie zapewnia polskich receptur. [Lifesum](https://help.lifesum.com/en/article/ai-tracking-how-does-it-work-15sw7rk/), [MFP głos](https://support.myfitnesspal.com/hc/en-us/articles/30332897072269-How-to-log-food-with-your-voice). |
| Lose It! / Carbon | Zegarkowy wydatek i trening nie mogą być dodane drugi raz; kompletność danych i wykonanie planu to różne oceny. [Calorie Bonus](https://loseit.zendesk.com/hc/en-us/p/caloriebonus), [Carbon check-in](https://help.joincarbon.com/en/articles/10338862-how-carbon-evaluates-your-progress-at-your-check-in). |
| Huawei / SnapCalorie | Podobne wizualnie dania, wiele składników, brak skali i ukryty olej pozostają trudne. Głębia pomaga geometrii, nie ujawnia receptury. [Ograniczenia Huawei](https://consumer.huawei.com/cn/support/content/zh-cn16080608/), [SnapCalorie FAQ](https://www3.snapcalorie.com/faq.html). |

Raport [Fitatu × Kantar](https://www.fitatu.com/blog/wp-content/uploads/Kantar_Fitatu_Zdrowie-w-erze-AI_raport_20260210_int.pdf) istnieje, ale bezpośredni odczyt pliku podczas researchu zwrócił 403. Nie odtworzono metodologii/wyników, więc nie jest podstawą globalnego rankingu ani porównania z aktualnym Sparky. Nie potwierdzono publicznego API do importu konsumenckich baz Fitatu/Asken/Calomiru.

## Audyt Sparky — obserwacje historyczne

Zakres kodu i moment odczytu wyznacza [JSON](food-trackers-audit.json). To tropy do sprawdzenia, **nie lista obecnych usterek**. Liczników i dawnych wyników nie kopiujemy z migawki do narracji.

| Obserwacja w badanym kodzie | Znaczenie / punkt sprawdzenia |
|---|---|
| Były już tekst/foto, kod kreskowy, OCR, prywatne wyszukiwanie, kopiowanie i pamięć porcji. | Nie budować ich duplikatów. Sprawdzić domknięcie w [MealComposer](../../src/components/core/nutrition/MealComposer.tsx). |
| Odbiorcy `nutrition_day_reviews` istnieli, ale nie odnaleziono aktywnego zapisu decyzji użytkownika. | Konsument sygnału nie dowodzi istnienia pisarza. Nie uznawać historii automatycznie za kompletną. [Kalibracja](../../packages/domain/src/training/nutritionCalibration.ts), [schemat](../../supabase/migrations/20260809145537_nutrition_adaptive_tracker.sql). |
| `GuidedMealReview`/`selectGuidedQuestions` i `rankMealMemoriesForGap` miały definicje/testy, bez znalezionego aktywnego konsumenta. Capture przekazywał `draft.items`, bez tego prowadzonego przeglądu. | Zanim tworzyć nowy model/planer, zweryfikować istniejące wpięcie: [capture](../../src/components/core/nutrition/hooks/useMealComposerCapture.ts), [ranking/pytania](../../src/lib/health/nutritionTracker.ts). |
| Dziennik miał tekstowe `amount`; kopiowanie czytało pierwszą liczbę także z „1 porcja”. `explicitGrams` obejmowało też masę domyślną; `user_portions` przechowywało ostatnią porcję, nie parę estymata→ważenie. | Liczba nie dowodzi jednostki ani ważenia; dzisiejsza nazwa w bibliotece nie odtwarza historycznej proweniencji. [Konwersje](../../src/lib/health/mealComposerUtils.ts), [porcje](../../src/lib/health/userPortionsApi.ts). |
| `buildCaptureItems` wpisywał `brand`/`barcode = null`; OCR etykiety mapowano jako `off`. Prywatne wyszukiwanie zwracało `confirmed` bez odczytu źródła. | Biblioteka i zgoda na zapis nie zamieniają importu/estymaty w pomiar. [Capture](../../src/lib/health/nutritionTrackerApi.ts), [wyszukiwanie](../../src/lib/health/foodSearch.ts). |
| Procenty `foodTrust` były regułami źródła/wejścia; `hypot` zakładało niezależność niewalidowanych błędów. Audyt dnia sumował rozstępy. | Wskaźnik triage nie jest skalibrowanym przedziałem prawdopodobieństwa. [foodTrust](../../src/lib/health/foodTrust.ts), [nutritionAudit](../../src/lib/health/nutritionAudit.ts). |
| Parser czytał statyczne referencje TS, a tabela `food_reference_pl` zasilała planowanie. Samo rozszerzenie `pgvector` nie oznaczało embeddingów produktów. | Import katalogu bez czytelnika nie zmienia parsera. „PZH-style” nie dowodzi licencji/pochodzenia PZH. [Reconcile](../../supabase/functions/_shared/foodParse/reconcile.ts), [planowanie](../../src/lib/health/mealPlanApi.ts). |
| Ścieżki OFF różniły się endpointem, User-Agentem, mapperem i brakami; `lookupOffFast` podstawiało niektóre zera. Adapter i szybki parser traktowały ml jak gramy. | Ujednolicić kontrakt, zachować NULL. Nie zmierzono blokady IP/awarii starszego endpointu. [lookup-food](../../supabase/functions/lookup-food/index.ts), [parser](../../supabase/functions/_shared/foodParseCore.ts). |
| „Domowe” obniżało tłuszcz/cukier bez dowodu receptury; rozbijanie dań używało stałych proporcji. | Obserwacja dotyczy badanego commitu, nie obecnej implementacji. Nazwa nie uzasadnia kierunkowej korekty energii. |
| Dawny Telegram zapisywał posiłek pętlą, mógł pominąć błędy i usunąć pending przed pełnym sukcesem. | Ścieżka wycofana decyzją app-only; nie naprawiać przez jej odbudowę. Aplikacyjny capture i stabilne retry to osobna sprawa. |
| `computeWeekBalance` używał zer dla braków i nie wiązał arytmetyki z kompletnością; kalibracja korzystała z krańcowych ważeń. | Niepełne dni nie są „wolnymi kaloriami”. Porównywać trend po rzeczywistych datach; nie diagnozować metabolizmu. [Bilans](../../src/lib/health/weekBalance.ts), [kalibracja](../../packages/domain/src/training/nutritionCalibration.ts). |

## Dane: dopasowanie, jednostki i prawa użycia

Nie istnieje uniwersalna drabina „lab > etykieta > ważenie”. To osobne osie: **tożsamość produktu, źródło składu, metoda porcji, kompletność**. Etykieta konkretnego opakowania może pasować lepiej niż analiza innego produktu; zważona porcja nie potwierdza składu.

| Źródło / przypadek | Co zachować i czego nie zakładać |
|---|---|
| Własny produkt/receptura | Dokładny wariant, region, stan surowy/gotowany/odsączony, źródło i snapshot. Receptura: składniki, masa jadalna, dodatki/usunięcia i końcowa masa. Edycja tworzy nową wersję; nie przepisuje historii. |
| USDA FoodData Central | Foundation, FNDDS, Branded, SR Legacy i dane eksperymentalne mają różne pochodzenie; nie wszystkie są analizami laboratoryjnymi. Zachować ID, nutrient ID, definicję i jednostkę. Otwarty katalog nie uzasadnia importu wszystkiego. [Dokumentacja typów](https://fdc.nal.usda.gov/data-documentation/), [API/public domain–CC0](https://fdc.nal.usda.gov/api-guide/). |
| Open Food Facts | Kod/region/receptura i kompletność wymagają kontroli. SDK nie zmienia licencji danych: ODbL bazy, DbCL zawartości, CC BY-SA zdjęć. Oddzielić katalog od prywatnego dziennika; zakres obowiązków sprawdzić dla konkretnej integracji. Limity/User-Agent/search-as-you-type sprawdzić u dostawcy, nie utrwalać tutaj. [API](https://openfoodfacts.github.io/openfoodfacts-server/api/), [licencje](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/). |
| PZH/IŻŻ | Pełna baza składu była oferowana jako płatny XLSX na umowie; warunków hostingu/cache/modyfikacji nie ustalono z licencjodawcą. To inny zasób niż normy żywienia. [Oferta](https://www.pzh.gov.pl/uslugi/tabele-wartosci-odzywczej-produktow/baza-danych-wersja-pelna/), [normy](https://www.pzh.gov.pl/normy-zywienia-2024/). |
| API komercyjne | fatsecret dokumentuje PL/pl, ale parametr nie dowodzi pokrycia koszyka. Edamam uzależnia cache od planu; dostęp Cronometera do NCCDB/Nutritionix nie daje Sparky sublicencji. Najpierw uprawniony pilot, warunki eksportu/cache i wynik na tych samych produktach. [fatsecret](https://platform.fatsecret.com/docs/guides/localization), [Edamam](https://developer.edamam.com/food-database-api-docs). |
| Polskie sieci restauracyjne | Użyć właściwego regionu, wariantu, rozmiaru i wersji oficjalnego menu; sos/napój rozdzielić. Podczas researchu nie odczytano aktualnego pliku McDonald’s, PDF KFC timeoutował; nie zaimportowano wartości. Publiczny PDF nie daje automatycznie prawa redystrybucji. [McDonald’s PL](https://mcdonalds.pl/zamow-i-odbierz-tabela-wartosci-odzywczych/), [KFC PL](https://kfc.pl/kcal-wartosci-odzywcze-alergeny-skladniki). |

Kontrakt musi zachować podstawę **100 g / 100 ml / porcja**, g/mg/µg, sól/sód, stan przygotowania i NULL/zero. Objętość nie jest masą bez gęstości lub pomiaru. „Carbohydrate by difference” USDA może zawierać błonnik, inaczej niż polska etykieta; [dokumentacja Foundation](https://fdc.nal.usda.gov/docs/Foundation_Foods_Documentation_Apr2024.pdf) i [brak versus zaokrąglone zero](https://fdc.nal.usda.gov/GBFPD_Documentation/#bkmk-7) wyjaśniają ograniczenia.

Unijna energia uwzględnia też błonnik, poliole, alkohol i erytrytol. Uproszczone 4/4/9 jest kontrolą, nie podstawą cichego „naprawiania” poprawnej etykiety. [1169/2011, załączniki XIV–XV](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32011R1169). Normy RDA/AI/EAR/UL nie są zamienne; niepełny dziennik nie diagnozuje niedoboru. Warunki/licencje i stan prawny wymagają ponownej kontroli przed importem lub publikacją.

## Badania i granice przenoszenia wyników

| Materiał pierwotny | Co wnosi / czego nie dowodzi |
|---|---|
| [DietAI24](https://www.nature.com/articles/s43856-025-01159-0), [ta sama publikacja w PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12589391/) | Oddziela identyfikację/porcję od wyszukania FNDDS i obliczeń. Raportowane 63% redukcji MAE to porównanie badania, nie „63% dokładności”; 65 wyliczanych składników nie jest pomiarem ze zdjęcia. Kontrolowane ASA24/Nutrition5k i modele GPT nie walidują Gemini/DeepSeek ani polskich dań. Bezpośrednie pobranie bywało blokowane; korzystano także z indeksowanych fragmentów źródła. |
| [Thames i współautorzy, Nutrition5k, CVPR](https://openaccess.thecvf.com/content/CVPR2021/html/Thames_Nutrition5k_Towards_Automatic_Nutritional_Understanding_of_Generic_Food_CVPR_2021_paper.html) | Ważone składniki, obrazy/wideo, częściowo głębia; wartości odżywcze z adnotacji składników/USDA, nie chemii każdego talerza. Test ludzi dotyczył wizualnych porcji na niewielkiej próbce, nie dietetyka z recepturą/wagą. Powiązane skany jednego dania nie są niezależnymi przykładami. |
| [Wang i współautorzy](https://pmc.ncbi.nlm.nih.gov/articles/PMC13092701/) | Rozpoznanie głównych składników nie usuwa dużych błędów ilości/energii; dodatkowy widok nie ujawnia ukrytej receptury. Dotyczy badanych VLM/Nutrition5k, nie rankingu obecnych usług. |
| [Walidacja SNAQ](https://pmc.ncbi.nlm.nih.gov/articles/PMC10556674/) | Porównanie z podwójnie znakowaną wodą obejmowało proces rejestracji z korektami/resztkami, a nie samo rozpoznanie pojedynczego zdjęcia. Kompletność wymaga osobnej oceny. |
| [Morello i współautorzy](https://onlinelibrary.wiley.com/doi/10.1111/jhn.70148), [RCT Noom](https://onlinelibrary.wiley.com/doi/10.1002/osp4.70122) | Pierwsze dotyczy starszych wersji Cronometer/MFP, kanadyjskich danych sportowców i wpisów oceniających, nie dzisiejszego polskiego AI. Drugie bada pakiet coachingu/edukacji/samomonitorowania z ograniczeniami populacji i samoopisem masy, nie osobno kolory czy aktualne AI. |
| [FAO/INFOODS](https://www.fao.org/4/ap805e/ap805e.pdf), [EuroFIR yield/retention](https://www.eurofir.org/report-on-collection-of-rules-on-use-of-recipe-calculation-procedures-including-the-use-of-yield-and-retention-factors-for-imputing-nutrient-values-for-composite-foods/) | Dopasowanie, część jadalna, zmiana masy i retencja składników to różne rzeczy. Odparowanie wody nie odejmuje energii garnka; usunięty tłuszcz/wywar może zmienić sumę. Nie ma uniwersalnego mnożnika surowe→gotowane. |
| [Hall i współautorzy](https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/), [NIDDK Body Weight Planner](https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner) | Statyczne kcal/kg nie opisuje długiego procesu zmiany masy. Z tej samej masy i błędnego dziennika nie rozdzielimy metabolizmu, niedologowania i wody; bardziej złożony filtr tego nie naprawia. To argument za walidacją trendu, nie obowiązek wdrożenia pełnego modelu. |
| [Zeevi i współautorzy, Cell](https://www.wisdom.weizmann.ac.il/~eran/zeevi_cell_2015.pdf), [EFSA DRV](https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values) | Osobnicza glikemia wymaga pomiaru glukozy; HRV/senność nie są zamiennikiem. IG/ŁG to estymata populacyjna. Niski marker laboratoryjny nie daje algorytmu zwiększania suplementu; zalecenie kliniczne i jego źródło pozostają osobnym faktem. |

Nutri-Score opisuje produkt na 100 g/ml i wersję algorytmu, nie jakość zjedzonego obiadu; NOVA wymaga wiarygodnego składu. [Źródło Nutri-Score](https://www.santepubliquefrance.fr/index.php/nutrition-et-activite-physique/nutri-score). Odczytane [pismo MZ udostępnione przez organizację branżową](https://mleczarstwopolskie.pl/wp-content/uploads/2026/09/Pismo-Ministerstw.pdf) nie stanowiło pełnej analizy obowiązywania prawa. Nie traktować go jako aktualnej porady prawnej.

## Kod zewnętrzny: referencje, nie zamiennik backendu

Przeglądano kod/licencje; nie kopiowano kodu ani nie uruchamiano importerów przeciwko Sparky. Licencję konkretnego pliku i danych należy sprawdzić ponownie przed wykorzystaniem.

| Repozytorium | Przydatny zakres / ograniczenie |
|---|---|
| [OpenNutriTracker-Backend](https://github.com/simonoppowa/OpenNutriTracker-Backend) ([GPLv3](https://github.com/simonoppowa/OpenNutriTracker-Backend/blob/main/LICENSE)) | Najbliższy wzorzec Supabase: food/nutrient/portion/translation, konwerter USDA. Nie przenosić całego schematu ani operacji zastępowania katalogu. |
| [OpenNutriTracker](https://github.com/simonoppowa/OpenNutriTracker) ([GPLv3](https://github.com/simonoppowa/OpenNutriTracker/blob/main/LICENSE)) | Przepisy, snapshoty/import; Flutter nie jest modułem React. Uproszczenia ml/g i braków oraz [naprawa jednostek mikro](https://github.com/simonoppowa/OpenNutriTracker/blob/main/lib/core/utils/off_micronutrient_repair.dart) pokazują potrzebę niezależnej walidacji importu. |
| [wger — mapper OFF](https://github.com/wger-project/wger/blob/master/wger/nutrition/extract_info/off.py) ([AGPLv3](https://github.com/wger-project/wger/blob/master/LICENSE.txt)) | Porcje, źródła, kJ/kcal; duży backend Django, osobne warunki katalogu danych. |
| [Oficjalny OFF JS/TS](https://github.com/openfoodfacts/openfoodfacts-js) ([Apache-2.0](https://github.com/openfoodfacts/openfoodfacts-js/blob/develop/LICENSE)) | Typowany klient wart użycia tylko jeśli redukuje utrzymanie i działa w Deno; licencja SDK nie zastępuje ODbL danych. |
| [NutriTrace](https://github.com/TraceApps/nutritrace) ([AGPLv3](https://github.com/TraceApps/nutritrace/blob/main/LICENSE)) | Potwierdzanie propozycji i as-sold/as-prepared. [Adaptive TDEE](https://github.com/TraceApps/nutritrace/blob/main/server/lib/adaptive-tdee.js) miało stałą energii, heurystyczne confidence i regresję po indeksie odfiltrowanych pomiarów, która może kompresować przerwy; nie zwalidowany silnik. |
| [Nutrition5k](https://github.com/google-research-datasets/Nutrition5k/blob/main/README.md) / [DietAI24](https://github.com/Runz96/DietAI24) | Pierwszy deklaruje CC BY 4.0 danych, nie automatycznie całego kodu. README drugiego deklarowało MIT bez potwierdzonego osobnego LICENSE w sprawdzonym katalogu; przed kopiowaniem wyjaśnić zakres i starszy adres repo wskazany przez publikację. |

GPL/AGPL nie oznacza zakazu prywatnego użycia; obowiązki zależą od konkretnej integracji i udostępniania, w AGPL także użycia sieciowego zmodyfikowanego programu. Nie odrzucać ani nie kopiować bez analizy. [GNU FAQ](https://www.gnu.org/licenses/gpl-faq.en.html), [AGPL §13](https://www.gnu.org/licenses/agpl-3.0.en.html).

## Jak sprawdzić „lepsze dla Jakuba”

Oddzielić poprawność deterministyczną (jednostki, skalowanie, snapshot, zapis/retry/korekta) od empirycznej (tożsamość nieznanego dania, porcja, ukryte dodatki, resztki i kompletność dnia). Zgodność arytmetyczna nie mierzy prawdziwego spożycia.

Próbka powinna odzwierciedlać naturalny koszyk: opakowania i zmiany receptury, g/ml/sól–sód, surowe/gotowane, garnki, olej/sosy, polskie dania mieszane i menu, resztki/kości, historyczne „porcje/sztuki”, NULL/zero oraz niepełne dni/post. Osobno sprawdzić offline, utratę odpowiedzi/dwuklik, północ i przerwy w ważeniach. Liczebność sama nie jest certyfikatem jakości.

Referencja: niezależne ważenia składników i spożytej części, stan produktu, końcowa masa, etykiety i jawne braki. Zachować wejście, pierwotny wynik **i** korektę; kliknięcie „potwierdź” bez ważenia nie jest ground truth. Oficjalne menu i ważony własny przepis mają różne statusy, a kcal z tabeli nie są pomiarem energii wchłoniętej.

Rozdzielić rozwój, zamknięty test i późniejsze posiłki prospektywne; zdjęcia tej samej partii, dania i etykiety grupować, by nie przeciekały między podziałami. Osobno mierzyć znane i nowe dania. Porównywać te same wejścia: obecny parser, wariant, prostą referencję bez LLM i wynik po doprecyzowaniu; konkurencję tylko przy dostępie/uprawnionym użyciu. Rejestrować model, prompt, parametry, datę, odpowiedź i powtórzenia — stała temperatura nie utrwala zewnętrznej usługi.

Raportować oddzielnie:

- Tożsamość, pominięte/dopisane składniki, markę i stan przygotowania.
- MAE i podpisany błąd porcji (g osobno od ml), kcal i makro; medianę, ogon oraz klasy trudności, nie tylko średnią/procent przy małych wartościach.
- Kompletność epizodów/napojów i empiryczne pokrycie deklarowanych przedziałów wraz z ich szerokością.
- Czas poprawnego zapisu, kliknięcia/korekty/porzucenia, utraty/duble, zgodność agregatu, opóźnienia i koszt zaakceptowanego wpisu.

Progi i krytyczne regresje ustalić przed otwarciem holdoutu. Porównywać sparowane różnice z niepewnością grupowaną po daniu/dniu, nie niemal identycznych zdjęciach. Adaptacja wymaga kompletnych dni i aktualnych ważeń; sam brak oleju w logu może obniżać estymowany wydatek. Statystyczna poprawka porcji potrzebuje par estymata→pomiar z N i rozrzutem, nie uczenia na własnych szacunkach.

Otwarte pozostają dokładność na tym koszyku, regionalne pokrycie baz, prawa i warunki usług, zgodność wdrożenia z kodem oraz działanie na rzeczywistym Androidzie po utracie sieci/ubiciu aplikacji. Nie blokuje to napraw deterministycznych, ale blokuje deklarację przewagi, pełnej adaptacji czy klinicznej pewności.
