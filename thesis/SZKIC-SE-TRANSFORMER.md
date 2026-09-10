# Magistrowa — szkic do wklejenia (Transformer / SE)

**Tytuł:** Detekcja ataków inżynierii społecznej i prób manipulacji semantycznej w komunikacji cyfrowej z wykorzystaniem architektury Transformer

**Autor:** Jakub … · Promotor: dr Michał Madera · Politechnika Rzeszowska

**Status:** część empiryczna zamknięta (RunPod RTX 3090, 2026-09-04). Tekst poniżej = robocza treść rozdziałów 1–6 pod szablon PRz (cytowania do domknięcia w Zotero/Word).

**Zrozumieć każdy wybór (nie rozdział pracy):** [`WYJASNIENIE-OD-A-DO-Z.md`](WYJASNIENIE-OD-A-DO-Z.md)

---

## Streszczenie (PL)

Praca dotyczy automatycznej detekcji treści związanych z inżynierią społeczną oraz manipulacją semantyczną w komunikacji cyfrowej. Pytanie badawcze: czy fine-tuned model architektury Transformer osiąga wyższą jakość klasyfikacji (F1 macro) niż klasyczny baseline TF-IDF+LinearSVC. Porównano majority baseline, TF-IDF+LinearSVC oraz trzy Transformery (`bert-base-uncased`, `roberta-base`, `distilbert-base-uncased`) na pięciu korpusach (SEConvo, MentalManip, SafePersuasion, scam_phone, phishing_text). Najsilniejsza przewaga Transformera wystąpiła na SafePersuasion (F1 macro 0,73 vs 0,61 dla SVM). Na MentalManip i phishingu przewaga była mniejsza; na SEConvo lepszy pozostał SVM; scam_phone osiągnął sufit F1 = 1,0 dla wszystkich modeli (kontrola). Wniosek: Transformer poprawia detekcję warunkowo — gdy zadanie jest semantycznie trudne i kontekst mieści się w oknie modelu.

**Słowa kluczowe:** inżynieria społeczna, manipulacja semantyczna, Transformer, BERT, klasyfikacja tekstu, phishing

## Abstract (EN)

This thesis studies automatic detection of social-engineering-related and semantically manipulative content in digital communication. The research question is whether a fine-tuned Transformer classifier outperforms a classical TF-IDF+LinearSVC baseline under the F1-macro metric. A majority baseline, TF-IDF+LinearSVC, and three Transformers (BERT, RoBERTa, DistilBERT) were evaluated on five corpora. The clearest Transformer gain appeared on SafePersuasion; gains were smaller on MentalManip and phishing; SVM remained stronger on SEConvo; scam_phone hit a perfect ceiling for all models (control). The answer is conditional: Transformers help when the decision is semantic and fits the model context window.

**Keywords:** social engineering, semantic manipulation, Transformer, BERT, text classification, phishing

---

## 1. Wstęp

### 1.1. Motywacja

Inżynieria społeczna (SE) i manipulacja w tekście cyfrowym (czat, komentarz, mail, rozmowa) omijają klasyczne filtry oparte wyłącznie na URL lub sygnaturach. Skuteczna detekcja wymaga modeli językowych zdolnych uchwycić **intencję i kontekst**, nie tylko słowa kluczowe. Architektura Transformer (Vaswani i in., 2017) i modele typu BERT stały się standardem w NLP; otwarte pozostaje pytanie, kiedy dają realny zysk względem prostego baseline’u leksykalnego w domenie SE/manipulacji.

### 1.2. Cel i pytanie badawcze

**Cel:** empirycznie porównać jakość detekcji binarnej treści SE / manipulacji semantycznej dla fine-tuned Transformerów oraz TF-IDF+LinearSVC.

**Pytanie badawcze:** Czy fine-tuned Transformer osiąga wyższe F1 macro niż TF-IDF+LinearSVC na tekstach reprezentujących SE i manipulację semantyczną w komunikacji cyfrowej?

**Teza robocza:** Tak — szczególnie na zadaniach o trudnym sygnale semantycznym (rozróżnienie manipulacji od racjonalnej perswazji); przewaga nie musi być uniwersalna na wszystkich kanałach i rozmiarach korpusu.

### 1.3. Zakres

