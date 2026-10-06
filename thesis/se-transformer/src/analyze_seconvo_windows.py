"""Verify saved SEConvo window predictions and compare them as paired outcomes."""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from sklearn.metrics import f1_score

from src.analyze_repeats import compare_predictions, paired_bootstrap_ci, paired_permutation_p
from src.paths import SECONVO_TEST, SECONVO_TRAIN
from src.research_run import _sha256
from src.research_seconvo_official import load_official_split


def holm_adjust(p_values: list[float]) -> list[float]:
    """Family-wise correction for the three pairwise exploratory tests."""
    result = [0.0] * len(p_values)
    previous = 0.0
    for rank, index in enumerate(sorted(range(len(p_values)), key=p_values.__getitem__)):
        previous = max(previous, min(1.0, p_values[index] * (len(p_values) - rank)))
        result[index] = previous
    return result


def read_verified_run(root: Path, expected_ids: list[str], expected_labels: list[int]) -> tuple[dict, dict[str, list[int]]]:
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    with (root / "test_predictions.csv").open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    ids = [row["id"] for row in rows]
    labels = [int(row["true_label"]) for row in rows]
    if ids != expected_ids or labels != expected_labels or len(set(ids)) != len(ids) or len(rows) != manifest["n_test"]:
        raise ValueError("saved SEConvo IDs or labels differ from the author test split")
    predictions = {}
    for side in ("full", "first", "last"):
        values = [int(row[f"{side}_pred"]) for row in rows]
        computed_f1 = float(f1_score(labels, values, average="macro", zero_division=0))
        if abs(computed_f1 - manifest["results"][side]["f1_macro"]) > 1e-12:
            raise ValueError(f"saved F1 for {side} differs from per-dialogue predictions")
        predictions[side] = values
    return manifest, predictions


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--replicates", type=int, default=5000)
    args = parser.parse_args()
    root = args.root.resolve()
    split = load_official_split()
    manifest, predictions = read_verified_run(root, split.ids_test, split.y_test)
    source_hashes = manifest["sources_sha256"]
    if source_hashes["train"] != _sha256(SECONVO_TRAIN) or source_hashes["test"] != _sha256(SECONVO_TEST):
        raise ValueError("saved source hashes differ from current author data")
    pairs = (("full", "first"), ("full", "last"), ("first", "last"))
    comparisons = {}
    raw_p = []
    for baseline_side, candidate_side in pairs:
        baseline = predictions[baseline_side]
        candidate = predictions[candidate_side]
        result = compare_predictions(split.y_test, baseline, candidate)
        result["paired_bootstrap_delta_f1_ci95"] = list(
            paired_bootstrap_ci(split.y_test, baseline, candidate, replicates=args.replicates)
        )
        result["paired_permutation_f1_p_two_sided"] = paired_permutation_p(
            split.y_test, baseline, candidate, replicates=args.replicates
        )
        name = f"{candidate_side}_minus_{baseline_side}"
        comparisons[name] = result
        raw_p.append(result["paired_permutation_f1_p_two_sided"])
    for result, adjusted in zip(comparisons.values(), holm_adjust(raw_p)):
        result["paired_permutation_holm_p"] = adjusted
    summary = {
        "description": "Exploratory paired comparisons on a previously used author test; shared train and test",
        "input_predictions_sha256": _sha256(root / "test_predictions.csv"),
        "analysis_script_sha256": _sha256(Path(__file__)),
        "replicates": args.replicates,
        "seed": 20260928,
        "comparisons": comparisons,
    }
    (root / "paired_analysis.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
