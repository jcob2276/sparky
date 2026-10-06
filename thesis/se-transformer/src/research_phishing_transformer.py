"""DistilBERT on the frozen phishing_text split; validation selects the epoch."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path

from src.research_phishing import classification_metrics, load_frozen_phishing_split


def run(split_file: Path, baseline_manifest: Path, output: Path, seed: int = 42) -> None:
    if output.exists():
        raise FileExistsError(f"refusing to overwrite: {output}")
    split = load_frozen_phishing_split(split_file, baseline_manifest)
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

    model_name = "distilbert-base-uncased"
    set_seed(seed)
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    class TextDataset(Dataset):
        def __init__(self, rows: list[dict]) -> None:
            self.tokens = tokenizer([row["text"] for row in rows], truncation=True, max_length=256)
            self.labels = [row["label"] for row in rows]

        def __len__(self) -> int:
            return len(self.labels)

        def __getitem__(self, index: int) -> dict:
            item = {key: value[index] for key, value in self.tokens.items()}
            item["labels"] = self.labels[index]
            return item

    def compute_metrics(prediction) -> dict[str, float]:
        predicted = np.argmax(prediction.predictions, axis=-1).tolist()
        return {"f1_macro": classification_metrics(prediction.label_ids.tolist(), predicted)["f1_macro"]}

    output.mkdir(parents=True)
    started_at = datetime.now(timezone.utc)
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)
    train_data = TextDataset(split["train"])
    validation_data = TextDataset(split["validation"])
    test_data = TextDataset(split["test"])
    args = TrainingArguments(
        output_dir=str(output / "trainer"),
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        learning_rate=3e-5,
        warmup_ratio=0.1,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        greater_is_better=True,
        save_total_limit=1,
        logging_steps=100,
        report_to=[],
        seed=seed,
        data_seed=seed,
        fp16=torch.cuda.is_available(),
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_data,
        eval_dataset=validation_data,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
    )
    start_clock = time.perf_counter()
    train_result = trainer.train()
    train_seconds = time.perf_counter() - start_clock
    validation_raw = trainer.predict(validation_data)
    test_raw = trainer.predict(test_data)
    predictions = {
        "validation": np.argmax(validation_raw.predictions, axis=-1).tolist(),
        "test": np.argmax(test_raw.predictions, axis=-1).tolist(),
    }
    probabilities = torch.softmax(torch.tensor(test_raw.predictions), dim=-1)[:, 1].tolist()
    metrics = {}
    for name in ("validation", "test"):
        rows = split[name]
        metrics[name] = classification_metrics([row["label"] for row in rows], predictions[name])
        with (output / f"{name}_predictions.csv").open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["id", "true_label", "svm_pred", "model_pred", "model_p1"])
            writer.writerows(
                (
                    row["id"], row["label"], baseline["svm"][name]["predictions"][i],
                    predictions[name][i], probabilities[i] if name == "test" else "",
                )
                for i, row in enumerate(rows)
            )
    trainer.save_model(str(output / "best_model"))
    tokenizer.save_pretrained(str(output / "best_model"))
    manifest = {
        "experiment": "phishing_text_normalized_group_distilbert_v1",
        "started_at_utc": started_at.isoformat(),
        "finished_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_sha256": baseline["source_sha256"],
        "split_sha256": baseline["split_sha256"],
        "baseline_manifest_sha256": hashlib.sha256(baseline_manifest.read_bytes()).hexdigest(),
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "seed": seed,
        "selection": "best epoch by validation F1 macro; test evaluated once after training",
        "config": {"model": model_name, "epochs": 3, "batch_size": 16, "max_length": 256,
                   "learning_rate": 3e-5, "warmup_ratio": 0.1, "weight_decay": 0.01},
        "environment": {
            "python": platform.python_version(), "torch": torch.__version__,
            "transformers": transformers.__version__, "cuda": torch.version.cuda,
            "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            "model_revision": getattr(model.config, "_commit_hash", None),
        },
        "training": {"seconds": train_seconds, "loss": float(train_result.training_loss),
                     "best_checkpoint": trainer.state.best_model_checkpoint,
                     "best_validation_f1_macro": trainer.state.best_metric,
                     "log_history": trainer.state.log_history},
        "metrics": metrics,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"seed": seed, "validation": metrics["validation"], "test": metrics["test"]}))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--split-file", type=Path, required=True)
    parser.add_argument("--baseline-manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    parsed = parser.parse_args()
    run(parsed.split_file, parsed.baseline_manifest, parsed.output_dir, parsed.seed)


if __name__ == "__main__":
    main()
