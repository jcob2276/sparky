"""Validate and summarize paired ReaMent_con predictions."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path

from src.analyze_repeats import compare_predictions, paired_bootstrap_ci


def _read_predictions(path: Path, prediction_field: str) -> tuple[list[str], list[int], list[int]]:
    with path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    return (
        [row["id"] for row in rows],
        [int(row["true_label"]) for row in rows],
        [int(row[prediction_field]) for row in rows],
    )


def summarize(root: Path, seeds: list[int], bootstrap_replicates: int = 5000) -> dict:
    baseline = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    ids, labels, svm = _read_predictions(root / "test_predictions.csv", "svm_pred")
    if ids != baseline["split"]["test"]["ids"] or len(set(ids)) != len(ids):
        raise ValueError("baseline test IDs differ from manifest")
    baseline_pair = compare_predictions(labels, svm, svm)
    if abs(baseline_pair["baseline_f1_macro"] - baseline["results"]["svm"]["test"]["f1_macro"]) > 1e-12:
        raise ValueError("baseline F1 differs from saved predictions")

    runs = {}
    predictions = {}
    for seed in seeds:
        run_path = root / f"transformer_seed_{seed}"
        manifest = json.loads((run_path / "manifest.json").read_text(encoding="utf-8"))
        run_ids, run_labels, model = _read_predictions(run_path / "test_predictions.csv", "model_pred")
        if run_ids != ids or run_labels != labels or manifest["split_ids"]["test"] != ids:
            raise ValueError(f"test IDs or labels differ for seed {seed}")
        if manifest["source_sha256"] != baseline["dataset_sha256"]:
            raise ValueError(f"source SHA-256 differs for seed {seed}")
        if manifest["config"]["model_seed"] != seed:
            raise ValueError(f"seed differs from directory name: {seed}")
        pair = compare_predictions(labels, svm, model)
        if abs(pair["model_f1_macro"] - manifest["metrics"]["test"]["f1_macro"]) > 1e-12:
            raise ValueError(f"model F1 differs from saved predictions for seed {seed}")
        runs[str(seed)] = {
            "test_f1_macro": pair["model_f1_macro"],
            "delta_vs_svm": pair["delta_f1_macro"],
            "best_validation_f1_macro": manifest["training"]["best_validation_f1_macro"],
            "train_seconds": manifest["training"]["seconds"],
            "only_svm_correct": pair["only_baseline_correct"],
            "only_transformer_correct": pair["only_model_correct"],
            "mcnemar_exact_p_exploratory": pair["mcnemar_exact_p"],
        }
        predictions[seed] = model

    selected = max(seeds, key=lambda seed: (runs[str(seed)]["best_validation_f1_macro"], -seed))
    ci = paired_bootstrap_ci(labels, svm, predictions[selected],
                             replicates=bootstrap_replicates, seed=20260929)
    scores = [runs[str(seed)]["test_f1_macro"] for seed in seeds]
    return {
        "dataset_sha256": baseline["dataset_sha256"],
        "test_size": len(ids),
        "baseline_f1_macro": baseline_pair["baseline_f1_macro"],
        "model_f1_mean": statistics.mean(scores),
        "model_f1_sample_sd": statistics.stdev(scores) if len(scores) > 1 else None,
        "model_f1_min_max": [min(scores), max(scores)],
        "selected_seed_by_validation": selected,
        "selected_seed_paired_delta_ci95_exploratory": list(ci),
        "runs": runs,
        "caveat": "Exploratory: this project's test labels were examined before this series; seeds share one test set.",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    result = summarize(args.root, list(range(42, 47)))
    (args.root / "summary.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
