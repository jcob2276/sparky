# Wyjaśnienie od A do Z — co zrobiliśmy, na czym, i **po co**

Ten plik nie jest rozdziałem pracy. To **ściągawka dla Ciebie**: żebyś rozumiał każdy wybór, każdą bazę, każdą liczbę i każde „dlaczego nie inaczej”.

Jak czytać: idź sekcja po sekcji. Przy każdym bloku jest **Co**, **Jak**, **Po co**, czasem **Czego NIE robimy**.

---

## 0. Jedno zdanie całej magisterki

> Sprawdzamy empirycznie: **czy fine-tuned Transformer lepiej wykrywa SE / manipulację w tekście niż klasyczny TF-IDF+SVM**, na kilku publicznych zbiorach, mierząc głównie **F1 macro**.

Wszystko inne (5 baz, 3 Transformery, majority, RunPod, max_length=512) służy temu jednemu porównaniu — żeby wynik był **wiarygodny**, a nie „wziąłem BERT i wyszło ładnie”.

---

## 1. Temat i pytanie badawcze

### Co

**Tytuł:** *Detekcja ataków inżynierii społecznej i prób manipulacji semantycznej w komunikacji cyfrowej z wykorzystaniem architektury Transformer*

**Pytanie:** Czy fine-tuned Transformer ma **wyższe F1 macro** niż TF-IDF+LinearSVC na tekstach SE / manipulacji?

### Po co taki tytuł / pytanie

| Element tytułu | Po co jest |
|---|---|
| **Detekcja** | To klasyfikacja (0/1), nie „zrozumienie człowieka” i nie system produkcyjny. |
| **Inżynieria społeczna (SE)** | Ataki oparte na wpływie społecznym w tekście (phishing, pretext w czacie, scam). |
| **Manipulacja semantyczna** | Nie tylko spam/phishing — też subtelne przekręcanie sensu / wpływu (komentarz, dialog). |
| **Komunikacja cyfrowa** | Czat, komentarz, mail/SMS, rozmowa — kanały tekstowe, nie URL-features. |
| **Architektura Transformer** | Konkretna rodzina modeli (BERT i kuzyni), nie „AI w ogóle”. |

### Czego tytuł NIE obiecuje

- że zbudujesz antywirusa SE  
- że model „wie”, co użytkownik czuje  
- że wynik przenosi się automatycznie na język polski  
- że Transformer zawsze wygrywa  

---

## 2. Logika eksperymentu (dlaczego taki, a nie inny)

Żeby odpowiedzieć na pytanie badawcze, potrzebujesz:

1. **Baseline klasyczny** — bez niego nie wiesz, czy Transformer cokolwiek daje.  
2. **Transformer(y)** — bo o nie pyta tytuł.  
3. **Więcej niż jeden zbiór** — bo jeden zbiór = jedna anegdota.  
4. **Zbiory łatwe i trudne** — żeby nie oszukiwać się wynikiem 0.99 na phishingu.  
5. **Jedna główna metryka** — żeby nie cherry-pickować accuracy gdy klasy są niezbalansowane.

Dlatego pipeline wygląda tak:

```text
dane publiczne
    → ten sam split / te same reguły
        → majority (dolna granica)
        → TF-IDF + LinearSVC (baseline leksykalny)
        → BERT, RoBERTa, DistilBERT (Transformery)
            → tabela F1 macro
                → dyskusja: gdzie wygrywa Transformer, gdzie nie, i dlaczego
```

---

## 3. Co to jest „klasyfikacja binarna” u nas

### Co

Każdy przykład = **tekst** + **etykieta 0 lub 1**.

- `1` = klasa „pozytywna” w sensie zadania (atak / manipulacja / phishing / scam)  
- `0` = druga klasa (benign / not manipulative / rational persuasion / nie-scam)

Model dostaje tekst → zwraca 0 albo 1.

### Po co binarna, a nie wieloklasowa

Magisterka porównuje **architektury**, nie taksonomię 20 typów ataków. Binarne zadanie jest:
- standardowe w literaturze tych korpusów,
- porównywalne między zbiorami,
- wystarczające do tezy „Transformer vs SVM”.

