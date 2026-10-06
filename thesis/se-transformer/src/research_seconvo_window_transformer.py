"""Paired DistilBERT first-vs-last 512-token SEConvo experiment."""
from __future__ import annotations

import argparse
import csv
import json
import platform
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from src.paths import SECONVO_TEST, SECONVO_TRAIN
from src.research_run import _metrics, _sha256
from src.research_seconvo_official import load_official_split

MODEL_ID = "distilbert/distilbert-base-uncased"
MODEL_REVISION = "12040accade4e8a0f71eabdb258fecc2e7e948be"


def encode_window(tokenizer, texts: list[str], window: str, max_length: int = 512):
    if window not in {"first", "last"} or max_length < 3:
        raise ValueError("window must be first or last, and max_length at least 3")
    tokenizer.truncation_side = "right" if window == "first" else "left"
    return tokenizer(texts, truncation=True, max_length=max_length)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--window", choices=["first", "last"], required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--gpu-hourly-price", type=float, default=None)
    parser.add_argument("--save-model", action="store_true")
    args = parser.parse_args()

    import numpy as np
    import torch
    import transformers
    from sklearn import __version__ as sklearn_version
    from torch.utils.data import Dataset
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
        Trainer,
        TrainingArguments,
    )

    split = load_official_split()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=False)
    started = time.perf_counter()
    started_at = datetime.now(timezone.utc).isoformat()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
    train_encodings = encode_window(tokenizer, split.texts_train, args.window)
    test_encodings = encode_window(tokenizer, split.texts_test, args.window)
    tokenizer_dir = output / "tokenizer"
    tokenizer.save_pretrained(str(tokenizer_dir))
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION, num_labels=2
    )

    class EncodedDataset(Dataset):
        def __init__(self, encodings, labels: list[int]):
            self.encodings = encodings
            self.labels = labels

        def __len__(self) -> int:
            return len(self.labels)

        def __getitem__(self, index: int) -> dict:
            row = {key: value[index] for key, value in self.encodings.items()}
            row["labels"] = self.labels[index]
            return row

    train_dataset = EncodedDataset(train_encodings, split.y_train)
    test_dataset = EncodedDataset(test_encodings, split.y_test)
    train_args = TrainingArguments(
        output_dir=str(output / "trainer"),
        num_train_epochs=3,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=2e-5,
        save_strategy="no",
        eval_strategy="no",
        logging_steps=20,
        report_to=[],
        seed=args.seed,
        data_seed=args.seed,
        fp16=torch.cuda.is_available(),
        dataloader_pin_memory=False,
    )
    trainer = Trainer(
        model=model,
        args=train_args,
        train_dataset=train_dataset,
        data_collator=DataCollatorWithPadding(tokenizer),
    )
    train_start = time.perf_counter()
    training_result = trainer.train()
    train_seconds = time.perf_counter() - train_start
    predict_start = time.perf_counter()
    prediction = trainer.predict(test_dataset)
    predict_seconds = time.perf_counter() - predict_start
    predicted = np.argmax(prediction.predictions, axis=-1).tolist()
    probabilities = torch.softmax(torch.tensor(prediction.predictions), dim=-1)[:, 1].tolist()
    if args.save_model:
        trainer.save_model(str(output / "model"))

    with (output / "test_predictions.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "true_label", "model_pred", "model_p1"])
        writer.writeheader()
        for identity, label, model_pred, p1 in zip(
            split.ids_test, split.y_test, predicted, probabilities
        ):
            writer.writerow({"id": identity, "true_label": label, "model_pred": model_pred, "model_p1": p1})

    manifest = {
        "protocol": "SEConvo author 40/360; paired DistilBERT first vs last window; no test evaluation during fitting",
        "started_at_utc": started_at,
        "finished_at_utc": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "train_sha256": _sha256(SECONVO_TRAIN),
            "test_sha256": _sha256(SECONVO_TEST),
            "script_sha256": _sha256(Path(__file__)),
            "tokenizer_sha256": _sha256(tokenizer_dir / "tokenizer.json"),
        },
        "model": {"id": MODEL_ID, "revision": MODEL_REVISION},
        "configuration": {
            "window": args.window,
            "truncation_side": tokenizer.truncation_side,
            "seed": args.seed,
            "epochs": 3,
            "batch_size": 8,
            "max_length": 512,
            "learning_rate": 2e-5,
        },
        "split": {
            "n_train": len(split.y_train),
            "n_test": len(split.y_test),
            "train_ids": split.ids_train,
            "test_ids": split.ids_test,
            "train_class_counts": dict(Counter(split.y_train)),
            "test_class_counts": dict(Counter(split.y_test)),
        },
        "environment": {
            "python": platform.python_version(),
            "scikit_learn": sklearn_version,
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "cuda_version": torch.version.cuda,
            "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        },
        "gpu_hourly_price_usd": args.gpu_hourly_price,
        "results": {
            **_metrics(split.y_test, predicted),
            "train_loss": float(training_result.training_loss),
            "train_seconds": train_seconds,
            "predict_seconds": predict_seconds,
        },
        "wall_seconds": time.perf_counter() - started,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"output_dir": str(output), "results": manifest["results"]}, indent=2))


if __name__ == "__main__":
    main()
