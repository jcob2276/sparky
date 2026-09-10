# Część badawcza — checklist 100%

Temat: Detekcja ataków SE i manipulacji semantycznej (Transformer).

## Potwierdzone z promotorem
- liczby baz wystarczy
- nie tylko BERT → **2–3 Transformery**
- to pokrywa całą część badawczą

## Setup eksperymentu
| Element | Wartość |
|---|---|
| Baseline | majority + TF-IDF + LinearSVC |
| Transformery | `bert-base-uncased`, `roberta-base`, `distilbert-base-uncased` |
| Zadania | seconvo, mentalmanip, safepersuasion, scam_phone, phishing_text, **reament** |
| Split | 80/20 stratified (seed 42); scam = oficjalny train/test |
| max_length | **512** |
| Epoki | 3 |
| Metryka główna | **F1 macro** (+ F1 klasy pozytywnej) |
| GPU run | RunPod RTX 3090 Community, 2026-09-04 (+ ReaMent 2026-09-05) |

## Status — DONE
- [x] Eksperyment: majority + SVM + 3 Transformery × 6 zadań (ReaMent = 6.)
- [x] Tabele: `outputs/comparison_f1_macro.md`, `comparison_f1.md`, `results_latest.md`
- [x] EDA: `outputs/eda_summary.md`
- [x] Wykres: `python -m src.plot_results` → `outputs/fig_f1_macro.png`
- [x] Szkic rozdziałów 1–6 + streszczenie: [`../SZKIC-SE-TRANSFORMER.md`](../SZKIC-SE-TRANSFORMER.md)
- [x] Przewodnik „co/jak/po co” od A do Z: [`../WYJASNIENIE-OD-A-DO-Z.md`](../WYJASNIENIE-OD-A-DO-Z.md)

## Co zostało (formalne, nie badawcze)
- [ ] Wklejenie do szablonu PRz + bibliografia (cytowania z rozdz. 2)
- [ ] Korekta językowa
- [ ] Streszczenie ostateczne po akceptacji promotora
