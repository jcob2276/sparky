# Audyt i powtórzenia empiryczne — 2026-09-28

## Cel

Sprawdzić, czy przewaga enkodera Transformer nad TF-IDF + LinearSVC na
SafePersuasion utrzymuje się w przebiegu z zapisanymi predykcjami, ustalonym
podziałem danych i rozliczonym kosztem GPU. F1 macro pozostaje metryką główną.

## Stan źródeł przed nowym przebiegiem

- Sześć korpusów jest lokalnie dostępnych w `data/`. Ich zawartość i skróty
  SHA-256 zostaną zapisane w manifestach poszczególnych przebiegów.
- SEConvo: pliki źródłowe zawierają 40 przykładów `train` i 360 `test`; nasz
  istniejący loader łączy je i wykonuje własny podział 320/80 (`seed=42`).
  Wyników 320/80 nie należy nazywać wynikiem na oficjalnym podziale autorów.
  Wszystkie 1400 rozmów w pełnym korpusie zostało wygenerowanych przez GPT-4
  Turbo; 400 z nich oznaczyli ludzie. „Human-annotated” nie znaczy, że są
  to autentyczne rozmowy ludzi.
- Phishing Text: po usunięciu duplikatów dokładnych pozostaje 20 007 tekstów.
  Najnowszy audyt znalazł 17 znormalizowanych wartości tekstu występujących
  po obu stronach podziału (normalizacja NFKC, małe litery, usunięcie
  interpunkcji i wyrównanie odstępów); nie ma w nich konfliktu etykiet.
  Rekord skrajny ma ok. 3,53 mln słów. Przed finalnym porównaniem
  na tym korpusie konieczne są grupowanie wariantów i jawna polityka długości.
- Faza D: temperatura skalowania była dopasowana do etykiet zbioru testowego.
  Wynik kalibracji ma status eksploracyjny do czasu oddzielnej walidacji.
- Faza E4: modele uczone na SafePersuasion oceniano na mieszance czterech
  korpusów. Wynik koszyków długości jest splątany z przesunięciem domeny.
- Jev: istnieje CSV 100 żądań, 99 odpowiedzi i jedna odpowiedź HTTP 529.
  Przy progu 0,85 bramka przepuściła 42 wiadomości, w tym 39 racjonalnych
  i 3 manipulacyjne. To pomiar prototypu na jednej próbce 100 tekstów.
- Odświeżony `outputs/audit_edge_cases.json` obejmuje wszystkie sześć zadań.
  W MentalManip wykryto jedną znormalizowaną wartość tekstu po obu stronach
  podziału; w SafePersuasion, SEConvo, scam_phone i ReaMent — zero. Jest to
  kontrola diagnostyczna, nie pełne wykrywanie parafraz semantycznych.

## Pochodzenie i trafność domenowa baz

