"""Exploratory SEConvo SVM control for text position and 512-token input limits."""
from __future__ import annotations

import argparse
import csv
import json
import platform
from pathlib import Path

from src.paths import SECONVO_TEST, SECONVO_TRAIN
from src.research_run import _metrics, _sha256
from src.research_seconvo_official import load_official_split


def clip_to_token_window(text: str, tokenizer, max_length: int, side: str) -> str:
    """Preserve original characters spanning first/last content-token window."""
    if max_length < 3 or side not in {"first", "last"}:
        raise ValueError("max_length must be >=3 and side first or last")
    offsets = [(start, end) for start, end in tokenizer.encode(text).offsets if end > start]
    content_budget = max_length - 2  # BERT-family [CLS] and [SEP]
    if len(offsets) <= content_budget:
        return text
    if side == "first":
        return text[: offsets[content_budget - 1][1]]
    return text[offsets[-content_budget][0] :]


def train_predict(train_texts: list[str], train_labels: list[int], test_texts: list[str]) -> list[int]:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.pipeline import Pipeline
    from sklearn.svm import LinearSVC

    svm = Pipeline(
        [
            ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=2, max_features=50_000)),
            ("clf", LinearSVC(class_weight="balanced", random_state=42, max_iter=4000)),
        ]
    )
    svm.fit(train_texts, train_labels)
    return svm.predict(test_texts).tolist()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tokenizer-json", type=Path, required=True)
    parser.add_argument("--baseline-predictions", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--max-length", type=int, default=512)
    args = parser.parse_args()
    from sklearn import __version__ as sklearn_version
    from tokenizers import Tokenizer, __version__ as tokenizers_version

    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=False)
    tokenizer = Tokenizer.from_file(str(args.tokenizer_json))
    tokenizer.no_truncation()
    split = load_official_split()
    full_pred = train_predict(split.texts_train, split.y_train, split.texts_test)

    with args.baseline_predictions.open(newline="", encoding="utf-8") as handle:
        baseline_rows = list(csv.DictReader(handle))
    if len(baseline_rows) != len(split.ids_test) or any(
        row["id"] != identity
        or int(row["true_label"]) != label
        or int(row["svm_pred"]) != prediction
        for row, identity, label, prediction in zip(
            baseline_rows, split.ids_test, split.y_test, full_pred
        )
    ):
        raise ValueError("full-text SVM did not reproduce the archived official run")

    predictions = {"full": full_pred}
    for side in ("first", "last"):
        clipped_train = [
            clip_to_token_window(text, tokenizer, args.max_length, side)
            for text in split.texts_train
        ]
        clipped_test = [
            clip_to_token_window(text, tokenizer, args.max_length, side)
            for text in split.texts_test
        ]
        predictions[side] = train_predict(clipped_train, split.y_train, clipped_test)

    token_lengths = [len(tokenizer.encode(text).ids) for text in split.texts_test]
    with (output / "test_predictions.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["id", "true_label", "raw_tokens", "full_pred", "first_pred", "last_pred"],
        )
        writer.writeheader()
        for index, identity in enumerate(split.ids_test):
            writer.writerow(
                {
                    "id": identity,
                    "true_label": split.y_test[index],
                    "raw_tokens": token_lengths[index],
                    **{f"{side}_pred": values[index] for side, values in predictions.items()},
                }
            )
    manifest = {
        "description": "Exploratory SVM comparison of full text, first and last BERT-token windows",
        "protocol": "author annotated train 40 / test 360; retrain same TF-IDF+LinearSVC on each window",
        "configuration": {"max_length": args.max_length, "content_token_budget": args.max_length - 2},
        "sources_sha256": {
            "train": _sha256(SECONVO_TRAIN),
            "test": _sha256(SECONVO_TEST),
            "tokenizer": _sha256(args.tokenizer_json),
            "baseline_predictions": _sha256(args.baseline_predictions),
            "script": _sha256(Path(__file__)),
        },
        "environment": {"python": platform.python_version(), "scikit_learn": sklearn_version, "tokenizers": tokenizers_version},
        "n_train": len(split.y_train),
        "n_test": len(split.y_test),
        "full_reproduces_archived_svm": True,
        "results": {side: _metrics(split.y_test, values) for side, values in predictions.items()},
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
