# Re-audit korpusów (2026-09-05) — czy są lepsze bazy?

**Cel:** znaleźć publiczny korpus **realnie lepszy** pod protokół magistry:  
klasyfikacja tekstu SE / manipulacji semantycznej, EN, downloadowalny, etykiety, porównywalny z TF-IDF+SVM vs Transformer.

**Obecna piątka (baseline audytu):**

| Task | Korpus | N | Rola |
|---|---|---:|---|
| seconvo | SEConvo (human-ann. subset) | 400 | SE chat |
| mentalmanip | MentalManip (movie scripts) | 4000 | manipulacja dialog |
| safepersuasion | SafePersuasion | ~1887 | manip. vs rational persuasion |
| scam_phone | BothBosu multi-agent | 1600 | kontrola / sufit |
| phishing_text | ealvaradob `texts` | ~20k | phishing tekst |

---

## Kryteria „lepszy”

Kandydat musi spełniać **wszystkie**:

1. Publiczny download (HF / Zenodo / GitHub bez gate’a uniemożliwiającego użycie)
2. Zadanie = klasyfikacja treści (nie URL-features, nie „LLM ma odmówić”, nie OpenQA defense)
3. Etykiety ludzkie lub silnie udokumentowane (nie sam LLM label bez human)
4. Pasuje do tytułu: **SE** i/lub **manipulacja semantyczna** w komunikacji cyfrowej
5. Daje **merytoryczny zysk** vs obecna piątka (nie kolejny phishing 0.99)

---

## Werdykt w jednym zdaniu

**Nie ma magicznej „najlepszej bazy wszech czasów”, która obala Twoją piątkę.**  
Jest **jeden sensowny upgrade**: **ReaMent** (zamiast lub obok MentalManip). Reszta = inny problem badawczy, za małe N, syntetyka/sufit, albo już pokryte.

---

## Kandydat GO (jedyny)

### ReaMent — `YSGao/ReaMent` (HF)

| | |
|---|---|
| N | 5000 dialogów |
| Task | mental manipulation vs not (jak MentalManip) |
| Źródło | YTD-18M — nagrania z web video (nieskryptowane), nie filmy |
| Etykiety | 12 annotatorów, 3 na sample, majority/consensus |
| Download | tak (`load_dataset("YSGao/ReaMent")`) |
| Paper | Gao et al., WWW 2026 / arXiv:2505.15255 |
| Długość | ~4 tury, ~80 słów (mieści się w 512 — fair vs SVM) |

**Dlaczego lepsze od MentalManip:** MentalManip = dialogi **filmowe** (sztuczny dramat). ReaMent = bliżej realnej komunikacji. Autorzy wprost pozycjonują go jako odpowiedź na lukę MentalManip.

**Jak użyć w pracy (opcjonalnie):**
- **Wariant A (zalecany bonus):** dorzuć jako 6. zadanie `reament` — porównaj z MentalManip w dyskusji „scripted vs real-world”.
- **Wariant B:** zamień MentalManip na ReaMent (tylko jeśli chcesz jedną tabelę manipulacji).

**Koszt GPU:** mały (N=5k, krótkie teksty) — spokojnie w budżecie $9.

**Uwaga:** HF card czasem pokazuje licencję CC-BY-NC-ND; repo MentalMAD deklaruje MIT — **sprawdź licencję plików przed publikacją / załącznikiem**. Do magistry uczelnianej zwykle OK.

---

## Kandydaci NO-GO (przeszukane i odrzucone)