- [SEConvo, opis autorów](https://zenodo.org/records/12170260): symulowane
  rozmowy typu LinkedIn o atakach SE. To najbliższy korpus tematowi
  cyberbezpieczeństwa, lecz jego syntetyczne pochodzenie ogranicza wniosek
  o zachowaniu na rzeczywistych wiadomościach.
- [SafePersuasion, opis autorów](https://github.com/haeinkong/SafePersuasion/blob/main/dataset/README.md):
  komentarze napisane przez ludzi, z etykietą manipulacja vs racjonalna
  perswazja. Korpus odpowiada części „manipulacja semantyczna”, nie jest
  jednak zbiorem incydentów cyberbezpieczeństwa. Autorzy udostępniają
  cały plik do klasyfikacji binarnej, nie wskazują w tym opisie oficjalnego
  podziału train/test. Nasz podział 80/20 jest własnym protokołem.
- [ReaMent, karta autorów](https://huggingface.co/datasets/YSGao/ReaMent):
  5000 dialogów wybranych z interakcji w filmach internetowych; ok. 68,3%
  etykiet pozytywnych. To realniejsza domena manipulacji interpersonalnej,
  lecz nie korpus phishingu ani ataków SE. Licencja CC BY-NC-ND 4.0.

Nie łączymy wyników tych trzech zbiorów w jeden „wynik detekcji ataków”,
bo mierzą różne konstrukty i kanały komunikacji. Potrzebna jest tabela
zakresu wnioskowania: cyber-SE / perswazja online / manipulacja dialogowa.

## Protokół pierwszego powtórzenia

1. `load_task("safepersuasion")` utrzymuje zewnętrzny podział 1509/378.
2. Z 1509 przykładów treningowych odkładamy 20% na walidację, stratyfikując
   z `seed=42`. Ten sam podział otrzymują SVM i DistilBERT. Test 378 tekstów
   służy wyłącznie do raportowania wyniku po ustaleniu konfiguracji.
3. SVM: słowne TF-IDF (1,2), `min_df=2`, maks. 50 000 cech, LinearSVC z
   `class_weight=balanced`.
4. DistilBERT: `distilbert-base-uncased`, 3 epoki, batch 16, maks. 256 tokenów,
   learning rate 3e-5, warmup 0,1, weight decay 0,01. Brak doboru progu na teście.
5. W każdym przebiegu zapisujemy manifest JSON, identyfikatory podziału,
   macierze pomyłek, CSV predykcji walidacyjnych i testowych, wersje bibliotek,
   nazwę GPU, czas treningu i cenę GPU w chwili uruchomienia.
6. Porównanie GPU wymaga identycznego skryptu, danych, modelu, seeda oraz
   parametrów. Czas na uruchomienie poda i pobranie modelu raportujemy osobno.

## Koszt i infrastruktura

Odczyt konta RunPod przed pracą: saldo 1,0519310312 USD, brak aktywnych
podów. Oferty RTX A5000 (0,16 USD/h), Ada 4000 (0,20 USD/h), L4 (0,49
USD/h) i A6000 (0,33 USD/h) widniały w katalogu, lecz próby utworzenia
instancji nie powiodły się z powodu braku dostępnej pojemności. RTX 3090
i RTX 4090 również były niedostępne. Udało się utworzyć A40 Secure Cloud
(0,49 USD/h) i A100 SXM 80 GB Secure Cloud (1,59 USD/h). CLI RunPod 2.14.0
nie rozpoznał parametru `--terminate-after`; **nie było automatycznego limitu
czasu**. Oba pody zostały ręcznie usunięte po pobraniu wyników. Końcowa lista
podów była pusta, a bieżąca stawka konta wynosiła 0 USD/h.

Saldo po pracy wynosiło 0,8077534913 USD; różnica salda to 0,2441775399
USD za całą sesję, obejmującą uruchamianie podów, instalację zależności,
transfery, oczekiwanie i eksperymenty. API historii rozliczeń podów zwracało
jeszcze pustą listę, dlatego nie przypisujemy tej kwoty osobno do kart ani
nie utożsamiamy jej z kosztem samego trenowania. Teoretyczny koszt 13,095 s
samego treningu A40 przy 0,49 USD/h to ok. 0,00178 USD; 9,848 s na A100
przy 1,59 USD/h to ok. 0,00435 USD. To wartości analityczne, nie faktura.

## Pierwszy lokalny preflight

`outputs/research_v2/local-preflight-20260928/manifest.json` zawiera stały
podział 1207/302/378 i predykcje SVM. Wynik SVM na 378 testowych przykładach:
F1 macro 0,6290, macierz pomyłek `[[178,55],[74,71]]`. Wynik różni się od
starszego przebiegu 0,6127, gdyż 302 przykłady odłożono do walidacji.

## Kryterium interpretacji

Jednostkowy przebieg na jednym seedzie nie uzasadnia twierdzenia o stałej
przewadze architektury. Do końcowej hipotezy potrzebne są powtórzenia z
różnymi seedami lub walidacja krzyżowa, a porównanie parowe musi wykorzystywać
predykcje na tych samych obserwacjach. Porównanie GPU służy ocenie kosztu i
czasu, nie wnioskowaniu o jakości semantycznej kart.

## Wykonane powtórzenia SafePersuasion

Artefakty znajdują się w `outputs/research_v2/`: manifest i predykcje dla
każdego przebiegu, zapisany model A40/seed 42, logi i `summary.json`.
Każdy przebieg użył tej samej wersji pliku danych (SHA-256:
`0a92e81c42018c1a7aa6efa283af8bbd2ce1031c6591f8e0db9292f03c0e1db8`)
i skryptu (SHA-256:
`4b28ef0285a73df3f43cdb44b5de6a66fe0420c2816056e4327a90aeb698d82f`).
Podział: 1207 trening / 302 walidacja / 378 test. W trakcie tych przebiegów
nie użyto etykiet testowych do wyboru progu ani epoki.

| GPU i seed | F1 macro DistilBERT | F1 macro SVM | Czas `trainer.train()` |
|---|---:|---:|---:|
| A40, 42 | 0,6970 | 0,6290 | 13,09 s |
| A40, 43 | 0,6928 | 0,6290 | 14,50 s |
| A40, 44 | 0,6979 | 0,6290 | 14,65 s |
| A40, 45 | 0,6833 | 0,6290 | 15,25 s |
| A40, 46 | 0,7089 | 0,6290 | 12,68 s |
| A100, 42 | 0,7035 | 0,6290 | 9,85 s |

Na A40 średnia z pięciu seedów wynosi 0,6960, odchylenie standardowe
próby 0,0092, zakres 0,6833–0,7089. Dla seeda 42 różnica F1 macro A40
minus SVM wynosi 0,0680. Parowy bootstrap po obserwacjach testowych
(5000 replik) dał przedział 95% różnicy [0,0053; 0,1318], a parowy test
permutacyjny dla F1 macro (5000 zamian) dwustronne p=0,0336. Dokładny
test McNemara dla **trafności**, a nie F1, dał p=0,0850 (51 przykładów
poprawnych tylko dla SVM, 71 tylko dla DistilBERT). Te wyniki nie są
sprzeczne: testują inne statystyki. Nie traktujemy pięciu wartości p z
powtórzeń jako niezależnych potwierdzeń, bo wszystkie używają tych samych
378 tekstów testowych.

A100 skrócił mierzony trening seeda 42 1,33 raza względem A40, ale stawka
godzinowa była 3,24 raza wyższa. Sama część treningowa była więc mniej
opłacalna na A100 przy tej małej skali. Skrypt na A100 trwał 81,07 s wobec
22,91 s na A40, głównie przez pobieranie modelu; tych wartości nie należy
interpretować jako czystej szybkości GPU. Mimo tego samego seeda, danych
i konfiguracji predykcje A40 i A100 różniły się w 17 z 378 przypadków;
deterministyczność między kartami nie została wymuszona.

## Granice wniosku i hipotezy

H1 (ograniczona): przy tym podziale SafePersuasion i ustalonej konfiguracji
DistilBERT przewyższa TF-IDF + LinearSVC według F1 macro. Nowe pięć
powtórzeń wspiera H1, lecz szacowanie na jednym, wcześniej używanym
w projekcie zbiorze testowym nie jest niezależnym sprawdzeniem uogólnienia.

H2: „większy / droższy GPU obniża koszt eksperymentu” — dla tak małego
zbioru dane jej nie wspierają: A100 jest szybszy treningowo, lecz droższy
w przeliczeniu na sekundę treningu; koszt całej sesji zależy od narzutu
infrastrukturalnego. Do uogólnienia potrzebny byłby dłuższy, powtarzalny
benchmark, którego teraz nie wykonywano.

Nie przenosimy H1 na SEConvo, MentalManip ani inne domeny. W szczególności
SEConvo wymaga rozdzielenia oficjalnego podziału od naszego wewnętrznego,
a Phishing Text poprawy kontroli duplikatów i długości. Żadnego z tych
problemów dodatkowy seed na SafePersuasion nie rozwiązuje.

## Jev na wspólnym zbiorze testowym — nowe wywołania API

Po wcześniejszym pilotażu 100 tekstów uruchomiono Jev ponownie na **tych
samych 378 identyfikatorach testowych**, które mają zapisane predykcje SVM
i DistilBERT. Surowe odpowiedzi są append-only w
`outputs/jev_holdout_20260928_events.jsonl`, podsumowanie wywołań w
`outputs/jev_holdout_20260928_summary.json`, a złączenia po identyfikatorze,
predykcje kaskady i metryki w `outputs/jev_holdout_20260928_analysis/`.
Zapisano SHA-256 danych i kodu tworzącego zapytanie. API odpowiedziało
378/378 razy bez błędu; wszystkie odpowiedzi wskazują snapshot
`typesafe/jev-1.13-20260917`. Cena odpowiedzi wyniosła razem 0,006432846
USD, czyli ok. 0,01702 USD na 1000 takich krótkich tekstów. Mediana czasu
pojedynczego żądania to 371 ms, P95 2382 ms przy czterech równoległych
pracownikach. To nie jest opóźnienie całej kaskady.

Reguła bramki pozostała bez zmian: przepuść jako bezpieczne tylko
`choice=safe` i `confidence>=0,85`; inaczej kieruj do modelu dalszego.
Wśród 233 racjonalnych komentarzy przepuściła 132 (56,7%); wśród 145
manipulacyjnych błędnie przepuściła 19 (13,1%). Razem oszczędza 151/378
wywołań modelu dalszego (39,9%), ale zatrzymuje tylko 126/145 ataków
(86,9%; dokładny 95% przedział dwumianowy 80,3–91,9%). „Oszczędza 39,9%
wywołań” **nie jest** równoznaczne z „obniża koszt całego systemu o 39,9%”,
bo sama bramka kosztuje i ma opóźnienie.

| Wariant, seed A40 42 | F1 macro | Czułość manipulacji | FP | FN |
|---|---:|---:|---:|---:|
| SVM bez bramki | 0,6290 | 0,4897 | 55 | 74 |
| DistilBERT bez bramki | 0,6970 | 0,6414 | 57 | 52 |
| Jev: sam wybór `safe`/`manipulation` | 0,7498 | 0,6345 | 34 | 53 |
| Jev → SVM | 0,6490 | 0,4414 | 35 | 81 |
| Jev → DistilBERT | 0,7057 | 0,5931 | 44 | 59 |

Sama klasyfikacja Jeva uzyskała wyższe F1 macro niż ten przebieg
DistilBERT, lecz to zewnętrzny, płatny model z opisem etykiet w zapytaniu,
a nie kolejna architektura trenowana na tym samym zbiorze. W kaskadzie
F1 rośnie nieznacznie, za to czułość ataku spada: dla seeda 42 pojawia się
7 dodatkowych fałszywych negatywów. We wszystkich pięciu seedach A40
F1 kaskady było wyższe od samego DistilBERT, a czułość manipulacji niższa.
Wobec priorytetu cyberbezpieczeństwa nie rekomendujemy tej bramki do
automatycznego oznaczania tekstów jako bezpiecznych bez dalszej walidacji.

Wcześniejszy pilotaż losował 100 tekstów z **całego** SafePersuasion;
23 z nich należą też do obecnych 378 testowych. Próg 0,85 był ustalony
przed nowym przebiegiem, ale obecny test nie jest w pełni niezależny od
historii pracy z danymi. Ponadto nie badano jeszcze rzeczywistego
end-to-end kosztu i czasu kaskady. Wyniki Jeva opisujemy jako ocenę
prototypu bramki, nie systemu SOC.

Powtórzono wszystkie 378 identycznych zapytań do tego samego snapshotu
modelu i z tym samym kodem zapytania. Drugi surowy zapis to
`outputs/jev_holdout_20260928_repeat2_events.jsonl`, koszt również
0,006432846 USD. Wybór `safe`/`manipulation` zmienił się dla 6/378
tekstów; decyzja bramki przy progu 0,85 dla 4/378, wszystkie cztery
zmiany dotyczyły racjonalnych komentarzy. Liczba przepuszczonych ataków
pozostała 19/145, a całkowita liczba przepuszczonych 151/378; nie znaczy
to, że za każdym razem były to te same bezpieczne teksty. Zmiany decyzji
bramki miały pewności blisko progu (0,82–0,87). Bezpośrednie F1 wyboru
Jeva zmieniło się z 0,7498 na 0,7563, a F1 kaskady z DistilBERT seed 42
z 0,7057 na 0,7033. Łączny zmierzony koszt obu przebiegów to
0,012865692 USD. Te dwie powtórki nie stanowią jeszcze pełnego badania
zmienności usługi w czasie.

### Punkt opłacalności bramki Jev

W każdym z dwóch przebiegów 378 zapytań kosztowało 0,006432846 USD,
a bramka ominęła 151 wywołań modelu dalszego i skierowała do niego 227.
Jeśli marginalny koszt jednego takiego wywołania oznaczyć przez `c`,
koszt bez bramki wynosi `378c`, a koszt kaskady
`0,006432846 + 227c` USD. Kaskada oszczędza pieniądze dopiero przy
`c > 0,006432846/151 = 0,0000426016 USD` za wywołanie, czyli
**ponad 0,0426 USD za 1000 wywołań** modelu dalszego. To próg
algebraiczny dla tych 378 tekstów, nie zmierzony koszt serwowania
DistilBERT ani prognoza dla innego ruchu. Stałe koszty infrastruktury,
batching i wykorzystanie sprzętu mogą zmienić rzeczywisty rachunek.
Przepuszczenie 19/145 manipulacji pozostaje oddzielnym kosztem
bezpieczeństwa, którego próg finansowy nie kompensuje.

Opóźnienie samego Jeva miało medianę 371 ms i P95 2382 ms w pierwszym
przebiegu, a 353 ms i 3060 ms w drugim. Dla 227 tekstów kierowanych
dalej czas modelu dalszego dochodzi po odpowiedzi bramki. Nie mierzono
opóźnienia całej kaskady, zatem nie wolno odejmować ani dodawać tych
kwantyli do kwantyli innego modelu jako wyniku end-to-end.
Zapisane w `thesis/figures/deep_e/all_results_e.json` 66,72 tekstu/s
dla DistilBERT-INT8 pochodzi z 100 pojedynczych tekstów
SafePersuasion na CPU w `thesis/run_phase_e.py` (limit 128 tokenów).
Skrypt nie zapisuje typu CPU, ceny instancji ani czasu wielu serii
i nie ustawia jawnie jednego wątku, mimo opisu „Single-Thread”.
Ta przepustowość nie wystarcza do wyznaczenia kosztu `c` ani do
potwierdzenia, że Jev przekracza lub nie przekracza próg opłacalności.

### Siła dowodu dla kwantyzacji INT8 z fazy E3

`thesis/run_phase_e.py` trenował osobny DistilBERT na 1509 przykładach
SafePersuasion i oceniał FP32 oraz dynamiczne INT8 na tych samych 378
testowych tekstach, bez ewaluacji testu w trakcie treningu. Zapisane
agregaty w `thesis/figures/deep_e/all_results_e.json` to F1 macro
0,7010974 dla FP32 i 0,7059383 dla INT8 (różnica +0,0048408), rozmiary
wag 255,45 i 132,29 MiB oraz 25,34 i 14,99 ms/tekst w jednorazowym
pomiarze 100 tekstów CPU. Pomiar czasu używał limitu 128 tokenów;
pomiar F1 limitu 256. Są to dwa różne ustawienia wejścia.

Skrypt usuwa tymczasowe pliki wag po zmierzeniu rozmiaru i zapisuje
jedynie agregaty, nie predykcje jednostkowe FP32/INT8 ani manifest CPU,
wersji bibliotek i surowych powtórzeń czasu. W obecnym stanie nie można
odtworzyć parowego przedziału różnicy F1 ani zweryfikować stabilności
przyspieszenia na innym sprzęcie. „Brak spadku” jest opisem **jednego
zaobserwowanego testu**, nie dowodem równoważności modeli. Wartość
`abs(delta F1) < 0,005` jest warunkiem przyjętym w skrypcie, nie
zewnętrzną normą SLA. Tego przebiegu nie wolno mieszać z nową serią
`research_v2`, gdzie trenowano na 1207 tekstach i 302 odłożono na
walidację; choć test liczy również 378 tekstów, wagi są inne.
Końcowy JSON nie jest też niezmiennym artefaktem pojedynczego przebiegu:
`thesis/test_pod.py` odczytuje wcześniejsze `all_results_e.json`,
opakowuje jego liczby DistilBERT w nową strukturę i zapisuje plik
pod tą samą nazwą. Historia pliku nie zawiera manifestu identyfikującego
konkretną sesję CPU/GPU. Przy publikacji trzeba zachować słowo
„obserwacja”, a nie przedstawiać E3 jako niezależnie odtworzonej
gwarancji wdrożeniowej.

### Faza E2: „0% fałszywych alarmów” a przeoczone ataki

Końcowy `thesis/figures/deep_e/all_results_e.json` dla stres-testu
korespondencji zarządczej pochodzi z późniejszego `thesis/test_pod.py`,
który nadpisał sekcję E2 wcześniejszego `run_phase_e.py`. Zbiór E2 to
**100 przykładów napisanych bezpośrednio w skrypcie**: 50 oznaczonych
jako bezpieczne i 50 jako BEC. Nie jest to próba ruchu firmowego ani
niezależnie anotowany zbiór rzeczywistych incydentów. Modele uczono
na lokalnym `phishing_text`: SVM na pierwszych 8000 treningowych
przykładach, a DistilBERT i DeBERTa-v3 na pierwszych 4000, więc ich
wyniki nie są kontrolowanym porównaniem architektur przy tej samej
ilości treningu. `phishing_text` ma dodatkowo problem mieszanych
źródeł spam/ham opisany wyżej.

| Wariant | FP / 50 bezpiecznych | TP / 50 ataków | FN / 50 ataków | F1 macro |
|---|---:|---:|---:|---:|
| SVM | 7 | 28 | 22 | 0,7033 |
| DistilBERT | 1 | 21 | 29 | 0,6745 |
| DeBERTa-v3 | 0 | 6 | **44** | 0,4544 |
| DistilBERT, próg 0,65 | 0 | 17 | **33** | 0,6297 |

Zatem 0% fałszywych alarmów DeBERTy oznaczało wykrycie tylko
12% ataków; wariant z progiem 0,65 wykrył 34%. `test_pod.py` nazywa
ten próg „calibrated”, ale nie dopasowuje tu temperatury ani progu
na osobnej walidacji. Zapisane agregaty nie zawierają jednostkowych
predykcji E2 ani przedziałów niepewności. Wniosek może brzmieć tylko:
na tym ręcznie skonstruowanym zbiorze zmniejszenie liczby alarmów
wiązało się z wysokim odsetkiem przeoczonych ataków. Nie ma dowodu
na bezpieczną automatyzację SOC ani przewagę architektury.

### Faza D2: literówki i hipoteza o tokenizacji

`thesis/figures/deep_d/all_results_d.json` podaje przy szumie 15%
F1 macro SVM 0,6130 oraz DistilBERT bez obrony 0,4376; przy poziomie
0% odpowiednio 0,6127 i 0,7035. Jest to zaobserwowana utrata jakości
DistilBERT w **jednym losowym zakłóceniu** testu SafePersuasion.
`thesis/run_phase_d.py` przy każdej literze z prawdopodobieństwem
`prob` zamienia ją z następnym znakiem (czasem spacją lub interpunkcją);
nie mierzy faktycznego udziału zmienionych słów ani liczby tokenów
przed i po perturbacji. SVM używa słownych TF-IDF 1–2-gramów, nie
specjalnego klasyfikatora znakowego. Nie zapisano predykcji
jednostkowych, wielu seedów szumu ani parowych przedziałów różnic.
Przyczyna „curse of tokenization” jest więc **hipotezą mechanistyczną**,
nie ustalonym przez ten eksperyment mechanizmem. Model uczony na
zakłóconym treningu osiągnął 0,7084 przy 15% szumu, ale tylko
0,5681 na wejściu bez szumu; również tu potrzebny jest opis kosztu
odporności na danych czystych, a nie sama najwyższa liczba.

### Faza D3: kalibracja i punkt risk–coverage

Skrypt `thesis/run_phase_d.py` minimalizuje NLL względem temperatury
używając **logitów i etykiet testu** SafePersuasion; tym samym zestawem
oblicza później ECE i krzywą risk–coverage. Nie ma odrębnej walidacji
kalibracji. Zapisane w `thesis/figures/deep_d/all_results_d.json`
ECE 0,09153695 → 0,08669306 oznacza względny spadek **5,29%**,
nie ponad 60%. `T=1,5` jest równe wartości startowej optymalizatora;
bez śladu jego działania nie stwierdzamy, czy rzeczywiście znalazł
optymalną temperaturę. Funkcja ECE grupuje prawdopodobieństwo klasy 1
i porównuje je z jej częstością, więc jest miarą kalibracji tej klasy,
nie typową miarą kalibracji pewności wybranej klasy.

Punkt 78,5714% pokrycia zapisano przy progu **0,64**, nie 0,65.
Na 378 tekstach odpowiada to 297 decyzjom automatycznym i 81
odroczonym. Ryzyko selektywne 20,2020% oznacza **60 błędnych
decyzji wśród 297 automatycznych**. Próg odczytano z tej samej
krzywej testowej; nie jest zwalidowanym ustawieniem wdrożeniowym,
a 20,2% błędów nie uzasadnia opisu „bezpieczna automatyzacja SOC”.

### Mapa ośmiu hipotez z obecnego szkicu pracy

To kontrola zakresu wnioskowania względem hipotez H1–H8 zapisanych
w `thesis/magisterka_draft.tex`, **bez edycji tekstu pracy**.
„Ograniczona” znaczy, że istnieje wynik dla konkretnego protokołu,
ale nie dowód pełnego, ogólnego zdania hipotezy.

| Hipoteza | Stan dowodu na 2026-09-29 | Granica wniosku |
|---|---|---|
| H1: przewaga semantyczna ΔF1 > 0,08 | Ograniczona | SafePersuasion: pięć seedów DistilBERT średnio 0,6960 vs SVM 0,6290, więc Δ≈0,067, poniżej progu H1. ReaMent_con: 0,6965 vs 0,6094, Δ≈0,087, lecz test już oglądano i są to dialogi filmowe, nie dowód ogólnego mechanizmu „samouwaga niezbędna”. |
| H2: nasycenie leksykalne i zbędny koszt Transformera | Częściowa obserwacja, decyzja kosztowa niewykazana | Starszy SVM ma F1 0,9729 na `phishing_text` i 1,0 na syntetycznym `scam_phone`; pierwszy zbiór miesza etykiety pochodzące także ze spam/ham, drugi ma łatwe artefakty generacji. Nie porównano rzeczywistego kosztu wdrożenia przy tej samej jakości na nowych wiadomościach. |
| H3: ogon dialogu odwraca relację na korzyść Transformera | Niewykazana w poprawionym protokole | Na autorskim SEConvo 40/360 SVM końcowego okna zmienia F1 0,6615→0,7363 względem początkowego, ale DistilBERT ma 0,3466 w obu oknach i w obu oznacza wszystko jako atak. Starszy wynik BERT na własnym 320/80 nie potwierdza H3 na podziale autorów. |
| H4: strukturalna klątwa tokenizacji | Mechanizm niewykazany | Jedna perturbacja 15% obniża DistilBERT 0,7035→0,4376 przy stabilnym SVM około 0,613; nie mierzono fragmentacji tokenów ani nie powtórzono szumu. Użyty SVM ma **słowne**, nie znakowe n-gramy. |
| H5: bezpieczne 75–80% automatyzacji SOC | Sprzeczna z zapisanym ryzykiem; brak niezależnej walidacji | Temperatura dopasowana na teście; przy pokryciu 78,6% błędnych jest 60/297 decyzji automatycznych. Nie zdefiniowano dopuszczalnego ryzyka operacyjnego. |
| H6: przyczynowy próg 15 słów dla samouwagi | Niewykazany | Koszyki długości fazy E4 mieszają cztery domeny i modele uczone na SafePersuasion; różnica F1 może wynikać ze źródła, etykiety i składu klas, a nie samej długości lub struktury samouwagi. SVM nie używa tu znakowych n-gramów. |
| H7: INT8, ≥40% szybkości przy stracie F1 <0,005 | Ograniczona obserwacja | W jednym przebiegu rozmiar 255,45→132,29 MiB, przepustowość 39,46→66,72/s i F1 0,7011→0,7059. Brak manifestu CPU, powtórzeń czasu i predykcji parowych; próg 0,005 jest lokalnym kryterium, nie normą SLA. |
| H8: neutralizacja APT i rozróżnianie BEC | Ograniczona dla skonstruowanych zakłóceń; BEC operacyjnie niewykazane | Sanitizer odwraca dokładnie mapę homoglifów wstrzykniętych przez ten sam skrypt i usuwa wybrane znaki zero-width; nie testowano niezależnego kamuflażu APT. W ręcznym teście E2 DeBERTa miała 0 FP, ale 44/50 FN. |

Statusy nie unieważniają wykonanych pomiarów. Oddzielają to, co
rzeczywiście zmierzono, od silniejszych tez o przyczynie, statystycznej
równoważności lub gotowości operacyjnej. Nowe testy wymagają
zamrożonego protokołu i podziału walidacja/test.

### Phishing Text: warunki podziału grupowego przed nowym treningiem

Ponownie odczytano lokalne `data/phishing/texts.json` (SHA-256
`2479fdb94abb59332cc747f7b823a1651921b9828240c5dad0ffdba66ab02581`).
Surowych rekordów jest 20 137, w tym jeden pusty; 20 136 niepustych
wierszy obejmuje 20 007 dokładnie różnych treści. Po NFKC,
`casefold`, zamianie ciągów `\W+` na spację i `strip` powstaje
**19 972 grupy**. Różnica 35 względem deduplikacji dokładnej oznacza
dodatkowe warianty tekstów. W całym pliku nie wykryto grupy ze
sprzecznymi etykietami; największa znormalizowana grupa liczy
6 wierszy. Pozwala to zachować etykiety przy przyszłym podziale
grupowym. Jest to kontrola wariantów tekstowych, nie dowód braku
parafraz semantycznych ani błędów etykiet.

Po dokładnej deduplikacji klasy liczą 12 464 bezpiecznych i 7543
pozytywne. Mediana długości to 752 znaki, P95 5957, P99 14 529;
2990/20 007 tekstów ma ponad 512 słów. Sześć różnych tekstów ma
ponad 100 000 znaków (pięć oznaczonych jako 0, jeden jako 1),
a największy ma **17 036 692 znaki i 3 527 576 słów**. Bez jawnej
polityki dla takich rekordów tokenizacja może zdominować pamięć i czas
przygotowania, a arbitralne ucięcie początku może zgubić informację
z końca wiadomości. Te liczby opisują długość i potrzebę kontroli,
nie przesądzają, że wszystkie długie wiersze są błędne.

## Porównanie na podziale autorów SEConvo (40/360)

Bez zmiany kodu pipeline'u podano do `src.train_svm.train_eval_svm` obiekt
`Split` z 40 rozmowami z `annotated_train.json` i 360 z
`annotated_test.json`. Użyto istniejącego `_dialogue_to_text` oraz tych
samych parametrów TF-IDF + LinearSVC. Trening zawierał 24 manipulacyjne
i 16 bezpiecznych rozmów; test 191 manipulacyjnych i 169 bezpiecznych.
Wynik: F1 macro **0,7019364**, accuracy 0,7278, recall ataku 0,9634,
macierz pomyłek `[[78,91],[7,184]]`. Bardzo wysoka czułość ataku idzie
tu w parze z 91 fałszywymi alarmami na 169 bezpiecznych rozmów.

Wcześniejsze F1 macro SVM **0,7834** z `comparison_f1_macro.md` dotyczy
autorskiego podziału wewnętrznego 320/80. Aż 285 z 360 rozmów oficjalnego
testu znalazło się w jego treningu. Nie jest to przeciek między treningiem
a testem *wewnętrznego* podziału, ale wynik 0,7834 nie mierzy wydajności
na teście wydanym przez autorów.

Kontrolny pomiar SVM włączono następnie do wspólnego protokołu, z zapisem
predykcji jednostkowych. Dla BERT-base-uncased, RoBERTa-base i
DistilBERT-base-uncased wykonano po pięć przebiegów (seedy 42–46).
Każdy model uczono wyłącznie na 40 rozmowach autorów: 3 epoki, batch 8,
maksymalnie 512 tokenów, learning rate 2e-5. Podczas treningu nie
oceniano testu. Predykcje 360 rozmów, manifesty, logi i podsumowanie
są w `outputs/seconvo_official/`. Analizator potwierdził jednakowe
skróty SHA-256 plików źródłowych i skryptu, identyfikatory i etykiety
testu oraz predykcje SVM we wszystkich 15 przebiegach; F1 przeliczono
ponownie z zapisanych predykcji.

| Model | F1 macro, średnia ± SD z 5 seedów | Zakres F1 | Średni recall ataku | Średni odsetek fałszywych alarmów |
|---|---:|---:|---:|---:|
| TF-IDF + LinearSVC | 0,7019 (deterministyczny punkt odniesienia) | — | 96,3% | 53,8% |
| BERT-base-uncased | 0,4700 ± 0,1356 | 0,3466–0,6362 | 94,6% | 82,5% |
| RoBERTa-base | 0,3479 ± 0,0029 | 0,3466–0,3532 | 100,0% | 99,9% |
| DistilBERT-base-uncased | 0,3466 ± 0,0000 | 0,3466 | 100,0% | 100,0% |

Wszystkie pięć przebiegów DistilBERT oznaczyło **każdą** rozmowę jako
atak; RoBERTa zrobiła to w czterech przebiegach, a w piątym oznaczyła
359/360 jako atak. Sam recall 100% nie jest więc sukcesem. BERT jest
niestabilny przy tych ustawieniach i zaledwie 40 przypadkach treningowych.
Nie przypisujemy niepowodzenia jednoznacznie architekturze ani
„attention dilution”: możliwe czynniki to wielkość treningu, przycięcie
do 512 tokenów, dobór hiperparametrów i wariancja inicjalizacji.
To wynik **konkretnego protokołu**, nie ogólna teza o Transformerach.

Kontrola długości zapisanym tokenizerem DistilBERT, po wyłączeniu
automatycznego obcinania na czas pomiaru, wykazała 31/40 rozmów
treningowych i 269/360 testowych dłuższych niż 512 tokenów.
Kod i manifest SHA-256 tej kontroli: `src/analyze_seconvo_lengths.py`
oraz `outputs/seconvo_official/token_lengths_distilbert.json`.
Mediany wyniosły odpowiednio 602,5 i 639,5 tokenu. W teście limit
przekraczało 169/191 rozmów atakujących i 100/169 bezpiecznych.
To dokumentuje rzeczywiste przycięcie danych i różnicę między klasami,
ale nie identyfikuje przyczyny spadku F1; wymagałoby to osobnej
kontroli przy stałym podziale i zmienionej długości wejścia.

Przebiegi współdzielą jeden test 360 rozmów i nie są niezależnymi
próbami generalizacji. Co więcej, ten sam test był już wcześniej używany
w projekcie po wewnętrznym przetasowaniu 320/80, więc eksperyment
stanowi korektę protokołu i pomiar eksploracyjny, a nie dziewiczy
holdout. Porównanie z wcześniejszym DeBERTa-v3 0,824 / SVM 0,834
dotyczy odrębnego podziału i nie stanowi sprzeczności.

Serię wykonano na A100 SXM 80 GB Secure Cloud (stawka 1,59 USD/h).
Suma zmierzonych czasów treningu 15 przebiegów wyniosła 18,01 s
(teoretycznie 0,00795 USD samego GPU), a predykcji 6,89 s
(0,00304 USD); **nie są to kwoty fakturowane osobno**. Saldo konta
przed serią: 0,8077534913 USD; po ręcznym usunięciu poda:
0,6144368265 USD. Rzeczywista różnica salda **0,1933166648 USD**
obejmuje przygotowanie środowiska, pobieranie modeli, transfery i czas
bezczynności. Po serii lista aktywnych podów była pusta.

## Kontrola położenia informacji w SEConvo — SVM, bez nowego GPU

Na tym samym autorskim podziale 40/360 i z tymi samymi parametrami
TF-IDF + LinearSVC ponowiono trening osobno na pełnych rozmowach,
pierwszych 510 tokenach treści oraz ostatnich 510 tokenach treści.
Okna wycięto według offsetów zapisanego tokenizera DistilBERT, zachowując
oryginalne znaki; dwa miejsca z limitu 512 pozostają na `[CLS]` i `[SEP]`.
Wariant pełny **dokładnie odtworzył wszystkie 360 predykcji** wcześniej
zarchiwizowanego SVM. Kod, skróty źródeł i tokenizera, manifest i predykcje
jednostkowe są w `src/seconvo_window_svm.py` oraz
`outputs/seconvo_official/window_svm_control/`.

| Tekst wejściowy SVM | F1 macro | TN | FP | FN | TP |
|---|---:|---:|---:|---:|---:|
| Cały dialog | 0,7019 | 78 | 91 | 7 | 184 |
| Pierwsze 510 tokenów treści | 0,6615 | 67 | 102 | 7 | 184 |
| Ostatnie 510 tokenów treści | 0,7363 | 94 | 75 | 15 | 176 |

Końcowe okno uzyskało wyższy F1 niż początkowe o 0,0749. Parowy
bootstrap po 360 rozmowach (5000 replik) dał przedział 95%
[0,0296; 0,1213], a dwustronny parowy test permutacyjny po korekcie
Holma za trzy porównania p=0,0054. Dla końca wobec pełnego tekstu
różnica F1 wyniosła +0,0344, lecz p po korekcie Holma = 0,0596;
analogicznie dla początku wobec całości różnica −0,0405 i p=0,0596.
Wszystkie te analizy są **eksploracyjne**, bo test był już używany;
przedziały bootstrap nie są skorygowane za wielokrotność porównań.
Ponadto korzystniejszy F1 końcowego okna ma koszt bezpieczeństwa:
15 fałszywych negatywów zamiast 7 dla pełnego tekstu. Wynik pokazuje,
że położenie fragmentu wpływa na cechy dostępne nawet prostemu SVM.
Nie dowodzi, że przycięcie jest przyczyną niepowodzenia Transformerów,
ani że ostatnie okno jest lepszą polityką operacyjną.

## Bezpośredni test okna DistilBERT na SEConvo

Zmieniono **tylko stronę przycięcia** w osobno trenowanych modelach
DistilBERT: pierwsze lub ostatnie 512 tokenów, z tymi samymi seedami
42–46, autorskim treningiem 40 i testem 360, 3 epokami, batch 8 oraz
learning rate 2e-5. Bazowe wagi przypięto do rewizji Hugging Face
`12040accade4e8a0f71eabdb258fecc2e7e948be`. Testu nie używano w
trakcie uczenia ani do wyboru progu. Audyt rzeczywistych identyfikatorów
tokenów potwierdził różne wejście pierwszego i ostatniego okna w 31/40
rozmowach treningowych i 269/360 testowych. Każdy z dziesięciu przebiegów
zapisał predykcje wszystkich 360 rozmów, manifest źródeł i log; dla
seeda 42 zapisano także obydwa modele. Kod i wyniki:
`src/research_seconvo_window_transformer.py`,
`src/audit_seconvo_windows.py`,
`src/analyze_seconvo_window_transformer.py`,
`outputs/seconvo_window_transformer/`.

| Okno DistilBERT | F1 macro, pięć seedów | Średnie AUROC | Średnie AP | FP/FN w każdym przebiegu |
|---|---:|---:|---:|---:|
| Początek | 0,3466 ± 0 | 0,6870 | 0,7058 | 169/0 |
| Koniec | 0,3466 ± 0 | 0,6945 | 0,6970 | 169/0 |

**Wszystkie 10 modeli oznaczyło wszystkie rozmowy jako atak.** Różnica
F1 koniec–początek wyniosła dokładnie zero w każdym seedzie. Jest to
negatywny wynik dla hipotezy, że samo zachowanie końca dialogu naprawia
ten wariant DistilBERT. AUROC powyżej 0,5 wskazuje na pewien sygnał w
uszeregowaniu zapisanych wyników probabilistycznych, mimo bezużytecznej
decyzji przy domyślnym progu; nie jest to zwalidowany alternatywny próg
ani potwierdzenie gotowości klasyfikatora. Różnica średnich AUROC między
oknami to tylko 0,0076 i nie jest stabilna między seedami. Ponieważ test
był już wielokrotnie używany, całość ma charakter eksploracyjny.
Nie rozstrzyga też wpływu *samej długości* wejścia ani małej liczby
rozmów treningowych.

Serię wykonano na A100 SXM 80 GB Secure Cloud po 1,59 USD/h. Suma
zmierzonych czasów `trainer.train()` dla 10 przebiegów: 9,31 s
(teoretycznie 0,00411 USD samego czasu treningu, **nie rachunek**).
Saldo RunPod przed serią: 0,6144368265 USD; po pobraniu wyników i
ręcznym usunięciu poda: 0,4570616219 USD. Faktyczny ubytek salda
wyniósł **0,1573752046 USD** i obejmuje przygotowanie, instalację,
pobieranie wag, transfer oraz czas bezczynności. Lista podów po pracy
była pusta, bieżąca stawka 0 USD/h.

## Dodatkowy audyt kandydatów na bazę (2026-09-28/29)

Kryterium było to samo co w `DATASETS.md`: tekst komunikacji cyfrowej,
etykiety pasujące do pytania badawczego, jawne pochodzenie i możliwość
uczciwego testu bez powtórzeń między treningiem a testem. W tym etapie
**nie trenowano modeli** i nie wydano środków RunPod/Jev.

### Phishing validation emails — pozornie 2000, faktycznie 100 tekstów

Sprawdzono [rekord Zenodo v1](https://zenodo.org/records/13474746)
(DOI 10.5281/zenodo.13474746). Pobranego pliku
`Phishing_validation_emails.csv` MD5
`1bf8ec0fe3f67e12dd275ce5b2b91b69` zgadza się z sumą udostępnioną
przez Zenodo; SHA-256 pobranych bajtów:
`ad15f63cb8db2caaee33c442f1ff4488b9444530a4c42ab63bb580016b160bd3`.
Niezależne odczyty CSV w PowerShell i standardowej bibliotece Pythona
dały identyczne liczby:

| Klasa | Wiersze | Różne teksty, porównanie dokładne |
|---|---:|---:|
| Safe Email | 1000 | 77 |
| Phishing Email | 1000 | 23 |
| Razem | 2000 | **100** |

Nie było konfliktu etykiet dla tych samych tekstów. Po NFKC, zamianie
na małe litery oraz usunięciu interpunkcji i symboli liczba różnych
tekstów nadal wynosi 100. Demonstracyjny podział stratyfikowany
`train_test_split(test_size=0.2, random_state=42)` daje 1600/400
wierszy, przy czym **400/400 tekstów testowych występuje dokładnie w
treningu** (87 różnych tekstów w teście). Nie wolno raportować wyniku
na takim podziale jako generalizacji do nowych e-maili. Opis źródła
mówi o mieszance wiadomości rzeczywistych i generowanych; nie rozdziela
ich w polach CSV. Metadane rekordu nie deklarują licencji (`rights=null`).
Werdykt: odrzucić jako główny niezależny test, zachować wyłącznie jako
przykład ryzyka duplikatów.

### MessengerPhishingDetection — bliższy kanał, ale niedokumentowany

Przejrzano [repozytorium autorów](https://github.com/ku-autoai/MessengerPhishingDetection)
na commicie `438cfbb251410fee791f49d75d928520847030c3` (2026-04-27).
Audyt angielskich plików CSV wykonano na plikach pobranych z tego commita;
`git hash-object` potwierdził zgodność z Git blob SHA: train
`86d2bf63788430b448ea7bb2435c9d425003b60a`, valid
`7705339954a36b628900379bcd9b8e455836abf6`, test
`78619f9e48328f13f33fbfaac38d21ceddcd1df4`.

| Podział EN | Wiersze | Normalne | Phishing | Udział phishingu |
|---|---:|---:|---:|---:|
| Train | 2540 | 1420 | 1120 | 44,1% |
| Valid | 781 | 710 | 71 | 9,1% |
| Test | 1562 | 1420 | 142 | 9,1% |

W treningu jest 2490 różnych tekstów dokładnych; po tej samej
normalizacji co wyżej jest 2447 różnych tekstów i 93 nadmiarowe
wiersze w 89 grupach, bez
konfliktów etykiet. Między train–valid i train–test nie wykryto
znormalizowanych duplikatów, natomiast test zawiera **dwa teksty**
występujące także w valid (bez konfliktu etykiet). Jest to kontrola
tekstów identycznych po normalizacji, nie wyszukiwanie parafraz.
Repozytorium ma jeden commit, nie ma pliku LICENSE ani deklaracji
licencji w metadanych GitHub; README opisuje etykiety i skrypty,
ale nie podaje wystarczającego pochodzenia każdego przykładu ani
metody anotacji. Różnica częstości klasy dodatniej może być celową
symulacją wdrożenia lub skutkiem konstrukcji zbioru — bez opisu nie
rozstrzygamy tego. Werdykt: nie włączać do głównego benchmarku przed
wyjaśnieniem praw i pochodzenia; ewentualny pomiar byłby osobnym
eksperymentem przesunięcia częstości klas.

### Pozostałe źródła

- [PsyScam, Ma i in., Findings EMNLP 2025](https://aclanthology.org/2025.findings-emnlp.675/)
  opisuje prawdziwe raporty o scamach z etykietami technik psychologicznych
  i dziewięcioelementową taksonomią. [Repo autorów](https://github.com/KiteFlyKid/PsyScam)
  udostępnia tylko część danych (`D2.csv`); komplet jest na prośbę.
  Na commicie `0e9f00409adf827749b32da68c7a1523a372d90a` pobrano
  ten podzbiór (SHA-256
  `7457ce652f26c3e339018544aa2915cc9338506d1995bc6867e71863bd2c7652`).
  Zawiera 730 różnych identyfikatorów i opisów, **wszystkie oznaczone
  typem Phishing** — bez klasy negatywnej. Po sparsowaniu słowników
  technik w 19 wierszach brak etykiet, a w 8 wierszach występuje
  łącznie 9 kluczy spoza dziewięciu nazw kanonicznych z `PTs.csv`
  (m.in. odwrócona kolejność `Scarcity and Urgency` i dodatkowy
  `scam message`). Przed eksperymentem wieloetykietowym potrzebna
  byłaby jawna mapa etykiet i kontrola takich rekordów, bez dopasowania
  jej na zbiorze testowym. To cenne źródło do analizy technik/XAI, lecz
  nie bezpośredni test binarny atak–bezpieczne. Pola kontaktowe w pliku
  wymagają ostrożnego obchodzenia się z danymi; raport nie kopiuje ich
  treści.
- [BitAbuse, Lee i in., Findings NAACL 2025](https://aclanthology.org/2025.findings-naacl.247/)
  ma rzeczywiste przykłady zakłóconego tekstu phishingowego, lecz
  prawidłową odpowiedzią jest tekst po usunięciu zakłóceń. Nie wolno
  liczyć na nim F1 detekcji atak–bezpieczne bez osobno zdefiniowanej
  etykiety i kontroli.
- [Seven Phishing Email Datasets](https://figshare.com/articles/dataset/Seven_Phishing_Email_Datasets/25432108)
  ma licencję CC BY 4.0 i powiązaną publikację IEEE ICMI 2024 (DOI
  10.1109/ICMI60790.2024.10585821). Później pobrano i skontrolowano
  dwa z siedmiu tekstowych CSV; wyniki nakładania i pochodzenia etykiet
  opisano w osobnej sekcji poniżej. Pozostałych pięciu nie audytowano.

## ReaMent — kontrola właściwego wariantu zbioru (2026-09-29)

W [publikacji autorów](https://arxiv.org/html/2505.15255) eksperymenty
prowadzono na `ReaMent_con`, 3355 dialogach z pełną zgodą anotatorów,
a nie na pełnym `ReaMent` (5000 dialogów). Autorzy opisują losowy
podział 6:2:2, ale bez seeda pozwalającego odtworzyć te same trzy listy.
Dla pełnego zbioru podają Fleiss κ=0,52. W trakcie budowy korpusu
używali wstępnego filtrowania kandydatów przez LLaMA3-70B, więc 68,3%
pozytywnych etykiet nie odzwierciedla częstości manipulacji w ruchu.

Pełny plik 5000 dialogów, obecny wcześniej lokalnie: dotychczasowy
TF-IDF + LinearSVC na własnym podziale 4000/1000 (`seed=42`) uzyskał
F1 macro 0,6476001, macierz `[[147,170],[122,561]]`. Przy kontroli
najbliższych sąsiadów (TF-IDF słowne 1–2-gramy) 5 tekstów testowych
miało podobieństwo cosinusowe co najmniej 0,70 do treningu. Para ID
4732/3027 o cosinusie 0,9999 ma sprzeczne etykiety 0/1 i różni się
głównie liczbą powtórzeń tej samej wypowiedzi. Nie raportujemy tego
wyniku jako porównywalnego z tabelą autorów.

Pobrano autorski `ReaMent_con.json` z rewizji Hugging Face
`b192ead11448a6bf73faa5e483a11a14657027b0`; SHA-256 pliku:
`4d0a4a04fb983867c5607fcb87971b61755bb32c782ce4d989b0cca048bb8b4f`.
3355 ID i dialogów jest unikatowych; 2362 etykiet dodatnich i 993
ujemne. Własny stratyfikowany podział 2013/671/671 z `seed=42` dał
SVM F1 macro 0,6093696 na teście oraz macierz `[[73,126],[75,397]]`.
Nie ma dokładnych tekstów wspólnych dla treningu i testu; w audycie
cosinusowym żaden tekst testowy nie osiągnął 0,70 do treningu.
To nadal własny wynik eksploracyjny, nie reprodukcja podziału autorów.
Licencja danych [CC BY-NC-ND 4.0](https://huggingface.co/datasets/YSGao/ReaMent/blob/main/README.md)
jest odrębna od licencji MIT kodu autorów. W tym kroku nie użyto GPU
ani płatnego API Jeva.

### Zamrożone porównanie ReaMent_con: SVM i pięć seedów DistilBERT

Po audycie uruchomiono oddzielny eksperyment z plikiem powyżej.
`src/research_reament_con.py` zapisuje własny podział stratyfikowany
2013/671/671 (`seed=42`), identyfikatory oraz predykcje SVM na każdym
tekście testowym. Powtórzony baseline dokładnie odtworzył F1 macro
**0,6093696** i macierz `[[73,126],[75,397]]`. Manifest źródła,
podziału i wyniki: `outputs/reament_con_fixed_v1/`.

`src/research_reament_transformer.py` odrzuca zmieniony plik danych
przed uczeniem. Dla seedów 42–46 użyto tych samych 2013/671/671 ID,
`distilbert-base-uncased` (rewizja HF
`12040accade4e8a0f71eabdb258fecc2e7e948be`), 3 epok, batch 16,
256 tokenów, learning rate 3e-5, A40. Najlepszy checkpoint wybierano
po F1 macro walidacji na końcu epoki; test przewidywano dopiero po
uczeniu. Wszystkie pięć manifestów ma identyczne SHA-256 danych,
manifestu bazowego i skryptu. `src/analyze_reament_con.py` ponownie
oblicza F1 z predykcji i wymaga tych samych ID/etykiet testu.

| Seed | F1 macro test | FP / 199 | FN / 472 | Czas treningu |
|---:|---:|---:|---:|---:|
| 42 | 0,7024 | 101 | 53 | 25,78 s |
| 43 | 0,7147 | 96 | 53 | 25,31 s |
| 44 | 0,6647 | 122 | 40 | 25,27 s |
| 45 | 0,6912 | 106 | 52 | 25,60 s |
| 46 | 0,7095 | 90 | 67 | 25,25 s |

Średnia F1 macro **0,6964881**, SD próby **0,0198176**. Seed 46
wybrano według najwyższego wyniku walidacyjnego (0,65209), nie według
testu. Jego różnica F1 do SVM to +0,10012; parowy bootstrap po 671
wierszach (5000 replik, seed 20260929) daje eksploracyjny przedział
95% [0,05268; 0,14725]. Test nie jest dziewiczy, gdyż etykiety
oglądano przy wcześniejszym SVM; pięć seedów dzieli ten sam test.
Zbiór dotyczy dialogów filmowych, a nie phishingu.

Sesja RunPod A40 Secure Cloud dała ubytek salda **0,0688739481 USD**
według późniejszego odczytu 0,4227675302 → 0,3538935821 USD, łącznie
z transferem modelu i narzutem. Wcześniejszy odczyt bezpośrednio po
usunięciu poda dawał 0,3582219154 USD; opłata dopisała się z opóźnieniem.
Historia billingowa dla ID poda zwracała jeszcze pustą listę, więc
różnica salda pozostaje najlepszym dostępnym pomiarem, nie rozbiciem
faktury. Pod `80jn02pw45vv46` został usunięty; lista podów jest pusta,
bieżąca stawka 0 USD/h. Zapisano pięć manifestów, jednostkowe
predykcje, logi, środowisko, `summary.json` i wagi modelu seed 46.
SHA-256 pobranych wag zgadza się z pod: `85a2cb7000f85fa95f32b72dd8e427c4f7b0c2db88560ff037f9cc8e39f9a27f`.
Po zmianach pełny zestaw 27 testów przeszedł.

## Figshare „Seven Phishing Email Datasets” — pochodzenie etykiet i nakładanie (2026-09-29)

Metadane [Figshare, rekord 25432108](https://figshare.com/articles/dataset/Seven_Phishing_Email_Datasets/25432108)
podają CC BY 4.0 i publikację Champa, Rabbi, Zibran, IEEE ICMI 2024
(DOI 10.1109/ICMI60790.2024.10585821). Repozytorium ma siedem par
plików: tekstowy CSV i wersję zwektoryzowaną. Do kontroli pobrano
tylko tekstowe `Ling.csv` (2859 wierszy; MD5
`eac6399dc0c7ae455aebb64423dadc8b`, SHA-256
`9407c9e022accc6c831e54c5226b99b30ac4ae07682e63f5d483ed0ec17ff23c`)
i `Assassin.csv` (5809; MD5 `d921e0b2333bfaa058bd38193e6b3fbd`,
SHA-256 `3bfe8f8abff89f69a98456be50413c2fcb20a476141116dd84ee1507b980c00e`).
Oba skróty MD5 zgadzają się
z metadanymi Figshare. Odpowiednio 458 i 1718 wierszy ma etykietę 1.

Artykuł autorów nazywa etykietę 1 „scam/phishing”, lecz identyfikuje
źródła jako Ling-Spam, Apache SpamAssassin i TREC Spam Track. Pierwotne
[AUEB NLP](https://nlp.cs.aueb.gr/en/software_data.html),
[Apache SpamAssassin](https://spamassassin.apache.org/old/publiccorpus/readme.html)
i [NIST TREC](https://trec.nist.gov/data/spam.html) definiują ich
zadanie jako **spam/ham**, nie specyficznie phishing/benign. Nie
stwierdzono dodatkowej anotacji potwierdzającej phishing dla każdej
pozytywnej wiadomości. Dlatego nie wolno automatycznie utożsamiać
wyników na tych zbiorach z detekcją ataków inżynierii społecznej.

Porównano te dwa CSV z lokalnym `data/phishing/texts.json` (20137
wierszy) po NFKC, zamianie na małe litery, usunięciu interpunkcji i
wyrównaniu odstępów. Dla Ling dopasowano `subject + body`:
**2577/2859** wierszy; dla SpamAssassin dopasowano `body`:
**2292/5809**. Dla dopasowanych par nie było konfliktów etykiet.
To co najmniej 4869 dopasowań w źródłach, nie 4869 dowiedzionych
unikatowych wiadomości w lokalnym korpusie. Po zliczeniu różnych
znormalizowanych treści w lokalnym korpusie jest ich **4854**
(2574 Ling, 2280 SpamAssassin, bez części wspólnej między tymi dwoma
zbiorami). Samo użycie Figshare jako
„zewnętrznego testu” dla modelu trenowanego na `phishing_text`
powodowałoby znaczące nakładanie źródeł. Pozostałych pięciu plików
nie pobrano i nie audytowano; nie uogólniamy tych liczb na całość.

## E-PhishLLM i Sting9 — kontrola nowych kandydatów (2026-09-29)

[E-PhishLLM](https://github.com/pajola/e-phishGen) pochodzi z pracy
Pajola i in., AISec 2025 ([tekst autorów](https://www.giovanniapruzzese.com/files/papers/aisec25/aisec25.pdf)).
Autorzy wygenerowali zarówno wiadomości phishingowe, jak i bezpieczne
przez GPT-4o-mini z syntetycznych profili firm i pracowników. Jest to
test współczesnej syntetycznej domeny, nie obserwacja prawdziwych
incydentów. Sama publikacja ostrzega, że starsze korpusy często mylą
spam z phishingiem, co wspiera ostrożną interpretację `phishing_text`.

Pobrano `ephishLLM.json` z commita autorów
`3ff53fb2ddeb09594b383406315d2ca47464c4e6` (12 275 474 bajty,
SHA-256 `56420b143e30343f6db723c3716e10abec9f72a67ba99ae2cc7c3a87b547f51f`).
Plik ma 16 616 różnych par `Subject`–`Body` (8398 etykiet 0, 8218
etykiet 1). Angielski podzbiór użyty w publikacji ma 11 502 wiadomości:
5506 bezpiecznych i 5996 phishingowych. Po normalizacji NFKC,
małych literach, usunięciu interpunkcji i wyrównaniu odstępów nie ma
żadnego dokładnego nakładania ani dla `Body`, ani dla `Subject + Body`
z lokalnym `phishing_text`. To nie wyklucza parafraz.

Silny artefakt etykiety: dosłowne `<<link>>` występuje w 4220/8218
pozytywnych i 0/8398 negatywnych rekordów pełnego pliku. Reguła
„czy `Body` zawiera jakikolwiek fragment `<<...>>` o długości 1–40
znaków” oznacza 4798 pozytywnych i żadnego negatywnego w całym
pliku. Na samym angielskim podzbiorze ta reguła ma macierz
`[[5506,0],[2409,3587]]`, F1 macro **0,7846**. Jest to diagnostyka
wykonana po oglądaniu zbioru, a nie bezstronna walidacja nowego
klasyfikatora; dowodzi jednak, że surowy plik pozwala osiągać wysokie
F1 na prostym znaczniku formatowania zamiast semantyce. W pliku są
również 64 rekordy z innym kodem języka niż `en`, `it` lub `de` (10
różnych kodów języka łącznie), mimo że artykuł opisuje trzy języki.
Repozytorium nie deklaruje licencji w GitHub API i nie zawiera pliku
LICENSE; przed dystrybucją lub włączeniem do głównego benchmarku
trzeba wyjaśnić prawa i przyjąć politykę maskowania znaczników.

[Sting9](https://sting9.org/dataset) reklamuje otwarty zbiór
zgłoszeń, lecz strona dostępu mówi o CC0, podczas gdy
[osobna strona licencji](https://sting9.org/license) i stopka mówią
o ODC-BY-NC z dodatkowymi ograniczeniami publikacji. Oficjalny link
„Download from GitHub” prowadził w dniu kontroli do 404. Bez
dostępnego snapshotu i spójnych warunków nie używać go teraz jako
źródła treningowego ani testowego.

## Phishing Pot — rzeczywiste wiadomości, ale tylko klasa dodatnia (2026-09-29)

[Repozytorium rf-peixoto/phishing_pot](https://github.com/rf-peixoto/phishing_pot)
przedstawia wiadomości z honeypotów i zgłoszeń. W FAQ autorzy
zastrzegają, że do kolekcji mogły trafić również wiadomości spamowe.
Plik licencji deklaruje Attribution-NonCommercial 4.0 International
(CC BY-NC 4.0); metadane GitHub API zwracają `NOASSERTION`, ponieważ
plik nie jest standardowo rozpoznany. Użyto snapshotu commita
`49f63777126b0bdb9eb1f6e770a5c3f9df2b0306`, nie zmiennego `main`.

Publiczne drzewo zawiera **8614 plików `email/*.eml`** o łącznej
wielkości blobów 422 771 079 bajtów. Lokalnie dostępnych było 8612;
dwa śledzone pliki (`sample-398.eml`, `sample-472.eml`) nie były obecne
w kopii roboczej, dlatego nie zostały odczytane. Przyczyny braku nie
ustalono. Wybrano część `text/plain` lub `text/html`,
bez otwierania odsyłaczy czy uruchamiania załączników. W 121 plikach
nie uzyskano treści. Po normalizacji NFKC, małych literach, usunięciu
interpunkcji i wyrównaniu odstępów otrzymano **7398 różnych wartości
treści (łącznie z pustą)** oraz 7941 różnych wartości `Subject + Body`.
Powtórzenia należy grupować przed jakimkolwiek podziałem.

W porównaniu z lokalnym `phishing_text` znaleziono 123 dopasowania
samego `Body` oraz 6 dopasowań `Subject + Body`. To dwa osobne sposoby
liczenia; ich wyników nie należy sumować jako 129 unikatowych maili.
Zbiór może służyć jako kandydat do zewnętrznego sprawdzenia **czułości
na ataki**, po deduplikacji, usunięciu nakładania i ręcznej kontroli
próbek. Nie zawiera klasy bezpiecznej, więc nie pozwala wyliczyć
binarnego F1 ani swoistości. Nawet czułość wymaga potwierdzenia, że
wybrane wiadomości są rzeczywiście phishingiem, nie ogólnym spamem.
Surowe wiadomości mogą zawierać adresy i aktywne złośliwe odsyłacze;
nie kopiowano ich do tego raportu ani nie należy ich redystrybuować.

## PhishRewrite v1.0 — audyt zewnętrznego benchmarku (2026-09-29)

Zweryfikowano [rekord Zenodo 21018700](https://zenodo.org/records/21018700)
i archiwum `phishrewrite-benchmark-v1.0.zip` (MD5 zgodny z rekordem:
`6868f01f5c416a93b5c3ffccc6a947c8`; SHA-256 pobranych bajtów:
`bc907619f21e87f87bfa5be6ee886eee59d18a4a0f72698401719e82441e04c7`).
Archiwum zawiera 28 201 wiadomości z unikalnym `id` i 4000 przeróbek
500 wiadomości testowych; identyfikatory `original_id` przeróbek wszystkie
odnoszą się do oryginałów phishingowych z testu. To audyt danych, **bez
treningu i bez wyniku modelu**.

Wszystkie 5390 pozytywy pochodzą z Nazario, a wszystkie 22 811 negatywów
z Enron (18 700) i SpamAssassin (4111, wyłącznie podzbiory ham). Mimo że
negatywy nie są ogólnym spamem, pochodzenie źródła jest doskonałą cechą
zastępczą etykiety. Wysoki wynik na losowym podziale tego pliku nie
potwierdzałby jeszcze rozpoznawania phishingu na nowym źródle.
Między podziałami train/test jest 0 identycznych tekstów, lecz **5 wspólnych
wartości po normalizacji** NFKC/casefold/usunięciu znaków niealfanumerycznych.
Nie ma znormalizowanych tekstów ze sprzecznymi etykietami.

W porównaniu z lokalnym `data/phishing/texts.json` według pola `text`
po tej samej normalizacji znaleziono 281 pokrywających się wierszy:
278 Enron i 3 SpamAssassin; z tego **61 leży w teście** (60 Enron,
1 SpamAssassin). To dolna granica nakładania według dokładnej
normalizacji, nie wykluczenie parafraz ani wariantów inaczej
oczyszczonych. Przed jakąkolwiek zewnętrzną oceną modelu trenowanego na
`phishing_text` trzeba te wiersze wykluczyć i przeliczyć mianowniki;
nie wolno nazywać oryginalnego testu w pełni niezależnym.

[Metadane Zenodo](https://zenodo.org/api/records/21018700) deklarują
CC BY 4.0, lecz `LICENSE` **w tym samym archiwum** ogranicza użycie danych
pochodnych do niekomercyjnych badań obronnych; dodatkowo Nazario nie ma
formalnej licencji OSI. Traktujemy to jako niespójność praw do
redystrybucji, nie rozstrzygamy jej sami. Archiwum zawiera treść
prawdziwych wiadomości i defangowane URL-e — nie kopiować ich do
raportu ani nie odwiedzać odsyłaczy. Skrypt audytu i zagregowany wynik
są w przestrzeni roboczej Codex pod `work/audit_phishrewrite.py` oraz
`work/audit_phishrewrite_summary.json`.

Werdykt: potencjalnie przydatny **pomocniczy stress-test** dla
tekstowych przeróbek phishingu po wykluczeniu przecieków, zamrożeniu
progu na walidacji i jawnym opisaniu zależności źródło–etykieta.
Nie zastępuje niezależnego testu detekcji prawdziwych incydentów ani
pomiaru Jeva na nowej domenie.

## MeAJOR v2 i SpaPhish — kontrola trafności etykiet (2026-09-29)

Pobrano `cleaned_preprocessed.csv` z [MeAJOR Corpus v2 na Zenodo](https://zenodo.org/records/18471483).
MD5 pliku `aa8f59e96787cbd696c0b650e5400dc9` jest zgodne z rekordem;
SHA-256 pobranych bajtów:
`5bf5371897ab4e4aa7ac6d8f499869e6c32e4456ed09636731e4069947b69f4f`.
CSV ma 108 685 wierszy danych, lecz jeden wiersz jest pusty i nie ma
etykiety ani źródła. Wśród **108 684 ważnych wierszy** występują tylko
trzy wartości `source`:

| Źródło | Etykieta 0 | Etykieta 1 | Razem |
|---|---:|---:|---:|
| TREC-05 | 29 929 | 19 654 | 49 583 |
| TREC-06 | 11 208 | 3 797 | 15 005 |
| TREC-07 | 19 513 | 24 583 | 44 096 |
| Razem | **60 650** | **48 034** | **108 684** |

Każde z tych źródeł zawiera obie klasy, więc samo pole `source` nie
wyznacza etykiety tak jak w PhishRewrite. Poważniejszy problem dotyczy
**znaczenia etykiety**. [Publikacja MeAJOR](https://arxiv.org/html/2507.17978)
opisuje 135 894 końcowych wiadomości po połączeniu Nazario, Nigerian
Fraud i TREC-05/06/07; tabelarycznie nazywa TREC korpusami e-mailowego
spamu. Nie opisuje ponownego, jednostkowego oznaczania TREC jako
phishingu. [Oryginalny NIST TREC Spam Track](https://trec.nist.gov/data/spam.html)
ma zadanie spam/ham. Pobrana wersja v2 zawiera jedynie TREC, bez
Nazario i Nigerian Fraud. Nie ustalamy przyczyny rozbieżności między
wersją pliku a artykułem. Nie wolno jednak na podstawie obecnych
metadanych nazywać 48 034 pozytywów **potwierdzonym phishingiem**.
Wynik modelu na tym pliku byłby co najwyżej wynikiem na dostarczonych
etykietach o niepewnej trafności dla pytania magisterskiego; wstrzymano
trening i wydatki GPU. Surowe wiadomości nie są kopiowane do raportu.

Alternatywa do dalszej oceny: [SpaPhish v5, opis autorów](https://data.mendeley.com/datasets/hz2d6gz7pc/5)
deklaruje 1395 hiszpańskich e-maili, 731 phishingowych i 664
legalne, pochodzących od współpracujących użytkowników. Opis zawiera
wieloosobową anotację klas oraz pięciu technik perswazji, co jest
tematycznie bliższe manipulacji semantycznej. Pobrano publiczny plik
`Spaphish dataset - DiB.csv` (5 098 917 bajtów, SHA-256
`656b2245d58da72d640680e5c2a168673a130b38607f2a427c773bbb167e995e`)
oraz `README.txt`. Kontrola lokalna potwierdza 1395 wierszy,
47 kolumn, podział klas 731/664, 1395 różnych identyfikatorów w
poprawnym formacie SHA-256, 3 puste tematy i brak pustych treści przed
normalizacją. Plik jest oddzielany **przecinkami**, choć README
twierdzi, że separatorem jest średnik. To nie zmienia wyników audytu,
ale parser należy ustawić według faktycznego pliku.

Po NFKC, casefold i zastąpieniu niealfanumerycznych ciągów spacją:
1385 różnych samych treści (8 grup powtórzeń, 10 dodatkowych wierszy,
jedna treść staje się pusta) oraz 1392 różne pary `subject + body`
(3 grupy po dwa wiersze). Nie ma konfliktów etykiet w tych grupach.
Podział train/validation/test musi grupować co najmniej
znormalizowane `subject + body`; ostrożniejsza wersja grupuje same
treści. Mediana długości treści to 705 znaków, P95 3683, maksimum
28 630. Skrypt agregujący i wynik bez treści wiadomości:
`work/audit_spaphish.py`, `work/audit_spaphish_summary.json` w
przestrzeni roboczej Codex.

W pięciu wymiarach perswazji zapisane etykiety konsensusu zgadzają
się z większością głosów A/B/C dla wszystkich wierszy. Nie oznacza
to pełnej zgodności ekspertów: jednomyślność zależnie od wymiaru
dotyczy od 915 do 1176 z 1395 wiadomości. Przykładowo `authority=1`
występuje u 593/664 legalnych i 690/731 phishingowych wiadomości.
Obliczona z trzech binarnych ocen Fleiss κ wynosi: `authority` 0,3557,
`social_proof` 0,4982, `liking_similarity_deception` 0,2867,
`commitment_integrity_reciprocation` 0,5159 oraz `distraction`
0,6553. Są to obliczenia z pobranego pliku, nie wartości zgłoszone
przez autorów; interpretacja κ zależy od częstości etykiet.
Nie wolno więc traktować każdej etykiety perswazji jako synonimu
ataku. Kolumny anotacji, uzasadnienia i identyfikatorów nie mogą być
wejściem modelu oceniającego phishing z samego tekstu, bo dawałyby
informację spoza wiadomości lub przeciek etykiety.

Wszystkie 1371 niepuste daty dały się odczytać jako dzień/miesiąc/rok;
24 wiadomości nie mają daty i **wszystkie 24 mają etykietę phishingu**.
Rok również silnie koreluje z klasą: w 2025 r. jest 423 pozytywnych
spośród 511 datowanych wiadomości (82,8%), a łącznie w latach
2014–2024 — 284/860 (33,0%). To nie dowodzi błędnych etykiet,
ale stwarza skrót klasyfikacyjny i przesunięcie rozkładu w ewentualnym
podziale czasowym. W teście tekstowym nie używać pola `date`, jego
braku ani pochodnych roku jako cechy wejściowej. Podział czasowy
może być osobnym stres-testem generalizacji, lecz wymaga raportowania
odmiennych częstości klas oraz czułości i swoistości, nie tylko F1.

SpaPhish pozostaje **kandydatem**, nie zaakceptowanym benchmarkiem:
nie sprawdzono reprezentatywności źródeł ani jakości każdej etykiety
jednostkowej. Angielskie `distilbert-base-uncased` nie daje tu
bezpośredniego porównania z obecnymi angielskimi testami; ewentualny
eksperyment wymagałby osobnego protokołu wielojęzycznego i kontroli
kosztu. W tej kontroli nie trenowano modeli i nie wydano środków
RunPod ani Jev.

## PhishFuzzer — trzy klasy, lecz silny skrót źródłowy (2026-09-29)

[Publikacja Toth, Gruschka i Bisztray](https://arxiv.org/html/2511.21448)
proponuje osobne klasy phishing/spam/valid oraz warianty e-maili
generowane z prawdziwych wzorców. Pobrano z [repozytorium autorów](https://github.com/DataPhish/PhishFuzzer)
rewizję `1e21dd4edbe5c64694f156bf5318c97c7c80681c`: plik
3300 wzorców (SHA-256
`394d542e27dcef57321bc69f0f93b03e5965531f616eb3d3c79416cc60a30765`)
oraz 19 800 wariantów (SHA-256
`62f9c1231cf7e9d1b4a9740680aefcf8723e689ac60ae171ea4e0eef70f1275d`).
To analiza danych, **bez treningu, F1 i płatnych wywołań**.

Wzorce mają 1126 etykiet `Phishing`, 1074 `Spam` i 1100 `Valid`.
Wśród 300 z oznaczeniem `Source=Manual` rozkład wynosi odpowiednio
103/95/102, a nie dokładne 100/100/100 podane w publikacji. Nie
znamy przyczyny tej drobnej rozbieżności. Pozostałe 3000 wzorców
tworzą rodziny źródeł:

| Rodzina źródła | Phishing | Spam | Valid |
|---|---:|---:|---:|
| Nazario | 1015 | 0 | 0 |
| WarrantedSpam | 0 | 842 | 0 |
| SpamArchive | 0 | 121 | 0 |
| CEAS | 0 | 0 | 839 |
| SpamAssassin (różne warianty nazwy) | 8 | 16 | 159 |

Dobór klasy większościowej dla każdej z pięciu rodzin dałby
**2976/3000 = 99,2% poprawnych etykiet publicznych wzorców**.
Jest to diagnostyka po odczycie etykiet, **nie wynik modelu na
tekście ani niezależny test**. Pole `Source` nie musi być wejściem
klasyfikatora, ale charakterystyczny język i format rodziny korpusów
mogą przenosić tę samą informację. Wysokie F1 po losowym podziale
wierszy nie dowodziłoby detekcji phishingu u nowych nadawców.

Każdy z 3300 identyfikatorów wzorca ma dokładnie sześć wariantów;
wszystkie `Original_ID` są poprawne i wszystkie etykiety wariantów
zgadzają się z etykietą wzorca. Ponadto 3300 wzorców zawiera
**78 grup powtórzonych po NFKC/casefold/usunięciu interpunkcji par
`Subject + Body`** między różnymi `Original_ID` (80 dodatkowych
wierszy), bez konfliktów etykiet. Cztery grupy są wewnątrz części
manualnej, 74 w publicznej. Podział po samym `Original_ID` chroni
rodzinę sześciu wariantów, ale nie rozdzieli tych powtórzeń;
potrzebna jest dodatkowa grupa treści.

Porównanie z lokalnym `data/phishing/texts.json` według samego
znormalizowanego `Body` znalazło **82 pokrywające się wzorce**:
76 `Valid` ze SpamAssassin, 5 `Phishing` z Nazario i 1 z części
`Manual` (łącznie 6 `Phishing`). Nie znaleziono pokrycia przy
porównaniu `Subject + Body` do lokalnego pola `text`; te sposoby
przygotowania treści nie są równoważne, więc brak drugiego
dopasowania nie unieważnia pierwszego. Liczba 82 jest dolną granicą
nakładania według dokładnej normalizacji, bez parafraz. Przed
zewnętrznym testem modelu trenowanego na `phishing_text` trzeba
wykluczyć te wzorce wraz z ich sześcioma wariantami.

Szczególnie interesujące może być **300 wiadomości z prywatnej
kolekcji** opisanej przez autorów jako anonimizowana i ręcznie
oznaczona, ale jedna z nich pokrywa się z lokalną bazą. Ta część jest
mała, a sprawdzenie jakości anotacji jednostkowej i praw do danych
pozostaje otwarte. GitHub API nie podaje licencji, a w korzeniu
repozytorium nie ma pliku `LICENSE`; nie redystrybuować treści i
nie uznawać zbioru za główny benchmark, dopóki prawa nie zostaną
wyjaśnione. Agregaty i skrypt kontroli zapisano w przestrzeni Codex
pod `work/audit_phishfuzzer_summary.json` i
`work/audit_phishfuzzer.py`.

Preflight tej ręcznej części: spośród 300 wzorców 265 oznaczono językiem
angielskim (`Phishing` 91, `Spam` 87, `Valid` 87). Po normalizacji
NFKC/casefold i usunięciu interpunkcji są w niej trzy grupy powtórzonego
tematu z treścią, bez sprzecznych etykiet. Jedna angielska treść
phishingowa nakłada się z lokalnym `phishing_text` według samego body;
żadna nie nakłada się według tematu z body. Po usunięciu wszystkich
trzech nadmiarowych wierszy i nakładającej się wiadomości zostaje
**261 angielskich wzorców** (`Phishing` 88, `Spam` 86, `Valid` 87).
To potencjalna wielkość testu, nie zatwierdzony benchmark ani wynik F1.

Rok jest wyraźnie związany z etykietą: w angielskiej części z 2025 r.
jest 89 wiadomości phishingowych, 34 spamowe i 59 poprawnych, a z
2026 r. odpowiednio 1, 52 i 8. W oczyszczonej części prosta diagnostyka
wybierająca najliczniejszą klasę *osobno dla każdego roku na tych
samych danych* trafiłaby 158/261 (60,5%). To diagnostyka artefaktu
z użyciem etykiet całego zbioru, **nie** wytrenowany model ani uczciwy
wynik testowy. Ewentualny test tekstowy musi jawnie kontrolować datę,
źródło i nakładanie oraz nie może korzystać z wygenerowanych wariantów
tych samych wzorców jako niezależnych obserwacji.

## Phishing Text — poprawiony podział i pięć treningów (2026-09-29)

Na wyraźną zgodę użytkownika wykonano porównanie TF-IDF + LinearSVC z
DistilBERT na lokalnym `data/phishing/texts.json` (SHA-256
`2479fdb94abb59332cc747f7b823a1651921b9828240c5dad0ffdba66ab02581`).
W pierwszym przebiegu diagnostycznym deduplikowano pełne teksty, a potem
ucięto je do 4096 znaków. Kontrola *faktycznych wejść modeli* znalazła
11 znormalizowanych treści wspólnych między częściami podziału (31
wierszy). Ten przebieg i przerwany seed 43 są **wyłączone** z końcowego
porównania. Drugi lokalny preflight również został zastąpiony, ponieważ
pozostawiał jedną powtórzoną pełną treść. Nie łączymy ich wyników z serią
końcową.

Protokół końcowy (`outputs/phishing_group_v3_local/`, nazwa eksperymentu
wewnątrz manifestu `phishing_text_normalized_group_v1`) tworzy grupy
przechodnie po dwóch kluczach: całym tekście oraz tekście widocznym po
ucięciu do 4096 znaków, w obu przypadkach NFKC, casefold i zamiana
ciągów znaków niebędących składnikami słowa na spację. Jedna grupa
pozostaje jedną obserwacją; konflikt etykiet zatrzymuje przebieg.
Z 20 137 wierszy odrzucono 2 puste lub bez tekstu widocznego i 191
nadmiarowych członków grup. Pozostało **19 944** obserwacji (12 456
etykiet 0, 7488 etykiet 1), w tym 1634 z uciętą treścią. Własny
stratyfikowany podział seed 42 to 11 966 train / 3989 validation /
3989 test; liczby klasy 1 to odpowiednio 4492 / 1498 / 1498.
Kontrola po podziale: **zero** wspólnych znormalizowanych treści zarówno
według pełnego, jak i modelowi widocznego tekstu. SHA-256 zamrożonego
`split.json`: `a02cd7e5464fbe65789d76e716a9eda98ccc77a7e682891fc8452992b47ae8db`.

SVM: słowny TF-IDF 1–2-gramowy, `min_df=2`, do 50 000 cech,
`LinearSVC(class_weight=balanced)`. Oba modele otrzymały ten sam
tekst do 4096 znaków; DistilBERT ograniczał go jeszcze do 256 tokenów.
Transformer: `distilbert-base-uncased`, 3 epoki, batch 16, 3e-5,
warmup 0,1, weight decay 0,01. W każdym seedzie najlepszą epokę
wybierano na F1 macro walidacji; test przeliczano po treningu. SVM
trenował się lokalnie 13,21 s i dał na teście F1 macro **0,9689**,
macierz `[[2444,47],[69,1429]]` (47 FP, 69 FN).

| A40 / seed | F1 macro walidacji | F1 macro testu | FP | FN | Czas treningu |
|---|---:|---:|---:|---:|---:|
| 42 | 0,9823 | 0,9826 | 20 | 45 | 174,18 s |
| 43 | 0,9824 | 0,9848 | 25 | 32 | 163,09 s |
| 44 | 0,9826 | 0,9869 | 21 | 28 | 156,04 s |
| 45 | **0,9837** | 0,9832 | 33 | 30 | 162,25 s |
| 46 | 0,9810 | 0,9818 | 21 | 47 | 159,39 s |

Średnia pięciu testowych F1 DistilBERT wynosi **0,98383 ± 0,00203**
(odchylenie standardowe między seedami, wspólny test). Seed 45 wybrano
po walidacji, mimo że seed 44 miał wyższy wynik testowy. Dla wybranego
seeda różnica wobec SVM to **+0,01426 F1 macro**; parowy bootstrap
po 3989 obserwacjach (2000 replik) dał 95% przedział
**[0,00868; 0,02054]**, a dwustronny parowy test permutacyjny
(2000 zamian) p=**0,00050**. W 89 przypadkach poprawny był tylko
DistilBERT, w 36 tylko SVM. Są to testy na *tym jednym podziale*;
pięć seedów współdzieli ten sam test, więc nie jest pięcioma
niezależnymi testami generalizacji. Ponadto korpus był używany już
wcześniej w projekcie: nowa seria jest kontrolowanym powtórzeniem,
nie dziewiczym zewnętrznym potwierdzeniem.

Zapisano `split.json`, manifest SVM, predykcje i manifesty wszystkich
pięciu seedów, `summary.json`, środowisko oraz wybraną wagę seeda 45.
SHA-256 lokalnie pobranej `model.safetensors` jest zgodny ze zdalnym:
`7e12ad2c31d9764cfd2d1c391ec1406fd2b9fcb898ef93930c94fc5e30c587fd`.
Testy projektu: 38/38 przeszły. Wagi pozostałych seedów nie były
archiwizowane lokalnie; ich predykcje i konfiguracje są zapisane.

RunPod A40 Secure Cloud kosztował katalogowo 0,49 USD/h. Suma
zmierzonych czasów samych pięciu treningów to 814,95 s, czyli
**0,1109 USD** przy tej stawce — kalkulacja, nie faktura. Saldo konta
przed sesją 10,3538935821 USD, po usunięciu poda 10,0601711774 USD;
obserwowany ubytek **0,2937224047 USD** obejmuje również przygotowanie,
transfer, dwa nieważne preflighty i oczekiwanie. Rozliczenia mogą być
dopisywane z opóźnieniem. Pod `yh4f9vldppg7d2` został usunięty,
lista podów była pusta, a bieżąca stawka konta 0 USD/h.

Najważniejsza granica interpretacji: `phishing_text` ma dostarczone
etykiety mieszanych wiadomości e-mail/SMS; część źródeł pierwotnie
rozróżniała spam/ham. F1 ~0,98 mierzy zgodność z **tymi etykietami**,
nie czułość na niezależnie potwierdzone ataki phishingowe ani gotowość
systemu SOC. Źródłowe i formatowe skróty pozostają możliwe, mimo
wyeliminowania wykrytych duplikatów. Przed silniejszą tezą potrzebny
jest zewnętrzny test ze sprawdzoną anotacją i kontrolą pochodzenia.

## Phishing Text — powtórzenie seeda 45 na karcie L4 (2026-09-29)

Cel tego przebiegu to **pomiar sprzętu i kosztu** na dłuższym,
zamrożonym zadaniu, nie kolejna niezależna walidacja phishingu.
Stan konta RunPod przed sesją: 10,052888095 USD, zero aktywnych podów
i bieżąca stawka 0 USD/h. Katalog nie miał dostępnej RTX A5000;
dwie próby rezerwacji RTX 4090 Secure Cloud w różnych centrach
zwróciły brak instancji i nie utworzyły poda. Dostępny był L4
Secure Cloud po 0,49 USD/h. Utworzono pod `4jgyo4dyskz2vu` z
oficjalnego szablonu PyTorch 2.8.0, a po pracy usunięto go;
lista podów wróciła do `[]`, stawka bieżąca do 0 USD/h.

Na L4 uruchomiono **ten sam** `src/research_phishing_transformer.py`,
seed 45, podział i manifest SVM z `outputs/phishing_group_v3_local/`.
Pakiet przesłany na pod miał zgodny SHA-256 po obu stronach:
`c2ea98c45a4bc0d9e23e3a940ced4340a7898c0a7edaac16026626104bc15878`.
Kontrola manifestów A40/L4 potwierdziła równość SHA-256 źródła,
podziału, manifestu bazowego i skryptu oraz identyczne parametry:
3 epoki, batch 16, 256 tokenów, 3e-5, warmup 0,1, weight decay 0,01.
W obu środowiskach: Python 3.12.3, Torch 2.8.0+cu128,
Transformers 4.45.2 i rewizja bazowego DistilBERT
`12040accade4e8a0f71eabdb258fecc2e7e948be`.
Różni się karta: A40 wobec L4 (23 034 MiB według `nvidia-smi`).

| Seed 45 na tym samym podziale | A40 | L4 |
|---|---:|---:|
| Czas `trainer.train()` | 162,245 s | **218,911 s** |
| Stawka Secure Cloud | 0,49 USD/h | 0,49 USD/h |
| Koszt *samego zmierzonego treningu*, rachunek analityczny | 0,02208 USD | 0,02980 USD |
| Najlepsza epoka według F1 walidacji | 2 | 3 |
| F1 macro walidacji | 0,983713 | 0,984453 |
| F1 macro testu | 0,983170 | 0,986609 |
| Macierz testu `[[TN,FP],[FN,TP]]` | `[[2458,33],[30,1468]]` | `[[2474,17],[33,1465]]` |

L4 potrzebowała **1,349 razy** więcej czasu treningu, więc przy
równej stawce koszt samego czasu GPU był o około 35% wyższy.
To pojedynczy przebieg sprzętowy, nie stabilny ranking kart: narzut
systemowy, wykorzystanie procesora i wariancja uruchomienia nie były
powtarzane na obu maszynach. Wyższe F1 na L4 **nie dowodzi**, że karta
poprawia klasyfikację. Mimo tego samego seeda trening nie był bitowo
deterministyczny między GPU: różniła się wybrana epoka i 31 z 3989
predykcji testowych. Wszystkie 3989 ID i etykiet były zgodne; F1 i
macierze przeliczono lokalnie z pobranych CSV i uzyskano dokładnie
wartości manifestu.

Saldo bezpośrednio po usunięciu poda: 9,9587438451 USD. Obserwowany
ubytek sesji to **0,0941442499 USD**; obejmuje start, instalację,
transfer i oczekiwanie, a rozliczenie może jeszcze mieć opóźnienie.
Nie należy zestawiać tej jednej sesji wprost z ubytkiem salda dla
pięciu treningów A40. Wszystkie wyniki, log, jednostkowe predykcje
i wybrany model znajdują się w
`outputs/phishing_gpu_l4_seed45/`. SHA-256 lokalnych wag
`best_model/model.safetensors` zgadza się ze zdalną sumą:
`ff72f8d7218a62d1665758fbffb5bdbd8f600863f08b8c64aa5672ad48e3679b`.
Pierwotne etykiety `phishing_text` nadal nie są niezależnie
zweryfikowanym oznaczeniem rzeczywistych ataków phishingowych.
