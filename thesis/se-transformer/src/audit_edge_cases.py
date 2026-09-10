"""Audit edge cases for thesis experiment defensibility."""
from __future__ import annotations

import json
from collections import Counter

from sklearn.metrics import f1_score

from src.data_load import load_task
from src.paths import ALL_TASKS


def majority_f1(y_test: list[int]) -> dict:
    maj = Counter(y_test).most_common(1)[0][0]
    pred = [maj] * len(y_test)
    return {
        "majority_class": maj,
        "f1_pos": float(f1_score(y_test, pred, zero_division=0)),
        "f1_macro": float(f1_score(y_test, pred, average="macro", zero_division=0)),
        "acc": sum(1 for y in y_test if y == maj) / len(y_test),
    }


def dup_stats(texts: list[str]) -> dict:
    c = Counter(texts)
    dups = sum(1 for _, n in c.items() if n > 1)
    return {"unique": len(c), "total": len(texts), "dup_values": dups}


def len_stats(texts: list[str]) -> dict:
    # rough token proxy: words
    words = [len(t.split()) for t in texts]
    chars = [len(t) for t in texts]
    return {
        "words_p50": sorted(words)[len(words) // 2],
        "words_p90": sorted(words)[int(len(words) * 0.9)],
        "words_max": max(words),
        "chars_p90": sorted(chars)[int(len(chars) * 0.9)],
        "chars_max": max(chars),
        "frac_words_gt_200": sum(1 for w in words if w > 200) / len(words),
        "frac_words_gt_256": sum(1 for w in words if w > 256) / len(words),
    }


def train_test_overlap(split) -> int:
    tr = set(split.texts_train)
    te = set(split.texts_test)
    return len(tr & te)


def scam_keyword_probe(split) -> None:
    # Check if type-specific words separate classes easily
    keywords = {
        1: ["refund", "ssn", "social security", "gift card", "tech support", "microsoft", "irs"],
        0: ["appointment", "delivery", "insurance", "wrong number", "package"],
    }
    for lab, kws in keywords.items():
        texts = [t.lower() for t, y in zip(split.texts_test, split.y_test) if y == lab]
        hits = sum(1 for t in texts if any(k in t for k in kws))
        print(f"  class {lab}: {hits}/{len(texts)} contain obvious type keywords")


def main() -> None:
    report = {}
    for task in ALL_TASKS:
        split = load_task(task)
        y = split.y_train + split.y_test
        bal = Counter(y)
        maj = majority_f1(split.y_test)
        overlap = train_test_overlap(split)
        dups = dup_stats(split.texts_train + split.texts_test)
        lens = len_stats(split.texts_train + split.texts_test)
        print("\n===", task, "===")
        print("class balance all:", dict(bal))
        print("majority baseline on test:", maj)
        print("train/test exact text overlap:", overlap)
        print("dup stats:", dups)
        print("length:", lens)
        if task == "scam_phone":
            scam_keyword_probe(split)
        report[task] = {
            "balance": dict(bal),
            "majority": maj,
            "overlap": overlap,
            "dups": dups,
            "length": lens,
        }
    out = __import__("pathlib").Path("outputs/audit_edge_cases.json")
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("\nwrote", out)


if __name__ == "__main__":
    main()
