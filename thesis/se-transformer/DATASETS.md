# Wybór korpusów — część praktyczna (EXTRA)

Temat: detekcja **SE** + **manipulacji semantycznej** w komunikacji cyfrowej (Transformer vs baseline).

## Core (już było)

| Task | Zbiór | N | Po co |
|---|---|---:|---|
| `seconvo` | SEConvo (human-annotated) | 400 | Symulowane rozmowy LinkedIn o SE; 400 oznaczonych przez ludzi, ale rozmowy wygenerował GPT-4 Turbo. Autorski trening liczy tylko 40 rozmów. Przy 512 tokenach większość testu nadal jest obcinana; szczegóły w audycie z 2026-09-28. |
| `mentalmanip` | MentalManip_maj | 4000 | Ludzkie etykiety większościowe dla dialogów ze scenariuszy filmowych (ACL 2024), nie autentycznych rozmów ani ataków cyber-SE; wariant pełnej zgody anotatorów ma 2915 dialogów. |

## Extra (dodane — lukę wielkości / domeny)

| Task | Zbiór | N | Po co / dlaczego lepsze |
|---|---|---:|---|
| `safepersuasion` | SafePersuasion | 1887 | Komentarze ludzi z r/ChangeMyView, oznaczone przez badaczy jako Manipulation vs Rational Persuasion — bliżej „manipulacja semantyczna w komunikacji cyfrowej” niż dialogi filmowe; nie są to incydenty cyber-SE ani reprezentatywna próbka ruchu. |
| `scam_phone` | BothBosu multi-agent scam | 1600 (1280/320 oficjalny split) | większy korpus rozmów scam vs nie-scam (telefon). **Uwaga:** syntetyka jest bardzo łatwa dla TF-IDF (F1≈1.0) — w pracy jako kanał „łatwy / kontrolny”, nie jako główny dowód |
| `phishing_text` | ealvaradob `texts` | 20137 | Mail/SMS, ale etykieta „phishing” wymaga ostrożności: część rekordów pokrywa się z korpusami spam/ham. Dawny audyt po usunięciu dokładnych duplikatów dawał 20 007 tekstów; jest tu rekord 17,0 mln znaków. Nowy protokół grupuje zarówno pełną, jak i widoczną po ucięciu do 4096 znaków treść: 19 944 grupy, podział 11 966/3989/3989 bez wykrytego nakładania. SVM F1 macro 0,9689; DistilBERT średnio 0,9838 ± 0,0020 (5 seedów). To wyniki dla dostarczonych etykiet, **nie** niezależnie potwierdzony phishing. Szczegóły w audycie. |
| `reament` | YSGao/ReaMent | 5000 | Dialogi z filmów internetowych; autorzy publikacji oceniają osobno `ReaMent_con` (3355 przykładów z pełną zgodą anotatorów), więc nie mieszać wyników obu wariantów. Osobny eksperyment na `ReaMent_con` ma zamrożony podział 2013/671/671: SVM F1 macro 0,6094, DistilBERT 0,6965 ± 0,0198 (5 seedów). Szczegóły i ograniczenia w audycie. |

### `phishing_text` — pochodzenie etykiet źródłowych (30.09.2026)

