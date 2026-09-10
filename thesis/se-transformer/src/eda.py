"""Dataset EDA for thesis: sizes, balance, length, examples."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from src.data_load import load_task
from src.paths import ALL_TASKS, OUTPUTS


TASK_DESC = {
    "seconvo": "SE chat (LinkedIn-style). Label: attack vs benign.",
    "mentalmanip": "Dialogue mental manipulation. Label: manipulative vs not.",
    "safepersuasion": "Online comments. Label: Manipulation vs Rational Persuasion.",
    "scam_phone": "Synthetic phone dialogues. Label: scam vs not (control / easy).",
    "phishing_text": "Email/SMS-like texts. Label: phishing vs benign.",
    "reament": "Real-world dialogues (YTD videos). Label: mental manipulation vs not.",
}


def _len_stats(texts: list[str]) -> dict:
    words = [len(t.split()) for t in texts]
    chars = [len(t) for t in texts]
    words_sorted = sorted(words)
    n = len(words_sorted)

    def pct(p: float) -> int:
        return words_sorted[min(n - 1, int(n * p))]

    return {
        "n": n,
        "words_p50": pct(0.5),
        "words_p90": pct(0.9),
        "words_max": max(words),
        "chars_p50": sorted(chars)[n // 2],
        "frac_gt_256_words": round(sum(1 for w in words if w > 256) / n, 4),
        "frac_gt_512_words": round(sum(1 for w in words if w > 512) / n, 4),
    }


def analyze_task(task: str) -> dict:
    split = load_task(task)
    y_all = split.y_train + split.y_test
    bal = Counter(y_all)
    texts = split.texts_train + split.texts_test
    example_pos = next(
        (t for t, y in zip(texts, y_all) if y == 1),
        "",
    )
    example_neg = next(
        (t for t, y in zip(texts, y_all) if y == 0),
        "",
    )
    return {
        "task": task,
        "description": TASK_DESC.get(task, ""),
        "n_train": len(split.y_train),
        "n_test": len(split.y_test),
        "n_total": len(y_all),
        "class_0": int(bal.get(0, 0)),
        "class_1": int(bal.get(1, 0)),
        "pos_rate": round(bal.get(1, 0) / len(y_all), 4),
        "length": _len_stats(texts),
        "example_pos": " ".join(example_pos.split())[:350],
        "example_neg": " ".join(example_neg.split())[:350],
    }


def run_eda(tasks: list[str] | None = None) -> list[dict]:
    tasks = tasks or list(ALL_TASKS)
    rows = [analyze_task(t) for t in tasks]
    OUTPUTS.mkdir(parents=True, exist_ok=True)
    out_json = OUTPUTS / "eda_summary.json"
    out_md = OUTPUTS / "eda_summary.md"
    out_json.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        "# Dataset EDA",
        "",
        "| task | n_total | train/test | class_0 | class_1 | pos_rate | words_p50 | words_p90 | frac>512w |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in rows:
        L = r["length"]
        lines.append(
            f"| {r['task']} | {r['n_total']} | {r['n_train']}/{r['n_test']} | "
            f"{r['class_0']} | {r['class_1']} | {r['pos_rate']:.3f} | "
            f"{L['words_p50']} | {L['words_p90']} | {L['frac_gt_512_words']:.3f} |"
        )
    lines.append("")
    for r in rows:
        lines.extend(
            [
                f"## {r['task']}",
                "",
                r["description"],
                "",
                f"**pos:** {r['example_pos']}",
                "",
                f"**neg:** {r['example_neg']}",
                "",
            ]
        )
    out_md.write_text("\n".join(lines), encoding="utf-8")
    print(out_md.read_text(encoding="utf-8"))
    print(f"wrote {out_json}")
    print(f"wrote {out_md}")
    return rows


def main() -> None:
    run_eda()


if __name__ == "__main__":
    main()
