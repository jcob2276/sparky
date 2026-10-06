"""Contracts for the live, paired Jev→DistilBERT benchmark."""

from __future__ import annotations

import pytest
import importlib
import json

from src.benchmark_cascade import run_one


def test_safe_gate_bypasses_downstream_but_baseline_is_measured() -> None:
    calls = []
    ticks = iter([0.0, 0.010, 0.020, 0.030, 0.040, 0.050])

    def infer(text):
        calls.append(text)
        return 1

    row = run_one(
        {"dataset_id": "safe_1", "text": "example", "text_sha256": "hash", "label": "Rational Persuasion"},
        lambda *_: {"jev_choice": "safe", "confidence": 0.99, "cost_usd": 0.001,
                    "model": "fixed-snapshot", "error": ""},
        infer, 0.98, lambda: next(ticks), "key", "fixed-snapshot",
    )
    assert calls == ["example"]
    assert row["baseline_pred"] == 1
    assert row["cascade_pred"] == 0
    assert row["passed_gate"] is True
    assert row["baseline_latency_ms"] == pytest.approx(10)
    assert row["cascade_latency_ms"] == pytest.approx(20)
    assert "text" not in row


def test_held_attack_runs_model_and_rejects_snapshot_change() -> None:
    ticks = iter([0.0, 0.010, 0.020, 0.030, 0.040, 0.050, 0.060, 0.070])
    row = run_one(
        {"dataset_id": "safe_2", "text": "attack", "text_sha256": "hash2", "label": "Manipulation"},
        lambda *_: {"jev_choice": "manipulation", "confidence": 0.99, "cost_usd": 0.002,
                    "model": "fixed-snapshot", "error": ""},
        lambda _: 1, 0.98, lambda: next(ticks), "key", "fixed-snapshot",
    )
    assert row["passed_gate"] is False
    assert row["cascade_pred"] == 1
    assert row["cascade_latency_ms"] == pytest.approx(40)
    with pytest.raises(ValueError, match="snapshot"):
        run_one(
            {"dataset_id": "safe_2", "text": "attack", "text_sha256": "hash2", "label": "Manipulation"},
            lambda *_: {"jev_choice": "safe", "confidence": 0.99, "cost_usd": 0.002,
                        "model": "changed", "error": ""},
            lambda _: 1, 0.98, lambda: iter([0.0, 1.0, 2.0]).__next__(), "key", "fixed-snapshot",
        )


def test_jev_error_fails_closed_without_pretending_complete_measurement() -> None:
    ticks = iter([0.0, 0.010, 0.020, 0.030])
    with pytest.raises(RuntimeError, match="Jev failed"):
        run_one(
            {"dataset_id": "safe_3", "text": "example", "text_sha256": "hash3", "label": "Manipulation"},
            lambda *_: {"error": "HTTP 529", "model": "", "cost_usd": None},
            lambda _: 0, 0.98, lambda: next(ticks), "key", "fixed-snapshot",
        )


def test_failed_snapshot_still_records_paid_response_without_secrets(tmp_path) -> None:
    module = importlib.import_module("src.benchmark_cascade")
    attempts = tmp_path / "attempts.jsonl"
    ticks = iter([0.0, 0.01, 0.02, 0.03])
    with pytest.raises(ValueError, match="snapshot"):
        module.run_one_audited(
            {"dataset_id": "safe_1", "text": "private message", "text_sha256": "hash", "label": "Manipulation"},
            lambda *_: {"jev_choice": "safe", "confidence": 0.99, "cost_usd": 0.002,
                        "input_tokens": 10, "model": "changed-snapshot", "error": ""},
            lambda _: 0, 0.98, lambda: next(ticks), "secret-key", "fixed-snapshot", attempts,
        )
    event = json.loads(attempts.read_text(encoding="utf-8"))
    assert event["dataset_id"] == "safe_1"
    assert event["cost_usd"] == 0.002
    assert event["model"] == "changed-snapshot"
    assert event["measurement_completed"] is False
    assert "private message" not in attempts.read_text(encoding="utf-8")
    assert "secret-key" not in attempts.read_text(encoding="utf-8")


def test_resume_rejects_changed_checkpoint_or_threshold_before_calls(tmp_path) -> None:
    module = importlib.import_module("src.benchmark_cascade")
    context = {"weights_sha256": "weights-1", "threshold_sha256": "threshold-1"}
    module.freeze_run_context(tmp_path, context)
    module.freeze_run_context(tmp_path, dict(context))
    for changed in ({**context, "weights_sha256": "weights-2"},
                    {**context, "threshold_sha256": "threshold-2"}):
        with pytest.raises(ValueError, match="context"):
            module.freeze_run_context(tmp_path, changed)
    assert json.loads((tmp_path / "run_context.json").read_text(encoding="utf-8")) == context


@pytest.mark.parametrize("filename", ["events.jsonl", "api_attempts.jsonl"])
def test_resume_refuses_unattributed_old_events(tmp_path, filename) -> None:
    module = importlib.import_module("src.benchmark_cascade")
    (tmp_path / filename).write_text('{"id":"safe_1"}\n', encoding="utf-8")
    with pytest.raises(ValueError, match="context"):
        module.freeze_run_context(tmp_path, {"weights_sha256": "weights-1"})
    assert not (tmp_path / "run_context.json").exists()


def test_audit_write_does_not_enter_request_latency(tmp_path) -> None:
    module = importlib.import_module("src.benchmark_cascade")
    ticks = iter([0.0, 0.01, 0.02, 0.03, 0.04])
    attempts = tmp_path / "attempts.jsonl"
    row = module.run_one_audited(
        {"dataset_id": "safe_1", "text": "example", "text_sha256": "hash", "label": "Rational Persuasion"},
        lambda *_: {"jev_choice": "safe", "confidence": 0.99, "cost_usd": 0.001,
                    "input_tokens": 10, "model": "fixed-snapshot", "error": ""},
        lambda _: 1, 0.98, lambda: next(ticks), "key", "fixed-snapshot", attempts,
    )
    assert row["cascade_latency_ms"] == pytest.approx(20)
    assert json.loads(attempts.read_text(encoding="utf-8"))["measurement_completed"] is True


def test_transport_exception_leaves_unknown_cost_attempt(tmp_path) -> None:
    module = importlib.import_module("src.benchmark_cascade")
    ticks = iter([0.0, 0.01, 0.02])
    attempts = tmp_path / "attempts.jsonl"

    def disconnected(*_):
        raise RuntimeError("transport disconnected")

    with pytest.raises(RuntimeError, match="transport"):
        module.run_one_audited(
            {"dataset_id": "safe_1", "text": "example", "text_sha256": "hash", "label": "Manipulation"},
            disconnected, lambda _: 0, 0.98, lambda: next(ticks), "key", "fixed-snapshot", attempts,
        )
    event = json.loads(attempts.read_text(encoding="utf-8"))
    assert event["response_received"] is False
    assert event["cost_usd"] is None
    assert event["api_error"] is True
