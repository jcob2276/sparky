"""Pair saved Jev holdout decisions with the same SVM/DistilBERT test items."""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from scipy.stats import beta

from src.data_load import load_task
from src.jev_holdout import make_holdout_records, read_events, select_latest_responses, sha256_bytes
from src.metrics import score
from src.paths import SAFE_CSV


def combine_predictions(
    jev_rows: list[dict], downstream_rows: list[dict], threshold: float
) -> list[dict]:
    if len({str(row["dataset_id"]) for row in jev_rows}) != len(jev_rows):
        raise ValueError("duplicate Jev dataset IDs")
    if len({str(row["id"]) for row in downstream_rows}) != len(downstream_rows):
        raise ValueError("duplicate downstream IDs")
    jev_by_id = {str(row["dataset_id"]): row for row in jev_rows}
    if set(jev_by_id) != {str(row["id"]) for row in downstream_rows}:
        raise ValueError("Jev and downstream test IDs differ")
    combined = []
    for prediction in downstream_rows:
        dataset_id = str(prediction["id"])
        jev = jev_by_id[dataset_id]
        if jev.get("error"):
            raise ValueError(f"Jev error for {dataset_id}")
        gold = int(prediction["true_label"])
        jev_gold = 1 if jev["true_label"] == "Manipulation" else 0
        if gold != jev_gold:
            raise ValueError(f"gold label differs for {dataset_id}")
        confidence = float(jev["confidence"])
        passed = jev["jev_choice"] == "safe" and confidence >= threshold
        model_pred = int(prediction["model_pred"])
        svm_pred = int(prediction["svm_pred"])
        combined.append(
            {
                "id": dataset_id,
                "true_label": gold,
                "jev_choice": jev["jev_choice"],
                "jev_confidence": confidence,
                "passed_gate": passed,
                "model_pred": model_pred,
                "svm_pred": svm_pred,
                "cascade_model_pred": 0 if passed else model_pred,
                "cascade_svm_pred": 0 if passed else svm_pred,
                "jev_choice_pred": 1 if jev["jev_choice"] == "manipulation" else 0,
                "jev_cost_usd": float(jev["cost_usd"]),
                "jev_latency_ms": float(jev["latency_ms"]),
            }
        )
    return combined


def exact_binomial_ci(successes: int, total: int) -> tuple[float, float]:
    if total <= 0:
        raise ValueError("total must be positive")
    lower = 0.0 if successes == 0 else float(beta.ppf(0.025, successes, total - successes + 1))
    upper = 1.0 if successes == total else float(beta.ppf(0.975, successes + 1, total - successes))
    return lower, upper


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--events-file", type=Path, required=True)
    parser.add_argument("--model-run", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    split = load_task("safepersuasion")
    expected = make_holdout_records(split)
    events = read_events(args.events_file)
    if not events:
        raise ValueError("no Jev events")
    dataset_sha = sha256_bytes(SAFE_CSV.read_bytes())
    if {row.get("dataset_sha256") for row in events} != {dataset_sha}:
        raise ValueError("Jev events use different dataset contents")
    if len({row.get("prompt_sha256") for row in events}) != 1:
        raise ValueError("Jev request prompt changed within experiment")
    latest = select_latest_responses(expected, events)
    if len(latest) != len(expected):
        raise ValueError(f"Jev responses incomplete: {len(latest)}/{len(expected)}")
    manifest = json.loads((args.model_run / "manifest.json").read_text(encoding="utf-8"))
    if manifest["dataset_sha256"] != dataset_sha:
        raise ValueError("downstream model used different dataset contents")
    with (args.model_run / "test_predictions.csv").open(encoding="utf-8", newline="") as handle:
        model_rows = list(csv.DictReader(handle))
    if [row["id"] for row in model_rows] != manifest["split"]["test_ids"]:
        raise ValueError("downstream prediction IDs differ from manifest")
    joined = combine_predictions(list(latest.values()), model_rows, threshold=0.85)
    y = [row["true_label"] for row in joined]
    passed = [row for row in joined if row["passed_gate"]]
    attacks = [row for row in joined if row["true_label"] == 1]
    benign = [row for row in joined if row["true_label"] == 0]
    attack_passes = sum(row["passed_gate"] for row in attacks)
    benign_passes = sum(row["passed_gate"] for row in benign)
    results = {
        "test_size": len(joined),
        "test_ids_match_model_manifest": True,
        "dataset_sha256": dataset_sha,
        "jev_prompt_sha256": events[0]["prompt_sha256"],
        "jev_model_snapshots": sorted({str(row["model"]) for row in latest.values()}),
        "gate_threshold": 0.85,
        "gate_pass_total": len(passed),
        "gate_pass_rate": len(passed) / len(joined),
        "gate_pass_benign": benign_passes,
        "gate_pass_benign_rate": benign_passes / len(benign),
        "gate_pass_attacks": attack_passes,
        "gate_pass_attacks_rate": attack_passes / len(attacks),
        "attack_hold_rate": 1 - attack_passes / len(attacks),
        "attack_hold_exact_ci95": exact_binomial_ci(len(attacks) - attack_passes, len(attacks)),
        "jev_total_cost_usd": sum(row["jev_cost_usd"] for row in joined),
        "jev_cost_per_1000_usd": sum(row["jev_cost_usd"] for row in joined) / len(joined) * 1000,
        "metrics": {
            name: {key: value for key, value in score(y, [row[column] for row in joined]).items() if key != "report"}
            for name, column in (
                ("svm", "svm_pred"),
                ("distilbert", "model_pred"),
                ("jev_choice", "jev_choice_pred"),
                ("jev_gate_plus_svm", "cascade_svm_pred"),
                ("jev_gate_plus_distilbert", "cascade_model_pred"),
            )
        },
        "interpretation_note": "Jev gate saves downstream calls, not necessarily end-to-end dollars or latency; 23 test items appeared in the earlier Jev pilot.",
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "summary.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    with (args.output_dir / "paired_predictions.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(joined[0]))
        writer.writeheader()
        writer.writerows(joined)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
