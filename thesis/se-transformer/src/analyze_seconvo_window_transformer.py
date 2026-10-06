"""Recompute and pair DistilBERT first/last SEConvo predictions by dialogue."""
from __future__ import annotations

import argparse
import csv
import json
import statistics
from math import isfinite
from pathlib import Path

from sklearn.metrics import average_precision_score, confusion_matrix, f1_score, roc_auc_score

from src.research_run import _sha256
from src.research_seconvo_official import load_official_split


def rank_metrics(labels: list[int], probabilities: list[float]) -> dict[str, float]:
    if len(labels) != len(probabilities) or set(labels) != {0, 1}:
        raise ValueError("rank metrics require aligned labels from both classes")
    return {
        "roc_auc": float(roc_auc_score(labels, probabilities)),
        "average_precision": float(average_precision_score(labels, probabilities)),
    }


def load_window_run(run_dir: Path, expected_ids: list[str], expected_labels: list[int]) -> tuple[dict, list[int], list[float]]:
    manifest = json.loads((run_dir / "manifest.json").read_text(encoding="utf-8"))
    with (run_dir / "test_predictions.csv").open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    ids = [row["id"] for row in rows]
    labels = [int(row["true_label"]) for row in rows]
    if (
        ids != expected_ids
        or labels != expected_labels
        or len(set(ids)) != len(ids)
        or len(rows) != manifest["split"]["n_test"]
        or ids != manifest["split"]["test_ids"]
    ):
        raise ValueError(f"IDs or labels differ from author test: {run_dir}")
    predictions = [int(row["model_pred"]) for row in rows]
    if any(value not in (0, 1) for value in predictions):
        raise ValueError(f"nonbinary prediction: {run_dir}")
    probabilities = [float(row["model_p1"]) for row in rows]
    if any(not isfinite(value) or value < 0 or value > 1 for value in probabilities):
        raise ValueError(f"invalid probability: {run_dir}")
    computed_f1 = float(f1_score(labels, predictions, average="macro", zero_division=0))
    if abs(computed_f1 - manifest["results"]["f1_macro"]) > 1e-12:
        raise ValueError(f"saved F1 differs from per-dialogue predictions: {run_dir}")
    return manifest, predictions, probabilities


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    split = load_official_split()
    runs = {}
    anchor = None
    for seed in range(42, 47):
        for window in ("first", "last"):
            name = f"{window}-seed{seed}"
            manifest, predictions, probabilities = load_window_run(root / name, split.ids_test, split.y_test)
            if manifest["configuration"]["window"] != window or manifest["configuration"]["seed"] != seed:
                raise ValueError(f"run config does not match path: {name}")
            expected_side = "right" if window == "first" else "left"
            if manifest["configuration"]["truncation_side"] != expected_side:
                raise ValueError(f"truncation side does not match window: {name}")
            fingerprint = (
                manifest["sources"]["train_sha256"],
                manifest["sources"]["test_sha256"],
                manifest["sources"]["script_sha256"],
                manifest["model"]["id"],
                manifest["model"]["revision"],
                tuple(manifest["split"]["train_ids"]),
            )
            if anchor is None:
                anchor = fingerprint
            elif fingerprint != anchor:
                raise ValueError(f"source, model, or train IDs differ: {name}")
            tn, fp, fn, tp = confusion_matrix(split.y_test, predictions, labels=[0, 1]).ravel()
            runs[name] = {
                "predictions": predictions,
                "f1_macro": manifest["results"]["f1_macro"],
                "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
                "attack_recall": float(tp / (tp + fn)),
                "benign_fpr": float(fp / (tn + fp)),
                **rank_metrics(split.y_test, probabilities),
                "train_seconds": manifest["results"]["train_seconds"],
                "predict_seconds": manifest["results"]["predict_seconds"],
                "gpu_name": manifest["environment"]["gpu_name"],
            }
    summary = {
        "description": "Exploratory paired 40/360 test; same five seeds and dataset, previously used test set",
        "source_hashes": {"train": anchor[0], "test": anchor[1], "script": anchor[2]},
        "model": {"id": anchor[3], "revision": anchor[4]},
        "n_train": len(split.y_train),
        "n_test": len(split.y_test),
        "prediction_files_verified": 10,
        "windows": {},
        "per_seed_delta_last_minus_first": {},
    }
    for window in ("first", "last"):
        window_runs = [runs[f"{window}-seed{seed}"] for seed in range(42, 47)]
        values = [item["f1_macro"] for item in window_runs]
        summary["windows"][window] = {
            "f1_macro_mean": statistics.mean(values),
            "f1_macro_sample_sd": statistics.stdev(values),
            "f1_macro_range": [min(values), max(values)],
            "attack_recall_mean": statistics.mean(item["attack_recall"] for item in window_runs),
            "benign_fpr_mean": statistics.mean(item["benign_fpr"] for item in window_runs),
            "roc_auc_mean": statistics.mean(item["roc_auc"] for item in window_runs),
            "average_precision_mean": statistics.mean(item["average_precision"] for item in window_runs),
            "runs": {
                str(seed): {key: value for key, value in runs[f"{window}-seed{seed}"].items() if key != "predictions"}
                for seed in range(42, 47)
            },
        }
    deltas = []
    for seed in range(42, 47):
        first = runs[f"first-seed{seed}"]["f1_macro"]
        last = runs[f"last-seed{seed}"]["f1_macro"]
        delta = last - first
        deltas.append(delta)
        summary["per_seed_delta_last_minus_first"][str(seed)] = delta
    summary["delta_last_minus_first_mean"] = statistics.mean(deltas)
    summary["delta_last_minus_first_sample_sd"] = statistics.stdev(deltas)
    summary["analysis_script_sha256"] = _sha256(Path(__file__))
    (root / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
