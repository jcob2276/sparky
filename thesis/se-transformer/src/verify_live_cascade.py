"""Independently verify saved live cascade events and derive economic checks."""
from __future__ import annotations

import csv
import hashlib
import json
import math
import statistics
from pathlib import Path

from scipy.stats import beta, binomtest
from sklearn.metrics import confusion_matrix, f1_score

from src.data_load import load_task
from src.jev_fresh_holdout import make_protocol_records
from src.paths import ROOT, SAFE_CSV


def main() -> None:
    folder = ROOT / "outputs" / "jev_live_e2e_20260930"
    original = ROOT / "outputs" / "jev_fresh_20260930"
    rows = [json.loads(line) for line in (folder / "events.jsonl").read_text(encoding="utf-8").splitlines()]
    summary = json.loads((folder / "summary.json").read_text(encoding="utf-8"))
    receipt = json.loads((folder / "cost_receipt.json").read_text(encoding="utf-8"))
    setup = json.loads((folder / "run_setup.json").read_text(encoding="utf-8"))
    measured_source_sha = hashlib.sha256((folder / setup["measured_source_path"]).read_bytes()).hexdigest()
    assert measured_source_sha == setup["measured_source_sha256"]
    assert hashlib.sha256((folder / setup["measured_launcher_path"]).read_bytes()).hexdigest() == setup["measured_launcher_sha256"]
    protocol = json.loads((original / "protocol.json").read_text(encoding="utf-8"))
    threshold = json.loads((original / "threshold.json").read_text(encoding="utf-8"))
    expected = make_protocol_records(load_task("safepersuasion"), protocol["partition"], "test")
    with (original / "a40_seed45" / "test_predictions.csv").open(encoding="utf-8", newline="") as handle:
        saved = list(csv.DictReader(handle))
    assert len(rows) == len(expected) == len(saved) == 215
    assert len({row["id"] for row in rows}) == 215
    assert not set(protocol["partition"]["test_ids"]) & (set(protocol["partition"]["train_ids"]) | set(protocol["partition"]["validation_ids"]))
    assert [row["id"] for row in rows] == [row["dataset_id"] for row in expected]
    assert summary["dataset_sha256"] == hashlib.sha256(SAFE_CSV.read_bytes()).hexdigest()
    assert summary["protocol_sha256"] == hashlib.sha256((original / "protocol.json").read_bytes()).hexdigest()
    assert summary["model_weights_sha256"] == hashlib.sha256((original / "a40_seed45" / "model" / "model.safetensors").read_bytes()).hexdigest()
    assert summary["prompt_sha256"] == hashlib.sha256((ROOT / "src" / "jev_triage_verify.py").read_bytes()).hexdigest()
    for row, record, prior in zip(rows, expected, saved, strict=True):
        assert row["text_sha256"] == record["text_sha256"]
        assert row["true_label"] == int(prior["true_label"]) == (record["label"] == "Manipulation")
        assert row["baseline_pred"] == int(prior["model_pred"])
        assert row["jev_model"] == threshold["jev_snapshot"]
        bypass = row["jev_choice"] == "safe" and row["jev_confidence"] >= threshold["selection"]["threshold"]
        assert row["passed_gate"] == bypass
        assert row["cascade_pred"] == (0 if bypass else row["baseline_pred"])
        for field in ("baseline_latency_ms", "cascade_latency_ms", "cascade_model_latency_ms", "jev_latency_ms", "jev_cost_usd"):
            assert math.isfinite(row[field]) and row[field] >= 0
        assert row["cascade_latency_ms"] + 1e-6 >= row["jev_latency_ms"] + row["cascade_model_latency_ms"]
        assert "text" not in row
    y = [row["true_label"] for row in rows]
    baseline = [row["baseline_pred"] for row in rows]
    cascade = [row["cascade_pred"] for row in rows]
    for field, predictions in (("baseline_f1_macro", baseline), ("cascade_f1_macro", cascade)):
        assert math.isclose(summary[field], f1_score(y, predictions, average="macro"), abs_tol=1e-12)
    api_cost = sum(row["jev_cost_usd"] for row in rows)
    assert math.isclose(summary["jev_api_cost_usd"], api_cost, abs_tol=1e-12)
    for prefix in ("baseline", "cascade", "jev"):
        timings = sorted(row[f"{prefix}_latency_ms"] for row in rows)
        assert math.isclose(summary["latency_ms"][f"{prefix}_median"], statistics.median(timings), abs_tol=1e-9)
        assert math.isclose(summary["latency_ms"][f"{prefix}_p95"], timings[math.ceil(0.95 * len(rows)) - 1], abs_tol=1e-9)
    missed = sum(row["passed_gate"] and row["true_label"] == 1 for row in rows)
    attacks = sum(y)
    bypassed = sum(row["passed_gate"] for row in rows)
    only_baseline = sum(a == gold and b != gold for gold, a, b in zip(y, baseline, cascade, strict=True))
    only_cascade = sum(a != gold and b == gold for gold, a, b in zip(y, baseline, cascade, strict=True))
    p = binomtest(min(only_baseline, only_cascade), only_baseline + only_cascade, p=0.5).pvalue if only_baseline + only_cascade else 1.0
    assert math.isclose(summary["paired_quality"]["mcnemar_exact_p"], p)
    old = {row["dataset_id"]: row for row in [json.loads(line) for line in (original / "jev_test.jsonl").read_text(encoding="utf-8").splitlines()]}
    rate = summary["gpu_list_rate_usd_per_hour"]
    result = {
        "checks_passed": True,
        "n": len(rows),
        "attack_count": attacks,
        "missed_attacks": missed,
        "miss_rate": missed / attacks,
        "miss_rate_exact_ci95": [float(beta.ppf(0.025, missed, attacks - missed + 1)), float(beta.ppf(0.975, missed + 1, attacks - missed))],
        "gate_missed_attacks_baseline_would_catch": sum(row["passed_gate"] and row["true_label"] == 1 and row["baseline_pred"] == 1 for row in rows),
        "baseline_confusion_matrix": confusion_matrix(y, baseline, labels=[0, 1]).tolist(),
        "cascade_confusion_matrix": confusion_matrix(y, cascade, labels=[0, 1]).tolist(),
        "mcnemar_exact_p": float(p),
        "bypassed": bypassed,
        "bypass_rate": bypassed / len(rows),
        "jev_choice_changes_from_prior_test": sum(row["jev_choice"] != old[row["id"]]["jev_choice"] for row in rows),
        "jev_gate_changes_from_prior_test": sum(row["passed_gate"] != (old[row["id"]]["jev_choice"] == "safe" and old[row["id"]]["confidence"] >= 0.98) for row in rows),
        "jev_api_cost_usd": api_cost,
        "api_key_usage_delta_usd": receipt["openrouter_key_usage_after_usd"] - receipt["openrouter_key_usage_before_usd"],
        "api_cost_matches_key_usage_delta": math.isclose(api_cost, receipt["openrouter_key_usage_after_usd"] - receipt["openrouter_key_usage_before_usd"], abs_tol=1e-12),
        "baseline_model_seconds": sum(row["baseline_latency_ms"] for row in rows) / 1000,
        "cascade_model_seconds": sum(row["cascade_model_latency_ms"] for row in rows) / 1000,
        "analytical_cascade_model_time_plus_jev_usd": api_cost + sum(row["cascade_model_latency_ms"] for row in rows) / 3_600_000 * rate,
        "break_even_marginal_downstream_cost_usd": api_cost / bypassed,
        "baseline_average_model_time_cost_usd": sum(row["baseline_latency_ms"] for row in rows) / 3_600_000 * rate / len(rows),
        "median_latency_ratio_cascade_over_baseline": summary["latency_ms"]["cascade_median"] / summary["latency_ms"]["baseline_median"],
        "fixed_order_caveat": "Baseline always precedes cascade; one serial pass on one warm A40, not a production concurrency or SLA test.",
        "source_script_sha256": measured_source_sha,
        "events_sha256": hashlib.sha256((folder / "events.jsonl").read_bytes()).hexdigest(),
        "summary_sha256": hashlib.sha256((folder / "summary.json").read_bytes()).hexdigest(),
    }
    (folder / "verification.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
