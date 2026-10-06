"""Measure SEConvo lengths with the exact archived tokenizer, before truncation."""
from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path

from src.paths import SECONVO_TEST, SECONVO_TRAIN
from src.research_run import _sha256
from src.research_seconvo_official import load_official_split


def summarize_lengths(texts, labels, tokenizer, limit: int = 512) -> dict:
    lengths = [len(tokenizer.encode(text).ids) for text in texts]
    if len(lengths) != len(labels) or not lengths:
        raise ValueError("texts and labels must be nonempty and aligned")
    result = {
        "n": len(lengths),
        "median_tokens": statistics.median(lengths),
        "min_tokens": min(lengths),
        "max_tokens": max(lengths),
        "n_over_limit": sum(length > limit for length in lengths),
        "fraction_over_limit": sum(length > limit for length in lengths) / len(lengths),
        "tokens_after_limit_fraction": sum(max(0, length - limit) for length in lengths) / sum(lengths),
    }
    for label in (0, 1):
        group = [length for length, item_label in zip(lengths, labels) if item_label == label]
        if not group:
            raise ValueError(f"missing class {label}")
        result[f"class_{label}"] = {
            "n": len(group),
            "median_tokens": statistics.median(group),
            "n_over_limit": sum(length > limit for length in group),
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tokenizer-json", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=512)
    args = parser.parse_args()
    from tokenizers import Tokenizer

    tokenizer = Tokenizer.from_file(str(args.tokenizer_json))
    tokenizer.no_truncation()
    split = load_official_split()
    result = {
        "description": "Token lengths before model truncation; archived DistilBERT tokenizer",
        "limit": args.limit,
        "sha256": {
            "train": _sha256(SECONVO_TRAIN),
            "test": _sha256(SECONVO_TEST),
            "tokenizer": _sha256(args.tokenizer_json),
            "script": _sha256(Path(__file__)),
        },
        "train": summarize_lengths(split.texts_train, split.y_train, tokenizer, args.limit),
        "test": summarize_lengths(split.texts_test, split.y_test, tokenizer, args.limit),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
