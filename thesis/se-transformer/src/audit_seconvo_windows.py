"""Verify first/last model inputs differ on the archived SEConvo split."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from src.paths import SECONVO_TEST, SECONVO_TRAIN
from src.research_run import _sha256
from src.research_seconvo_official import load_official_split
from src.research_seconvo_window_transformer import encode_window


def summarize_input_windows(texts: list[str], tokenizer, max_length: int = 512) -> dict:
    first = encode_window(tokenizer, texts, "first", max_length)["input_ids"]
    last = encode_window(tokenizer, texts, "last", max_length)["input_ids"]
    return {
        "n": len(texts),
        "n_changed": sum(left != right for left, right in zip(first, last)),
        "n_unchanged": sum(left == right for left, right in zip(first, last)),
        "all_at_most_limit": all(len(ids) <= max_length for ids in first + last),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tokenizer-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--max-length", type=int, default=512)
    args = parser.parse_args()
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(str(args.tokenizer_dir), local_files_only=True)
    split = load_official_split()
    result = {
        "description": "Actual token-ID changes between first and last windows",
        "max_length": args.max_length,
        "train": summarize_input_windows(split.texts_train, tokenizer, args.max_length),
        "test": summarize_input_windows(split.texts_test, tokenizer, args.max_length),
        "sha256": {
            "train": _sha256(SECONVO_TRAIN),
            "test": _sha256(SECONVO_TEST),
            "tokenizer": _sha256(args.tokenizer_dir / "tokenizer.json"),
            "training_script": _sha256(Path(__file__).with_name("research_seconvo_window_transformer.py")),
            "audit_script": _sha256(Path(__file__)),
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
