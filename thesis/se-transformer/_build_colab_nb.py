"""Build the full research Colab notebook (EDA + SVM + 3 Transformers)."""

from __future__ import annotations

import json
from pathlib import Path

root = Path(__file__).resolve().parent
src = root / "src"
SRC_FILES = [
    "paths.py",
    "download.py",
    "data_load.py",
    "metrics.py",
    "train_svm.py",
    "train_bert.py",
    "run_all.py",
    "eda.py",
    "compare_results.py",
    "__init__.py",
]
payload = {name: (src / name).read_text(encoding="utf-8") for name in SRC_FILES}


def md(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": text.splitlines(keepends=True)}


def code(text: str) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": text.splitlines(keepends=True),
    }


cells: list[dict] = []

cells.append(
    md(
        """# Magistra — część badawcza (100%)

**Temat:** Detekcja ataków inżynierii społecznej i prób manipulacji semantycznej w komunikacji cyfrowej z wykorzystaniem architektury Transformer

## Cel eksperymentu
Porównać **klasyczny baseline** (TF-IDF + LinearSVC) oraz **3 modele Transformer**:
1. `bert-base-uncased`
2. `roberta-base`
3. `distilbert-base-uncased`

na **5 publicznych korpusach** (bez zbierania własnych danych).

## Metryki
- główna przy imbalance: **F1 macro**
- dodatkowo: accuracy, precision, recall, F1 (klasa pozytywna)

## Środowisko
1. **Środowisko wykonawcze → Zmień typ → GPU T4 → Zapisz**
2. Runtime → **Uruchom wszystko**
3. Czas: EDA+SVM ~5–15 min; 3 Transformery na 5 zbiorach ~**2–4 h** na T4 (nie zamykaj karty)

## Zakres (potwierdzony z promotorem)
- liczby baz **wystarczy**
- nie tylko BERT — **2–3 Transformery**
"""
    )
)

cells.append(
    md(
        """## 0) GPU check + zależności
Sprawdź, że widać **Tesla T4** / CUDA = True.
"""
    )
)

cells.append(
    code(
        """!nvidia-smi
%pip install -q scikit-learn pandas numpy transformers accelerate huggingface_hub
import torch
print("cuda:", torch.cuda.is_available())
print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else "BRAK GPU — ustaw T4 i zrestartuj runtime")
"""
    )
)

cells.append(
    md(
        """## 1) Kod projektu + pobranie baz
Komórka zapisuje pipeline w `/content/se-transformer` i ściąga 5 korpusów.
Ma retry przy HTTP 429 (Hugging Face).
"""
    )
)

# Cell that writes source + downloads with retries
setup = f'''from pathlib import Path
import json, time, shutil, urllib.request, urllib.error

ROOT = Path("/content/se-transformer")
SRC = ROOT / "src"
SRC.mkdir(parents=True, exist_ok=True)
(ROOT / "outputs").mkdir(exist_ok=True)
(ROOT / "models").mkdir(exist_ok=True)
for sub in ["seconvo", "mentalmanip", "safepersuasion", "scam_phone", "phishing"]:
    (ROOT / "data" / sub).mkdir(parents=True, exist_ok=True)

FILES = json.loads({json.dumps(json.dumps(payload, ensure_ascii=False))})
for name, text in FILES.items():
    (SRC / name).write_text(text, encoding="utf-8")
    print("wrote src/" + name)

def fetch(url, dest, attempts=8):
    if dest.exists() and dest.stat().st_size > 1000:
        print("skip", dest.name, dest.stat().st_size)
        return
    print("download", dest.name)
    if "ealvaradob/phishing-dataset" in url and dest.name == "texts.json":
        try:
            from huggingface_hub import hf_hub_download
            path = hf_hub_download(
                repo_id="ealvaradob/phishing-dataset",
                filename="texts.json",
                repo_type="dataset",
            )
            shutil.copy(path, dest)
            print(" ", dest.stat().st_size, "(hf_hub)")
            return
        except Exception as e:
            print(" hf_hub failed:", e)
    tmp = dest.with_suffix(dest.suffix + ".part")
    last = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={{"User-Agent": "thesis-colab/2.0"}})
            with urllib.request.urlopen(req, timeout=180) as resp, open(tmp, "wb") as out:
                shutil.copyfileobj(resp, out)
            shutil.move(tmp, dest)
            print(" ", dest.stat().st_size)
            return
        except urllib.error.HTTPError as e:
            last = e
            if tmp.exists():
                tmp.unlink()
            wait = 20 * (i + 1)
            if e.code in (429, 503):
                print(f"  HTTP {{e.code}}, wait {{wait}}s")
                time.sleep(wait)
                continue
            raise
        except Exception as e:
            last = e
            if tmp.exists():
                tmp.unlink()
            wait = 15 * (i + 1)
            print(f"  error {{e}}, wait {{wait}}s")
            time.sleep(wait)
    raise RuntimeError(f"failed {{dest.name}}: {{last}}")

downloads = [
    ("https://zenodo.org/records/12170260/files/annotated_train.json?download=1", ROOT / "data/seconvo/annotated_train.json"),
    ("https://zenodo.org/records/12170260/files/annotated_test.json?download=1", ROOT / "data/seconvo/annotated_test.json"),
    ("https://huggingface.co/datasets/audreyeleven/MentalManip/resolve/main/mentalmanip_maj.csv?download=true", ROOT / "data/mentalmanip/mentalmanip_maj.csv"),
    ("https://raw.githubusercontent.com/haeinkong/SafePersuasion/main/dataset/SafePersuasion.csv", ROOT / "data/safepersuasion/SafePersuasion.csv"),
    ("https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation/resolve/main/agent_conversation_train.csv?download=true", ROOT / "data/scam_phone/agent_conversation_train.csv"),
    ("https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation/resolve/main/agent_conversation_test.csv?download=true", ROOT / "data/scam_phone/agent_conversation_test.csv"),
    ("https://huggingface.co/datasets/ealvaradob/phishing-dataset/resolve/main/texts.json?download=true", ROOT / "data/phishing/texts.json"),
]
for url, dest in downloads:
    fetch(url, dest)

import os, sys
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))
print("cwd", os.getcwd())
'''
cells.append(code(setup))