---

## 4. Baseline’y — po kolei

### 4.1. Majority baseline

**Co:** zawsze przewiduj klasę, która występuje częściej **na teście**.

**Po co:**
- dolna granica głupoty („nawet bez czytania tekstu”),
- szczególnie ważny przy **imbalance** (np. MentalManip ~70% klasy 1) — bo sam F1 klasy pozytywnej wygląda wtedy „mocno” dla majority.

**Czego nie mówi:** że Twój model jest dobry. Mówi tylko: „czy w ogóle bijesz los/stałą”.

### 4.2. TF-IDF + LinearSVC (w tabelach: `tfidf_linearsvc` / SVM)

**Co:**
- tekst → wektor częstości słów/n-gramów (TF-IDF),
- klasyfikator liniowy SVM (`LinearSVC`),
- u nas z `class_weight=balanced` (żeby rzadka klasa nie ginęła).

**Po co akurat to:**
- klasyczny, silny, tani baseline NLP sprzed ery BERT,
- dobrze działa, gdy decyzja siedzi w **słowach kluczowych** (część phishingu),
- w pracy: „czy Transformer jest potrzebny, czy bag-of-words wystarczy”.

**Czego nie umie dobrze:**
- kontekstu dalekiego („nie” negujące całą wypowiedź),
- subtelnej różnicy *manipulacja* vs *racjonalna perswazja* przy podobnym słownictwie.

---

## 5. Transformery — po kolei i po co trzy

### 5.1. Co to jest Transformer w jednym akapicie

Model językowy z mechanizmem **uwagi (attention)**: każde słowo „patrzy” na inne w sekwencji. Po pretrenowaniu na ogromnym tekście dokładasz głowę klasyfikacji i **fine-tunujesz** na swoich etykietach.

U nas: `*ForSequenceClassification`, `max_length=512`, 3 epoki, batch 8.

### 5.2. BERT (`bert-base-uncased`)

**Co:** kanoniczny Transformer do klasyfikacji tekstu (Devlin i in.).

**Po co:** punkt odniesienia — „czy w ogóle BERT bije SVM”.

### 5.3. RoBERTa (`roberta-base`)

**Co:** wariant BERT z inną (mocniejszą) procedurą pretrenowania.

**Po co:** kontrola, że wynik nie jest **artefaktem jednego checkpointu**.  
Promotor: nie tylko BERT → 2–3 modele. RoBERTa = drugi pełny model.

### 5.4. DistilBERT (`distilbert-base-uncased`)

**Co:** skompresowany „uczeń” BERT (mniejszy, szybszy).

**Po co:**
- trzeci wariant (wymóg 2–3 modeli),
- praktyczny trade-off: **czy tańszy model zachowuje zysk**.

### 5.5. Dlaczego NIE dziesięć modeli / NIE GPT-4

| Pokusa | Dlaczego nie |
|---|---|
| ChatGPT API | Inny protokół (prompt), trudniejsza powtarzalność, inna teza |
| 10 Transformerów | Overkill; promotor powiedział 2–3; to już pokrywa badanie |
| Tylko Distil | Za słaby „reprezentant” rodziny względem tytułu |

**Wniosek z trzech modeli w Twoich wynikach:** różnice między BERT/RoBERTa/Distil są małe; ranking vs SVM jest **stabilny**. To wzmacnia wiarygodność, nie „wyścig SOTA”.

---

## 6. Metryki — każda po przecinku

### 6.1. Accuracy

Udział poprawnych.  
**Problem:** przy 70% klasy 1 model „zawsze 1” ma 70% accuracy i wygląda OK.  
Dlatego **nie** jest metryką główną.

### 6.2. Precision / Recall / F1 (klasa pozytywna)

- Precision: z tego, co oznaczyłem jako atak, ile naprawdę jest atakiem.  
- Recall: z prawdziwych ataków, ile złapałem.  
- F1: harmoniczna średnia precision i recall **dla jednej klasy** (u nas zwykle klasa 1).

