"""Summarize paired SafePersuasion repeats from saved per-example predictions."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path

import numpy as np
from scipy.stats import binomtest
from sklearn.metrics import f1_score


def compare_predictions(
    true_labels: list[int], baseline_predictions: list[int], model_predictions: list[int]
) -> dict[str, float | int]:
    if not (len(true_labels) == len(baseline_predictions) == len(model_predictions)):
        raise ValueError("paired prediction arrays have unequal lengths")
    y = np.asarray(true_labels)
    baseline = np.asarray(baseline_predictions)
    model = np.asarray(model_predictions)
    only_baseline = int(np.sum((baseline == y) & (model != y)))
    only_model = int(np.sum((baseline != y) & (model == y)))
    discordant = only_baseline + only_model
    baseline_f1 = float(f1_score(y, baseline, average="macro", zero_division=0))
    model_f1 = float(f1_score(y, model, average="macro", zero_division=0))
    return {
        "n": len(y),
        "baseline_f1_macro": baseline_f1,
        "model_f1_macro": model_f1,
        "delta_f1_macro": model_f1 - baseline_f1,
        "only_baseline_correct": only_baseline,
        "only_model_correct": only_model,
        "mcnemar_exact_p": float(
            binomtest(min(only_baseline, only_model), discordant, 0.5).pvalue
        ) if discordant else 1.0,
    }


def paired_bootstrap_ci(
    true_labels: list[int],
    baseline_predictions: list[int],
    model_predictions: list[int],
    replicates: int = 5000,
    seed: int = 20260928,
) -> tuple[float, float]:
    if not (len(true_labels) == len(baseline_predictions) == len(model_predictions)):
        raise ValueError("paired prediction arrays have unequal lengths")
    y = np.asarray(true_labels)
    baseline = np.asarray(baseline_predictions)
    model = np.asarray(model_predictions)
    rng = np.random.default_rng(seed)
    deltas = np.empty(replicates)
    for i in range(replicates):
        sample = rng.integers(0, len(y), len(y))
        deltas[i] = f1_score(y[sample], model[sample], average="macro", zero_division=0) - f1_score(
            y[sample], baseline[sample], average="macro", zero_division=0
        )
    lo, hi = np.quantile(deltas, [0.025, 0.975])
    return float(lo), float(hi)


def paired_permutation_p(
    true_labels: list[int],
    baseline_predictions: list[int],
    model_predictions: list[int],
    replicates: int = 5000,
    seed: int = 20260928,
) -> float:
    y = np.asarray(true_labels)
    baseline = np.asarray(baseline_predictions)
    model = np.asarray(model_predictions)
    if not (len(y) == len(baseline) == len(model)):
        raise ValueError("paired prediction arrays have unequal lengths")
    observed = abs(compare_predictions(true_labels, baseline_predictions, model_predictions)["delta_f1_macro"])
    rng = np.random.default_rng(seed)
    extreme = 0
    for _ in range(replicates):
        swap = rng.random(len(y)) < 0.5
        b = np.where(swap, model, baseline)
        m = np.where(swap, baseline, model)
        delta = abs(f1_score(y, m, average="macro", zero_division=0) - f1_score(
            y, b, average="macro", zero_division=0
        ))
        extreme += delta >= observed - 1e-12
    return (extreme + 1) / (replicates + 1)


def _load_run(path: Path) -> tuple[dict, list[str], list[int], list[int], list[int]]:
    manifest = json.loads((path / "manifest.json").read_text(encoding="utf-8"))
    with (path / "test_predictions.csv").open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    ids = [row["id"] for row in rows]
    y = [int(row["true_label"]) for row in rows]
    baseline = [int(row["svm_pred"]) for row in rows]
    model = [int(row["model_pred"]) for row in rows]
    if ids != manifest["split"]["test_ids"] or len(set(ids)) != len(ids):
        raise ValueError(f"IDs in predictions do not match manifest: {path}")
    pair = compare_predictions(y, baseline, model)
    if abs(pair["model_f1_macro"] - manifest["results"]["transformer"]["test"]["f1_macro"]) > 1e-12:
        raise ValueError(f"saved F1 does not match predictions: {path}")
    return manifest, ids, y, baseline, model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    names = [f"a40-seed{seed}" for seed in range(42, 47)] + ["a100-seed42"]
    runs = {name: _load_run(root / name) for name in names}
    anchor = runs["a40-seed42"]
    hashes = set()
    script_hashes = set()
    for name, run in runs.items():
        manifest, ids, y, baseline, _ = run
        if (ids, y, baseline) != (anchor[1], anchor[2], anchor[3]):
            raise ValueError(f"test set or SVM baseline differs in {name}")
        hashes.add(manifest["dataset_sha256"])
        script_hashes.add(manifest["source_script_sha256"])
    if len(hashes) != 1 or len(script_hashes) != 1:
        raise ValueError("dataset or training script differs between runs")

    quality = {}
    for name, (manifest, _, y, baseline, model) in runs.items():
        quality[name] = {
            **compare_predictions(y, baseline, model),
            "gpu": manifest["environment"]["gpu_name"],
            "train_seconds": manifest["results"]["transformer"]["train_seconds"],
            "script_wall_seconds": manifest["wall_seconds"],
            "gpu_price_usd_per_hour": manifest["gpu_hourly_price_usd"],
        }

    seed42 = anchor
    ci = paired_bootstrap_ci(seed42[2], seed42[3], seed42[4])
    permutation_p = paired_permutation_p(seed42[2], seed42[3], seed42[4])
    scores = [quality[f"a40-seed{seed}"]["model_f1_macro"] for seed in range(42, 47)]
    a40 = quality["a40-seed42"]
    a100 = quality["a100-seed42"]
    summary = {
        "dataset_sha256": next(iter(hashes)),
        "source_script_sha256": next(iter(script_hashes)),
        "test_size": len(seed42[2]),
        "a40_f1_mean_5_seeds": statistics.mean(scores),
        "a40_f1_sample_sd_5_seeds": statistics.stdev(scores),
        "a40_f1_min_max_5_seeds": [min(scores), max(scores)],
        "seed42_paired_bootstrap_delta_ci95": list(ci),
        "seed42_paired_permutation_f1_p_two_sided": permutation_p,
        "seed42_cross_gpu_prediction_disagreements": sum(
            x != z for x, z in zip(seed42[4], runs["a100-seed42"][4])
        ),
        "a100_to_a40_training_speedup_seed42": a40["train_seconds"] / a100["train_seconds"],
        "runs": quality,
    }
    (root / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
