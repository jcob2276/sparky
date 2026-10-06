"""Audit the frozen Jev gate against a new model on the fresh test split."""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
from pathlib import Path

from src.analyze_jev import combine_predictions, exact_binomial_ci
from src.data_load import load_task
from src.jev_fresh_holdout import make_protocol_records
from src.jev_holdout import read_events, select_latest_responses, sha256_bytes
from src.metrics import score
from src.paths import SAFE_CSV
from src.analyze_repeats import compare_predictions


def summarize_joined(joined: list[dict]) -> dict:
    if not joined:
        raise ValueError("no paired test predictions")
    attacks = [row for row in joined if row["true_label"] == 1]
    benign = [row for row in joined if row["true_label"] == 0]
    attack_passes = sum(bool(row["passed_gate"]) for row in attacks)
    benign_passes = sum(bool(row["passed_gate"]) for row in benign)
    y = [row["true_label"] for row in joined]
    latencies = sorted(float(row["jev_latency_ms"]) for row in joined)
    metrics = {
        name: {key: value for key, value in score(y, [row[column] for row in joined]).items() if key != "report"}
        for name, column in (
            ("svm", "svm_pred"),
            ("distilbert", "model_pred"),
            ("jev_choice", "jev_choice_pred"),
            ("jev_gate_plus_svm", "cascade_svm_pred"),
            ("jev_gate_plus_distilbert", "cascade_model_pred"),
        )
    }
    paired_gate_vs_distilbert = compare_predictions(
        y,
        [row["model_pred"] for row in joined],
        [row["cascade_model_pred"] for row in joined],
    )
    return {
        "test_size": len(joined),
        "gate_pass_total": attack_passes + benign_passes,
        "gate_pass_rate": (attack_passes + benign_passes) / len(joined),
        "gate_pass_attacks": attack_passes,
        "gate_missed_attacks_model_would_catch": sum(
            row["passed_gate"] and row["model_pred"] == 1 for row in attacks
        ),
        "gate_pass_attacks_rate": attack_passes / len(attacks),
        "gate_pass_benign": benign_passes,
        "gate_pass_benign_rate": benign_passes / len(benign),
        "attack_hold_rate": 1 - attack_passes / len(attacks),
        "attack_hold_exact_ci95": exact_binomial_ci(len(attacks) - attack_passes, len(attacks)),
        "jev_total_cost_usd": sum(row["jev_cost_usd"] for row in joined),
        "jev_latency_median_ms": statistics.median(latencies),
        "jev_latency_p95_ms": latencies[math.ceil(0.95 * len(latencies)) - 1],
        "paired_gate_vs_distilbert": paired_gate_vs_distilbert,
        "metrics": metrics,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--protocol", type=Path, required=True)
    parser.add_argument("--threshold-file", type=Path, required=True)
    parser.add_argument("--events-file", type=Path, required=True)
    parser.add_argument("--model-run", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    protocol_sha = sha256_bytes(args.protocol.read_bytes())
    protocol = json.loads(args.protocol.read_text(encoding="utf-8"))
    threshold = json.loads(args.threshold_file.read_text(encoding="utf-8"))
    manifest = json.loads((args.model_run / "manifest.json").read_text(encoding="utf-8"))
    dataset_sha = sha256_bytes(SAFE_CSV.read_bytes())
    if protocol["dataset_sha256"] != dataset_sha or manifest["dataset_sha256"] != dataset_sha:
        raise ValueError("dataset hash differs across protocol and model")
    if threshold["protocol_sha256"] != protocol_sha or manifest["frozen_protocol_sha256"] != protocol_sha:
        raise ValueError("protocol hash differs across Jev and model")
    split = load_task("safepersuasion")
    expected = make_protocol_records(split, protocol["partition"], "test")
    expected_ids = [str(row["dataset_id"]) for row in expected]
    events = read_events(args.events_file)
    if {row.get("dataset_sha256") for row in events} != {dataset_sha}:
        raise ValueError("Jev event dataset hash mismatch")
    if {row.get("prompt_sha256") for row in events} != {threshold["prompt_sha256"]}:
        raise ValueError("Jev event prompt hash mismatch")
    latest = select_latest_responses(expected, events)
    if len(latest) != len(expected):
        raise ValueError("Jev test decisions incomplete")
    if {row.get("model") for row in latest.values()} != {threshold["jev_snapshot"]}:
        raise ValueError("Jev snapshot differs from validation")
    with (args.model_run / "test_predictions.csv").open(encoding="utf-8", newline="") as handle:
        model_rows = list(csv.DictReader(handle))
    if [row["id"] for row in model_rows] != expected_ids or manifest["split"]["test_ids"] != expected_ids:
        raise ValueError("model prediction IDs differ from frozen test")
    gate_threshold = threshold["selection"]["threshold"]
    joined = combine_predictions(
        [latest[dataset_id] for dataset_id in expected_ids],
        model_rows,
        threshold=math.inf if gate_threshold is None else float(gate_threshold),
    )
    result = summarize_joined(joined)
    result.update({
        "experiment": "jev_fresh_safepersuasion_v1",
        "dataset_sha256": dataset_sha,
        "protocol_sha256": protocol_sha,
        "jev_prompt_sha256": threshold["prompt_sha256"],
        "jev_snapshot": threshold["jev_snapshot"],
        "gate_threshold": gate_threshold,
        "validation_selection": threshold["selection"],
        "model_manifest_sha256": sha256_bytes((args.model_run / "manifest.json").read_bytes()),
        "model_weights_sha256": sha256_bytes((args.model_run / "model" / "model.safetensors").read_bytes()),
        "interpretation_note": "Fresh internal SafePersuasion test; Jev savings are downstream calls, not proven end-to-end dollars or latency.",
    })
    args.output_dir.mkdir(parents=True, exist_ok=False)
    with (args.output_dir / "paired_predictions.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(joined[0]))
        writer.writeheader()
        writer.writerows(joined)
    (args.output_dir / "summary.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
