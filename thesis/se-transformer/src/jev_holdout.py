"""Evaluate the fixed Jev cost gate on the existing SafePersuasion test split.

Responses are append-only JSONL events. A rerun sends only missing or failed
items, so an interrupted paid experiment does not start from scratch.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from src.data_load import Split, load_task
from src.jev_triage_verify import call_one, summarize
from src.paths import SAFE_CSV

PROMPT_SOURCE = Path(__file__).with_name("jev_triage_verify.py")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def make_holdout_records(split: Split) -> list[dict[str, object]]:
    if split.task != "safepersuasion":
        raise ValueError("expected safepersuasion split")
    if not (len(split.texts_test) == len(split.y_test) == len(split.ids_test)):
        raise ValueError("test split lengths differ")
    if set(split.ids_train) & set(split.ids_test):
        raise ValueError("train/test IDs overlap")
    return [
        {
            "dataset_id": dataset_id,
            "text": value,
            "text_sha256": sha256_bytes(value.encode("utf-8")),
            "label": "Manipulation" if label == 1 else "Rational Persuasion",
        }
        for dataset_id, value, label in zip(
            split.ids_test, split.texts_test, split.y_test, strict=True
        )
    ]


def select_latest_responses(
    records: list[dict[str, object]], events: list[dict[str, object]]
) -> dict[str, dict[str, object]]:
    expected = {str(item["dataset_id"]): str(item["text_sha256"]) for item in records}
    latest: dict[str, dict[str, object]] = {}
    for event in events:
        dataset_id = str(event["dataset_id"])
        if dataset_id not in expected:
            raise ValueError(f"unexpected dataset ID: {dataset_id}")
        if event["text_sha256"] != expected[dataset_id]:
            raise ValueError(f"text hash changed for {dataset_id}")
        if not event.get("error"):
            latest[dataset_id] = event
    return latest


def read_events(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--events-file", type=Path, required=True)
    parser.add_argument("--summary-file", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    if not 1 <= args.workers <= 8:
        parser.error("workers must be between 1 and 8")
    if args.events_file.resolve() == args.summary_file.resolve():
        parser.error("events and summary paths must differ")
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("OPENROUTER_API_KEY is missing")

    split = load_task("safepersuasion")
    records = make_holdout_records(split)
    dataset_sha = sha256_bytes(SAFE_CSV.read_bytes())
    prompt_sha = sha256_bytes(PROMPT_SOURCE.read_bytes())
    events = read_events(args.events_file)
    for event in events:
        if event.get("dataset_sha256") != dataset_sha:
            raise ValueError("dataset hash changed since earlier Jev responses")
        if event.get("prompt_sha256") != prompt_sha:
            raise ValueError("Jev request code changed since earlier responses")
    successes = select_latest_responses(records, events)
    pending = [(index, item) for index, item in enumerate(records) if item["dataset_id"] not in successes]

    def judge(item: tuple[int, dict[str, object]]) -> dict[str, object]:
        index, record = item
        response = call_one(index, str(record["text"]), str(record["label"]), api_key)
        if not response["error"] and (
            response["jev_choice"] not in ("safe", "manipulation")
            or not isinstance(response["confidence"], (int, float))
        ):
            response["error"] = "malformed Jev choice or confidence"
        return {
            **response,
            "dataset_id": record["dataset_id"],
            "text_sha256": record["text_sha256"],
            "dataset_sha256": dataset_sha,
            "prompt_sha256": prompt_sha,
            "requested_at_utc": datetime.now(timezone.utc).isoformat(),
        }

    args.events_file.parent.mkdir(parents=True, exist_ok=True)
    args.summary_file.parent.mkdir(parents=True, exist_ok=True)
    if pending:
        with args.events_file.open("a", encoding="utf-8") as handle:
            first = judge(pending[0])
            handle.write(json.dumps(first, ensure_ascii=False) + "\n")
            handle.flush()
            if first["error"].startswith(("HTTP 401", "HTTP 402", "HTTP 403")):
                raise SystemExit(f"Jev authorization/billing failed: {first['error'][:40]}")
            remaining = pending[1:]
            with ThreadPoolExecutor(max_workers=args.workers) as pool:
                for completed, event in enumerate(pool.map(judge, remaining), start=2):
                    handle.write(json.dumps(event, ensure_ascii=False) + "\n")
                    handle.flush()
                    if completed % 25 == 0 or completed == len(pending):
                        print(f"completed this pass: {completed}/{len(pending)}", flush=True)

    events = read_events(args.events_file)
    successes = select_latest_responses(records, events)
    last_event = {str(event["dataset_id"]): event for event in events}
    rows = [successes.get(str(item["dataset_id"])) or last_event.get(str(item["dataset_id"]))
            for item in records]
    rows = [row for row in rows if row is not None]
    result = summarize(rows)
    result.update(
        {
            "scope": "SafePersuasion fixed outer test split from load_task; no train/validation texts",
            "expected_test_size": len(records),
            "successful_unique_ids": len(successes),
            "dataset_sha256": dataset_sha,
            "prompt_sha256": prompt_sha,
            "events_file": str(args.events_file.resolve()),
            "threshold_selected_before_this_run": True,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        }
    )
    args.summary_file.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
