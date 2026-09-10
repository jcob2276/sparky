from __future__ import annotations

import numpy as np
import torch
from torch.utils.data import Dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)

from src.data_load import Split
from src.metrics import score
from src.paths import MODELS


class TextClsDataset(Dataset):
    def __init__(self, encodings: dict, labels: list[int]) -> None:
        self.encodings = encodings
        self.labels = labels

    def __len__(self) -> int:
        return len(self.labels)

    def __getitem__(self, idx: int) -> dict:
        item = {key: val[idx] for key, val in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
        return item


def train_eval_bert(
    split: Split,
    model_name: str = "bert-base-uncased",
    epochs: float = 3,
    batch_size: int = 8,
    max_length: int = 256,
    lr: float = 2e-5,
) -> dict:
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    train_enc = tokenizer(
        split.texts_train,
        truncation=True,
        padding=True,
        max_length=max_length,
    )
    test_enc = tokenizer(
        split.texts_test,
        truncation=True,
        padding=True,
        max_length=max_length,
    )
    train_ds = TextClsDataset(train_enc, split.y_train)
    test_ds = TextClsDataset(test_enc, split.y_test)

    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)
    out_dir = MODELS / f"{split.task}_{model_name.replace('/', '_')}"
    common = {
        "output_dir": str(out_dir),
        "num_train_epochs": epochs,
        "per_device_train_batch_size": batch_size,
        "per_device_eval_batch_size": batch_size,
        "learning_rate": lr,
        "save_strategy": "no",
        "logging_steps": 20,
        "report_to": [],
        "seed": 42,
        "fp16": torch.cuda.is_available(),
        "dataloader_pin_memory": False,
    }
    try:
        args = TrainingArguments(**common, eval_strategy="epoch")
    except TypeError:
        args = TrainingArguments(**common, evaluation_strategy="epoch")

    def compute_metrics(eval_pred: tuple) -> dict[str, float]:
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=-1)
        m = score(labels.tolist(), preds.tolist())
        return {
            "accuracy": m["accuracy"],
            "precision": m["precision"],
            "recall": m["recall"],
            "f1": m["f1"],
            "f1_macro": m["f1_macro"],
        }

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=test_ds,
        compute_metrics=compute_metrics,
    )
    trainer.train()
    pred = np.argmax(trainer.predict(test_ds).predictions, axis=-1).tolist()
    metrics = score(split.y_test, pred)
    return {
        "task": split.task,
        "model": model_name,
        "n_train": len(split.y_train),
        "n_test": len(split.y_test),
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "metrics": metrics,
    }