W zakresie: klasyfikacja tekstu EN, pięć publicznych korpusów, majority + SVM + trzy Transformery, metryka F1 macro, analiza ograniczeń (truncacja, imbalance, kontrola sufitowa).

Poza zakresem: detekcja URL-only, multimodalność, produkcyjny system obrony, język polski, twierdzenia o „wykrywaniu intencji psychologicznej” poza etykietą korpusu.

### 1.4. Struktura pracy

Rozdział 2 — literatura. Rozdział 3 — materiały i metoda. Rozdział 4 — wyniki. Rozdział 5 — dyskusja. Rozdział 6 — wnioski.

---

## 2. Przegląd literatury (szkielet + tezy do cytowań)

*(Uzupełnij pełne pozycje bibliograficzne w stylu wymaganym przez PRz.)*

### 2.1. Inżynieria społeczna w komunikacji cyfrowej

SE wykorzystuje wpływ społeczny zamiast (wyłącznie) eksploatacji technicznej. W kanale tekstowym: phishing, pretexting w czacie, scam w rozmowie. Praca traktuje SE jako **problem klasyfikacji treści**, nie jako pełny model atakującego.

### 2.2. Manipulacja semantyczna vs perswazja

Literatura NLP rozróżnia perswazję racjonalną od manipulacji (m.in. korpusy typu MentalManip, SafePersuasion). Dla tytułu pracy kluczowe jest, że etykieta nie sprowadza się do „toksyczności” ani spamu — wymaga oceny **sposobu wpływania** na odbiorcę.

### 2.3. Klasyczne podejścia NLP

TF-IDF + klasyfikator liniowy (np. SVM) to silny, tani baseline na zadaniach z wyraźnymi cue’ami leksykalnymi (część phishingu). Słabość: brak kontekstu dalekozasięgowego i składni.

### 2.4. Architektura Transformer i transfer learning

Transformer (Vaswani i in., 2017); BERT (Devlin i in., 2019); RoBERTa (Liu i in., 2019); DistilBERT (Sanh i in., 2019). Fine-tuning `*ForSequenceClassification` jest standardem dla klasyfikacji tekstu. Dobór trzech wariantów w pracy służy **stabilności wniosku**, nie chase’owi SOTA.

### 2.5. Detekcja phishingu / CSE z użyciem deep learning

Prace łączące DL z phishingiem i conversational SE (w tym SEConvo) pokazują potencjał modeli kontekstowych, ale często przy innych protokołach ewaluacji. Luka, którą wypełnia ta praca: **jednolity protokół** (te same splity/metryki) porównujący SVM z trzema Transformerami na zestawie korpusów pokrywającym tytuł (SE + manipulacja + różne kanały).

### 2.6. Podsumowanie luk

Brakuje prostego, powtarzalnego porównania „czy Transformer w ogóle jest potrzebny” na mieszance zadań łatwych i trudnych, z jawnym traktowaniem zbiorów kontrolnych i ograniczenia okna kontekstu.

---

## 3. Materiały i metoda

### 3.1. Cel eksperymentu

Porównanie jakości klasyfikacji binarnej dla:

1. baseline leksykalnego (TF-IDF + LinearSVC),
2. trzech wariantów Transformera (fine-tuning klasyfikatora sekwencji),

względem majority baseline jako dolnej granicy.

### 3.2. Zbiory danych

| Zadanie | Korpus | N | Kanał | Etykieta | Rola |
|---|---|---:|---|---|---|
| seconvo | SEConvo (human-annotated) | 400 | czat | SE vs benign | złoty standard SE; małe N, długie dialogi |
| mentalmanip | MentalManip | 4000 | dialog | manipulative vs not | manipulacja w rozmowie |
| reament | ReaMent (YTD-18M) | 5000 | dialog/video | manipulative vs not | rzeczywista manipulacja psychologiczna z wideo |
| safepersuasion | SafePersuasion | 1887 | komentarze | Manipulation vs Rational Persuasion | hard case manipulacji semantycznej |
| scam_phone | BothBosu multi-agent scam | 1600 | telefon (syntetyka) | scam vs not | **kontrola / sufit** |
| phishing_text | ealvaradob `texts` | 20007* | mail/SMS-like | phishing vs benign | klasyczny kanał SE, duża skala |

\*po deduplikacji dokładnych kopii przed splitem.

