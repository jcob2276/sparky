"""Leakage-controlled phishing_text comparison; labels retain source meaning."""

from __future__ import annotations

import re
import unicodedata
import json
import hashlib
import argparse
import csv
from pathlib import Path
from collections import Counter


def normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text).casefold()
    return re.sub(r"\W+", " ", normalized).strip()


def prepare_external_holdout(
    local_rows: list[dict], prior_train: list[dict], prior_validation: list[dict],
    external_test: list[dict], max_chars: int = 4096,
) -> tuple[list[dict], dict]:
    """Filter external test using the exact text normalization of the local split."""
    if max_chars < 1:
        raise ValueError("max_chars must be positive")
    local_keys = {
        key
        for row in local_rows
        for key in (normalize_text(row["text"]), normalize_text(row["text"][:max_chars]))
        if key
    }
    prior_keys = {
        normalize_text(row["text"][:max_chars])
        for row in prior_train + prior_validation
    }
    seen_test: set[str] = set()
    excluded = Counter()
    kept: list[dict] = []
    for source_index, row in enumerate(external_test):
        label = int(row["label"])
        if label not in (0, 1):
            raise ValueError("expected binary labels 0/1")
        visible_text = row["text"][:max_chars]
        key = normalize_text(visible_text)
        if not key:
            excluded["empty_visible_text"] += 1
        elif key in local_keys:
            excluded["local_overlap"] += 1
        elif key in prior_keys:
            excluded["prior_split_overlap"] += 1
        elif key in seen_test:
            excluded["within_test_duplicate"] += 1
        else:
            seen_test.add(key)
            kept.append({"source_index": source_index, "text": visible_text, "label": label})
    audit = {
        "raw_test_rows": len(external_test),
        **{name: excluded[name] for name in (
            "local_overlap", "prior_split_overlap", "within_test_duplicate", "empty_visible_text"
        )},
        "retained_rows": len(kept),
        "class_counts": dict(Counter(row["label"] for row in kept)),
    }
    return kept, audit


def prepare_phishing_rows(rows: list[dict], max_chars: int = 4096) -> tuple[list[dict], dict]:
    if max_chars < 1:
        raise ValueError("max_chars must be positive")
    candidates: list[dict] = []
    parent: list[int] = []
    seen_full: dict[str, int] = {}
    seen_visible: dict[str, int] = {}
    empty_rows = 0

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(first: int, second: int) -> None:
        first_root, second_root = find(first), find(second)
        if first_root == second_root:
            return
        if candidates[first_root]["label"] != candidates[second_root]["label"]:
            raise ValueError("conflicting labels in normalized group")
        parent[second_root] = first_root

    for index, source in enumerate(rows):
        text = str(source.get("text") or "").strip()
        if not text:
            empty_rows += 1
            continue
        label = int(source["label"])
        if label not in (0, 1):
            raise ValueError("expected binary labels 0/1")
        visible_text = text[:max_chars]
        full_key = normalize_text(text)
        visible_key = normalize_text(visible_text)
        if not full_key or not visible_key:
            empty_rows += 1
            continue
        current = len(candidates)
        candidates.append({"id": f"phish_{index}", "text": visible_text, "label": label,
                           "was_capped": len(text) > max_chars})
        parent.append(current)
        for key, seen in ((full_key, seen_full), (visible_key, seen_visible)):
            if key in seen:
                union(current, seen[key])
            else:
                seen[key] = current

    retained_roots: set[int] = set()
    prepared: list[dict] = []
    capped_rows = 0
    for index, candidate in enumerate(candidates):
        root = find(index)
        if root in retained_roots:
            continue
        retained_roots.add(root)
        capped_rows += candidate["was_capped"]
        prepared.append({key: candidate[key] for key in ("id", "text", "label")})
    duplicate_rows = len(candidates) - len(prepared)
    return prepared, {
        "raw_rows": len(rows),
        "empty_rows": empty_rows,
        "normalized_duplicate_rows": duplicate_rows,
        "normalized_unique_rows": len(prepared),
        "length_capped_rows": capped_rows,
        "max_chars": max_chars,
        "class_counts": dict(Counter(row["label"] for row in prepared)),
    }


def split_phishing_rows(rows: list[dict], seed: int = 42) -> dict[str, list[dict]]:
    from sklearn.model_selection import train_test_split

    if len({row["id"] for row in rows}) != len(rows):
        raise ValueError("duplicate IDs")
    train_val, test = train_test_split(
        rows, test_size=0.2, stratify=[row["label"] for row in rows], random_state=seed
    )
    train, validation = train_test_split(
        train_val,
        test_size=0.25,
        stratify=[row["label"] for row in train_val],
        random_state=seed,
    )
    return {"train": train, "validation": validation, "test": test}


def classification_metrics(true_labels: list[int], predicted: list[int]) -> dict:
    from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score

    return {
        "f1_macro": float(f1_score(true_labels, predicted, average="macro", zero_division=0)),
        "precision_positive": float(precision_score(true_labels, predicted, zero_division=0)),
        "recall_positive": float(recall_score(true_labels, predicted, zero_division=0)),
        "confusion_matrix": confusion_matrix(true_labels, predicted, labels=[0, 1]).tolist(),
    }


def run_svm_baseline(split: dict[str, list[dict]]) -> dict:
    import time
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.pipeline import Pipeline
    from sklearn.svm import LinearSVC

    model = Pipeline([
        ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=2, max_features=50000)),
        ("clf", LinearSVC(class_weight="balanced", random_state=42, max_iter=4000)),
    ])
    started = time.perf_counter()
    model.fit([row["text"] for row in split["train"]], [row["label"] for row in split["train"]])
    result = {"fit_seconds": time.perf_counter() - started}
    for name in ("validation", "test"):
        predictions = model.predict([row["text"] for row in split[name]]).tolist()
        result[name] = {
            "predictions": predictions,
            "metrics": classification_metrics([row["label"] for row in split[name]], predictions),
        }
    return result


