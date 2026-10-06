"""Recompute the frozen phishing_text comparison from per-message predictions."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import statistics
from pathlib import Path

from src.analyze_repeats import compare_predictions, paired_bootstrap_ci, paired_permutation_p
from src.research_phishing import load_frozen_phishing_split


def validate_and_pair(expected_rows: list[dict], svm_predictions: list[int], saved: list[dict]) -> dict:
    if len(expected_rows) != len(saved) or len(saved) != len(svm_predictions):
        raise ValueError("prediction row count mismatch")
    if [row["id"] for row in saved] != [row["id"] for row in expected_rows]:
        raise ValueError("prediction IDs do not match frozen split")
    true_labels = [int(row["true_label"]) for row in saved]
    baseline = [int(row["svm_pred"]) for row in saved]
    model = [int(row["model_pred"]) for row in saved]
    if true_labels != [row["label"] for row in expected_rows]:
        raise ValueError("prediction labels do not match frozen split")
    if baseline != svm_predictions:
        raise ValueError("SVM predictions do not match baseline manifest")
    return compare_predictions(true_labels, baseline, model)


def select_seed_by_validation(runs: dict[int, dict]) -> int:
    return max(sorted(runs), key=lambda seed: runs[seed]["validation_f1_macro"])


def summarize(root: Path, seeds: tuple[int, ...] = (42, 43, 44, 45, 46)) -> dict:
    baseline_path = root / "manifest.json"
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    split = load_frozen_phishing_split(root / "split.json", baseline_path)
    baseline_sha = hashlib.sha256(baseline_path.read_bytes()).hexdigest()
    runs = {}
    script_hashes = set()
    for seed in seeds:
        run = root / f"seed-{seed}"
        manifest = json.loads((run / "manifest.json").read_text(encoding="utf-8"))
        if (manifest["split_sha256"] != baseline["split_sha256"] or
                manifest["source_sha256"] != baseline["source_sha256"] or
                manifest["baseline_manifest_sha256"] != baseline_sha):
            raise ValueError(f"source or split checksum mismatch for seed {seed}")
        script_hashes.add(manifest["script_sha256"])
        pairs = {}
        for name in ("validation", "test"):
            with (run / f"{name}_predictions.csv").open(newline="", encoding="utf-8") as handle:
                saved = list(csv.DictReader(handle))
            pair = validate_and_pair(split[name], baseline["svm"][name]["predictions"], saved)
            if abs(pair["model_f1_macro"] - manifest["metrics"][name]["f1_macro"]) > 1e-12:
                raise ValueError(f"saved F1 differs from predictions for seed {seed} {name}")
            pairs[name] = pair
        runs[seed] = {
            "validation_f1_macro": pairs["validation"]["model_f1_macro"],
            "test_f1_macro": pairs["test"]["model_f1_macro"],
            "test_pair": pairs["test"],
            "test_confusion_matrix": manifest["metrics"]["test"]["confusion_matrix"],
            "train_seconds": manifest["training"]["seconds"],
            "gpu": manifest["environment"]["gpu"],
        }
    if len(script_hashes) != 1:
        raise ValueError("training script differs between seeds")
    selected = select_seed_by_validation(runs)
    with (root / f"seed-{selected}" / "test_predictions.csv").open(newline="", encoding="utf-8") as handle:
        chosen_rows = list(csv.DictReader(handle))
    y = [int(row["true_label"]) for row in chosen_rows]
    svm = [int(row["svm_pred"]) for row in chosen_rows]
    model = [int(row["model_pred"]) for row in chosen_rows]
    scores = [runs[seed]["test_f1_macro"] for seed in seeds]
    return {
        "experiment": baseline["experiment"],
        "source_sha256": baseline["source_sha256"],
        "split_sha256": baseline["split_sha256"],
        "training_script_sha256": next(iter(script_hashes)),
        "selected_seed_by_validation": selected,
        "svm_test_f1_macro": baseline["svm"]["test"]["metrics"]["f1_macro"],
        "transformer_test_mean_f1_macro": statistics.mean(scores),
        "transformer_test_sample_sd": statistics.stdev(scores),
        "selected_seed_paired_bootstrap_delta_ci95": list(paired_bootstrap_ci(y, svm, model, replicates=2000, seed=42)),
        "selected_seed_paired_permutation_p_two_sided": paired_permutation_p(y, svm, model, replicates=2000, seed=42),
        "runs": runs,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    result = summarize(root)
    (root / "summary.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
