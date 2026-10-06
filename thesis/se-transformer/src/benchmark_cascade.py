"""Sequential, per-message Jev→DistilBERT latency and cost benchmark.

The frozen SafePersuasion test and validation-selected threshold are never
changed. Text and API credentials are not written to benchmark artifacts.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import platform
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from src.analyze_repeats import compare_predictions
from src.data_load import load_task
from src.jev_fresh_holdout import make_protocol_records
from src.jev_holdout import sha256_bytes
from src.jev_triage_verify import call_one
from src.metrics import score
from src.paths import SAFE_CSV
from src.research_run import resolve_protocol_partition


def run_one(
    record: dict,
    judge: Callable,
    infer: Callable[[str], int],
    threshold: float,
    clock: Callable[[], float],
    api_key: str,
    expected_snapshot: str,
) -> dict:
    """Measure a baseline request and a genuine sequential cascade request."""
    text = str(record["text"])
    baseline_start = clock()
    baseline_pred = int(infer(text))
    baseline_end = clock()
    cascade_start = clock()
    response = judge(0, text, str(record["label"]), api_key)
    jev_end = clock()
    if response.get("error"):
        raise RuntimeError("Jev failed; benchmark stopped without a fabricated decision")
    if response.get("model") != expected_snapshot:
        raise ValueError("Jev snapshot changed during frozen benchmark")
    confidence = response.get("confidence")
    cost = response.get("cost_usd")
    if (response.get("jev_choice") not in {"safe", "manipulation"}
            or not isinstance(confidence, (int, float))
            or not math.isfinite(float(confidence))
            or not 0 <= float(confidence) <= 1
            or not isinstance(cost, (int, float))
            or not math.isfinite(float(cost))
            or float(cost) < 0):
        raise ValueError("Malformed Jev decision or missing per-request cost")
    passed = response["jev_choice"] == "safe" and float(confidence) >= threshold
    if passed:
        cascade_pred = 0
        model_latency_ms = 0.0
    else:
        model_start = clock()
        cascade_pred = int(infer(text))
        model_end = clock()
        model_latency_ms = (model_end - model_start) * 1000
    cascade_end = clock()
    return {
        "id": record["dataset_id"],
        "text_sha256": record["text_sha256"],
        "true_label": 1 if record["label"] == "Manipulation" else 0,
        "baseline_pred": baseline_pred,
        "cascade_pred": cascade_pred,
        "passed_gate": passed,
        "jev_choice": response["jev_choice"],
        "jev_confidence": float(confidence),
        "jev_model": response["model"],
        "jev_cost_usd": float(cost),
        "jev_input_tokens": response.get("input_tokens"),
        "baseline_latency_ms": (baseline_end - baseline_start) * 1000,
        "jev_latency_ms": (jev_end - cascade_start) * 1000,
        "cascade_model_latency_ms": model_latency_ms,
        "cascade_latency_ms": (cascade_end - cascade_start) * 1000,
    }


def _p95(values: list[float]) -> float:
    ordered = sorted(values)
    return ordered[math.ceil(len(ordered) * 0.95) - 1]


def freeze_run_context(output_dir: Path, context: dict) -> None:
    """Reject resuming an event log produced with another measured setup."""
    manifest_file = output_dir / "run_context.json"
    if manifest_file.exists():
        if json.loads(manifest_file.read_text(encoding="utf-8")) != context:
            raise ValueError("Frozen run context differs; use a new output directory")
        return
    for name in ("events.jsonl", "api_attempts.jsonl"):
        events_file = output_dir / name
        if events_file.exists() and events_file.stat().st_size:
            raise ValueError("Existing events lack a frozen run context; refusing attribution")
    output_dir.mkdir(parents=True, exist_ok=True)
    with manifest_file.open("x", encoding="utf-8") as handle:
        json.dump(context, handle, indent=2, allow_nan=False)


def run_one_audited(record: dict, judge: Callable, infer: Callable,
                    threshold: float, clock: Callable, api_key: str,
                    expected_snapshot: str, attempts_file: Path) -> dict:
    """Journal every returned API response, including rejected snapshots.

    Disk writes occur after run_one's timed path, so fsync does not enter the
    request latency. If the judge raises, retain an unknown-cost attempt.
    """
    response = None
    started_at = None
    measurement_completed = False

    def capture(index, text, label, key):
        nonlocal response, started_at
        started_at = datetime.now(timezone.utc).isoformat()
        response = judge(index, text, label, key)
        return response

    try:
        row = run_one(record, capture, infer, threshold, clock, api_key, expected_snapshot)
        measurement_completed = True
        return row
    finally:
        if started_at is not None:
            result = response or {}
            cost = result.get("cost_usd")
            known_cost = isinstance(cost, (int, float)) and math.isfinite(float(cost)) and float(cost) >= 0
            event = {
                "dataset_id": record["dataset_id"],
                "text_sha256": record["text_sha256"],
                "started_at_utc": started_at,
                "finished_at_utc": datetime.now(timezone.utc).isoformat(),
                "response_received": response is not None,
                "measurement_completed": measurement_completed,
                "expected_snapshot": expected_snapshot,
                "api_error": bool(result.get("error")) or response is None,
                "model": result.get("model"),
                "choice": result.get("jev_choice") if result.get("jev_choice") in {"safe", "manipulation"} else None,
                "cost_usd": float(cost) if known_cost else None,
                "input_tokens": result.get("input_tokens"),
            }
            attempts_file.parent.mkdir(parents=True, exist_ok=True)
            with attempts_file.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(event, allow_nan=False) + "\n")
                handle.flush()
                os.fsync(handle.fileno())


def _summarize(rows: list[dict], hourly_price: float) -> dict:
    labels = [row["true_label"] for row in rows]
    baseline = [row["baseline_pred"] for row in rows]
    cascade = [row["cascade_pred"] for row in rows]
    baseline_ms = [row["baseline_latency_ms"] for row in rows]
    cascade_ms = [row["cascade_latency_ms"] for row in rows]
    jev_ms = [row["jev_latency_ms"] for row in rows]
    api_cost = sum(row["jev_cost_usd"] for row in rows)
    baseline_gpu_cost = sum(baseline_ms) / 3_600_000 * hourly_price
    cascade_gpu_cost = sum(cascade_ms) / 3_600_000 * hourly_price
    return {
        "n": len(rows),
        "bypassed": sum(row["passed_gate"] for row in rows),
        "missed_attacks": sum(row["passed_gate"] and row["true_label"] == 1 for row in rows),
        "baseline_f1_macro": score(labels, baseline)["f1_macro"],
        "cascade_f1_macro": score(labels, cascade)["f1_macro"],
        "paired_quality": compare_predictions(labels, baseline, cascade),
        "latency_ms": {
            "baseline_median": statistics.median(baseline_ms),
            "baseline_p95": _p95(baseline_ms),
            "cascade_median": statistics.median(cascade_ms),
            "cascade_p95": _p95(cascade_ms),
            "jev_median": statistics.median(jev_ms),
            "jev_p95": _p95(jev_ms),
            "baseline_sum": sum(baseline_ms),
            "cascade_sum": sum(cascade_ms),
        },
        "jev_api_cost_usd": api_cost,
        "gpu_list_rate_usd_per_hour": hourly_price,
        "analytical_cost_usd": {
            "baseline_model_time_only": baseline_gpu_cost,
            "cascade_wall_time_on_dedicated_pod_plus_jev": cascade_gpu_cost + api_cost,
        },
        "cost_note": "Analytical allocation at list rate is not the RunPod invoice; pod startup, setup, transfer, idle and billing granularity are separate.",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--protocol", type=Path, required=True)
    parser.add_argument("--threshold-file", type=Path, required=True)
    parser.add_argument("--model-run", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--hourly-price", type=float, required=True)
    parser.add_argument("--max-api-cost", type=float, default=0.10)
    args = parser.parse_args()
    if args.hourly_price < 0 or args.max_api_cost <= 0:
        parser.error("price and API cap must be nonnegative/positive")
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        parser.error("OPENROUTER_API_KEY is missing")

    protocol_bytes = args.protocol.read_bytes()
    protocol = json.loads(protocol_bytes)
    threshold = json.loads(args.threshold_file.read_text(encoding="utf-8"))
    manifest = json.loads((args.model_run / "manifest.json").read_text(encoding="utf-8"))
    dataset_sha = sha256_bytes(SAFE_CSV.read_bytes())
    protocol_sha = sha256_bytes(protocol_bytes)
    prompt_sha = sha256_bytes(Path(call_one.__code__.co_filename).read_bytes())
    if (protocol["dataset_sha256"] != dataset_sha
            or manifest["dataset_sha256"] != dataset_sha
            or threshold["protocol_sha256"] != protocol_sha
            or manifest["frozen_protocol_sha256"] != protocol_sha
            or threshold["prompt_sha256"] != prompt_sha):
        raise ValueError("Frozen dataset, protocol, model or Jev prompt hash mismatch")
    split = load_task("safepersuasion")
    resolve_protocol_partition(split, protocol, dataset_sha)
    records = make_protocol_records(split, protocol["partition"], "test")
    with (args.model_run / "test_predictions.csv").open(encoding="utf-8", newline="") as handle:
        saved_predictions = list(csv.DictReader(handle))
    if ([row["dataset_id"] for row in records] != [row["id"] for row in saved_predictions]
            or manifest["split"]["test_ids"] != [row["dataset_id"] for row in records]):
        raise ValueError("Frozen test IDs do not match saved model predictions")
    gate_threshold = threshold["selection"]["threshold"]
    if not isinstance(gate_threshold, (int, float)):
        raise ValueError("Frozen gate threshold is unavailable")

    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    model_dir = args.model_run / "model"
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device).eval()
    weights_sha = hashlib.sha256((model_dir / "model.safetensors").read_bytes()).hexdigest()
    freeze_run_context(args.output_dir, {
        "dataset_sha256": dataset_sha,
        "protocol_sha256": protocol_sha,
        "threshold_sha256": sha256_bytes(args.threshold_file.read_bytes()),
        "weights_sha256": weights_sha,
        "model_manifest_sha256": sha256_bytes((args.model_run / "manifest.json").read_bytes()),
        "prompt_sha256": prompt_sha,
        "source_sha256": sha256_bytes(Path(__file__).read_bytes()),
        "max_length": 256,
        "precision": "float32",
        "hourly_price_usd": args.hourly_price,
        "hardware": {"device": str(device), "host": platform.node(),
                     "pod_id": os.environ.get("RUNPOD_POD_ID"),
                     "gpu": torch.cuda.get_device_name(0) if device.type == "cuda" else None,
                     "python": platform.python_version(), "torch": torch.__version__},
        "method": "Serial paired baseline then cascade, no batching",
    })

    def infer(text: str) -> int:
        inputs = tokenizer(text, truncation=True, max_length=256, return_tensors="pt")
        with torch.inference_mode():
            logits = model(**{name: tensor.to(device) for name, tensor in inputs.items()}).logits
            if device.type == "cuda":
                torch.cuda.synchronize()
        return int(logits.argmax(dim=-1).item())

    # A paid API call is not made until this hardware reproduces every saved prediction.
    mismatches = [record["dataset_id"] for record, saved in zip(records, saved_predictions, strict=True)
                  if infer(str(record["text"])) != int(saved["model_pred"])]
    if mismatches:
        raise ValueError(f"Model preflight differs on {len(mismatches)} frozen test items")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    events_file = args.output_dir / "events.jsonl"
    existing = [json.loads(line) for line in events_file.read_text(encoding="utf-8").splitlines()] if events_file.exists() else []
    expected_by_id = {row["dataset_id"]: row for row in records}
    if (len({row["id"] for row in existing}) != len(existing)
            or any(row["id"] not in expected_by_id or row["text_sha256"] != expected_by_id[row["id"]]["text_sha256"]
                   or row["jev_model"] != threshold["jev_snapshot"] for row in existing)):
        raise ValueError("Existing event log does not match frozen benchmark")
    completed = {row["id"] for row in existing}
    attempts_file = args.output_dir / "api_attempts.jsonl"
    previous_attempts = [json.loads(line) for line in attempts_file.read_text(encoding="utf-8").splitlines()] if attempts_file.exists() else []
    spent = sum(row["cost_usd"] for row in previous_attempts if isinstance(row.get("cost_usd"), (int, float)))
    with events_file.open("a", encoding="utf-8") as handle:
        for index, record in enumerate(records):
            if record["dataset_id"] in completed:
                continue
            if spent >= args.max_api_cost:
                raise RuntimeError("API cost cap reached; benchmark stopped")
            row = run_one_audited(record, call_one, infer, float(gate_threshold), time.perf_counter,
                                  key, threshold["jev_snapshot"], attempts_file)
            if row["baseline_pred"] != int(saved_predictions[index]["model_pred"]):
                raise ValueError("Baseline prediction changed during live run")
            spent += row["jev_cost_usd"]
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
            if (index + 1) % 25 == 0 or index + 1 == len(records):
                print(f"Completed {index + 1}/{len(records)}; API spend ${spent:.6f}", flush=True)
    rows_by_id = {row["id"]: row for row in existing + [json.loads(line) for line in events_file.read_text(encoding="utf-8").splitlines() if line]}
    rows = [rows_by_id[record["dataset_id"]] for record in records]
    if len(rows) != len(records):
        raise ValueError("Incomplete benchmark")
    result = _summarize(rows, args.hourly_price)
    result.update({
        "experiment": "jev_distilbert_live_e2e_safepersuasion_20260930",
        "dataset_sha256": dataset_sha,
        "protocol_sha256": protocol_sha,
        "prompt_sha256": prompt_sha,
        "model_weights_sha256": weights_sha,
        "source_script_sha256": sha256_bytes(Path(__file__).read_bytes()),
        "all_known_api_attempt_cost_usd": spent,
        "jev_snapshot": threshold["jev_snapshot"],
        "gate_threshold": gate_threshold,
        "hardware": {"device": str(device), "gpu": torch.cuda.get_device_name(0) if device.type == "cuda" else None,
                     "python": platform.python_version(), "torch": torch.__version__},
        "method": "Serial paired requests, warmed loaded model; baseline model and real Jev→model path measured for each frozen text. Model preflight matched saved predictions before API calls.",
    })
    summary_file = args.output_dir / "summary.json"
    if summary_file.exists():
        raise FileExistsError(summary_file)
    summary_file.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps({"n": result["n"], "bypassed": result["bypassed"],
                      "baseline_f1_macro": result["baseline_f1_macro"],
                      "cascade_f1_macro": result["cascade_f1_macro"],
                      "jev_api_cost_usd": result["jev_api_cost_usd"],
                      "output": str(summary_file)}, indent=2), flush=True)


if __name__ == "__main__":
    main()
