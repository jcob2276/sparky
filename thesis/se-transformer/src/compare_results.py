"""Merge result JSON files into comparison pivot tables."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

from src.paths import OUTPUTS


def _load_rows(paths: list[Path]) -> list[dict]:
    rows: list[dict] = []
    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            rows.extend(data)
    return rows


def pivot_f1(rows: list[dict], metric: str = "f1_macro") -> tuple[list[str], list[str], dict]:
    tasks = sorted({r["task"] for r in rows})
    models = []
    seen = set()
    for r in rows:
        if r["model"] not in seen:
            models.append(r["model"])
            seen.add(r["model"])
    grid: dict[tuple[str, str], float] = {}
    for r in rows:
        grid[(r["task"], r["model"])] = float(r["metrics"][metric])
    return tasks, models, grid


def to_markdown(tasks: list[str], models: list[str], grid: dict, metric: str) -> str:
    header = "| task | " + " | ".join(models) + " |"
    sep = "|---|" + "|".join(["---:" for _ in models]) + "|"
    lines = [f"# Comparison (`{metric}`)", "", header, sep]
    for task in tasks:
        cells = []
        for model in models:
            val = grid.get((task, model))
            cells.append(f"{val:.4f}" if val is not None else "—")
        lines.append(f"| {task} | " + " | ".join(cells) + " |")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--glob",
        default="results_*.json",
        help="glob under outputs/",
    )
    parser.add_argument("--metric", default="f1_macro", choices=["f1", "f1_macro", "accuracy"])
    args = parser.parse_args()

    paths = sorted(OUTPUTS.glob(args.glob))
    # Prefer full runs, skip smoke if both exist
    full = [p for p in paths if "smoke" not in p.name]
    paths = full or paths
    if not paths:
        raise SystemExit(f"no files matched outputs/{args.glob}")

    rows = _load_rows(paths)
    # keep latest row per (task, model)
    latest: dict[tuple[str, str], dict] = {}
    for r in rows:
        latest[(r["task"], r["model"])] = r
    rows = list(latest.values())

    tasks, models, grid = pivot_f1(rows, args.metric)
    md = to_markdown(tasks, models, grid, args.metric)
    out = OUTPUTS / f"comparison_{args.metric}.md"
    out.write_text(md, encoding="utf-8")
    print(md)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
