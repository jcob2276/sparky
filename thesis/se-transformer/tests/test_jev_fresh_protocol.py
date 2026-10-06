"""Contracts for a fresh, pilot-free SafePersuasion cascade evaluation."""

from __future__ import annotations

import importlib
import json
import math
import subprocess
import sys

from src.data_load import Split


def test_partition_excludes_old_test_and_pilot_without_overlap() -> None:
    protocol = importlib.import_module("src.jev_fresh_protocol")
    ids = [f"safe_{i}" for i in range(100)]
    split = Split(
        "safepersuasion",
        [f"text {i}" for i in range(80)],
        [i % 2 for i in range(80)],
        [f"text {i}" for i in range(80, 100)],
        [i % 2 for i in range(80, 100)],
        ids[:80],
        ids[80:],
    )
    first = protocol.make_fresh_partition(split, {"safe_0", "safe_1", "safe_90"})
    second = protocol.make_fresh_partition(split, {"safe_0", "safe_1", "safe_90"})
    assert first == second
    groups = [set(first[name]) for name in ("train_ids", "validation_ids", "test_ids")]
    assert not (groups[0] & groups[1] or groups[0] & groups[2] or groups[1] & groups[2])
    assert set.union(*groups) == set(ids[:80]) - {"safe_0", "safe_1"}
    assert not set.union(*groups) & set(ids[80:])
    assert all({int(item.split("_")[1]) % 2 for item in group} == {0, 1} for group in groups)


def test_threshold_uses_only_validation_labels_and_rejects_unsafe_bypass() -> None:
    protocol = importlib.import_module("src.jev_fresh_protocol")
    rows = [
        {"true_label": "Manipulation", "jev_choice": "manipulation", "confidence": 0.9, "error": ""}
        for _ in range(29)
    ]
    rows.append({"true_label": "Manipulation", "jev_choice": "safe", "confidence": 0.9, "error": ""})
    rows += [
        {"true_label": "Rational Persuasion", "jev_choice": "safe", "confidence": 0.95, "error": ""},
        {"true_label": "Rational Persuasion", "jev_choice": "safe", "confidence": 0.99, "error": ""},
    ]
    selection = protocol.choose_threshold(rows, max_miss_upper=0.1)
    assert selection["threshold"] == 0.95
    assert selection["validation_bypassed"] == 2
    assert selection["validation_attack_missed"] == 0
    assert selection["validation_attack_count"] == 30


def test_threshold_falls_back_to_no_bypass_when_validation_too_small() -> None:
    protocol = importlib.import_module("src.jev_fresh_protocol")
    rows = [
        {"true_label": "Manipulation", "jev_choice": "manipulation", "confidence": 0.9, "error": ""}
        for _ in range(10)
    ]
    rows.append({"true_label": "Rational Persuasion", "jev_choice": "safe", "confidence": 0.99, "error": ""})
    selection = protocol.choose_threshold(rows, max_miss_upper=0.1)
    assert math.isinf(selection["threshold"])
    assert selection["validation_bypassed"] == 0


def test_reconstructed_pilot_sample_matches_record_order() -> None:
    protocol = importlib.import_module("src.jev_fresh_protocol")
    assert protocol.pilot_ids(5, 2, seed=42) == {"safe_0", "safe_4"}


def test_real_partition_has_expected_frozen_counts() -> None:
    protocol = importlib.import_module("src.jev_fresh_protocol")
    from src.data_load import load_task
    from src.jev_triage_verify import load_records

    split = load_task("safepersuasion")
    pilot = protocol.pilot_ids(len(load_records()), 100, seed=42)
    partition = protocol.make_fresh_partition(split, pilot)
    assert [len(partition[name]) for name in ("train_ids", "validation_ids", "test_ids")] == [1002, 215, 215]
    assert not set(partition["test_ids"]) & pilot


