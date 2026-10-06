"""Auditable ReaMent_con baseline on a fixed 60/20/20 split."""

import argparse
import csv
import hashlib
import json
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from src.research_run import _metrics


def load_records(path: Path) -> list[dict[str, str | int]]:
    records = []
    seen_ids = set()
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            row = json.loads(line)
            item_id = str(row["id"])
            if item_id in seen_ids:
                raise ValueError(f"duplicate ID: {item_id}")
            seen_ids.add(item_id)
            text = str(row["dialogue"]).strip()
            label = int(row["manipulative"])
            if not text or label not in (0, 1):
                raise ValueError(f"invalid dialogue or label on line {line_number}")
            records.append({"id": item_id, "dialogue": text, "label": label})
    if not records:
        raise ValueError("empty dataset")
    return records


def partition_indices(labels: list[int], seed: int = 42) -> tuple[list[int], list[int], list[int]]:
    indices = list(range(len(labels)))
    train_validation, test = train_test_split(
        indices, test_size=0.2, random_state=seed, stratify=labels
    )
    train, validation = train_test_split(
        train_validation,
        test_size=0.25,
        random_state=seed,
        stratify=[labels[index] for index in train_validation],
    )
    return sorted(train), sorted(validation), sorted(test)


def run_svm(source: Path, output: Path) -> None:
    records = load_records(source)
    labels = [int(row["label"]) for row in records]
    train, validation, test = partition_indices(labels)
    output.mkdir(parents=True, exist_ok=False)

    def values(indices: list[int], field: str) -> list:
        return [records[index][field] for index in indices]

    def split_info(indices: list[int]) -> dict:
        return {
            "n": len(indices),
            "ids": values(indices, "id"),
            "class_counts": dict(Counter(values(indices, "label"))),
        }

    svm = Pipeline(
        [
            ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=2,
                                      max_features=50_000)),
            ("clf", LinearSVC(class_weight="balanced", random_state=42, max_iter=4000)),
        ]
    )
    started = time.perf_counter()
    svm.fit(values(train, "dialogue"), values(train, "label"))
    fit_seconds = time.perf_counter() - started
    validation_predictions = svm.predict(values(validation, "dialogue")).tolist()
    test_predictions = svm.predict(values(test, "dialogue")).tolist()

    for name, indices, predictions in (
        ("validation", validation, validation_predictions),
        ("test", test, test_predictions),
    ):
        with (output / f"{name}_predictions.csv").open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["id", "true_label", "svm_pred"])
            writer.writerows(
                zip(values(indices, "id"), values(indices, "label"), predictions)
            )

    manifest = {
        "experiment": "reament_con_fixed_split_v1",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(source.resolve()),
        "dataset_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "split_seed": 42,
        "split_procedure": "stratified 80/20, then stratified 75/25 on remaining 80",
        "split": {
            "train": split_info(train),
            "validation": split_info(validation),
            "test": split_info(test),
        },
        "config": {
            "svm": "TF-IDF word (1,2), min_df=2, max_features=50000; LinearSVC balanced",
        },
        "results": {
            "svm": {
                "fit_seconds": fit_seconds,
                "validation": _metrics(values(validation, "label"), validation_predictions),
                "test": _metrics(values(test, "label"), test_predictions),
            }
        },
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def load_frozen_split(source: Path, manifest_path: Path) -> dict[str, list[dict]]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if hashlib.sha256(source.read_bytes()).hexdigest() != manifest["dataset_sha256"]:
        raise ValueError("dataset SHA-256 differs from frozen manifest")
    records = load_records(source)
    by_id = {row["id"]: row for row in records}
    result = {}
    all_ids = []
    for part in ("train", "validation", "test"):
        ids = manifest["split"][part]["ids"]
        result[part] = [by_id[item_id] for item_id in ids]
        all_ids.extend(ids)
        if len(ids) != manifest["split"][part]["n"]:
            raise ValueError(f"{part} size differs from frozen manifest")
    if len(all_ids) != len(records) or len(set(all_ids)) != len(records):
        raise ValueError("frozen split omits or repeats IDs")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    run_svm(args.source, args.output_dir)


if __name__ == "__main__":
    main()