**Po co raportujemy:** bo w praktyce SE zależy Ci na false positive / false negative.  
**Dlaczego nie jako jedyna:** przy imbalance majority może mieć wysoki F1 klasy 1 (MentalManip).

### 6.3. F1 macro — **główna**

Średnia F1 z **obu** klas (dla 0 i dla 1).

**Po co:**
- karze model, który umie tylko klasę większościową,
- porównywalna między zbiorami,
- uzgodniona jako metryka główna w setupie pracy.

Gdy mówisz „Transformer wygrywa”, masz na myśli **F1 macro**, chyba że napiszesz inaczej.

---

## 7. Setup techniczny — po co każdy parametr

| Parametr | Wartość | Po co |
|---|---|---|
| Split | 80/20 stratified, seed 42 | Powtarzalność; stratified = proporcje klas w train i test podobne |
| seed 42 | stały | Ten sam podział przy ponownym odpaleniu |
| max_length | **512** | Limit BERT-like; wcześniej 256 mocno kroiło SEConvo (unfair vs SVM) |
| epochs | 3 | Standard fine-tuningu małego klasyfikatora; bez długiego overfitu chase |
| batch_size | 8 | Mieści się w VRAM 24 GB przy 512 |
| GPU | RTX 3090 RunPod | 3 modele × 5 zbiorów za ~$1, nie Colab Pro |
| Dedup phishing | przed splitem | Exact-dupes powodowały overlap train/test = zawyżone wyniki |

### Truncacja 512 — bardzo ważne „po co rozumieć”

Transformer bierze max 512 tokenów. Dłuższy tekst **obcina**.  
SVM (TF-IDF) widzi **cały** tekst jako worek słów.

Dlatego na **długich dialogach** (SEConvo mediana ~484 słów, ~47% >512 słów) SVM ma strukturalną przewagę — to nie znaczy, że „BERT jest zły na SE”, tylko że **warunki porównania faworyzują SVM**.

---

## 8. Sześć baz — każda od zera

Kolejność w kodzie: `seconvo` → `mentalmanip` → `reament` → `safepersuasion` → `scam_phone` → `phishing_text`.

Wspólna zasada doboru:
- publiczne,
- tekst (nie URL-features),
- etykieta człowieka / oficjalna,
- razem pokrywają **SE + manipulację + różne kanały + różne trudności**.

---

### 8.1. SEConvo (`seconvo`) — N≈400

**Co to jest**  
Korpus rozmów w stylu czatu (LinkedIn-like). Etykieta: rozmowa **złośliwa / SE** vs nie (`IsMalicious`).

**Jak ładujemy**  
Sklejamy tury dialogu w jeden tekst (`Name: Message`). Train+test dostawcy łączymy i robimy własny 80/20 stratified (małe N — jeden spójny protokół z resztą).

**Po co w pracy**
- najbliżej „ataku SE w komunikacji” w sensie dialogowym,
- „złoty standard” tematyczny dla SE w czacie.

**Po co NIE jako jedyny zbiór**
- za mały (400) → duża wariancja, łatwo overfit,
- rozmowy **długie** → problem 512 tokenów.

**Twój wynik (F1 macro)**  
SVM **0,78** > BERT/RoBERTa/Distil **~0,75**.  
**Interpretacja:** SVM wygrywa; w dyskusji tłumaczysz długością + małym N, nie „Transformery nie działają na SE”.

---

### 8.2. MentalManip (`mentalmanip`) — N=4000

**Co to jest**  
Dialogi z etykietą **manipulative** vs nie (ACL 2024 i okolice literatury manipulacji).

**Jak ładujemy**  
CSV: kolumna `dialogue` + `manipulative` (0/1). Split 80/20 stratified.

**Po co w pracy**
- pokrywa „manipulację” w dialogu,
- większe N niż SEConvo → stabilniejsze porównanie modeli.