def test_protocol_cli_freezes_auditable_partition_without_overwriting(tmp_path) -> None:
    output = tmp_path / "protocol.json"
    command = [sys.executable, "-m", "src.jev_fresh_protocol", "--output", str(output)]
    first = subprocess.run(command, capture_output=True, text=True, check=False)
    assert first.returncode == 0, first.stderr
    manifest = json.loads(output.read_text(encoding="utf-8"))
    assert manifest["dataset_sha256"] == "0a92e81c42018c1a7aa6efa283af8bbd2ce1031c6591f8e0db9292f03c0e1db8"
    assert manifest["counts"] == {"train": 1002, "validation": 215, "test": 215}
    assert manifest["selection_rule"]["max_miss_upper_95_one_sided"] == 0.1
    assert len(manifest["excluded_pilot_ids"]) == 100
    assert len(manifest["excluded_old_test_ids"]) == 378
    second = subprocess.run(command, capture_output=True, text=True, check=False)
    assert second.returncode != 0
    assert json.loads(output.read_text(encoding="utf-8")) == manifest


def test_trainer_rejects_protocol_with_old_test_or_pilot_leakage() -> None:
    from src.data_load import Split
    from src.research_run import resolve_protocol_partition

    split = Split("safepersuasion", ["a", "b", "c", "d"], [0, 1, 0, 1], ["e"], [1],
                  ["safe_0", "safe_1", "safe_2", "safe_3"], ["safe_4"])
    manifest = {
        "dataset_sha256": "abc",
        "excluded_pilot_ids": ["safe_0"],
        "excluded_old_test_ids": ["safe_4"],
        "partition": {"train_ids": ["safe_1"], "validation_ids": ["safe_2"], "test_ids": ["safe_3"]},
    }
    assert resolve_protocol_partition(split, manifest, "abc") == {"train": [1], "validation": [2], "test": [3]}
    manifest["partition"]["test_ids"] = ["safe_0"]
    try:
        resolve_protocol_partition(split, manifest, "abc")
    except ValueError as exc:
        assert "pilot" in str(exc)
    else:
        raise AssertionError("piloted ID must not enter the fresh test")
    manifest["partition"]["test_ids"] = ["safe_4"]
    try:
        resolve_protocol_partition(split, manifest, "abc")
    except ValueError as exc:
        assert "outer test" in str(exc)
    else:
        raise AssertionError("old test ID must not enter the fresh test")


def test_fresh_jev_records_follow_frozen_partition_order() -> None:
    runner = importlib.import_module("src.jev_fresh_holdout")
    split = Split("safepersuasion", ["hello", "attack", "safe"], [0, 1, 0],
                  ["old"], [1], ["safe_0", "safe_1", "safe_2"], ["safe_3"])
    partition = {"train_ids": ["safe_0"], "validation_ids": ["safe_2", "safe_1"], "test_ids": []}
    rows = runner.make_protocol_records(split, partition, "validation")
    assert [row["dataset_id"] for row in rows] == ["safe_2", "safe_1"]
    assert [row["label"] for row in rows] == ["Rational Persuasion", "Manipulation"]
    assert all("text_sha256" in row for row in rows)


def test_fresh_jev_threshold_refuses_incomplete_or_mixed_snapshots() -> None:
    runner = importlib.import_module("src.jev_fresh_holdout")
    rows = [
        {"dataset_id": "a", "true_label": "Manipulation", "jev_choice": "manipulation",
         "confidence": 0.8, "error": "", "model": "snapshot-1"},
        {"dataset_id": "b", "true_label": "Rational Persuasion", "jev_choice": "safe",
         "confidence": 0.9, "error": "", "model": "snapshot-1"},
    ]
    try:
        runner.freeze_threshold(rows, expected_count=3, protocol_sha="abc", prompt_sha="def")
    except ValueError as exc:
        assert "incomplete" in str(exc)
    else:
        raise AssertionError("incomplete validation must not freeze")
    rows[1]["model"] = "snapshot-2"
    try:
        runner.freeze_threshold(rows, expected_count=2, protocol_sha="abc", prompt_sha="def")
    except ValueError as exc:
        assert "snapshot" in str(exc)
    else:
        raise AssertionError("mixed snapshots must not freeze")