cells.append(
    md(
        """## 2) EDA korpusów
Rozmiary, balans klas, długości tekstów, przykłady pos/neg.
Zwróć uwagę: **SEConvo i scam_phone** mają długie rozmowy → dlatego używamy `max_length=512`.
"""
    )
)

cells.append(
    code(
        """import os, sys
os.chdir("/content/se-transformer")
sys.path.insert(0, "/content/se-transformer")
from src.eda import run_eda
eda_rows = run_eda()
"""
    )
)

cells.append(
    md(
        """## 3) Baseline: majority + TF-IDF + LinearSVC
Szybkie. Wyniki idą do `outputs/`.
"""
    )
)

cells.append(
    code(
        """import os, sys
os.chdir("/content/se-transformer")
sys.path.insert(0, "/content/se-transformer")
!python -m src.run_all --task all --skip-transformers --max-length 512
"""
    )
)

cells.append(
    md(
        """## 4) Transformery (3 modele) — główna część badawcza
Kolejność: BERT → RoBERTa → DistilBERT, wszystkie zadania, **max_length=512**, 3 epoki.

Jeśli sesja padnie w połowie, odpal poniższą komórkę z `--models` tylko dla brakującego modelu, np.:
`!python -m src.run_all --task all --models roberta-base --epochs 3 --batch-size 8 --max-length 512`
"""
    )
)

cells.append(
    code(
        """import os, sys
os.chdir("/content/se-transformer")
sys.path.insert(0, "/content/se-transformer")
# Pełny przebieg: majority+SVM jest już policzone wyżej; tu doklejamy 3 Transformery.
# Aby nie dublować SVM, można odpalić tylko modele — ale run_all zawsze liczy majority+SVM (szybkie).
!python -m src.run_all --task all --models bert-base-uncased,roberta-base,distilbert-base-uncased --epochs 3 --batch-size 8 --max-length 512
"""
    )
)

cells.append(
    md(
        """## 5) Tabele porównawcze (F1 macro i F1)
Pivot po wszystkich plikach `results_*.json` w `outputs/`.
"""
    )
)

cells.append(
    code(
        """import os, sys
os.chdir("/content/se-transformer")
sys.path.insert(0, "/content/se-transformer")
!python -m src.compare_results --metric f1_macro
!python -m src.compare_results --metric f1
from pathlib import Path
print(Path("outputs/comparison_f1_macro.md").read_text(encoding="utf-8"))
print(Path("outputs/comparison_f1.md").read_text(encoding="utf-8"))
"""
    )
)

cells.append(
    md(
        """## 6) Jak czytać wyniki (do rozdziału Dyskusja)

| Zbiór | Rola w pracy |
|---|---|
| SafePersuasion | hard case manipulacji semantycznej — tu Transformer powinien pomagać |
| MentalManip | manipulacja w dialogu; raportuj **F1 macro** (imbalance) |
| SEConvo | SE w czacie; mały N; długie rozmowy → 512 tokenów |
| phishing_text | skala / klasyczny kanał SE |
| scam_phone | **kontrola** — jeśli F1≈1.0, nie jest główny dowód |

**Pytanie badawcze:** czy modele Transformer przewyższają baseline SVM w detekcji SE i manipulacji semantycznej — i kiedy nie.
"""
    )
)

cells.append(
    md("## 7) Pobierz artefakty do magistry")
)

cells.append(
    code(
        """from pathlib import Path
from google.colab import files

outs = Path("/content/se-transformer/outputs")
for name in [
    "results_latest.md",
    "eda_summary.md",
    "eda_summary.json",
    "comparison_f1_macro.md",
    "comparison_f1.md",
]:
    p = outs / name
    if p.exists():
        print("download", p)
        files.download(str(p))

# najnowszy pełny JSON
jsons = sorted(outs.glob("results_full_*.json"))
if jsons:
    files.download(str(jsons[-1]))
print("DONE — część badawcza do wklejenia w rozdział Wyniki")
"""
    )
)

nb = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "accelerator": "GPU",
        "colab": {"provenance": [], "gpuType": "T4"},
    },
    "cells": cells,
}

out = root / "colab.ipynb"
out.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", out, out.stat().st_size)