**Uwaga imbalance**  
~70% klasy pozytywnej. Majority ma F1 klasy 1 ~0,83 — **dlatego F1 macro**.  
Na F1 macro: SVM 0,62 → Transformery ~0,64–0,65 (lekka przewaga).

**Interpretacja:** kierunek „Transformer lepiej”, ale delta mała — nie opieraj całej tezy tylko na tym zbiorze.

---

### 8.2b. ReaMent (`reament`) — N=5000

**Co to jest**  
Zbiór prawdziwych, nieskryptowanych dialogów wideo (wywiady, rozmowy). Etykieta: manipulacja psychologiczna vs brak.

**Jak ładujemy**  
Ewolucja *MentalManip*, zdejmująca zarzut o "sztuczność" filmowych dialogów. Podział 80/20 stratified.

**Po co w pracy — Twój "reality check"**
- rozwiązuje akademicki problem "czy to działa w prawdziwym życiu",
- krótki format (~80 słów na dialog) = brak problemów z truncacją 512 tokenów.

**Twój wynik (F1 macro)**  
SVM **0,65** → DistilBERT **0,72**.

**Interpretacja:** Wyraźny triumf Transformera. Na prawdziwej manipulacji kontekst gra kluczową rolę, przez co modele wektorowe (SVM) wyraźnie odstają od modeli BERTowych.

---

### 8.3. SafePersuasion (`safepersuasion`) — N≈1887

**Co to jest**  
Komentarze online. Etykieta człowieka: **Manipulation** vs **Rational Persuasion**.

**Jak ładujemy**  
U nas: Manipulation=1, Rational Persuasion=0. Split 80/20 stratified.

**Po co w pracy — to jest Twój główny hard case**
- najbliżej frazy tytułu „manipulacja semantyczna w komunikacji cyfrowej”,
- krótkie teksty (mediana ~32 słów) → **mieści się w 512**, fair vs SVM,
- trudne semantycznie: podobne słownictwo, inna funkcja wypowiedzi.

**Twój wynik (F1 macro)**  
SVM **0,61** → BERT **0,73** (RoBERTa 0,71, Distil 0,70).  

**Interpretacja:** tu jest **empiryczny trzon tezy**. Transformer realnie pomaga. Trzy modele biją SVM → to nie fluke jednego BERT-a.

---

### 8.4. scam_phone (`scam_phone`) — N=1600

**Co to jest**  
Syntetyczne rozmowy telefoniczne multi-agent: scam vs nie. Oficjalny split 1280/320.

**Po co w pracy**
- większy korpus „rozmowa + scam”,
- **kontrola / sufit**: sprawdza, czy pipeline w ogóle działa i czy zadanie nie jest trywialne.

**Dlaczego wynik F1=1.0 dla wszystkich nie jest sukcesem tezy**  
Bo SVM też ma 1.0. Zbiór jest za łatwy / zbyt regularny.  
W pracy piszesz wprost: **kontrola sufitowa**, nie dowód wyższości Transformera.

**Po co mimo to trzymamy**  
Żeby pokazać świadomość trudności zadań i nie mieszać „łatwego sufitu” z „twardym case’em”.

---

### 8.5. phishing_text (`phishing_text`) — N≈20007 po dedup

**Co to jest**  
Teksty mail/SMS-like: phishing vs benign (JSON `texts`).

**Jak ładujemy**  
Deduplikacja dokładnych kopii **przed** splitem → 80/20 stratified.  
**Po co dedup:** bez tego te same maile w train i test = sztucznie wysokie wyniki.

**Po co w pracy**
- klasyczny kanał SE w komunikacji cyfrowej,
- duża skala (BERT ma co jeść),
- kontrast: zadanie z silnymi cue’ami leksykalnymi.

**Twój wynik**  
SVM już **0,97**; Transformery **~0,99**.  
**Interpretacja:** Transformer wygrywa technicznie, ale **praktycznie** SVM też jest świetny. Wniosek: na „oczywistym” phishingu Transformer nie jest konieczny do wysokiej skuteczności.

---

### 8.6. Czego świadomie NIE wzięliśmy

