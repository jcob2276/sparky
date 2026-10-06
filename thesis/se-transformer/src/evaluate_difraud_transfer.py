"""Frozen cross-corpus evaluation on the audited DIFrauD phishing subset."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path

from src.research_phishing import (
    load_frozen_phishing_split,
    predict_frozen_transformer,
    prepare_external_holdout,
    rebuild_verified_svm,
    write_external_evaluation_artifacts,
)


SOURCE_REVISION = "aaaf94b336c563a14806bb4f3f58727bed9ed8d4"
SOURCE_SHA256 = {
    "train": "a3d65b3fbf2178640a6e0e756349da95f3f10bddf3fac2f205bb3e1aecb9aaf7",
    "validation": "321649644c01a0d5523c2c2cec164e0b2a1916196553b4f1fc5be902528b8470",
    "test": "a74a0eaef001d0d90dd7db6519a00213cd1bf99b18c06bf5ffc23f2044e5a068",
}
MODEL_SHA256 = "7e12ad2c31d9764cfd2d1c391ec1406fd2b9fcb898ef93930c94fc5e30c587fd"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def run(source_dir: Path, local_source: Path, local_dir: Path, output_dir: Path,
        batch_size: int = 16, cpu_threads: int = 4) -> dict:
    if output_dir.exists():
        raise FileExistsError(f"refusing to overwrite: {output_dir}")
    if cpu_threads < 1:
        raise ValueError("cpu_threads must be positive")
    started_at = datetime.now(timezone.utc)
    source_files = {name: source_dir / f"{name}.jsonl" for name in SOURCE_SHA256}
    for name, path in source_files.items():
        if sha256(path) != SOURCE_SHA256[name]:
            raise ValueError(f"DIFrauD {name} checksum mismatch")

    local_split_file = local_dir / "split.json"
    baseline_file = local_dir / "manifest.json"
    local_split = load_frozen_phishing_split(local_split_file, baseline_file)
    baseline = json.loads(baseline_file.read_text(encoding="utf-8"))
    if sha256(local_source) != baseline["source_sha256"]:
        raise ValueError("local source checksum mismatch")
    source_rows = json.loads(local_source.read_text(encoding="utf-8"))
    foreign = {name: read_jsonl(path) for name, path in source_files.items()}
    external_rows, filter_audit = prepare_external_holdout(
        source_rows, foreign["train"], foreign["validation"], foreign["test"]
    )
    if filter_audit != {
        "raw_test_rows": 1528, "local_overlap": 21, "prior_split_overlap": 57,
        "within_test_duplicate": 2, "empty_visible_text": 0,
        "retained_rows": 1448, "class_counts": {0: 891, 1: 557},
    }:
        raise ValueError(f"unexpected holdout composition: {filter_audit}")

    started_svm = time.perf_counter()
    svm = rebuild_verified_svm(local_split, baseline["svm"])
    svm_refit_seconds = time.perf_counter() - started_svm
    started_svm_inference = time.perf_counter()
    svm_predictions = svm.predict([row["text"] for row in external_rows]).tolist()
    svm_inference_seconds = time.perf_counter() - started_svm_inference
    print(f"SVM reconstructed; external predictions: {len(svm_predictions)}", flush=True)

    model_dir = local_dir / "selected_model_seed45"
    model_file = model_dir / "model.safetensors"
    if sha256(model_file) != MODEL_SHA256:
        raise ValueError("selected DistilBERT checksum mismatch")
    import torch
    import transformers
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    torch.set_num_threads(cpu_threads)
    tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir, local_files_only=True)
    model.to("cpu")
    print("DistilBERT loaded; checking archived local test predictions", flush=True)
    local_predictions, _, local_check_seconds = predict_frozen_transformer(
        model, tokenizer, [row["text"] for row in local_split["test"]], batch_size=batch_size
    )
    with (local_dir / "seed-45" / "test_predictions.csv").open(encoding="utf-8", newline="") as handle:
        archived = list(csv.DictReader(handle))
    if len(archived) != len(local_split["test"]):
        raise ValueError("archived local test row count mismatch")
    for index, (row, old, prediction) in enumerate(zip(local_split["test"], archived, local_predictions)):
        if (row["id"] != old["id"] or row["label"] != int(old["true_label"])
                or prediction != int(old["model_pred"])):
            raise ValueError(f"checkpoint reconstruction mismatch at local test row {index}")
    print(f"Checkpoint matches all {len(archived)} archived local test predictions", flush=True)

    transformer_predictions, probabilities, transformer_inference_seconds = predict_frozen_transformer(
        model, tokenizer, [row["text"] for row in external_rows], batch_size=batch_size
    )
    metadata = {
        "experiment": "difraud_phishing_external_transfer_v1",
        "started_at_utc": started_at.isoformat(),
        "finished_at_utc": datetime.now(timezone.utc).isoformat(),
        "interpretation": "cross-corpus transfer on provided labels, not verified real-world phishing detection",
        "source_revision": SOURCE_REVISION,
        "source_sha256": SOURCE_SHA256,
        "local_source_sha256": baseline["source_sha256"],
        "local_split_sha256": baseline["split_sha256"],
        "baseline_manifest_sha256": sha256(baseline_file),
        "selected_model_sha256": MODEL_SHA256,
        "script_sha256": sha256(Path(__file__)),
        "text_policy": "first 4096 characters for both models; DistilBERT max 256 tokens",
        "filter_audit": filter_audit,
        "model_validation": f"{len(archived)} local test predictions matched archived seed-45 CSV",
        "environment": {"python": platform.python_version(), "torch": torch.__version__,
                        "transformers": transformers.__version__, "cpu_threads": cpu_threads},
        "timing_seconds": {
            "svm_refit": svm_refit_seconds,
            "svm_external_inference": svm_inference_seconds,
            "transformer_local_checkpoint_check": local_check_seconds,
            "transformer_external_inference": transformer_inference_seconds,
        },
    }
    manifest = write_external_evaluation_artifacts(
        external_rows, svm_predictions, transformer_predictions, probabilities, output_dir, metadata
    )
    print(json.dumps({"retained_rows": len(external_rows), "metrics": manifest["metrics"]}, indent=2), flush=True)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--local-source", type=Path, required=True)
    parser.add_argument("--local-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--cpu-threads", type=int, default=4)
    args = parser.parse_args()
    run(args.source_dir, args.local_source, args.local_dir, args.output_dir,
        batch_size=args.batch_size, cpu_threads=args.cpu_threads)


if __name__ == "__main__":
    main()
