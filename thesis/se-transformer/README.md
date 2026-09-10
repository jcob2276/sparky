# SE + manipulacja semantyczna — eksperyment (część badawcza)

**Notebook Colab (pełny):** [`colab.ipynb`](colab.ipynb)  
**Checklist / zakres:** [`RESEARCH.md`](RESEARCH.md) · [`DATASETS.md`](DATASETS.md) · [`AUDIT.md`](AUDIT.md)  
**Szkic pracy (wklej do PRz):** [`../SZKIC-SE-TRANSFORMER.md`](../SZKIC-SE-TRANSFORMER.md) · wykres: `python -m src.plot_results`

## Modele
- Baseline: majority + TF-IDF + LinearSVC  
- Transformery: **BERT**, **RoBERTa**, **DistilBERT**

## Zadania
SEConvo, MentalManip, SafePersuasion, scam_phone, phishing_text, **ReaMent** (6.)

## Colab (to odpalasz Ty)
1. Wgraj `colab.ipynb`
2. GPU **T4**
3. Runtime → Uruchom wszystko (~2–4 h)
4. Pobierz pliki z ostatniej komórki

## Lokalnie (bez GPU)
```bash
python -m pip install -r requirements.txt
python -m src.download
python -m src.eda
python -m src.run_all --task all --skip-transformers
python -m src.compare_results --metric f1_macro
```

Pełne 3 Transformery (GPU):
```bash
python -m src.run_all --task all --models all --epochs 3 --batch-size 8 --max-length 512
```