| Kandydat | Po co odrzucony |
|---|---|
| GCT-100K | niejasna jakość etykiet / mix źródeł |
| ScamBench gated | inny problem badawczy (agent refusal), nie czysta klasyfikacja tekstu |
| CSE Tsinganos | brak publicznego downloadu |
| URL-feature phishing | to nie NLP na treści wiadomości |

**Po co ta lista w pracy:** pokazuje, że dobór korpusów był **celowy**, nie „co było pod ręką”.

---

## 9. Jak przebiega jeden przebieg treningu (krok po kroku)

Dla **jednego** zadania, np. SafePersuasion:

1. Załaduj teksty + etykiety.  
2. Podziel train/test (albo weź oficjalny split).  
3. Policz **majority** na teście → zapisz metryki.  
4. Wytrenuj **TF-IDF+SVM** na train → oceń na test.  
5. Dla każdego z {BERT, RoBERTa, DistilBERT}:  
   - tokenizacja (pad/truncate do 512),  
   - fine-tuning 3 epoki,  
   - ewaluacja na teście.  
6. Dopisz wiersze do wspólnej tabeli.

Powtórz dla 5 zadań → `comparison_f1_macro.md`.

**Po co ten sam protokół wszędzie:** żeby różnice wynikały z **zadania/modelu**, nie z innego splitu czy innej metryki.

---

## 10. Twoje wyniki — jak je czytać bez ściemy

### Tabela F1 macro (przypomnienie)

| Zadanie | Majority | SVM | BERT | RoBERTa | DistilBERT | Werdykt jednym zdaniem |
|---|---:|---:|---:|---:|---:|---|
| safepersuasion | 0,38 | 0,61 | **0,73** | 0,71 | 0,70 | **Główny dowód** — Transformer bije SVM |
| mentalmanip | 0,41 | 0,62 | 0,65 | **0,65** | 0,64 | Lekka przewaga Transformera |
| reament | 0,41 | 0,65 | 0,68 | 0,71 | **0,72** | Jasny triumf na prawdziwym dialogu |
| phishing_text | 0,38 | 0,97 | 0,99 | **0,99** | 0,99 | Wszyscy mocni; zysk Transformera mały |
| seconvo | 0,35 | **0,78** | 0,75 | 0,75 | 0,75 | SVM wygrywa (małe N + długość) |
| scam_phone | 0,33 | 1,00 | 1,00 | 1,00 | 1,00 | Kontrola / sufit — nie dowód |

### Co z tego wynika dla pytania badawczego

**Odpowiedź: częściowo tak.**

- **Tak** na zadaniach semantycznie trudnych i krótkich (SafePersuasion; słabiej MentalManip).  
- **Prawie obojętne** na łatwym phishingu (SVM i tak wysoki).  
- **Nie** na SEConvo w tym protokole (SVM lepszy).  
- **Bez sensu interpretować** scam_phone jako wygraną kogokolwiek.

### Po co były 2 dodatkowe modele (RoBERTa, Distil)

Żeby powiedzieć:
> „Nie jest tak, że wylosowaliśmy szczęśliwy BERT. Na SafePersuasion **wszystkie trzy** biją SVM; między sobą różnią się mało.”

Distil dodatkowo: większość zysku przy mniejszym modelu.

---

## 11. Mapa „po co każdy artefakt w folderze”

| Plik / folder | Po co |
|---|---|
| `src/download.py` | ściąga korpusy w jedno miejsce |
| `src/data_load.py` | jeden loader / split na zadanie |
| `src/train_svm.py` | baseline |
| `src/train_bert.py` | fine-tuning Transformerów |
| `src/run_all.py` | orkiestracja: majority+SVM+modele × taski |
| `src/compare_results.py` | tabele porównawcze |
| `src/eda.py` / `eda_summary.md` | długości, imbalance — paliwo do dyskusji SEConvo |
| `src/plot_results.py` / `fig_f1_macro.png` | rysunek do pracy |
| `outputs/comparison_f1_macro.md` | **główna tabela wyników** |
| `outputs/results_latest.md` | rozwinięte wyniki |
| `SZKIC-SE-TRANSFORMER.md` | tekst rozdziałów do wklejenia w PRz |
| `RESEARCH.md` | checklista zakresu z promotorem |
| `DATASETS.md` | uzasadnienie wyboru / odrzuceń korpusów |
| `AUDIT.md` | problemy fairness (256 vs 512, dupy phishing) |

