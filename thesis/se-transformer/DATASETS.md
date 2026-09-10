# Wybór korpusów — część praktyczna (EXTRA)

Temat: detekcja **SE** + **manipulacji semantycznej** w komunikacji cyfrowej (Transformer vs baseline).

## Core (już było)

| Task | Zbiór | N | Po co |
|---|---|---:|---|
| `seconvo` | SEConvo (human-annotated) | 400 | CSE w czacie LinkedIn — złoty standard SE. **Uwaga:** rozmowy długie (mediana ~484 słów) — BERT przy max_length=256 mocno tnie; do fair comparison użyj 512 |
| `mentalmanip` | MentalManip | 4000 | manipulacja w dialogu (ACL 2024) |

## Extra (dodane — lukę wielkości / domeny)

| Task | Zbiór | N | Po co / dlaczego lepsze |
|---|---|---:|---|
| `safepersuasion` | SafePersuasion | 1887 | **prawdziwe komentarze online**, etykieta człowiek: Manipulation vs Rational Persuasion — bliżej „manipulacja semantyczna w komunikacji cyfrowej” niż dialogi filmowe |
| `scam_phone` | BothBosu multi-agent scam | 1600 (1280/320 oficjalny split) | większy korpus rozmów scam vs nie-scam (telefon). **Uwaga:** syntetyka jest bardzo łatwa dla TF-IDF (F1≈1.0) — w pracy jako kanał „łatwy / kontrolny”, nie jako główny dowód |
| `phishing_text` | ealvaradob `texts` | 20137 | mail/SMS phishing vs benign — klasyczny kanał SE w komunikacji cyfrowej, skala pod BERT |
| `reament` | YSGao/ReaMent | 5000 | real-world mental manipulation (web video dialogues) — kontrast vs MentalManip (scripted) |

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

**Deep keywords:** [`../DATASETS-DEEP-KEYWORDS-2026-09.md`](../DATASETS-DEEP-KEYWORDS-2026-09.md) — nic lepszego od ReaMent; LoveFraud02 = case study only.

## Komendy

```bash
python -m src.download
python -m src.run_all --task all --skip-bert          # SVM na 5 zadaniach
python -m src.run_all --task all --bert-model bert-base-uncased --epochs 3   # Colab T4
python -m src.run_all --task extra --skip-bert
```
