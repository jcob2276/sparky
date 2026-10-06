"""Auditable SafePersuasion comparison on a fixed train/validation/test split.

Run from se-transformer: python -m src.research_run --output-dir outputs/research_v2/run-id
The script never selects hyperparameters on the test set.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
import subprocess
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from src.data_load import Split


def prepare_partition(
    labels: list[int], ids: list[str], seed: int = 42, validation_size: float = 0.2
) -> tuple[list[int], list[int]]:
    """Split only the existing training set; preserve the fixed outer test set."""
    from sklearn.model_selection import train_test_split

    if len(labels) != len(ids) or len(set(ids)) != len(ids):
        raise ValueError("labels and unique IDs must have the same length")
    train, validation = train_test_split(
        list(range(len(labels))),
        test_size=validation_size,
        random_state=seed,
        stratify=labels,
    )
    return sorted(train), sorted(validation)


def resolve_protocol_partition(
    split: Split, protocol: dict, dataset_sha256: str
) -> dict[str, list[int]]:
    """Resolve a frozen fresh protocol without admitting old-test or pilot IDs."""
    if protocol.get("dataset_sha256") != dataset_sha256:
        raise ValueError("protocol dataset SHA256 mismatch")
    if set(protocol.get("excluded_old_test_ids", [])) != set(split.ids_test):
        raise ValueError("protocol outer test IDs do not match the loaded split")
    pilot = set(protocol.get("excluded_pilot_ids", []))
    index_by_id = {item: i for i, item in enumerate(split.ids_train)}
    if len(index_by_id) != len(split.ids_train):
        raise ValueError("repeated training IDs")
    partition = protocol.get("partition", {})
    chosen: dict[str, list[int]] = {}
    used: set[str] = set()
    for name in ("train", "validation", "test"):
        ids = partition.get(f"{name}_ids")
        if not isinstance(ids, list) or not ids:
            raise ValueError(f"missing {name} IDs")
        if set(ids) & pilot:
            raise ValueError("pilot ID appears in fresh partition")
        if set(ids) & set(split.ids_test):
            raise ValueError("outer test ID appears in fresh partition")
        if len(ids) != len(set(ids)) or set(ids) & used:
            raise ValueError("partition IDs repeat or overlap")
        if any(item not in index_by_id for item in ids):
            raise ValueError("partition ID not found in old training split")
        chosen[name] = [index_by_id[item] for item in ids]
        used.update(ids)
    if used != set(split.ids_train) - pilot:
        raise ValueError("fresh partition does not cover all eligible IDs")
    return chosen


def write_predictions(
    path: Path,
    ids: list[str],
    true_labels: list[int],
    svm_predictions: list[int],
    model_predictions: list[int] | None = None,
    model_probabilities: list[float] | None = None,
) -> None:
    n = len(ids)
    arrays = [true_labels, svm_predictions]
    if model_predictions is not None:
        arrays.append(model_predictions)
    if model_probabilities is not None:
        arrays.append(model_probabilities)
    if any(len(items) != n for items in arrays):
        raise ValueError("prediction arrays must match the ID count")
    if model_probabilities is not None and model_predictions is None:
        raise ValueError("probabilities require model predictions")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle, fieldnames=["id", "true_label", "svm_pred", "model_pred", "model_p1"]
        )
        writer.writeheader()
        for i in range(n):
            writer.writerow(
                {
                    "id": ids[i],
                    "true_label": true_labels[i],
                    "svm_pred": svm_predictions[i],
                    "model_pred": "" if model_predictions is None else model_predictions[i],
                    "model_p1": "" if model_probabilities is None else model_probabilities[i],
                }
            )


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _metrics(y_true: list[int], y_pred: list[int]) -> dict[str, float | list[list[int]]]:
    from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score

    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_positive": float(f1_score(y_true, y_pred, zero_division=0)),
        "precision_positive": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall_positive": float(recall_score(y_true, y_pred, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist(),
    }


def _git_commit() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=Path(__file__).resolve().parents[3], text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42, help="model seed; data split stays at 42")
    parser.add_argument("--epochs", type=float, default=3)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--model", default="distilbert-base-uncased")
    parser.add_argument("--skip-transformer", action="store_true", help="local baseline dry run")
    parser.add_argument("--save-model", action="store_true")
    parser.add_argument("--gpu-hourly-price", type=float, default=None)
    parser.add_argument("--protocol", type=Path, default=None, help="frozen fresh Jev partition JSON")
    args = parser.parse_args()

    import numpy as np
    import sklearn
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.pipeline import Pipeline
    from sklearn.svm import LinearSVC

    from src.data_load import load_task
    from src.paths import SAFE_CSV

    out = args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=False)
    started_at = datetime.now(timezone.utc)
    start_clock = time.perf_counter()
    split = load_task("safepersuasion")
    protocol_hash = None
    if args.protocol is not None:
        protocol = json.loads(args.protocol.read_text(encoding="utf-8"))
        chosen = resolve_protocol_partition(split, protocol, _sha256(SAFE_CSV))
        train_idx, val_idx, test_idx = chosen["train"], chosen["validation"], chosen["test"]
        test_texts = [split.texts_train[i] for i in test_idx]
        y_test = [split.y_train[i] for i in test_idx]
        test_ids = [split.ids_train[i] for i in test_idx]
        protocol_hash = _sha256(args.protocol)
    else:
        train_idx, val_idx = prepare_partition(split.y_train, split.ids_train)
        test_texts, y_test, test_ids = split.texts_test, split.y_test, split.ids_test
    take = lambda values, indices: [values[i] for i in indices]
    train_texts = take(split.texts_train, train_idx)
    val_texts = take(split.texts_train, val_idx)
    y_train = take(split.y_train, train_idx)
    y_val = take(split.y_train, val_idx)
    val_ids = take(split.ids_train, val_idx)

    svm = Pipeline(
        [
            ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=2, max_features=50000)),
            ("clf", LinearSVC(class_weight="balanced", random_state=42, max_iter=4000)),
        ]
    )
    svm_start = time.perf_counter()
    svm.fit(train_texts, y_train)
    svm_seconds = time.perf_counter() - svm_start
    svm_val = svm.predict(val_texts).tolist()
    svm_test = svm.predict(test_texts).tolist()

    manifest: dict = {
        "experiment": "jev_fresh_safepersuasion_v1" if protocol_hash else "safepersuasion_fixed_split_v1",
        "frozen_protocol_sha256": protocol_hash,
        "started_at_utc": started_at.isoformat(),
        "source_git_commit": _git_commit(),
        "source_script_sha256": _sha256(Path(__file__)),
        "dataset_path": str(SAFE_CSV),
        "dataset_sha256": _sha256(SAFE_CSV),
        "dataset_source": "https://github.com/haeinkong/SafePersuasion",
        "split": {
            "outer_split_seed": 42,
            "inner_validation_seed": 42,
            "n_train": len(train_idx),
            "n_validation": len(val_idx),
            "n_test": len(y_test),
            "train_ids": take(split.ids_train, train_idx),
            "validation_ids": val_ids,
            "test_ids": test_ids,
            "class_counts": {
                "train": dict(Counter(y_train)),
                "validation": dict(Counter(y_val)),
                "test": dict(Counter(y_test)),
            },
        },
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "scikit_learn": sklearn.__version__,
            "numpy": np.__version__,
        },
        "config": {
            "model": args.model,
            "model_seed": args.seed,
            "epochs": args.epochs,
            "batch_size": args.batch_size,
            "max_length": args.max_length,
            "svm": "TF-IDF word (1,2), min_df=2, max_features=50000; LinearSVC balanced",
        },
        "results": {
            "svm": {
                "fit_seconds": svm_seconds,
                "validation": _metrics(y_val, svm_val),
                "test": _metrics(y_test, svm_test),
            }
        },
    }

    model_val = None
    model_test = None
    prob_test = None
    if not args.skip_transformer:
        import torch
        import transformers
        from torch.utils.data import Dataset
        from transformers import (
            AutoModelForSequenceClassification,
            AutoTokenizer,
            DataCollatorWithPadding,
            Trainer,
            TrainingArguments,
        )

        class TextDataset(Dataset):
            def __init__(self, texts: list[str], labels: list[int], tokenizer) -> None:
                self.encodings = tokenizer(texts, truncation=True, max_length=args.max_length)
                self.labels = labels

            def __len__(self) -> int:
                return len(self.labels)

            def __getitem__(self, index: int) -> dict:
                item = {key: value[index] for key, value in self.encodings.items()}
                item["labels"] = self.labels[index]
                return item

        torch.manual_seed(args.seed)
        np.random.seed(args.seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(args.seed)
        tokenizer = AutoTokenizer.from_pretrained(args.model)
        model = AutoModelForSequenceClassification.from_pretrained(args.model, num_labels=2)
        train_ds = TextDataset(train_texts, y_train, tokenizer)
        val_ds = TextDataset(val_texts, y_val, tokenizer)
        test_ds = TextDataset(test_texts, y_test, tokenizer)
        train_args = TrainingArguments(
            output_dir=str(out / "trainer"),
            num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch_size,
            per_device_eval_batch_size=args.batch_size,
            learning_rate=3e-5,
            warmup_ratio=0.1,
            weight_decay=0.01,
            eval_strategy="epoch",
            save_strategy="no",
            logging_steps=20,
            report_to=[],
            seed=args.seed,
            data_seed=args.seed,
            fp16=torch.cuda.is_available(),
        )
        trainer = Trainer(
            model=model,
            args=train_args,
            train_dataset=train_ds,
            eval_dataset=val_ds,
            data_collator=DataCollatorWithPadding(tokenizer),
        )
        training_start = time.perf_counter()
        training_output = trainer.train()
        training_seconds = time.perf_counter() - training_start
        val_raw = trainer.predict(val_ds)
        test_raw = trainer.predict(test_ds)
        model_val = np.argmax(val_raw.predictions, axis=-1).tolist()
        model_test = np.argmax(test_raw.predictions, axis=-1).tolist()
        prob_test = torch.softmax(torch.tensor(test_raw.predictions), dim=-1)[:, 1].tolist()
        if args.save_model:
            trainer.save_model(str(out / "model"))
            tokenizer.save_pretrained(str(out / "model"))
        manifest["environment"].update(
            {
                "torch": torch.__version__,
                "transformers": transformers.__version__,
                "cuda_version": torch.version.cuda,
                "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            }
        )
        manifest["results"]["transformer"] = {
            "train_seconds": training_seconds,
            "train_loss": float(training_output.training_loss),
            "validation": _metrics(y_val, model_val),
            "test": _metrics(y_test, model_test),
        }

    write_predictions(
        out / "validation_predictions.csv", val_ids, y_val, svm_val, model_val
    )
    write_predictions(
        out / "test_predictions.csv",
        test_ids,
        y_test,
        svm_test,
        model_test,
        prob_test,
    )
    manifest["finished_at_utc"] = datetime.now(timezone.utc).isoformat()
    manifest["wall_seconds"] = time.perf_counter() - start_clock
    if args.gpu_hourly_price is not None:
        manifest["gpu_hourly_price_usd"] = args.gpu_hourly_price
        manifest["estimated_script_gpu_cost_usd"] = (
            manifest["wall_seconds"] * args.gpu_hourly_price / 3600
        )
    (out / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps({"output_dir": str(out), "results": manifest["results"]}, indent=2))


if __name__ == "__main__":
    main()
