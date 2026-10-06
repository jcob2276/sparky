"""Train DistilBERT on a frozen ReaMent_con split without test-set selection."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path

from src.research_reament_con import load_frozen_split
from src.research_run import _metrics


def run(
    source: Path,
    baseline_manifest: Path,
    output: Path,
    seed: int,
    model_name: str = "distilbert-base-uncased",
    epochs: int = 3,
    batch_size: int = 16,
    max_length: int = 256,
) -> None:
    if output.exists():
        raise FileExistsError(f"refusing to overwrite prior run: {output}")
    splits = load_frozen_split(source, baseline_manifest)
    baseline = json.loads(baseline_manifest.read_text(encoding="utf-8"))

    import numpy as np
    import torch
    import transformers
    from torch.utils.data import Dataset
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
        Trainer,
        TrainingArguments,
        set_seed,
    )

    class DialogueDataset(Dataset):
        def __init__(self, rows: list[dict], tokenizer) -> None:
            self.tokens = tokenizer(
                [str(row["dialogue"]) for row in rows],
                truncation=True,
                max_length=max_length,
            )
            self.labels = [int(row["label"]) for row in rows]

        def __len__(self) -> int:
            return len(self.labels)

        def __getitem__(self, index: int) -> dict:
            item = {key: value[index] for key, value in self.tokens.items()}
            item["labels"] = self.labels[index]
            return item

    def compute_metrics(prediction) -> dict[str, float]:
        labels = prediction.label_ids.tolist()
        predicted = np.argmax(prediction.predictions, axis=-1).tolist()
        metrics = _metrics(labels, predicted)
        return {"f1_macro": metrics["f1_macro"], "recall_positive": metrics["recall_positive"]}

    set_seed(seed)
    output.mkdir(parents=True)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)
    train_data = DialogueDataset(splits["train"], tokenizer)
    validation_data = DialogueDataset(splits["validation"], tokenizer)
    test_data = DialogueDataset(splits["test"], tokenizer)

    training_args = TrainingArguments(
        output_dir=str(output / "trainer"),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=3e-5,
        warmup_ratio=0.1,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        greater_is_better=True,
        save_total_limit=1,
        logging_steps=20,
        report_to=[],
        seed=seed,
        data_seed=seed,
        fp16=torch.cuda.is_available(),
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_data,
        eval_dataset=validation_data,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
    )
    started_at = datetime.now(timezone.utc)
    started = time.perf_counter()
    training = trainer.train()
    train_seconds = time.perf_counter() - started
    validation_raw = trainer.predict(validation_data)
    test_raw = trainer.predict(test_data)  # The test is read once, after model selection.
    validation_pred = np.argmax(validation_raw.predictions, axis=-1).tolist()
    test_pred = np.argmax(test_raw.predictions, axis=-1).tolist()
    test_prob = torch.softmax(torch.tensor(test_raw.predictions), dim=-1)[:, 1].tolist()

    for name, rows, predictions, probabilities in (
        ("validation", splits["validation"], validation_pred, None),
        ("test", splits["test"], test_pred, test_prob),
    ):
        with (output / f"{name}_predictions.csv").open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["id", "true_label", "model_pred", "model_p1"])
            writer.writerows(
                (row["id"], row["label"], prediction, "" if probabilities is None else probabilities[i])
                for i, (row, prediction) in enumerate(zip(rows, predictions))
            )

    trainer.save_model(str(output / "best_model"))
    tokenizer.save_pretrained(str(output / "best_model"))
    metrics = {
        "validation": _metrics([int(row["label"]) for row in splits["validation"]], validation_pred),
        "test": _metrics([int(row["label"]) for row in splits["test"]], test_pred),
    }
    manifest = {
        "experiment": "reament_con_distilbert_fixed_split_v1",
        "started_at_utc": started_at.isoformat(),
        "finished_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_sha256": baseline["dataset_sha256"],
        "baseline_manifest_sha256": hashlib.sha256(baseline_manifest.read_bytes()).hexdigest(),
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "split_seed": baseline["split_seed"],
        "split_ids": {part: baseline["split"][part]["ids"] for part in ("train", "validation", "test")},
        "config": {
            "model": model_name,
            "model_seed": seed,
            "epochs": epochs,
            "batch_size": batch_size,
            "max_length": max_length,
            "learning_rate": 3e-5,
            "selection": "best validation F1 macro at epoch end; test after training only",
        },
        "environment": {
            "python": platform.python_version(),
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "cuda": torch.version.cuda,
            "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            "model_revision": getattr(model.config, "_commit_hash", None),
        },
        "training": {
            "seconds": train_seconds,
            "loss": float(training.training_loss),
            "best_checkpoint": trainer.state.best_model_checkpoint,
            "best_validation_f1_macro": trainer.state.best_metric,
            "log_history": trainer.state.log_history,
        },
        "metrics": metrics,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"seed": seed, "validation": metrics["validation"], "test": metrics["test"]}))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--baseline-manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--model", default="distilbert-base-uncased")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--max-length", type=int, default=256)
    args = parser.parse_args()
    run(args.source, args.baseline_manifest, args.output_dir, args.seed,
        args.model, args.epochs, args.batch_size, args.max_length)


if __name__ == "__main__":
    main()