Świadomie odrzucono m.in. GCT-100K, ScamBench gated, korpusy URL-feature-only.

#### EDA — długość tekstów

| Zadanie | pos_rate | mediana słów | udział >512 słów |
|---|---:|---:|---:|
| seconvo | 0,54 | 484 | 0,47 |
| mentalmanip | 0,70 | 71 | ~0 |
| safepersuasion | 0,38 | 32 | 0 |
| scam_phone | 0,50 | 427 | 0,36 |
| phishing_text | 0,38 | 137 | 0,15 |

Wniosek metodyczny: dla SEConvo (i części scam_phone) truncacja do 512 tokenów ogranicza Transformer względem SVM na pełnym tekście.

### 3.3. Podział danych

- 80/20 stratified, `seed=42` (domyślnie).
- `scam_phone`: oficjalny split 1280/320.
- `phishing_text`: deduplikacja przed splitem.

### 3.4. Modele

**Baseline:** majority; TF-IDF + LinearSVC (`class_weight=balanced`).

**Transformery:**

| Model | Po co |
|---|---|
| bert-base-uncased | kanoniczny punkt odniesienia |
| roberta-base | inna procedura pretrenowania — czy wynik to artefakt jednego checkpointu? |
| distilbert-base-uncased | wariant skompresowany (jakość vs koszt) |

Hiperparametry: `epochs=3`, `batch_size=8`, `max_length=512`. GPU: NVIDIA RTX 3090 (RunPod Community).

### 3.5. Metryki

Główna: **F1 macro**. Uzupełniająco: F1 klasy pozytywnej, accuracy, precision, recall.  
Uzasadnienie: przy imbalance (MentalManip ~70% klasy 1) sam F1 pozytywnej zawyża majority.

### 3.6. Powtarzalność

Kod: `thesis/se-transformer`. Komenda:

```bash
python -m src.run_all --task all --models all --epochs 3 --batch-size 8 --max-length 512
python -m src.compare_results --metric f1_macro
```

Artefakty: `outputs/comparison_f1_macro.md`, `comparison_f1.md`, `results_latest.md`, `eda_summary.md`.

---

## 4. Wyniki

### 4.1. F1 macro (główna tabela)

| Zadanie | Majority | TF-IDF+SVM | BERT | RoBERTa | DistilBERT |
|---|---:|---:|---:|---:|---:|
| safepersuasion | 0,381 | 0,613 | **0,731** | 0,709 | 0,703 |
| mentalmanip | 0,414 | 0,619 | 0,646 | **0,651** | 0,639 |
| reament | 0,406 | 0,648 | 0,678 | 0,708 | **0,719** |
| phishing_text | 0,384 | 0,973 | 0,988 | **0,991** | 0,989 |
| seconvo | 0,350 | **0,783** | 0,749 | 0,749 | 0,746 |
| scam_phone | 0,333 | 1,000 | 1,000 | 1,000 | 1,000 |

### 4.2. F1 klasy pozytywnej

| Zadanie | Majority | TF-IDF+SVM | BERT | RoBERTa | DistilBERT |
|---|---:|---:|---:|---:|---:|
| safepersuasion | 0,000 | 0,500 | **0,652** | 0,621 | 0,637 |
| mentalmanip | 0,827 | 0,796 | **0,819** | 0,813 | 0,814 |
| reament | 0,812 | 0,794 | 0,816 | 0,825 | **0,835** |
| phishing_text | 0,000 | 0,966 | 0,985 | **0,989** | 0,986 |
| seconvo | 0,699 | **0,813** | 0,762 | 0,767 | 0,778 |
| scam_phone | 0,000 | 1,000 | 1,000 | 1,000 | 1,000 |

### 4.3. Omówienie per zbiór

**SafePersuasion.** Najwyraźniejsza przewaga Transformerów (+ok. 0,09–0,12 F1 macro vs SVM). Sygnał semantyczny; BERT najlepszy wśród trzech wariantów.

**MentalManip.** Transformerzy +0,02–0,03 F1 macro vs SVM; różnice między BERT/RoBERTa/Distil małe. Majority ma wysoki F1 klasy 1 (~0,83) przez imbalance — stąd F1 macro.

