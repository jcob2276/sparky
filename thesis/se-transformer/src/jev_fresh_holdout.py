"""Call Jev on frozen SafePersuasion validation/test partitions, with audit events."""

from __future__ import annotations

import argparse
import json
import math
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from src.data_load import Split
from src.jev_fresh_protocol import choose_threshold
from src.jev_holdout import read_events, select_latest_responses, sha256_bytes
from src.jev_triage_verify import call_one


def make_protocol_records(
    split: Split, partition: dict[str, list[str]], name: str
) -> list[dict[str, object]]:
    if name not in {"validation", "test"}:
        raise ValueError("expected validation or test")
    by_id = {
        dataset_id: (text, label)
        for dataset_id, text, label in zip(
            split.ids_train, split.texts_train, split.y_train, strict=True
        )
    }
    records = []
    for dataset_id in partition[f"{name}_ids"]:
        text, label = by_id[dataset_id]
        records.append(
            {
                "dataset_id": dataset_id,
                "text": text,
                "text_sha256": sha256_bytes(text.encode("utf-8")),
                "label": "Manipulation" if label == 1 else "Rational Persuasion",
            }
        )
    return records


def freeze_threshold(
    validation_rows: list[dict[str, object]],
    expected_count: int,
    protocol_sha: str,
    prompt_sha: str,
) -> dict[str, object]:
    if len(validation_rows) != expected_count or len({str(row["dataset_id"]) for row in validation_rows}) != expected_count:
        raise ValueError("incomplete validation responses")
    if any(row.get("error") for row in validation_rows):
        raise ValueError("incomplete validation: Jev errors remain")
    snapshots = {str(row.get("model", "")) for row in validation_rows}
    if len(snapshots) != 1 or not next(iter(snapshots)):
        raise ValueError("Jev snapshot changed across validation calls")
    return {
        "protocol_sha256": protocol_sha,
        "prompt_sha256": prompt_sha,
        "jev_snapshot": next(iter(snapshots)),
        "selection": choose_threshold(validation_rows),
    }


def run_stage(
    records: list[dict[str, object]],
    events_file: Path,
    dataset_sha: str,
    prompt_sha: str,
    api_key: str,
    judge: Callable[[int, str, str, str], dict[str, object]] = call_one,
    workers: int = 4,
) -> list[dict[str, object]]:
    """Append paid decisions one by one and resume without paying twice."""
    if not 1 <= workers <= 8:
        raise ValueError("workers must be between 1 and 8")
    events = read_events(events_file)
    for event in events:
        if event.get("dataset_sha256") != dataset_sha or event.get("prompt_sha256") != prompt_sha:
            raise ValueError("event log belongs to another dataset or prompt")
    successes = select_latest_responses(records, events)
    pending = [(index, item) for index, item in enumerate(records) if item["dataset_id"] not in successes]

    def call(item: tuple[int, dict[str, object]]) -> dict[str, object]:
        index, record = item
        response = judge(index, str(record["text"]), str(record["label"]), api_key)
        if not response.get("error") and (
            response.get("jev_choice") not in ("safe", "manipulation")
            or not isinstance(response.get("confidence"), (int, float))
        ):
            response["error"] = "malformed Jev decision"
        response.pop("text", None)
        return {
            **response,
            "dataset_id": record["dataset_id"],
            "text_sha256": record["text_sha256"],
            "dataset_sha256": dataset_sha,
            "prompt_sha256": prompt_sha,
            "requested_at_utc": datetime.now(timezone.utc).isoformat(),
        }

    if pending:
        events_file.parent.mkdir(parents=True, exist_ok=True)
        with events_file.open("a", encoding="utf-8") as handle:
            first = call(pending[0])
            handle.write(json.dumps(first, ensure_ascii=False) + "\n")
            handle.flush()
            if str(first.get("error", "")).startswith(("HTTP 401", "HTTP 402", "HTTP 403")):
                raise RuntimeError("Jev authorization or billing failed")
            with ThreadPoolExecutor(max_workers=workers) as pool:
                for count, event in enumerate(pool.map(call, pending[1:]), start=2):
                    handle.write(json.dumps(event, ensure_ascii=False) + "\n")
                    handle.flush()
                    if count % 25 == 0 or count == len(pending):
                        print(f"Jev completed this pass: {count}/{len(pending)}", flush=True)

    events = read_events(events_file)
    successes = select_latest_responses(records, events)
    latest = {str(event["dataset_id"]): event for event in events}
    return [successes.get(str(record["dataset_id"])) or latest[str(record["dataset_id"])] for record in records]