def test_paid_stage_event_log_is_resumable_and_contains_no_text(tmp_path) -> None:
    runner = importlib.import_module("src.jev_fresh_holdout")
    events_file = tmp_path / "events.jsonl"
    records = [
        {"dataset_id": "safe_1", "text": "private example one", "text_sha256": "hash1", "label": "Manipulation"},
        {"dataset_id": "safe_2", "text": "private example two", "text_sha256": "hash2", "label": "Rational Persuasion"},
    ]
    calls = []

    def fake_judge(index, text, label, api_key):
        calls.append(index)
        return {"id": index, "true_label": label, "jev_choice": "manipulation" if index == 0 else "safe",
                "confidence": 0.9, "latency_ms": 100, "cost_usd": 0.001,
                "input_tokens": 10, "model": "snapshot-1", "error": ""}

    first = runner.run_stage(records, events_file, "dataset-hash", "prompt-hash", "secret", fake_judge)
    second = runner.run_stage(records, events_file, "dataset-hash", "prompt-hash", "secret", fake_judge)
    assert calls == [0, 1]
    assert first == second
    logged = events_file.read_text(encoding="utf-8")
    assert "private example" not in logged
    assert [json.loads(line)["dataset_id"] for line in logged.splitlines()] == ["safe_1", "safe_2"]


def test_fresh_jev_cli_dry_run_requires_frozen_threshold_before_test(tmp_path) -> None:
    protocol = "outputs/jev_fresh_20260930/protocol.json"
    base = [sys.executable, "-m", "src.jev_fresh_holdout", "--protocol", protocol,
            "--events-file", str(tmp_path / "events.jsonl"),
            "--threshold-file", str(tmp_path / "threshold.json"), "--dry-run"]
    validation = subprocess.run(base + ["--stage", "validation"], capture_output=True, text=True, check=False)
    assert validation.returncode == 0, validation.stderr
    assert json.loads(validation.stdout)["expected_count"] == 215
    assert not (tmp_path / "events.jsonl").exists()
    test = subprocess.run(base + ["--stage", "test"], capture_output=True, text=True, check=False)
    assert test.returncode != 0
    assert "threshold" in test.stderr.lower()


def test_fresh_cascade_summary_counts_bypass_and_attack_risk() -> None:
    analysis = importlib.import_module("src.analyze_jev_fresh")
    joined = [
        {"true_label": 0, "passed_gate": True, "jev_cost_usd": 0.001, "jev_latency_ms": 100,
         "svm_pred": 0, "model_pred": 0, "cascade_svm_pred": 0, "cascade_model_pred": 0, "jev_choice_pred": 0},
        {"true_label": 1, "passed_gate": True, "jev_cost_usd": 0.001, "jev_latency_ms": 200,
         "svm_pred": 1, "model_pred": 1, "cascade_svm_pred": 0, "cascade_model_pred": 0, "jev_choice_pred": 0},
        {"true_label": 1, "passed_gate": False, "jev_cost_usd": 0.001, "jev_latency_ms": 300,
         "svm_pred": 0, "model_pred": 1, "cascade_svm_pred": 0, "cascade_model_pred": 1, "jev_choice_pred": 1},
        {"true_label": 0, "passed_gate": False, "jev_cost_usd": 0.001, "jev_latency_ms": 400,
         "svm_pred": 1, "model_pred": 1, "cascade_svm_pred": 1, "cascade_model_pred": 1, "jev_choice_pred": 1},
    ]
    result = analysis.summarize_joined(joined)
    assert result["test_size"] == 4
    assert result["gate_pass_total"] == 2
    assert result["gate_pass_attacks"] == 1
    assert result["gate_pass_benign"] == 1
    assert result["attack_hold_rate"] == 0.5
    assert result["jev_total_cost_usd"] == 0.004
    assert result["metrics"]["jev_gate_plus_distilbert"]["confusion_matrix"] == [[1, 1], [1, 1]]
    assert result["gate_missed_attacks_model_would_catch"] == 1
    assert result["paired_gate_vs_distilbert"]["only_baseline_correct"] == 1
