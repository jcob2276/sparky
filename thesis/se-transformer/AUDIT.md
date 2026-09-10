# Audyt eksperymentu — czy to jest „to”?

**Temat:** Detekcja ataków SE i manipulacji semantycznej w komunikacji cyfrowej (Transformer).

**Data audytu:** 2026-09-04

## Werdykt

**TAK — to pokrywa temat i da się na tym pisać magistę.**  
Rdzeń (pytanie + dane + SVM vs BERT + wyniki) jest wystarczający.

Nie jest to jeszcze „hermetyczne EXTRA” bez zastrzeżeń metodycznych. Poniżej: co jest OK, edge case’y, MUST vs NICE.

## Pokrycie tytułu

| Fragment tytułu | Pokrycie |
|---|---|
| Ataki inżynierii społecznej | SEConvo + phishing (+ scam jako kontrola) |
| Manipulacja semantyczna | MentalManip + **SafePersuasion** (najważniejszy hard case) |
| Komunikacja cyfrowa | czat, komentarze, mail/SMS, rozmowa |
| Architektura Transformer | fine-tune BERT-base |

To **nie** jest detekcja prompt injection / ataków na LLM. Tytuł tego nie wymaga — i dobrze, że nie mieszamy.

## Edge cases (znalezione)

### 1. SEConvo: BERT widzi ułamek rozmowy (KRYTYCZNE do dyskusji)
- mediana ~**484 słów**, 99% rozmów >256 słów
- w Colabie było `max_length=256` → BERT tnie początek, **SVM bierze cały tekst**
- to mocno tłumaczy, czemu SVM wygrał na SEConvo (0.81 vs 0.72)

**MUST w tekście:** napisać o truncacji.  
**MUST technicznie (1 re-run):** SEConvo (+ opcjonalnie scam) z `--max-length 512`.

### 2. MentalManip: F1 klasy pozytywnej vs majority
- majority „zawsze manipulacja” ma F1_pos ≈ **0.83**
- Wasz BERT F1_pos ≈ **0.80** — wygląda słabo, jeśli raportujesz tylko F1 klasy 1
- F1 **macro** majority ≈ 0.41, Wasz ≈ **0.63** → tu jest realny zysk

**MUST w tekście:** raportować **F1 macro** jako metrykę główną przy imbalance.

### 3. scam_phone: F1=1.0 to nie sukces
- słowa typu *appointment / refund / ssn* rozdzielają klasy niemal idealnie
- syntetyka + szablony

**MUST w tekście:** kontrola / ograniczenie, nie główny wynik.

### 4. phishing: duplikaty / overlap
- były dokładne duplikaty i ~39 overlapping train/test przed dedupe
- loader teraz **usuwa exact duplicates** przed split

**NICE:** po dedupe szybko przebić SVM (opcjonalnie BERT) na phishingu.

### 5. Asymetria modeli
- SVM: `class_weight=balanced`
- BERT: bez wag klas

**NICE:** BERT + class weights / oversampling — nie blokuje pisania.

### 6. Brak osobnego validation set
- train → test; eval w trakcie epok patrzy na test, ale checkpoint nie jest wybierany (`save_strategy=no`)
- akceptowalne na magistę, jeśli opiszesz fixed 3 epochs

### 7. Jeden seed
- brak odchyleń std

**NICE:** 3 seedy na core (seconvo/mental/safe) — tylko jeśli promotor chce „bardziej naukowo”.

## Co NIE trzeba robić
- RoBERTa (chyba że Madera każe)
- własna architektura Transformera
- Sparky / izolacja danych
- GCT-100K / ScamBench
- zbieranie własnego korpusu

## MUST przed „zamknięciem praktyki” (krótka lista)

1. W pracy: truncacja SEConvo, F1 macro, scam=kontrola.  
2. Colab re-run:  
   `python -m src.run_all --task seconvo --bert-model bert-base-uncased --epochs 3 --batch-size 8 --max-length 512`  
3. (Opcja) to samo dla `scam_phone` z 512 — i tak pewnie ~1.0, ale uczciwiej.

Po punkcie 2 możesz spokojnie pisać spis + literaturę. Reszta to NICE.

## Status

| Element | Status |
|---|---|
| Pytanie badawcze | OK |
| Korpusy pod tytuł | OK |
| Baseline + Transformer | OK |
| Tabele wyników | OK |
| Edge-case awareness | OK (ten audyt) |
| Re-run SEConvo @512 | **TODO (1 godzina Colab)** |
| Tekst magistry | nie zaczęty |

**Go do pisania: TAK**, z jednym obowiązkowym dopiskiem metodycznym + zalecanym re-runem SEConvo przy 512.
