"""Bar chart: F1 macro by task × model (thesis figure)."""

from __future__ import annotations

import argparse
from pathlib import Path

from src.paths import OUTPUTS

# Recovered RunPod 2026-09-04 comparison (f1_macro)
ROWS: dict[str, dict[str, float]] = {
    "safepersuasion": {
        "majority": 0.3813,
        "svm": 0.6127,
        "bert": 0.7308,
        "roberta": 0.7090,
        "distilbert": 0.7026,
    },
    "mentalmanip": {
        "majority": 0.4135,
        "svm": 0.6194,
        "bert": 0.6458,
        "roberta": 0.6512,
        "distilbert": 0.6394,
    },
    "phishing_text": {
        "majority": 0.3838,
        "svm": 0.9729,
        "bert": 0.9877,
        "roberta": 0.9912,
        "distilbert": 0.9885,
    },
    "seconvo": {
        "majority": 0.3496,
        "svm": 0.7834,
        "bert": 0.7494,
        "roberta": 0.7486,
        "distilbert": 0.7460,
    },
    "scam_phone": {
        "majority": 0.3333,
        "svm": 1.0,
        "bert": 1.0,
        "roberta": 1.0,
        "distilbert": 1.0,
    },
}

ORDER = ["safepersuasion", "mentalmanip", "phishing_text", "seconvo", "scam_phone"]
MODELS = ["majority", "svm", "bert", "roberta", "distilbert"]
LABELS = {
    "majority": "Majority",
    "svm": "TF-IDF+SVM",
    "bert": "BERT",
    "roberta": "RoBERTa",
    "distilbert": "DistilBERT",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=OUTPUTS / "fig_f1_macro.png")
    args = parser.parse_args()

    import matplotlib.pyplot as plt
    import numpy as np

    x = np.arange(len(ORDER))
    width = 0.15
    fig, ax = plt.subplots(figsize=(10, 4.5))
    for i, model in enumerate(MODELS):
        vals = [ROWS[t][model] for t in ORDER]
        ax.bar(x + (i - 2) * width, vals, width, label=LABELS[model])
    ax.set_ylabel("F1 macro")
    ax.set_xticks(x)
    ax.set_xticklabels(ORDER, rotation=15, ha="right")
    ax.set_ylim(0, 1.05)
    ax.legend(ncols=3, fontsize=8)
    ax.set_title("F1 macro — RunPod RTX 3090 (max_length=512, epochs=3)")
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.out, dpi=160)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