---

## 12. Czego w wynikach NIE wolno powiedzieć

| Złe zdanie | Dlaczego złe |
|---|---|
| „Transformer zawsze lepszy od SVM” | SEConvo temu przeczy |
| „Udowodniliśmy detekcję SE w produkcji” | To offline klasyfikacja na publicznych EN korpusach |
| „RoBERTa jest zdecydowanie najlepszy” | Różnice ~0,01–0,02 |
| „scam_phone potwierdza metodę” | Sufit 1.0 dla wszystkich |
| „F1 0,82 majority na MentalManip znaczy, że majority jest silny” | To imbalance; patrz F1 macro |

---

## 13. Ograniczenia — każde z „po co je znać”

1. **Jeden seed** — wynik punktu, nie przedziału ufności. Po co znać: nie overclaimuj „istotności”.  
2. **Brak CV** — jak wyżej.  
3. **Truncacja 512** — fairness vs SVM na długich tekstach.  
4. **SVM ma class_weight, Transformery nie** — lekka asymetria setupu.  
5. **EN only** — nie generalizuj na PL bez nowych danych.  
6. **Syntetyka scam_phone** — łatwość ≠ rzeczywistość.

Ograniczenia to nie wstyd — to dowód, że rozumiesz eksperyment.

---

## 14. Jak to przełożyć na ~50 stron (kolejność pracy pisania)

1. **Wstęp** — motywacja SE/manipulacja, pytanie, zakres.  
2. **Literatura** — SE, phishing NLP, manipulacja, Transformer/BERT/RoBERTa/Distil, metryki.  
3. **Metody** — skopiuj/rozwiń z tego pliku + szkicu (bazy, split, modele, metryki, hardware).  
4. **Wyniki** — tabele + wykres + omówienie per zbiór.  
5. **Dyskusja** — SafePersuasion jako trzon; SEConvo jako ograniczenie; 3 modele = stabilność.  
6. **Wnioski** — odpowiedź warunkowa na pytanie badawcze.  
7. **Bibliografia + załączniki** — EDA, setup RunPod.

Empiria jest **zamknięta**. Objętość 50 stron = głównie literatura + staranne opisanie tego, co już wiesz z tego dokumentu.

---

## 15. Checklista „czy rozumiem wszystko”

Odpowiedz sobie na głos:

1. Jakie jest **jedno** pytanie badawcze?  
2. Dlaczego majority istnieje obok SVM?  
3. Dlaczego F1 macro, nie accuracy?  
4. Po co SafePersuasion jest ważniejszy niż phishing w tezie?  
5. Po co scam_phone, skoro wszyscy mają 1.0?  
6. Po co trzy Transformery, skoro BERT by wystarczył do „czy bije SVM”?  
7. Dlaczego SVM może wygrać na SEConvo bez obalania całej tezy?  
8. Co zmienia `max_length=512` względem 256?  
9. Po co dedup phishingu?  
10. Jakie zdanie jest poprawną odpowiedzią na pytanie badawcze?

Jeśli 1–10 umiesz — **każdy przecinek w części badawczej jest Twój**.

---

## 16. Jedno zdanie na koniec (do obrony)

> Porównaliśmy TF-IDF+SVM z trzema Transformerami na sześciu korpusach SE/manipulacji; Transformer daje wyraźny zysk na semantycznie trudnym SafePersuasion i rzeczywistym ReaMent, mniejszy na skryptowanym MentalManip i phishingu, przegrywa z SVM na małym i długim SEConvo, a scam_phone jest kontrolą sufitową — więc przewaga Transformera jest **warunkowa**, nie absolutna.

To jest cała magistrowa empiria w jednym oddechu.
