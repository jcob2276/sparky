"""Run majority + SVM + one or more Transformers. Writes Markdown/JSON tables."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone

from src.data_load import load_task
from src.metrics import majority_baseline
from src.paths import ALL_TASKS, CORE_TASKS, EXTRA_TASKS, OUTPUTS, TRANSFORMER_MODELS
from src.train_svm import train_eval_svm


def _md_row(row: dict) -> str:
    m = row["metrics"]
    return (
        f"| {row['task']} | {row['model']} | {row['n_train']} | {row['n_test']} | "
        f"{m['accuracy']:.4f} | {m['precision']:.4f} | {m['recall']:.4f} | "
        f"{m['f1']:.4f} | {m['f1_macro']:.4f} |"
    )


def write_tables(rows: list[dict], tag: str) -> None:
    OUTPUTS.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = OUTPUTS / f"results_{tag}_{stamp}.json"
    md_path = OUTPUTS / f"results_{tag}_{stamp}.md"
    latest_md = OUTPUTS / "results_latest.md"
    json_path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    header = (
        "| task | model | n_train | n_test | accuracy | precision | recall | f1 | f1_macro |\n"
        "|---|---|---:|---:|---:|---:|---:|---:|---:|\n"
    )
    body = "\n".join(_md_row(r) for r in rows)
    reports = "\n\n".join(
        f"### {r['task']} / {r['model']}\n\n```\n{r['metrics']['report']}\n```"
        for r in rows
    )
    md = f"# Results `{tag}`\n\n{header}{body}\n\n{reports}\n"
    md_path.write_text(md, encoding="utf-8")
    latest_md.write_text(md, encoding="utf-8")
    print(md)
    print(f"wrote {json_path}")
    print(f"wrote {md_path}")


def _resolve_tasks(name: str) -> list[str]:
    if name == "core":
        return list(CORE_TASKS)
    if name == "extra":
        return list(EXTRA_TASKS)
    if name == "all":
        return list(ALL_TASKS)
    if name == "both":
        return list(CORE_TASKS)
    if name in ALL_TASKS:
        return [name]
    raise ValueError(f"unknown task selector: {name}")


def _resolve_models(raw: str | None, skip_transformers: bool, smoke: bool) -> list[str]:
    if skip_transformers:
        return []
    if smoke:
        return ["distilbert-base-uncased"]
    if not raw or raw.strip() == "all":
        return list(TRANSFORMER_MODELS)
    return [m.strip() for m in raw.split(",") if m.strip()]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--task",
        default="all",
        help="seconvo|mentalmanip|safepersuasion|scam_phone|phishing_text|reament|core|extra|all",
    )
    parser.add_argument("--limit", type=int, default=None, help="subset for smoke tests")
    parser.add_argument("--skip-bert", action="store_true", help="alias: skip transformers")
    parser.add_argument("--skip-transformers", action="store_true")
    parser.add_argument(
        "--models",
        default="all",
        help="comma list or 'all' → bert-base-uncased,roberta-base,distilbert-base-uncased",
    )
    parser.add_argument("--bert-model", default=None, help="deprecated: single model (use --models)")
    parser.add_argument("--epochs", type=float, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument("--smoke", action="store_true")
    args = parser.parse_args()

    skip_tr = args.skip_bert or args.skip_transformers
    if args.smoke:
        args.limit = args.limit or 64
        args.epochs = 1
        args.batch_size = 4
        args.max_length = 128

    models = _resolve_models(args.bert_model or args.models, skip_tr, args.smoke)
    tasks = _resolve_tasks(args.task)
    rows: list[dict] = []

    for task in tasks:
        split = load_task(task, limit=args.limit)
        print(f"\n=== {task} train={len(split.y_train)} test={len(split.y_test)} ===")
        maj = majority_baseline(split.y_test)
        print(
            f"majority baseline: class={maj['majority_class']} "
            f"acc={maj['accuracy']:.4f} f1={maj['f1']:.4f} f1_macro={maj['f1_macro']:.4f}"
        )
        rows.append(
            {
                "task": task,
                "model": "majority_baseline",
                "n_train": len(split.y_train),
                "n_test": len(split.y_test),
                "metrics": {
                    "accuracy": maj["accuracy"],
                    "precision": 0.0,
                    "recall": 0.0,
                    "f1": maj["f1"],
                    "f1_macro": maj["f1_macro"],
                    "confusion_matrix": [],
                    "report": f"majority_class={maj['majority_class']}",
                },
            }
        )
        rows.append(train_eval_svm(split))
        if not models:
            continue
        from src.train_bert import train_eval_bert

        for model_name in models:
            print(f"--- transformer: {model_name} ---")
            rows.append(
                train_eval_bert(
                    split,
                    model_name=model_name,
                    epochs=args.epochs,
                    batch_size=args.batch_size,
                    max_length=args.max_length,
                )
            )

    tag = "smoke" if args.smoke else "full"
    write_tables(rows, tag)


if __name__ == "__main__":
    main()
