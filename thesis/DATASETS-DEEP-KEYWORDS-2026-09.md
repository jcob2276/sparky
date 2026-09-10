# Deep keyword re-audit (2026-09-05) — kąty nieoczywiste

Cel: szukać **poza** typowymi frazami (`social engineering`, `phishing`, `manipulation detection`) — czy wyjdzie korpus lepszy od piątki + ReaMent.

Pełny audyt „oczywisty”: [`DATASETS-REAUDIT-2026-09.md`](DATASETS-REAUDIT-2026-09.md).

---

## Przeszukane kąty (słowa kluczowe)

| Kąt | Przykładowe keywordy |
|---|---|
| Psych abuse | gaslighting dataset NLP, psychological coercion, coercive control chat |
| Romance / pig | romance fraud corpus, LoveFraud, pig butchering dialogue |
| BEC / pretext | business email compromise dataset text, pretexting corpus |
| Deception theory | interpersonal deception dialogue corpus, Diplomacy lie truth annotated |
| Influence / news | SemEval persuasion techniques, propaganda techniques detection PTC |
| Voice channel | vishing transcript KorCCVi, voice phishing dialogue EN |
| Adjacent abuse | delicate text DeTexD, conversations gone awry, VAWG synthetic dialogue |
| LLM-as-attacker | gaslightingLLM assistant, FedHeartShield romance synthetic |

---

## Co wyszło ciekawego (i dlaczego nie bije ReaMent/piątki)

### 1) LoveFraud02 (Mendeley) — **najciekawszy nieoczywisty hit**

- **Co:** 83 **prawdziwe** rozmowy romance-scam (autorka vs scammerzy), ~1M słów.
- **Dlaczego wow:** rzadki real SE chat (nie GPT, nie film).
- **Dlaczego NIE upgrade głównej tabeli:** N=83; brak zbalansowanej klasy benign w korpusie (wszystko to scam interaction); za mało pod fine-tune + fair SVM/Transformer compare.
- **Gdzie pasuje:** załącznik / case study jakościowy / „real romance SE examples”, nie 6. wiersz F1 macro.

### 2) Diplomacy deception (ConvoKit) — **najciekawszy hit „semantyczny”**

- **Co:** >17k wiadomości z gry Diplomacy; etykieta *intended lie/truth* od nadawcy (+ perception odbiorcy).
- **Dlaczego wow:** złoty standard **decepcji interpersonalnej** w dialogu.
- **Dlaczego NIE zamiast SE:** to gra strategiczna, nie atak cyber-SE / phishing / scam. Tytuł o inżynierii społecznej w komunikacji cyfrowej — stretch zbyt duży jako główny korpus.
- **Gdzie pasuje:** literatura / ewentualny eksperyment transferowy „czy detector manipulacji generalizuje do kłamstwa w negocjacji” — osobna hipoteza.

### 3) SemEval persuasion / propaganda (PTC, SemEval-2023)

- **Co:** techniki perswazji/propagandy w **newsach** (span / multi-label).
- **Fit:** blisko „manipulacja semantyczna” językowo, daleko kanałowo (artykuł ≠ czat/mail SE).
- **Werdykt:** related work, nie zamiennik SafePersuasion.

### 4) Maxwe11y/gaslighting (LLM assistant)

- Syntetyczny gaslighting **chatbota**, nie atak SE człowiek→człowiek.
- **NO-GO** jako główny korpus.

### 5) FedHeartShield romance (Zenodo)

- Autorzy sami piszą: klasy rozdzielalne **stylem generacji**, nie treścią scamu (AUC shortcut 0.84–1.0).
- **Anti-pattern** — świadomie nie brać jako dowodu metody.

### 6) BEC / zero-day phishing corpora (Kaggle, Africa-BEC)

- Głównie syntetyka / features tabularne / regional CTI bez pełnego NLP body.
- Phishing tekstowy już masz (~20k, F1~0.99) → **ROI ≈ 0**.

### 7) KorCCVi / VISH-Darija / VishBox

- KR / Darija / syntetyka vishing — zły język lub zły setup.
- **NO-GO** na EN magistry.

### 8) LeTG psychological-coercion / ConVAWG

- Etykiety LLM albo pełna syntetyka VAWG.
- Słabszy gold standard niż SafePersuasion / ReaMent / MentalManip.

### 9) DeTexD / Conversations Gone Awry

- „Delicate” / derailment w toksyczność — sąsiad tematu, nie SE/manipulacja atakująca.
- **NO-GO** jako zamiennik.

---

## Ranking po deep search

| Miejsce | Korpus | Werdykt |
|---|---|---|
| 1 | **ReaMent** (z poprzedniego audytu) | nadal najlepszy **opcjonalny upgrade** do tabeli |
| 2 | LoveFraud02 | najlepszy **nieoczywisty** real SE — tylko appendix/case study |
| 3 | Diplomacy deception | najlepszy **nieoczywisty** deception — zły domenowo na tytuł |
| 4 | SemEval persuasion/news | related work, nie main table |
| — | reszta deep hits | NO-GO / ROI zero / anti-shortcut |

---

## Finalne GO / NO-GO (po deep search)

| Pytanie | Odpowiedź |
|---|---|
| Czy deep keywords znalazły bazę **lepszą niż ReaMent** do głównego eksperymentu? | **Nie** |
| Czy znalazły coś wartościowego poza ReaMent? | **Tak:** LoveFraud02 (jakość real SE, małe N) |
| Czy zmieniać piątkę? | **Nie** |
| Czy warto palić $9 GPU na deep-findy? | Tylko na **ReaMent**; LoveFraud02 nie wymaga GPU |

**Rekomendacja bez zmian:**  
trzon = obecna piątka; bonus empiryczny = ReaMent; bonus jakościowy/anegdotyczny = LoveFraud02 w dyskusji/załączniku — **nie** w głównej tabeli F1.