**ReaMent.** Znacznie wyraźniejsza wygrana Transformera niż na MentalManip (DistilBERT 0,718 vs SVM 0,647). Dowodzi to, że na prawdziwych (nieskryptowanych) dialogach manipulacyjnych, modele kontekstowe radzą sobie dużo lepiej niż leksykalne.

**Phishing.** SVM już 0,97; Transformery ~0,99. Zysk realny, ale niewielki (silne cechy powierzchniowe).

**SEConvo.** SVM wygrywa (0,78 vs ~0,75). Małe N + długie dialogi; SVM na pełnym tekście, Transformer w oknie 512.

**scam_phone.** F1 = 1,0 dla wszystkich — **kontrola sufitowa**, nie dowód metody.

### 4.4. Trzy Transformery

Rozbieżności między BERT / RoBERTa / DistilBERT zwykle ≤0,03 F1 macro. DistilBERT zachowuje większość jakości przy niższym koszcie. Wniosek względem SVM jest **stabilny względem wyboru wariantu**.

---

## 5. Dyskusja

### 5.1. Odpowiedź na pytanie badawcze

**Częściowo tak.** Transformer poprawia F1 macro względem SVM, gdy decyzja opiera się na semantyce (przede wszystkim SafePersuasion; słabiej MentalManip/phishing). Nie ma uniwersalnej przewagi: SEConvo faworyzuje SVM; scam_phone to sufit.

### 5.2. Manipulacja semantyczna

SafePersuasion najbliżej tytułu w części „manipulacja semantyczna w komunikacji cyfrowej”. Tu bag-of-words traci najwięcej do reprezentacji kontekstowej.

### 5.3. Inżynieria społeczna

Phishing: klasyczny kanał SE — SVM już blisko sufitu. SEConvo (dialogowy CSE): ograniczenie małego N i truncacji. Wniosek praktyczny: „Transformer zawsze lepszy na SE” jest fałszywy bez warunków brzegowych.

### 5.4. Po co trzy modele

Nie crowning „zwycięzcy”, lecz kontrola artefaktu jednego checkpointu. Stabilność rankingów względem SVM zwiększa wiarygodność. DistilBERT = trade-off jakość/koszt.

### 5.5. Ograniczenia

1. Jeden seed / jeden split — brak CV i przedziałów niepewności.  
2. Truncacja 512 — szczególnie SEConvo.  
3. Asymetria: SVM z `class_weight=balanced`, Transformery bez osobnych class weights.  
4. scam_phone — syntetyka łatwo separowalna.  
5. Korpusy EN — brak automatycznej generalizacji na PL.  
6. Stałe 3 epoki — bez osobnego early stopping na val.

### 5.6. Implikacje

Subtelna manipulacja w krótkim tekście → uzasadniony fine-tuning Transformera. Masowy phishing o silnych cue’ach → często wystarczy SVM. Długie dialogi SE przy małym N → ostrożnie z oknem kontekstu / rozważyć long-context.

---

## 6. Wnioski

1. Porównano majority, TF-IDF+LinearSVC oraz BERT, RoBERTa i DistilBERT na pięciu korpusach SE/manipulacji.  
2. Najsilniejszy argument empiryczny za Transformerem: **SafePersuasion** (0,73 vs 0,61 F1 macro).  
3. Przewaga nieuniwersalna: **SEConvo** → SVM; **scam_phone** → kontrola sufitowa.  
4. Trzy Transformery dają **spójny** obraz — wynik nie zależy krytycznie od jednego modelu.  
5. Odpowiedź na pytanie badawcze: Transformer poprawia detekcję **warunkowo** — przy trudnym sygnale semantycznym i kontekście mieszczącym się w oknie modelu.

---

## Załącznik A — setup

```text
GPU: NVIDIA GeForce RTX 3090 (RunPod Community)
epochs=3, batch_size=8, max_length=512
models: bert-base-uncased, roberta-base, distilbert-base-uncased
```

## Załącznik B — checklist domknięcia formalnego (PRz)

- [ ] Wklejenie do szablonu uczelni (marginesy, numeracja, cytowania)
- [ ] Domknięcie bibliografii (pozycje z rozdz. 2)
- [ ] Rysunek słupkowy F1 macro: `python -m src.plot_results` (opcjonalnie)
- [ ] Korekta językowa + streszczenie zgodne z ostatecznym wnioskiem
