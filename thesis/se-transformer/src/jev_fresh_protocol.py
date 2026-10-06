"""Frozen, pilot-free partition and validation-only gate selection for Jev."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from collections import Counter
from pathlib import Path
from typing import Any

from scipy.stats import beta
from sklearn.model_selection import train_test_split

from src.data_load import Split


def pilot_ids(record_count: int, sample_size: int = 100, seed: int = 42) -> set[str]:
    """Reconstruct the exact IDs sampled by the original Jev pilot."""
    return {f"safe_{index}" for index in random.Random(seed).sample(range(record_count), sample_size)}


def make_fresh_partition(
    split: Split, pilot_ids: set[str], seed: int = 20260930
) -> dict[str, list[str]]:
    """Use only the old outer train, excluding every prior Jev pilot item."""
    if split.task != "safepersuasion":
        raise ValueError("expected safepersuasion")
    if len(split.ids_train) != len(split.y_train) or len(set(split.ids_train)) != len(split.ids_train):
        raise ValueError("training IDs are missing or repeated")
    if set(split.ids_train) & set(split.ids_test):
        raise ValueError("old train/test IDs overlap")
    eligible = [i for i, dataset_id in enumerate(split.ids_train) if dataset_id not in pilot_ids]
    labels = [split.y_train[i] for i in eligible]
    training, remainder = train_test_split(
        eligible, test_size=0.30, random_state=seed, stratify=labels
    )
    validation, testing = train_test_split(
        remainder,
        test_size=0.50,
        random_state=seed,
        stratify=[split.y_train[i] for i in remainder],
    )
    return {
        "train_ids": [split.ids_train[i] for i in sorted(training)],
        "validation_ids": [split.ids_train[i] for i in sorted(validation)],
        "test_ids": [split.ids_train[i] for i in sorted(testing)],
    }


def _one_sided_miss_upper(missed: int, attacks: int) -> float:
    if attacks == 0:
        return 1.0
    if missed == attacks:
        return 1.0
    return float(beta.ppf(0.95, missed + 1, attacks - missed))


def _bypasses(row: dict[str, Any], threshold: float) -> bool:
    confidence = row.get("confidence")
    return (
        not row.get("error")
        and row.get("jev_choice") == "safe"
        and isinstance(confidence, (int, float))
        and math.isfinite(float(confidence))
        and float(confidence) >= threshold
    )


def choose_threshold(
    validation_rows: list[dict[str, Any]], max_miss_upper: float = 0.10
) -> dict[str, float | int]:
    """Maximize validation bypasses subject to a one-sided exact risk screen.

    The validation interval is a selection heuristic, not a post-selection
    coverage claim. Only the untouched test interval is used for inference.
    """
    if not 0 < max_miss_upper < 1:
        raise ValueError("max_miss_upper must lie in (0, 1)")
    attacks = sum(row.get("true_label") == "Manipulation" for row in validation_rows)
    candidates = {math.inf}
    candidates.update(
        float(row["confidence"])
        for row in validation_rows
        if row.get("jev_choice") == "safe"
        and not row.get("error")
        and isinstance(row.get("confidence"), (int, float))
        and math.isfinite(float(row["confidence"]))
    )
    best = (0, math.inf, 0)
    for threshold in sorted(candidates, reverse=True):
        bypassed = [row for row in validation_rows if _bypasses(row, threshold)]
        missed = sum(row.get("true_label") == "Manipulation" for row in bypassed)
        if _one_sided_miss_upper(missed, attacks) <= max_miss_upper:
            if len(bypassed) > best[0]:
                best = (len(bypassed), threshold, missed)
    count, threshold, missed = best
    return {
        "threshold": threshold,
        "validation_bypassed": count,
        "validation_attack_missed": missed,
        "validation_attack_count": attacks,
        "validation_miss_upper_95_one_sided": _one_sided_miss_upper(missed, attacks),
    }


def main() -> None:
    from src.data_load import load_task
    from src.jev_triage_verify import load_records
    from src.paths import SAFE_CSV

    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    split = load_task("safepersuasion")
    excluded_pilot = pilot_ids(len(load_records()))
    partition = make_fresh_partition(split, excluded_pilot)
    labels_by_id = dict(zip(split.ids_train, split.y_train, strict=True))
    counts = {
        name: len(partition[f"{name}_ids"])
        for name in ("train", "validation", "test")
    }
    class_counts = {
        name: dict(Counter(labels_by_id[dataset_id] for dataset_id in partition[f"{name}_ids"]))
        for name in counts
    }
    manifest = {
        "experiment": "jev_fresh_safepersuasion_v1",
        "dataset_sha256": hashlib.sha256(SAFE_CSV.read_bytes()).hexdigest(),
        "protocol_script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "pilot_script_sha256": hashlib.sha256(
            Path(__file__).with_name("jev_triage_verify.py").read_bytes()
        ).hexdigest(),
        "outer_split_seed": 42,
        "pilot_seed": 42,
        "fresh_split_seed": 20260930,
        "excluded_pilot_ids": sorted(excluded_pilot),
        "excluded_old_test_ids": sorted(split.ids_test),
        "counts": counts,
        "class_counts": class_counts,
        "selection_rule": {
            "objective": "maximize validation bypass count",
            "max_miss_upper_95_one_sided": 0.10,
            "fallback": "no bypass when no candidate passes",
            "note": "validation interval is a selection heuristic; infer from the untouched test only",
        },
        "partition": partition,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
    print(json.dumps({"output": str(args.output), "counts": counts, "class_counts": class_counts}))


if __name__ == "__main__":
    main()
