"""Verify and summarize repeated SEConvo runs on the authors' 40/360 split."""
from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path

from sklearn.metrics import confusion_matrix, f1_score

from src.paths import TRANSFORMER_MODELS


def load_official_run(run_dir: Path) -> dict:
    manifest = json.loads((run_dir / "manifest.json").read_text(encoding="utf-8"))
    with (run_dir / "test_predictions.csv").open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    ids = [row["id"] for row in rows]
    if ids != manifest["split"]["test_ids"] or len(set(ids)) != len(ids):
        raise ValueError(f"prediction IDs differ from manifest: {run_dir}")
    if len(rows) != manifest["split"]["n_test"]:
        raise ValueError(f"prediction count differs from manifest: {run_dir}")
    y = [int(row["true_label"]) for row in rows]
    baseline = [int(row["svm_pred"]) for row in rows]
    model = [int(row["model_pred"]) for row in rows]
    baseline_f1 = float(f1_score(y, baseline, average="macro", zero_division=0))
    model_f1 = float(f1_score(y, model, average="macro", zero_division=0))
    if abs(baseline_f1 - manifest["results"]["svm"]["f1_macro"]) > 1e-10:
        raise ValueError(f"SVM F1 differs from saved predictions: {run_dir}")
    if abs(model_f1 - manifest["results"]["transformer"]["f1_macro"]) > 1e-10:
        raise ValueError(f"Transformer F1 differs from saved predictions: {run_dir}")
    confusion = confusion_matrix(y, model, labels=[0, 1]).tolist()
    tn, fp = confusion[0]
    fn, tp = confusion[1]
    return {
        "manifest": manifest,
        "ids": ids,
        "y": y,
        "svm_predictions": baseline,
        "model_predictions": model,
        "n_test": len(rows),
        "svm_f1_macro": baseline_f1,
        "model_f1_macro": model_f1,
        "model_confusion_matrix": confusion,
        "attack_recall": tp / (tp + fn),
        "benign_false_positive_rate": fp / (fp + tn),
        "n_predicted_attacks": fp + tp,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    expected = [f"{model}-seed{seed}" for model in TRANSFORMER_MODELS for seed in range(42, 47)]
    runs = {name: load_official_run(root / name) for name in expected}
    reference = runs[expected[0]]
    for name, run in runs.items():
        if run["manifest"]["sources"] != reference["manifest"]["sources"]:
            raise ValueError(f"different source files or script in {name}")
        if (run["ids"], run["y"], run["svm_predictions"]) != (
            reference["ids"], reference["y"], reference["svm_predictions"]
        ):
            raise ValueError(f"different test set or SVM baseline in {name}")
        if (run["manifest"]["split"]["n_train"], run["n_test"]) != (40, 360):
            raise ValueError(f"not the SEConvo author 40/360 protocol in {name}")
    models: dict[str, dict] = {}
    for model in TRANSFORMER_MODELS:
        group = [runs[f"{model}-seed{seed}"] for seed in range(42, 47)]
        f1 = [run["model_f1_macro"] for run in group]
        recall = [run["attack_recall"] for run in group]
        fpr = [run["benign_false_positive_rate"] for run in group]
        models[model] = {
            "f1_macro_mean": statistics.mean(f1),
            "f1_macro_sample_sd": statistics.stdev(f1),
            "f1_macro_min": min(f1),
            "f1_macro_max": max(f1),
            "attack_recall_mean": statistics.mean(recall),
            "benign_fpr_mean": statistics.mean(fpr),
            "seed42_confusion_matrix": group[0]["model_confusion_matrix"],
            "runs": {
                str(seed): {
                    "f1_macro": group[i]["model_f1_macro"],
                    "attack_recall": group[i]["attack_recall"],
                    "benign_fpr": group[i]["benign_false_positive_rate"],
                    "n_predicted_attacks": group[i]["n_predicted_attacks"],
                    "train_seconds": group[i]["manifest"]["results"]["transformer"]["train_seconds"],
                    "predict_seconds": group[i]["manifest"]["results"]["transformer"]["predict_seconds"],
                }
                for i, seed in enumerate(range(42, 47))
            },
        }
    summary = {
        "protocol": "SEConvo authors' annotated_train 40 / annotated_test 360; fixed 3 epochs, batch 8, max length 512",
        "source_hashes": reference["manifest"]["sources"],
        "n_train": 40,
        "n_test": 360,
        "all_test_ids_and_svm_predictions_match": True,
        "svm_f1_macro": reference["svm_f1_macro"],
        "svm_confusion_matrix": reference["manifest"]["results"]["svm"]["confusion_matrix"],
        "models": models,
        "interpretation_note": "The official test was already used in earlier internal resplits; these repeated results are exploratory and share one test set.",
    }
    (root / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