def main() -> None:
    from src.data_load import load_task
    from src.paths import SAFE_CSV
    from src.research_run import resolve_protocol_partition

    parser = argparse.ArgumentParser()
    parser.add_argument("--protocol", type=Path, required=True)
    parser.add_argument("--stage", choices=("validation", "test"), required=True)
    parser.add_argument("--events-file", type=Path, required=True)
    parser.add_argument("--threshold-file", type=Path, required=True)
    parser.add_argument("--summary-file", type=Path)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    protocol_sha = sha256_bytes(args.protocol.read_bytes())
    protocol = json.loads(args.protocol.read_text(encoding="utf-8"))
    dataset_sha = sha256_bytes(SAFE_CSV.read_bytes())
    prompt_sha = sha256_bytes(Path(__file__).with_name("jev_triage_verify.py").read_bytes())
    split = load_task("safepersuasion")
    resolve_protocol_partition(split, protocol, dataset_sha)
    records = make_protocol_records(split, protocol["partition"], args.stage)
    threshold_artifact = None
    if args.stage == "test":
        if not args.threshold_file.is_file():
            parser.error("frozen validation threshold file is required before test")
        threshold_artifact = json.loads(args.threshold_file.read_text(encoding="utf-8"))
        if threshold_artifact.get("protocol_sha256") != protocol_sha:
            raise ValueError("threshold protocol hash mismatch")
        if threshold_artifact.get("prompt_sha256") != prompt_sha:
            raise ValueError("threshold prompt hash mismatch")
    if args.dry_run:
        print(json.dumps({"stage": args.stage, "expected_count": len(records),
                          "protocol_sha256": protocol_sha}))
        return

    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("OPENROUTER_API_KEY is missing")
    rows = run_stage(records, args.events_file, dataset_sha, prompt_sha, api_key, workers=args.workers)
    if args.stage == "validation":
        artifact = freeze_threshold(rows, len(records), protocol_sha, prompt_sha)
        selection = artifact["selection"]
        if math.isinf(float(selection["threshold"])):
            selection["threshold"] = None
        if args.threshold_file.exists():
            if json.loads(args.threshold_file.read_text(encoding="utf-8")) != artifact:
                raise ValueError("frozen threshold file differs; refusing overwrite")
        else:
            args.threshold_file.parent.mkdir(parents=True, exist_ok=True)
            with args.threshold_file.open("x", encoding="utf-8") as handle:
                json.dump(artifact, handle, indent=2, allow_nan=False)
    else:
        snapshots = {str(row.get("model", "")) for row in rows if not row.get("error")}
        if snapshots != {threshold_artifact["jev_snapshot"]}:
            raise ValueError("test Jev snapshot differs from frozen validation snapshot")
        artifact = threshold_artifact
    summary = {
        "stage": args.stage,
        "expected_count": len(records),
        "successful_count": sum(not row.get("error") for row in rows),
        "error_count": sum(bool(row.get("error")) for row in rows),
        "protocol_sha256": protocol_sha,
        "prompt_sha256": prompt_sha,
        "jev_snapshot": artifact["jev_snapshot"],
        "threshold": artifact["selection"]["threshold"],
        "total_api_cost_usd": sum(float(row["cost_usd"]) for row in rows if isinstance(row.get("cost_usd"), (int, float))),
        "events_file": str(args.events_file.resolve()),
        "threshold_file": str(args.threshold_file.resolve()),
    }
    if args.summary_file is not None:
        args.summary_file.parent.mkdir(parents=True, exist_ok=True)
        args.summary_file.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