def rebuild_verified_svm(split: dict[str, list[dict]], baseline: dict):
    """Refit the unsaved SVM and require exact agreement with archived predictions."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.pipeline import Pipeline
    from sklearn.svm import LinearSVC

    model = Pipeline([
        ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=2, max_features=50000)),
        ("clf", LinearSVC(class_weight="balanced", random_state=42, max_iter=4000)),
    ])
    model.fit([row["text"] for row in split["train"]], [row["label"] for row in split["train"]])
    for name in ("validation", "test"):
        actual = model.predict([row["text"] for row in split[name]]).tolist()
        if actual != baseline[name]["predictions"]:
            raise ValueError(f"SVM reconstruction mismatch on {name}")
    return model


def write_external_evaluation_artifacts(
    rows: list[dict], svm_predictions: list[int], transformer_predictions: list[int],
    transformer_p1: list[float], output_dir: Path, metadata: dict,
) -> dict:
    """Save a text-free per-message audit and metrics for one external holdout."""
    if output_dir.exists():
        raise FileExistsError(f"refusing to overwrite: {output_dir}")
    if not (len(rows) == len(svm_predictions) == len(transformer_predictions) == len(transformer_p1)):
        raise ValueError("prediction count mismatch")
    true_labels = [row["label"] for row in rows]
    manifest = {
        **metadata,
        "retained_rows": len(rows),
        "metrics": {
            "svm": classification_metrics(true_labels, svm_predictions),
            "transformer": classification_metrics(true_labels, transformer_predictions),
        },
        "prediction_columns": [
            "source_index", "true_label", "svm_pred", "transformer_pred",
            "transformer_p1", "visible_text_sha256"
        ],
    }
    output_dir.mkdir(parents=True)
    with (output_dir / "predictions.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(manifest["prediction_columns"])
        for row, svm_pred, transformer_pred, p1 in zip(
            rows, svm_predictions, transformer_predictions, transformer_p1
        ):
            writer.writerow([
                row["source_index"], row["label"], svm_pred, transformer_pred, p1,
                hashlib.sha256(row["text"].encode("utf-8")).hexdigest(),
            ])
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return manifest


def predict_frozen_transformer(model, tokenizer, texts: list[str], batch_size: int = 16):
    """Predict binary labels and positive-class probabilities without fitting."""
    import time
    import torch

    if batch_size < 1:
        raise ValueError("batch_size must be positive")
    model.eval()
    predictions: list[int] = []
    probabilities: list[float] = []
    started = time.perf_counter()
    with torch.inference_mode():
        for start in range(0, len(texts), batch_size):
            encoded = tokenizer(
                texts[start:start + batch_size], truncation=True,
                max_length=256, padding=True, return_tensors="pt",
            )
            logits = model(**encoded).logits
            predictions.extend(torch.argmax(logits, dim=-1).tolist())
            probabilities.extend(torch.softmax(logits, dim=-1)[:, 1].tolist())
    return predictions, probabilities, time.perf_counter() - started


def write_baseline_artifacts(
    raw_rows: list[dict], output_dir: Path, source_sha256: str
) -> dict:
    prepared, audit = prepare_phishing_rows(raw_rows)
    split = split_phishing_rows(prepared)
    output_dir.mkdir(parents=True, exist_ok=False)
    (output_dir / "split.json").write_text(
        json.dumps(split, ensure_ascii=False), encoding="utf-8"
    )
    baseline = run_svm_baseline(split)
    manifest = {
        "experiment": "phishing_text_normalized_group_v1",
        "source_sha256": source_sha256,
        "split_sha256": hashlib.sha256((output_dir / "split.json").read_bytes()).hexdigest(),
        "source_label_note": "provided labels; not independently verified phishing ground truth",
        "deduplication": "transitive groups by NFKC + casefold + non-word-to-space on full and 4096-character-capped text; first representative retained",
        "text_policy": "first 4096 characters for both models; transformer then 256 tokens",
        "split_seed": 42,
        "split_counts": {name: len(part) for name, part in split.items()},
        "split_class_counts": {
            name: dict(Counter(row["label"] for row in part)) for name, part in split.items()
        },
        "audit": audit,
        "svm": baseline,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return manifest


def load_frozen_phishing_split(split_file: Path, manifest_file: Path) -> dict[str, list[dict]]:
    manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    if hashlib.sha256(split_file.read_bytes()).hexdigest() != manifest["split_sha256"]:
        raise ValueError("split checksum mismatch")
    split = json.loads(split_file.read_text(encoding="utf-8"))
    if set(split) != {"train", "validation", "test"}:
        raise ValueError("unexpected split names")
    for name, rows in split.items():
        if len(rows) != manifest["split_counts"][name]:
            raise ValueError("split row count mismatch")
    ids = [row["id"] for rows in split.values() for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("overlapping split IDs")
    return split


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    source = args.source.resolve()
    raw = json.loads(source.read_text(encoding="utf-8"))
    manifest = write_baseline_artifacts(
        raw, args.output_dir.resolve(), hashlib.sha256(source.read_bytes()).hexdigest()
    )
    print(json.dumps({
        "split_counts": manifest["split_counts"],
        "audit": manifest["audit"],
        "svm_validation": manifest["svm"]["validation"]["metrics"],
        "svm_test": manifest["svm"]["test"]["metrics"],
    }, indent=2))


if __name__ == "__main__":
    main()