| Kandydat | N / typ | Dlaczego nie lepszy dla Ciebie |
|---|---|---|
| **ScamBench training** (`shaw` / lalalune) | 37k multi-turn | Inny problem: trening **agenta** (refuse/engage), mix jailbreak + SE + prompt injection; nie czysta klasyfikacja SE tekstu |
| **ScamBench** (maximusrafla) | 15k phishing LLM | Benchmark **ofensywnej** generacji phishingu / CTR; gated dual-use; nie Twój protokół |
| **Fraud-R1** | 8564 | Ewaluacja **odporności LLM** multi-round; nie SVM vs Transformer classif. |
| **GCT-100K** | 100k | Już odrzucone: jakość etykiet / mix; ryzyko shortcutów |
| **SE-VSim** (~1350) | syntetyka agentów | Symulacja personality SE; inny setup, nie dowód na Twoje pytanie |
| **ConScamBench-278** | 278 | Za małe; świeże / agentic pipeline — słaby zysk vs SEConvo+kontrola |
| **PRESCAM** | ~11k structured | Inne zadanie (progresja scam / kill-chain), etykiety mocno LLM-pipeline |
| **SG-CSE Corpus** | ~90 | Za małe do fine-tuningu porównawczego |
| **MultiManip** | 220 | Za małe vs MentalManip/ReaMent |
| **Zenodo multiclass SE** | 624 | Za małe vs phishing_text |
| **SpaPhish** | 1463 ES | Hiszpański — nie wzmacnia EN magistry (ew. appendix językowy) |
| **MeAJOR / Nazario aggregates** | duże maile | Phishing już masz ~20k z sufitem ~0.99; ROI ≈ 0 |
| **Anthropic/persuasion** | argumenty + rating | Perswazyjność LLM, nie detekcja manipulacji/SE |
| **URL-only phishing** | — | Poza zakresem NLP na treści |

---

## Ocena obecnej piątki po re-audycie

| Slot | Ocena | Czy istnieje wyraźnie lepszy zamiennik? |
|---|---|---|
| SE chat (SEConvo) | Najlepszy **dostępny** human-ann. CSE LinkedIn-style; małe N to wada dziedziny, nie Twój błąd | **Nie** (publicznie) |
| Manipulacja dialog (MentalManip) | Dobry, ale **scripted** | **Tak → ReaMent** |
| Manip. vs rational (SafePersuasion) | Nadal najlepszy hard case pod tytuł | **Nie** |
| Kontrola scam (scam_phone) | Świadomy sufit — OK jako kontrola | Nie zamieniać na większą syntetykę |
| Phishing tekst | Wystarczający; wynik już przy suficie | Nie warto „lepszego” phishingu |

---

## Co robić z $9 GPU

| Opcja | Warto? |
|---|---|
| Dodać **ReaMent** (SVM + 3 Transformery) | **Tak**, jeśli chcesz bonus empiryczny |
| Szukać dalej „lepszych baz” | **Nie** — diminishing returns |
| Własna baza PL | Osobny projekt (annotacja >> GPU) |
| Nic / pisać pracę | **Też tak** — piątka jest obronna |

---

## Finalne GO / NO-GO

| Pytanie | Odpowiedź |
|---|---|
| Czy obecna piątka jest „najlepsza możliwa absolutnie”? | **Nie** |
| Czy jest wystarczająca i dobrze dobrana pod tezę? | **Tak** |
| Czy istnieje jedna baza, którą warto dorzucić? | **Tak: ReaMent** |
| Czy trzeba wymieniać SafePersuasion / SEConvo / phishing? | **Nie** |
| Czy ScamBench/Fraud-R1/GCT to upgrade? | **Nie** (zły problem / jakość / sufit) |

**Rekomendacja:** nie rozbieraj piątki. Opcjonalnie **+ReaMent** jako 6. zbiór (real-world manipulation), resztę czasu → pisanie.

---

## Addendum: deep keywords (ten sam dzień)

Przeszukano kąty: gaslighting, romance fraud / LoveFraud, BEC, interpersonal deception (Diplomacy), SemEval persuasion/propaganda, vishing KR, coercive control, DeTexD, FedHeartShield.

**Wynik:** nadal brak korpusu lepszego od ReaMent do głównego eksperymentu.  
Szczegóły: [`DATASETS-DEEP-KEYWORDS-2026-09.md`](DATASETS-DEEP-KEYWORDS-2026-09.md).