[Karta agregatora](https://huggingface.co/datasets/ealvaradob/phishing-dataset)
wskazuje, że `texts.json` łączy wiadomości e-mail i SMS. Jednym z
podanych źródeł jest [zbiór SMS autorstwa Mishry i Soni](https://data.mendeley.com/datasets/f45bkkt8pr/1)
(DOI `10.17632/f45bkkt8pr.1`), który ma **trzy** kategorie: 4844
`ham`, 489 `spam` i 638 `smishing`. Agregator opisuje już tylko etykietę
binarną `0`/`1`, a jego [skrypt wczytujący](https://huggingface.co/datasets/ealvaradob/phishing-dataset/blob/main/phishing-dataset.py)
zwraca wyłącznie `text` i `label`, bez źródła rekordu i bez kodu
przekształcenia trzech klas SMS na dwie. Nie znamy więc liczby
wiadomości `spam` zachowanych w lokalnym `texts.json` ani ich
przypisania po agregacji. Lokalny plik ma 20 137 wierszy, pola
wyłącznie `text,label`, klasy 0/1 w liczbie 12 465/7672 i SHA-256
`2479fdb94abb59332cc747f7b823a1651921b9828240c5dad0ffdba66ab02581`.
F1 z tego zbioru jest F1 względem
**dostarczonej etykiety binarnej**, nie zweryfikowaną miarą wykrywania
phishingu sensu stricto. Licencja Apache-2.0 na karcie agregatora nie
jest sama w sobie dowodem praw do każdego źródłowego e-maila lub SMS-a.

### scam_phone — audyt łatwego wyniku (30.09.2026)

[Karta autorów](https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation) opisuje rozmowy jako syntetyczne dialogi dwóch agentów AI, wygenerowane z użyciem AutoGen i Together Inference API; nie są to nagrania ani transkrypcje rzeczywistych połączeń. Lokalny oficjalny podział ma 1280 przykładów treningowych i 320 testowych, po 160/40 dla każdego z ośmiu typów scenariusza. W obu częściach cztery typy (`ssn`, `refund`, `support`, `reward`) mają wyłącznie etykietę 1, a pozostałe cztery (`delivery`, `insurance`, `appointment`, `wrong`) wyłącznie etykietę 0. Sama kolumna `type` pozwoliłaby więc bezbłędnie odtworzyć etykietę, ale **nasz loader nie podaje jej modelom**: wejściem jest wyłącznie `dialogue` z neutralnymi nazwami ról; `personality` również nie jest podawane. Nie należy nazywać tego bezpośrednim przeciekiem kolumny `type` do wejścia modelu.

Po zamianie nazw ról, złożeniu białych znaków i zmianie wielkości liter wszystkie 1280 tekstów treningowych oraz 320 testowych są unikatowe; **0** znormalizowanych tekstów testowych jest identycznych z treningowymi. Mimo braku takich duplikatów klasy pozostają skonfundowane z tematyką rozmowy. Eksploracyjnie w teście dosłowne `appointment` występuje w 41/160 rozmów klasy 0 i 0/160 klasy 1, a `social security` w 1/160 klasy 0 i 94/160 klasy 1. Pojedyncze słowa nie są pełnym klasyfikatorem ani dowodem przyczynowym; pokazują jednak widoczne dla modeli wskazówki scenariusza. Archiwalne F1 macro = **1,0000** dla SVM i trzech Transformerów na tym podziale należy interpretować jako separację **tych wygenerowanych typów** w tej samej rodzinie danych, nie jako wykazaną skuteczność na nowych rodzajach oszustwa lub rzeczywistych połączeniach. Nie ma tu testu przeniesienia na nieznane typy.

Lokalne SHA-256: `agent_conversation_train.csv` `e1c89f4e252162f5a37c01d2ebe9e0cdcad3b22b7bcf01ef730877cef04612db`; `agent_conversation_test.csv` `93d380c704e47d81028aa55c03a3f28cd6e23498c03cb70aad136a3762c0cc74`. Sposób wczytania i normalizacji: `src/data_load.py`; wynik porównania: `outputs/comparison_f1_macro.md`. Pliki źródłowe pozostają poza repozytorium.

## MentalManip — pochodzenie etykiet i granica wnioskowania (30.09.2026)

[Publikacja autorów](https://aclanthology.org/2024.acl-long.206/) podaje jako źródło Cornell Movie Dialogs Corpus: dialogi ze scenariuszy 617 filmów. Kandydatów do anotacji wyszukiwano frazami oraz klasyfikatorem BERT wytrenowanym na przykładach wstępnie wybranych przez GPT-4 Turbo i poprawionych ręcznie. Część dialogów przeredagowano dla czytelności. Ten dobór zwiększał częstość manipulacji, więc udział klasy dodatniej nie odzwierciedla zwykłych rozmów ani ruchu cyfrowego.

Każdy dialog oceniało trzech anotatorów. Autorzy podają Fleiss κ = 0,596 dla pytania binarnego o manipulację. Nasz loader używa lokalnego `mentalmanip_maj.csv` (SHA-256 `2923c0e336a52ac1370d045b0975369b83eb2535f173180d959a15822f90cb93`), czyli **4000 etykiet większościowych**. Osobny `MentalManip_con` obejmuje **2915** dialogów, co do których wszyscy trzej anotatorzy byli zgodni; tych dwóch wariantów nie należy utożsamiać. Wynik na naszym własnym podziale `MentalManip_maj` mierzy zgodność z oceną większości w fikcyjnych dialogach, nie skuteczność na rzeczywistych incydentach inżynierii społecznej. [Karta danych autorów](https://huggingface.co/datasets/audreyeleven/MentalManip) opisuje oba warianty i plik z jednostkowymi anotacjami.

Kontrola lokalna z rewizji Hugging Face `86e800cebf9ee2baa8f5999845027cc3f50e8fd5`: pobrano `mentalmanip_con.csv` (SHA-256 `e418d8a32e02a6e2330e4bd2786447d4bee0ef289f89263551d594c6039c8e7b`) i `mentalmanip_detailed.csv` (SHA-256 `7ce49ffd291d7fc54ebba18792670984fc3e96564a78e5fdbbcbd437a8a34b1c`). Pliki mają odpowiednio 2915 i 4000 unikatowych ID. Wszystkie ID i teksty wariantu `con` są zgodne z `maj`; każda etykieta `maj` zgadza się z większością trzech głosów w pliku szczegółowym (0 rozbieżności w 4000). W naszym stałym podziale `seed=42` test ma 800 dialogów: **605 z pełną zgodą (75,6%) i 195 z rozbieżnością anotatorów (24,4%)**. Wśród tych 195 spornych przykładów 146 ma większościową etykietę pozytywną. Wynik F1 na całym teście obejmuje więc znaczną część przypadków o niejednoznacznej etykiecie; nie należy traktować wszystkich błędów wobec niej jako bezspornych pomyłek modelu.

## SafePersuasion — pochodzenie etykiet i granica wnioskowania (30.09.2026)

[Publikacja autorów](https://aclanthology.org/2025.findings-ijcnlp.65/) opisuje korpus jako wycinek komentarzy z r/ChangeMyView, po filtrach m.in. długości 70–200 znaków, minimum 5 głosów, toksyczności i słów charakterystycznych dla platformy. Z 18 160 kandydatów autorzy zastosowali wstępny filtr dwóch modeli językowych, a następnie wylosowali 2000 komentarzy do anotacji ludzkiej. Dobór celowo zwiększał udział potencjalnej manipulacji; proporcja klas **nie jest estymatą częstości manipulacji w ruchu**. Zbiór dotyczy krótkich pojedynczych wypowiedzi bez pełnego kontekstu rozmowy.

Dwaj badacze wspólnie oznaczali sześć rund po 50 komentarzy i omawiali rozbieżności; w ostatnich dwóch rundach zgodność etykiet pierwszego poziomu wynosiła 85–89%, Cohen κ 0,69–0,71. Pozostałe 1700 komentarzy podzielono między nich do **pojedynczej** anotacji. Około 110 odrzucono jako nieperswazyjne lub trudne do interpretacji. Dlatego „etykieta ludzka” nie oznacza podwójnego, niezależnego potwierdzenia każdego z 1887 przykładów. Ponadto wstępne filtrowanie przez LLM może wpływać na skład i trudność zbioru, mimo że końcową etykietę nadawali ludzie.

Lokalny `data/safepersuasion/SafePersuasion.csv` ma SHA-256 `0a92e81c42018c1a7aa6efa283af8bbd2ce1031c6591f8e0db9292f03c0e1db8`; `first_label` zawiera 1165 Rational Persuasion i 722 Manipulation, zgodnie z tabelą autorów. Nie ma pustego `text` ani dokładnych powtórzeń tekstu. `second_label` to autorska taksonomia technik, a nie niezależny pomiar etykiety binarnej. Nasze F1 i wynik bramki Jev dotyczą zgodności z tymi etykietami na własnych podziałach, nie wykrywania wszystkich rzeczywistych ataków inżynierii społecznej.

## Świadomie odrzucone

| Kandydat | Dlaczego nie |
|---|---|
| GCT-100K | mix real/public/synthetic + słaba dokumentacja jakości etykiet |
| ScamBench (gated / agent prompts / training) | inny problem (odmowa agenta / jailbreak), nie czysta klasyfikacja tekstu |
| CSE Tsinganos | brak publicznego downloadu |
| same URL-feature phishing | to nie NLP / Transformer na tekście |
| Fraud-R1, SE-VSim, ConScamBench-278 | inny setup ewaluacji / za małe / syntetyka — patrz re-audit |

## Re-audit 2026-09-05

Pełny przegląd + werdykt: [`../DATASETS-REAUDIT-2026-09.md`](../DATASETS-REAUDIT-2026-09.md)

**6. zadanie:** ReaMent (`YSGao/ReaMent`) — wpięte do pipeline (`--task reament` / `--task all`).

**Deep keywords:** [`../DATASETS-DEEP-KEYWORDS-2026-09.md`](../DATASETS-DEEP-KEYWORDS-2026-09.md) — stan przeglądu z 2026-09-05; LoveFraud02 = case study only.

## Nowi kandydaci — kontrola 2026-09-28/29

To przegląd przydatności, **nie nowe wyniki modelu**. Szczegóły i
wersje źródeł zapisano w `RESEARCH-AUDIT-2026-09-28.md`.

| Kandydat | Werdykt dla obecnej tabeli F1 | Powód |
|---|---|---|
| [Phishing validation emails, Zenodo v1](https://zenodo.org/records/13474746) | Nie używać jako testu 2000 niezależnych e-maili | Plik ma 2000 wierszy, ale tylko 100 różnych tekstów (23 phishing, 77 safe); brak licencji w metadanych. |
| [MessengerPhishingDetection, repo autorów](https://github.com/ku-autoai/MessengerPhishingDetection) | Kandydat warunkowy, bez treningu na razie | Angielski podział ma 2540/781/1562 wierszy; udział phishingu zmienia się z 44,1% w treningu na 9,1% w walidacji/teście, a 2 znormalizowane teksty walidacji są w teście. Repo nie deklaruje licencji ani pochodzenia przykładów wystarczająco do przyjęcia jako główny benchmark. |
| [PsyScam, Findings EMNLP 2025](https://aclanthology.org/2025.findings-emnlp.675/) | Możliwy zbiór pomocniczy do technik perswazji, nie test binarny | Publiczne `D2.csv` ma 730 różnych opisów, wszystkie typu Phishing; 19 bez etykiet technik i 8 z niekanonicznymi kluczami. Brak klasy bezpiecznej do F1 scam/benign. |
| [BitAbuse, Findings NAACL 2025](https://aclanthology.org/2025.findings-naacl.247/) | Pomocniczo do odporności na szum | Etykietą jest przywrócona postać zakłóconego tekstu, nie klasyfikacja atak/bezpieczne. |
| [Seven Phishing Email Datasets, Figshare](https://figshare.com/articles/dataset/Seven_Phishing_Email_Datasets/25432108) | Nie używać jako niezależnego testu `phishing_text` ani jako czystego phishingu | Dwa pobrane pliki są zgodne z MD5 autorów. W obecnym `phishing_text` znaleziono 2577/2859 wiadomości Ling i 2292/5809 SpamAssassin po normalizacji, bez konfliktów etykiet w dopasowaniach. Pierwotne źródła mają etykiety spam/ham, nie zweryfikowany podział phishing/benign. Licencja CC BY 4.0 nie rozwiązuje problemu trafności etykiet. |
| [E-PhishLLM, Pajola i in., AISec 2025](https://github.com/pajola/e-phishGen) | Kandydat do pomocniczego testu poza domeną, nie główny „real-world” benchmark | 16 616 wygenerowanych wiadomości, w tym 11 502 po angielsku. Brak dokładnego nakładania angielskich tekstów z `phishing_text`, ale `<<...>>` występuje w 3587/5996 angielskich phishingowych i 0/5506 bezpiecznych; sama ta reguła daje eksploracyjnie F1 macro 0,7846. Przed użyciem potrzebna kontrola artefaktów generowania i praw do pliku (brak licencji repo). |
| [Sting9](https://sting9.org/dataset) | Nie włączać obecnie | Strona dostępu podaje CC0, lecz strona warunków i stopka ODC-BY-NC; reklamowany link do zrzutu GitHub zwraca 404. Brak weryfikowalnego snapshotu danych i jasnych praw na dziś. |
| [Phishing Pot](https://github.com/rf-peixoto/phishing_pot) | Kandydat do osobnego testu czułości ataków po kontroli próbek; nie do binarnego F1 | Publiczny snapshot ma 8614 plików EML, z czego 8612 odczytano. Po normalizacji jest 7398 różnych wartości treści (w tym pusta); 123 wiadomości treścią pokrywają się z `phishing_text`. Zbiór jest dodatni, a autorzy dopuszczają spam w kolekcji. Licencja CC BY-NC 4.0; nie redystrybuować surowych wiadomości. |
| [cw-l/email-corpus](https://github.com/cw-l/email-corpus) | Nie używać jako niezależnego binarnego testu phishing/benign | Snapshot `e270b256359ff8ec958c1a2aa1bd80631695324c` ma 1255 plików EML od tylko 2 anonimowych dostawców (109 i 1146). Repo opisuje je zbiorczo jako spam/scam/phishing, ale nie daje etykiety phishing dla każdej wiadomości ani klasy bezpiecznej. 1128 plików to `multipart/digest`; po bezpiecznym wyodrębnieniu tekstu z HTML/partii plain jest 1223 różnych niepustych treści, 19 nadmiarowych kopii i 13 pustych. Nagłówek `List-Unsubscribe` występuje w 1136 wiadomościach — nie wolno utożsamiać całego zbioru z phishingiem. Brak dokładnego pokrycia wyodrębnionej treści z lokalnym `phishing_text`; jedno pokrycie według `subject + plain body` dotyczy klasy 0. Licencja repo MIT, lecz autorzy ostrzegają o możliwym resztkowym PII i załącznikach; nie redystrybuować surowych EML. Skrypt audytu: `work/audit_email_corpus.py` w przestrzeni Codex. |
| [PhishRewrite v1.0, Zenodo](https://zenodo.org/records/21018700) | Pomocniczy test odporności na przeróbki tekstu, nie główny dowód skuteczności phishingowej | 28 201 e-maili i 4000 przeróbek; 5390 pozytywów pochodzi wyłącznie z Nazario, 22 811 negatywów wyłącznie z Enron/SpamAssassin, więc źródło idealnie wskazuje etykietę. Pięć znormalizowanych treści występuje między train/test, a 61 wierszy testowych pokrywa się z lokalnym `phishing_text`. Opis licencji Zenodo (CC BY 4.0) jest niespójny z ograniczeniem non-commercial w archiwum. |
| [MeAJOR Corpus v2, Zenodo](https://zenodo.org/records/18471483) | Nie używać jako zweryfikowanego testu phishing/benign | Pobrany CSV ma 108 685 wierszy, z czego jeden jest pusty. Pozostałe pochodzą wyłącznie z TREC-05/06/07: 60 650 etykiet 0 i 48 034 etykiety 1. Artykuł opisuje także Nazario i Nigerian Fraud oraz 135 894 przykładów, lecz tych źródeł nie ma w pobranym v2. TREC pierwotnie rozróżnia spam/ham; nie znaleziono opisu ponownej anotacji każdej wiadomości pod kątem phishingu. |
| [SpaPhish v5, Mendeley Data](https://data.mendeley.com/datasets/hz2d6gz7pc/5) | Kandydat do osobnego testu wielojęzycznego; bez treningu na razie | Pobrany CSV potwierdza 1395 hiszpańskich e-maili (731 phishingowych, 664 legalne), 47 kolumn i unikatowe SHA-256. Po normalizacji `subject + body` są 3 grupy duplikatów (po 2 wiersze), bez konfliktów etykiet; przy podziale trzeba je grupować. Silny związek daty z klasą: w 2025 r. 423/511 datowanych e-maili to phishing, we wcześniejszych latach 284/860; wszystkie 24 brakujące daty mają klasę 1. Pięć wymiarów perswazji ma osobne decyzje trzech anotatorów. Język hiszpański nie pozwala bezpośrednio porównywać wyników angielskich modeli; nie trenowano na tym pliku. |
| [PhishFuzzer, Toth i in., arXiv 2026](https://arxiv.org/html/2511.21448) | Kandydat warunkowy do trzyklasowego testu, zwłaszcza 300 wiadomości z prywatnych skrzynek; nie główny dowód | Publiczne pliki z rewizji `1e21dd4` mają 3300 wzorców i 19 800 wariantów po 6 na wzorzec. W 3000 publicznych wzorców sama rodzina źródła pozwala dobrać klasę większościową poprawną dla 2976 (99,2%); model może rozpoznawać pochodzenie. Są 78 grup powtórzonego znormalizowanego `subject + body` między różnymi ID wzorców i 82 pokrycia samych treści wzorców z lokalnym `phishing_text` (w tym 1 w części manualnej). Konieczny podział po rodzinie wzorca i powtórzonym tekście oraz odfiltrowanie nakładania. Repo nie deklaruje licencji; bez wyjaśnienia praw nie redystrybuować danych ani nie traktować zbioru jako głównego benchmarku. |
| [DIFrauD — podzbiór phishing, LREC-COLING 2024](https://huggingface.co/datasets/difraud/difraud) | **Pomocniczy test transferu między korpusami**, nie czysty test phishingu | 15 272 angielskie e-maile (6074 klasa 1, 9198 klasa 0), trzy publiczne splity i artykuł autorów. Po filtrowaniu z 1528 testowych wierszy zostało 1448 (557/891). Zamrożony SVM osiągnął F1 macro **0,9131**, DistilBERT seed 45 **0,8963** — odwrotną kolejność niż na wewnętrznym `phishing_text`. Pierwotny benchmark zaliczał 1019 e-maili SpamAssassin `spam` do dodatniej klasy „phishing”; nie wiadomo, ile z nich przetrwało czyszczenie DIFrauD. Szczegóły poniżej. |

### DIFrauD phishing — kontrola danych 30.09.2026

Źródło: [publikacja autorów DIFrauD](https://aclanthology.org/2024.lrec-main.468/), [karta zbioru](https://huggingface.co/datasets/difraud/difraud) w rewizji Hugging Face `aaaf94b336c563a14806bb4f3f58727bed9ed8d4` oraz [publikacja źródłowego Email Benchmark Dataset](https://par.nsf.gov/servlets/purl/10224700). DIFrauD podaje pierwotny benchmark 21 000 wiadomości, z którego po czyszczeniu zostało 15 272. Nie należy pisać, że wszystkie 15 272 wiadomości zostały nowo i niezależnie ręcznie oznaczone. Autorzy deklarują usunięcie duplikatów i korekty etykiet; poniższa kontrola dotyczy **opublikowanych plików**, nie ich intencji.

Istotna granica trafności etykiet: artykuł o pierwotnym benchmarku wylicza po stronie „phishing” 8433 e-maile Nazario, 1048 nowszych Nazario i **1019 wiadomości SpamAssassin `spam`**, a po stronie „legitimate” 6779 WikiLeaks, 2046 Enron i 1675 SpamAssassin. W tym samym artykule autorzy przy porównaniu korpusów piszą wprost, że SpamAssassin ma spam, a nie phishing. DIFrauD zachowuje wyłącznie `text,label`, bez źródła wiersza; nie da się z tych plików potwierdzić, ile dodatnich wiadomości spamowych przetrwało czyszczenie. Stąd dodatnia etykieta mierzy zgodność z kompilacją autorów, nie bezspornie atak phishingowy w każdym wierszu.

Pobrano tylko `phishing/{train,validation,test}.jsonl` do ignorowanego przez Git `data/difraud_phishing_aaaf94b/`. SHA-256: `train` `a3d65b3fbf2178640a6e0e756349da95f3f10bddf3fac2f205bb3e1aecb9aaf7`, `validation` `321649644c01a0d5523c2c2cec164e0b2a1916196553b4f1fc5be902528b8470`, `test` `a74a0eaef001d0d90dd7db6519a00213cd1bf99b18c06bf5ffc23f2044e5a068`. Rzeczywiste liczby wierszy i etykiet: train 12 217 (7358/4859), validation 1527 (920/607), test 1528 (920/608), kolejno klasa 0/1.

Kontrola tekstu po `NFKC → casefold → zamiana \W+ na spację` wykryła 14 951 różnych treści w 15 272 wierszach, bez sprzecznych etykiet w identycznych treściach. Wspólne znormalizowane **pełne** treści: train–validation 46, train–test 39, validation–test 9; po obcięciu do pierwszych 4096 znaków odpowiednio 63, 47 i 12. Z lokalnym źródłowym `phishing_text` nakłada się 190/24/21 wierszy odpowiednio w train/validation/test według pełnego tekstu. W samym teście 15 wierszy jest też w lokalnym *treningu*, 2 w walidacji i 3 w teście zamrożonego podziału; pozostałe lokalne dopasowanie mogło odpaść przy deduplikacji.

Konserwatywny **preflight przyszłego testu**, nie nowy wynik F1: przechodząc przez oficjalny test w oryginalnej kolejności, wykluczono najpierw 21 wierszy, których klucz z pierwszych 4096 znaków był wśród pełnych lub obciętych kluczy lokalnego `phishing_text`, następnie 57 z kluczem widocznym w DIFrauD train/validation i wreszcie 2 nadmiarowe kopie w samym teście. Pozostało **1448 unikatowych wierszy (891 klasa 0, 557 klasa 1)**. Długość medianowa tekstu to 947 znaków, 90. percentyl 4573, maksimum 121 699; przyszła ewaluacja musi jawnie podać limit znaków i tokenów. Dokładne dopasowanie nie wykrywa parafraz ani wspólnej rodziny źródłowej, więc ta liczba nie dowodzi pełnej niezależności.

Karta deklaruje licencję MIT dla kompilacji, lecz nie weryfikuje to automatycznie praw do każdego pierwotnego e-maila; nie redystrybuować surowych treści w repo ani w pracy. Najuczciwsze użycie to **pomocnicza ewaluacja transferu między korpusami** zamrożonych modeli z `phishing_text`, bez ponownego strojenia na teście. Nie zastępuje ona osobnej ręcznej kontroli etykiet ani nie czyni starego F1 ≈0,98 wynikiem „na prawdziwym phishingu”.

### DIFrauD — wykonany test transferu 30.09.2026

Po zatwierdzeniu protokołu przez użytkownika oceniono modele z wewnętrznego `phishing_text` na 1448 odfiltrowanych wiadomościach. **Nie trenowano i nie dostrajano na DIFrauD.** Ponieważ pierwotnego SVM nie zapisano jako pliku modelu, odtworzono go z zamrożonego lokalnego treningu i wymagano *dokładnej zgodności* predykcji na lokalnych walidacji i teście z archiwalnym manifestem. Waga DistilBERT seed 45 (wybrana według walidacji przed tym testem) ma SHA-256 `7e12ad2c31d9764cfd2d1c391ec1406fd2b9fcb898ef93930c94fc5e30c587fd`; na lokalnym teście odtworzyła wszystkie **3989/3989** decyzji z archiwalnego CSV. Oba modele dostały tę samą treść do 4096 znaków, a DistilBERT dodatkowo limit 256 tokenów.

| Model na DIFrauD po filtrach | F1 macro | Precision klasy 1 | Recall klasy 1 | Macierz `[[TN,FP],[FN,TP]]` |
|---|---:|---:|---:|---|
| TF-IDF + LinearSVC | **0,913118** | 0,858553 | 0,937163 | `[[805,86],[35,522]]` |
| DistilBERT seed 45 | 0,896282 | 0,831190 | 0,928187 | `[[786,105],[40,517]]` |

Różnica DistilBERT minus SVM wynosi **−0,016835 F1 macro**, wobec **+0,014263** na wewnętrznym teście `phishing_text`. W porównaniu parowym na DIFrauD tylko SVM miał rację w 72 przypadkach, tylko DistilBERT w 48. Eksploracyjny parowy bootstrap (2000 replik, seed 42) dał 95% przedział różnicy **[−0,03102; −0,00133]**, a dokładny McNemar p=**0,0353** (bez korekty na wybór zbioru i inne analizy). Te liczby wspierają *warunkowość* przewagi modelu, nie uniwersalną wyższość SVM: korpus jest kompilacją starych źródeł z niepewną interpretacją części klasy dodatniej.

Manifest i jednostkowe predykcje bez surowej treści są w `outputs/difraud_transfer_20260930/` (ignorowane przez Git). SHA-256 `predictions.csv`: `988a1e8fa955797b5eb2626e6972c35ddd61985fd953f211b30343eb8f174db3`. F1 i macierze ponownie przeliczono z CSV niezależnym rachunkiem; 1448 identyfikatorów wierszy i skrótów widocznych treści jest unikatowych. Skrypt powtarzalnego przebiegu: `src/evaluate_difraud_transfer.py`; testy filtra, odtworzenia SVM, kolejności inferencji i eksportu są w `tests/test_research_phishing.py`. Pełna lokalna suita: **43/43** testy przeszły po naprawie dwóch testowych konstruktorów tokenizera dla Transformers 5.16.1.

To pomiar na lokalnym CPU (Python 3.14.3, Torch 2.14.0+cpu, cztery wątki), bez wydatku RunPod. W tej sesji inferencja 1448 wiadomości trwała 1,574 s dla odtworzonego SVM i 272,092 s dla DistilBERT; czas ponownego dopasowania SVM wyniósł osobno 30,680 s, a weryfikacja DistilBERT na 3989 wcześniejszych przykładach 899,648 s. Nie traktować tego pojedynczego przebiegu jako ogólnego benchmarku szybkości ani nie mylić go z pomiarami GPU.

## Komendy

```bash
python -m src.download
python -m src.run_all --task all --skip-bert          # SVM na 5 zadaniach
python -m src.run_all --task all --bert-model bert-base-uncased --epochs 3   # Colab T4
python -m src.run_all --task extra --skip-bert
```
