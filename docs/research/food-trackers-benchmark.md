# Najlepsze trackery żywności na świecie — co mają, jak to rozwiązali, co wdrożyć u nas

Data: 2026-10-27. Cel: moduł Jedzenie jako najlepszy, spersonalizowany tracker dla jednego użytkownika (Jakuba). Koszt i czas nie są ograniczeniem.

## 0. Jak czytać ten raport

Każdy fakt ma etykietę wiarygodności:

- **[P]** źródło pierwotne (artykuł naukowy, dokumentacja, strona producenta o własnym produkcie),
- **[V]** deklaracja producenta (marketing, liczby bez metodologii),
- **[S]** źródło wtórne (blogi porównawcze, często afiliacyjne lub pisane przez konkurentów; kierunkowe, nie liczbowe).

Liczby dokładności typu „±4%" z blogów porównawczych **nie są dowodem**. Używam ich tylko do rankingu kierunkowego.

## 1. Mapa rynku: kto jest najlepszy w czym

| Aplikacja (region) | Czym wygrywa | Czego nie robi | Jakość dowodów |
|---|---|---|---|
| **MacroFactor** (USA) | Adaptacyjny TDEE z wagi i spożycia, wygładzony trend wagi, brak „check-inów" — algorytm działa w tle; baza weryfikowana | Słabsze mikroskładniki niż Cronometer; photo AI drugorzędne | [V]/[S] (opis metody w help center producenta [P]) |
| **Cronometer** (USA/Kanada) | Dane laboratoryjne (NCCDB, USDA), 80+ składników, jawny poziom pewności źródła | UX wolniejszy, mało personalizacji celu | [P]/[V] |
| **Carbon Diet Coach** (USA) | Cotygodniowy check-in z adherencją, regulacja kalorii i makro | Brak korekty między check-inami; przy złej adherencji nic nie zmienia | [S] |
| **RP Diet** (USA) | Szablony posiłków, periodyzacja | Sztywniejszy wybór jedzenia | [S] słabe |
| **MyFitnessPal / Cal AI** (USA) | Skala bazy, bardzo szybkie logowanie zdjęciem | Baza crowdsourcowana (duble, błędy), zdjęcia bez weryfikacji | [S] |
| **SnapCalorie** (USA) | Zdjęcie z głębią (LiDAR/model głębi), nauka na Nutrition5k | Zależność od sprzętu | [P] badania Nutrition5k |
| **Foodvisor / Bitesnap** (FR/USA) | Rozpoznawanie składników i szybkie poprawianie | Mieszane i ukryte potrawy | [S] |
| **Lifesum / Yazio** (SE/DE) | Szeroka baza europejska, dobre UX | Zdjęcie za paywallem i słabsze wg testów | [S] |
| **Fitatu** (PL) | Polska baza + kod kreskowy (Open Food Facts), Premium+AI: zdjęcie, głos, tekst | Brak publikowanych liczb dokładności; ograniczenia: wymaga internetu, zdjęcia z galerii dopiero planowane | [P] strona producenta bez metryk |
| **Boohee 薄荷健康** (Chiny) | 1,6 mln pozycji, 170+ pól, >10 krajowych tabel źródłowych, dedykowana baza dań, estymacja oleju i soli przy smażeniu, 8000+ zdjęć referencyjnych o znanej wadze, LLM dostrojony do żywienia z pobieraniem danych z bazy | Nie opisuje szczegółów metody porcji | [V] strona producenta |
| **Asken あすけん** (Japonia) | Oceny posiłków i „co zjeść następnym razem" w kontekście luk dnia, rozmowa z AI-dietetykiem | — | [S]/[V] |
| **Yuka** (FR) | Ocena produktów (Nutri-Score, dodatki, NOVA), odwracanie decyzji zakupowych | Nie jest dziennikiem | [V] |
| **DietAI24** (nauka) | LLM + RAG na FNDDS (5624 pozycji, ponad 23 000 miar porcji), 65 składników; −63% MAE dla wagi i 4 składników vs metody wcześniejsze | Prototyp badawczy | [P] [Communications Medicine](https://www.nature.com/articles/s43856-025-01159-0) |

Wniosek ogólny: **nikt nie ma wszystkiego**. Najlepsze przewagi są rozproszone: adaptacja celu (MacroFactor), zaufanie do źródła danych (Cronometer), uziemienie LLM w bazie referencyjnej (Boohee, DietAI24), rozmowa i kontekst „co dalej" (Asken), personalizacja (nikt naprawdę).

## 2. Dziewięć wzorców rozwiązań, które się powtarzają

1. **LLM nie jest źródłem liczb, tylko tłumaczem.** DietAI24 i Boohee pozwalają modelowi rozpoznać potrawę i opisać ją, a liczby pobierają z bazy referencyjnej (RAG). Wartość modelu = identyfikacja + porcje, wartość bazy = skład. My już mamy ten kierunek (grams_only → reconcile z bazą), ale baza referencyjna jest mała.
2. **Hierarchia zaufania źródeł.** Cronometer: laboratoria > USDA > etykieta > użytkownik. My mamy provenance (`macroSource`, `trust_level`), ale hierarchia nie jest jawnie pokazana użytkownikowi na każdym wpisie.
3. **Porcja to główne źródło błędu, nie skład.** Badania zdjęciowe (Nutrition5k, DietAI24) pokazują, że błąd wagi dominuje nad błędem składu. Rozwiązania: zdjęcia referencyjne o znanej wadze (Boohee), głębia (SnapCalorie), miary domowe z bazy (FNDDS 23 000 miar).
4. **Adaptacyjny wydatek energetyczny.** MacroFactor: wygładzony trend wagi + spożycie → TDEE na bieżąco. Model dynamiczny Halla zamiast stałych 7700 kcal/kg [P, literatura].
5. **Neutralność wobec adherencji.** Dobre aplikacje nie karzą za wpadki; zamiast tego pokazują trend i dopasowują plan. Samokontrola żywieniowa ma realny koszt obciążenia (self-monitoring burden), więc minimalizują tarcie.
6. **Szacowanie ukrytych składników.** Boohee estymuje olej i sól przy smażeniu. U nas: sól i nasycone tłuszcze są w pipeline, ale ukryty tłuszcz kulinarny nie jest osobno modelowany.
7. **Dane regionalne.** Boohee wchłonęło chińską tabelę; Fitatu stoi na polskiej bazie. Dla Polski kluczowe są tabele IŻŻ/PZH i normy żywienia dla populacji Polski.
8. **Kontekst „co dalej".** Asken pokazuje lukę dnia i proponuje następny posiłek. Nasz moduł ma `foodAssist` (menu restauracji, lodówka) i `mealPlan`, więc to najłatwiejszy do spięcia wzorzec.
9. **Personalizacja odpowiedzi metabolicznej.** Zeevi 2015 (Cell): odpowiedź glikemiczna na ten sam posiłek różni się między osobami [P]. Komercyjnie robi to głównie CGM; u nas jest tylko tabela IG/ŁG bez osobniczej krzywej.

## 3. Nasz stan (inwentarz)

Mamy już, w wielu miejscach lepiej niż typowe aplikacje konsumenckie:

- model niepewności (`uncertainty_pct` jako hypot(makro, porcja)), poziom zaufania, źródło mikroskładników (dane vs oszacowanie),
- walidacja energii vs makro (Atwater 4/4/9 z wyjątkiem dla alkoholu),
- tygodniowy autoaudyt całej historii (okno 400 dni), kwarantanna, tabela kopii zmian `food_history_repairs`,
- pipeline soli i nasyconych z proweniencją,
- uzupełnianie mikroskładników z backfillem,
- kalibracja żywienia z wagi (`calibrateNutrition`, stałe 7700 kcal/kg, wymaga ≥14 pełnych dni),
- IG/ŁG z referencji (Sydney GI), ocena menu restauracji i lodówki, plan posiłków, cele osobiste (białko ≥150 g, sen 8 h).

Czego **nie** mamy (luki względem świata): patrz sekcja 4.

## 4. Luki i rekomendacje (priorytet, wysiłek, wpływ)

Skala: wpływ i wysiłek 1–5. Priorytet P0 = zrób najpierw.

### P0 — fundament dokładności

**A. Baza referencyjna jako uziemienie (RAG à la DietAI24/Boohee).**
Wpływ 5, wysiłek 4.
- Zaimportować i zindeksować: **USDA FoodData Central** (domena publiczna; Foundation/SR Legacy/FNDDS; FNDDS ma miary porcji), tabele **IŻŻ/PZH** (sprawdzić licencję przed importem), **Open Food Facts** dla kodów kreskowych (licencja ODbL: share-alike i atrybucja — dla własnego użytku OK, ale rozważyć gdy dane wychodzą na zewnątrz).
- Wyszukiwanie wektorowe (pgvector w Supabase) + dopasowanie leksykalne po polsku; LLM opisuje, retrieval zwraca kandydatów, reconcile wybiera.
- Zasada: każdy wpis ma `reference_id` i `source_tier`.
- Uwaga jakościowa: liczby wielkości baz API (Nutritionix 1,9 mln, FatSecret 1,9 mln, Edamam ~900 tys., USDA 250–370 tys.) pochodzą z blogów dostawców [S] i są sprzeczne; wielkość nie świadczy o jakości.

**B. Jawna hierarchia źródeł na wpisie (jak Cronometer).**
Wpływ 4, wysiłek 2. Poziomy: `lab/ref` > `label` > `chain_official` > `user_weighed` > `llm_estimate`. Wyświetlać znaczek przy wpisie, a niepewność liczyć z poziomu. Mamy większość danych, brakuje spójnej taksonomii i widoku.

**C. Korekta porcji osobistym biasem (unikalne — nikt tego nie robi dobrze).**
Wpływ 5, wysiłek 3. Mamy 240 wpisów bez gramów i historię wpisów z wagą. Uczyć się per potrawa: „Jakub zwykle niedoszacowuje makaron o X%" na podstawie wpisów ważonych vs szacowanych. Stosować jako korektę z przedziałem niepewności, nigdy po cichu.

**D. Benchmark złotego zestawu (golden set).**
Wpływ 5, wysiłek 3. ~100 posiłków ważonych na wadze z prawdziwym składem, zdjęcia + opis. Mierzyć MAE kcal/białka/tłuszczu/węgli, porównywać wersje pipeline'u przy każdej zmianie (regresja). Bez tego żadna deklaracja „lepsze niż Fitatu" nie ma dowodu. To jedyny sposób, żeby uczciwie odpowiedzieć na pytanie o Fitatu.

### P1 — adaptacja i personalizacja

**E. Adaptacyjny TDEE (zamiast stałego 7700).**
Wpływ 5, wysiłek 3. Rozbudować `calibrateNutrition`: wygładzony trend wagi (filtr wykładniczy lub Kalman), wydatek jako stan ukryty, uwzględnienie retencji wody (węgle, sód, cykl). Opcjonalnie model Halla (energia z tłuszczu i masy beztłuszczowej o różnej gęstości), co pokazuje, dlaczego stałe 3500/7700 myli przy dłuższych okresach [P]. Wyjście: aktualny TDEE ± przedział, rekomendacja celu kcal, pewność.

**F. Cele składników z norm polskich i badań krwi.**
Wpływ 4, wysiłek 3. Normy żywienia dla populacji Polski (IŻŻ/NCEZ) jako domyślne EAR/RDA/UL per składnik; połączenie z `medical_lab_results` (np. niski ferrytyna/D3/B12 podnosi cel danego składnika). Pasek pokrycia składników już istnieje (`NutrientCoverageStrip`) — dostaje tylko lepsze cele.

**G. Ukryty tłuszcz kulinarny i sól (wzorzec Boohee).**
Wpływ 4, wysiłek 2. Dla potraw smażonych/duszonych dodać jawny składnik „olej/masło do obróbki" z przedziałem (np. 5–20 g) i flagą niepewności. Najczęstsze źródło niedoszacowania kcal w domowym gotowaniu.

**H. Personalna odpowiedź glikemiczna.**
Wpływ 3, wysiłek 4 (zależy od danych). Bez CGM: zbierać proxy (energia/senność po posiłku w dzienniku, HR/HRV z wearable'a jeśli jest) i uczyć się, które posiłki pogarszają samopoczucie. Z CGM (opcjonalnie): prawdziwa krzywa. Zeevi 2015 dowodzi sensu personalizacji, ale to wymaga danych, których teraz nie mamy.

### P2 — UX i pętla zachowania

**I. Kontekst „co dalej" (Asken).** Wpływ 4, wysiłek 2. Po każdym posiłku: luka dnia (białko, błonnik, mikroskładniki) → propozycja następnego posiłku z `foodAssist`/`mealPlan` i ulubionych. Konsument już istnieje (Telegram, widok Jedzenie).

**J. Logowanie głosem i rozmową.** Wpływ 4, wysiłek 3. Telegram już przyjmuje tekst i zdjęcia; dodać wiadomości głosowe (transkrypcja → parse-food-nl) i dopytywanie tylko tam, gdzie niepewność porcji jest największa (jedno pytanie, nie formularz).

**K. Kod kreskowy i opakowania.** Wpływ 3, wysiłek 2. OFF API po kodzie, a gdy brak — zdjęcie etykiety (OCR tabeli wartości odżywczych przez model wizyjny, walidowane energią vs makro, co już mamy).

**L. Oceny produktu (Nutri-Score, NOVA).** Wpływ 2, wysiłek 2. Pola z OFF; użyteczne jako jedna linijka przy produkcie pakowanym. Nie dawać punktów za „zdrowość" jako celu samego w sobie (patrz wzorzec 5).

**M. Dane sieciówek.** Wpływ 3, wysiłek 2. McDonald's Polska publikuje wartości odżywcze w PDF; analogicznie KFC i inne. Import jako `chain_official` z wersją i datą. Wymaga weryfikacji aktualności i licencji.

**N. Obciążenie logowaniem.** Wpływ 4, wysiłek 2. Mierzyć czas od zamiaru do zapisu; skracać (ulubione, „to samo co wczoraj", szablony). Literatura o self-monitoring wskazuje, że porzucenie wynika z tarcia, nie z braku motywacji.

### P3 — rzeczy do świadomego pominięcia

- Zdjęcie z głębią (LiDAR) — wymaga sprzętu i dużego wysiłku; zysk umiarkowany przy ważeniu domowych posiłków.
- Społeczności, gamifikacja, rankingi — jedyny użytkownik.
- Skala bazy „milion pozycji" — jakość i uziemienie są ważniejsze od liczby.

## 5. Proponowana kolejność wdrożenia (pionowe plastry)

Każdy plaster kończy się konsumentem w UI/Telegram (zasada Done).

1. **Benchmark (D)** — najpierw, żeby mierzyć wszystko dalej. Wynik: skrypt + tabela wyników + wskaźnik w widoku zdrowia.
2. **Taksonomia źródeł (B)** + migracja pól `source_tier`. Wynik: znaczek zaufania w wpisie.
3. **Baza referencyjna (A)** — USDA FDC + PZH/IŻŻ w pgvector, RAG w `reconcile`. Wynik: wyższy odsetek wpisów `ref`/`lab`.
4. **Ukryty tłuszcz (G)** i **bias porcji (C)** — największy realny zysk w kcal dla domowych posiłków.
5. **Adaptacyjny TDEE (E)** — nowy silnik w `@vanguard/domain`, testy na syntetycznych seriach wagi.
6. **Cele z norm i badań (F)**.
7. **Następny posiłek (I)**, **głos (J)**, **kod kreskowy/etykieta (K)**, **sieciówki (M)**.
8. **Personalna odpowiedź (H)** — gdy będzie dość danych.

## 6. Ryzyka i zastrzeżenia

- **Licencje:** OFF jest ODbL (share-alike, atrybucja); tabele IŻŻ/PZH wymagają sprawdzenia warunków; PDF-y sieciówek to dane producenta. USDA jest domeną publiczną.
- **Dokładność deklarowana:** wszystkie liczby „±X%" z blogów porównawczych [S] to nie wyniki walidacji. Jedyne rzetelne porównanie z Fitatu da nasz własny benchmark (D).
- **DietAI24:** wynik −63% dotyczy wagi i czterech składników na daniach mieszanych, nie wszystkich 65 składników [P].
- **Boohee:** dokładności per kategoria (np. 70,3% dla talerza z wieloma produktami) to wynik producenta na własnym zbiorze [V]; strona jest wewnętrznie niespójna co do wielkości bazy (1,6 mln vs 1,5 mln).
- **Fitatu:** brak publikowanych metryk; ocena „lepsze/gorsze" bez benchmarku byłaby zgadywaniem.
- **Nie zbadano w pełni:** szczegółowe mechaniki Lose It!, Noom, Yazio, Lifesum, Foodvisor (głównie źródła wtórne); aktualny status Nutri-Score w Polsce; pokrycie polskich produktów w OFF; dokładne nazwy pól API OFF. Przed wdrożeniem odpowiedniego punktu zrobić krótkie badanie pierwotne.

## 7. Źródła (wybór)

- DietAI24, Communications Medicine: https://www.nature.com/articles/s43856-025-01159-0 (PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC12589391/)
- Boohee, strona rozwiązań AI: https://ai.boohee.com/solution/diet/
- Fitatu, AI ze zdjęć: https://www.fitatu.com/blog/en/fitatu-ai-photos/
- Porównania MacroFactor / Carbon: https://fittechreview.me/macrofactor-vs-carbon-body-recomp-macro-showdown/ , https://caleye.fit/blog/carbon-vs-macrofactor-2026/ [S]
- Porównania photo AI: https://nutrient-metrics.com/en/guides/best-photo-recognition-nutrition-apps-2026/ [S]
- Porównania baz API: https://about.greenchoicenow.com/nutrition-data-api-comparison [S]
- Wcześniejsze wyniki sesji (MacroFactor help center, Cronometer, Asken, SnapCalorie/Nutrition5k, Hall, Zeevi 2015, PZH/IŻŻ, OFF, McDonald's PL, Yuka): w historii tej sesji.
