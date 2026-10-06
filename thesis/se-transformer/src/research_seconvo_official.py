"""Fixed-protocol SEConvo experiment on the authors' annotated 40/360 split."""
from __future__ import annotations

import argparse
import json
import platform
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from src.data_load import Split, _dialogue_to_text
from src.paths import SECONVO_TEST, SECONVO_TRAIN, TRANSFORMER_MODELS
from src.research_run import _metrics, _sha256, write_predictions


def load_official_split() -> Split:
    def read(path: Path) -> tuple[list[str], list[int], list[str]]:
        items = json.loads(path.read_text(encoding="utf-8"))["Conversations"]
        texts = [_dialogue_to_text(item["Conversation"]) for item in items]
        labels = [int(item["GroundTruth"]["IsMalicious"]) for item in items]
        ids = [str(item["GroundTruth"]["ConversationID"]) for item in items]
        return texts, labels, ids

    train_texts, train_labels, train_ids = read(SECONVO_TRAIN)
    test_texts, test_labels, test_ids = read(SECONVO_TEST)
    if len(set(train_ids)) != len(train_ids) or len(set(test_ids)) != len(test_ids):
        raise ValueError("duplicate SEConvo IDs in an author split")
    if set(train_ids) & set(test_ids):
        raise ValueError("author train/test IDs overlap")
    return Split(
        task="seconvo_official",
        texts_train=train_texts,
        y_train=train_labels,
        texts_test=test_texts,
        y_test=test_labels,
        ids_train=train_ids,
        ids_test=test_ids,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--model", choices=TRANSFORMER_MODELS, default="distilbert-base-uncased")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--skip-transformer", action="store_true")
    parser.add_argument("--save-model", action="store_true")
    parser.add_argument("--gpu-hourly-price", type=float, default=None)
    args = parser.parse_args()

    from sklearn import __version__ as sklearn_version
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.pipeline import Pipeline
    from sklearn.svm import LinearSVC

    split = load_official_split()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=False)
    started = time.perf_counter()
    manifest: dict = {
        "protocol": "SEConvo author annotated_train.json -> annotated_test.json; fixed hyperparameters; no test evaluation during fitting",
        "started_at_utc": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "train_sha256": _sha256(SECONVO_TRAIN),
            "test_sha256": _sha256(SECONVO_TEST),
            "script_sha256": _sha256(Path(__file__)),
        },
        "split": {
            "n_train": len(split.y_train),
            "n_test": len(split.y_test),
            "train_ids": split.ids_train,
            "test_ids": split.ids_test,
            "train_class_counts": dict(Counter(split.y_train)),
            "test_class_counts": dict(Counter(split.y_test)),
        },
        "configuration": {
            "model": args.model,
            "seed": args.seed,
            "epochs": 3,
            "batch_size": 8,
            "max_length": 512,
            "learning_rate": 2e-5,
            "svm_seed": 42,
        },
        "gpu_hourly_price_usd": args.gpu_hourly_price,
        "environment": {"python": platform.python_version(), "scikit_learn": sklearn_version},
        "results": {},
    }

    svm = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=2, max_features=50_000),
            ),
            ("clf", LinearSVC(class_weight="balanced", random_state=42, max_iter=4000)),
        ]
    )
    svm_start = time.perf_counter()
    svm.fit(split.texts_train, split.y_train)
    svm_predictions = svm.predict(split.texts_test).tolist()
    manifest["results"]["svm"] = {
        **_metrics(split.y_test, svm_predictions),
        "fit_and_predict_seconds": time.perf_counter() - svm_start,
    }

    model_predictions = None
    model_probabilities = None
    if not args.skip_transformer:
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
        )

        class TextDataset(Dataset):
            def __init__(self, texts: list[str], labels: list[int], tokenizer) -> None:
                self.encodings = tokenizer(texts, truncation=True, max_length=512)
                self.labels = labels

            def __len__(self) -> int:
                return len(self.labels)

            def __getitem__(self, index: int) -> dict:
                result = {key: value[index] for key, value in self.encodings.items()}
                result["labels"] = self.labels[index]
                return result

        torch.manual_seed(args.seed)
        np.random.seed(args.seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(args.seed)
        tokenizer = AutoTokenizer.from_pretrained(args.model)
        model = AutoModelForSequenceClassification.from_pretrained(args.model, num_labels=2)
        train_dataset = TextDataset(split.texts_train, split.y_train, tokenizer)
        test_dataset = TextDataset(split.texts_test, split.y_test, tokenizer)
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
        train_result = trainer.train()
        train_seconds = time.perf_counter() - train_start
        predict_start = time.perf_counter()
        prediction = trainer.predict(test_dataset)
        predict_seconds = time.perf_counter() - predict_start
        model_predictions = np.argmax(prediction.predictions, axis=-1).tolist()
        model_probabilities = torch.softmax(
            torch.tensor(prediction.predictions), dim=-1
        )[:, 1].tolist()
        if args.save_model:
            trainer.save_model(str(output / "model"))
            tokenizer.save_pretrained(str(output / "model"))
        manifest["environment"].update(
            {
                "torch": torch.__version__,
                "transformers": transformers.__version__,
                "cuda_version": torch.version.cuda,
                "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            }
        )
        manifest["results"]["transformer"] = {
            **_metrics(split.y_test, model_predictions),
            "train_loss": float(train_result.training_loss),
            "train_seconds": train_seconds,
            "predict_seconds": predict_seconds,
        }

    write_predictions(
        output / "test_predictions.csv",
        split.ids_test,
        split.y_test,
        svm_predictions,
        model_predictions,
        model_probabilities,
    )
    manifest["wall_seconds"] = time.perf_counter() - started
    manifest["finished_at_utc"] = datetime.now(timezone.utc).isoformat()
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"output_dir": str(output), "results": manifest["results"]}, indent=2))


if __name__ == "__main__":
    main()
