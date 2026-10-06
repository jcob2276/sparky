import csv
import json
import tempfile
import unittest
from pathlib import Path

from src.analyze_reament_con import summarize


class ReaMentConAnalysisTests(unittest.TestCase):
    def test_summary_joins_predictions_by_frozen_ids_and_selects_on_validation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "manifest.json").write_text(json.dumps({
                "dataset_sha256": "a" * 64,
                "split": {"test": {"ids": ["a", "b", "c", "d"]}},
                "results": {"svm": {"test": {"f1_macro": 0.7333333333333334}}},
            }), encoding="utf-8")
            with (root / "test_predictions.csv").open("w", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                writer.writerows([["id", "true_label", "svm_pred"], ["a", 0, 0],
                                  ["b", 0, 1], ["c", 1, 1], ["d", 1, 1]])
            for seed, validation, predictions in ((42, 0.6, [0, 0, 0, 1]),
                                                   (43, 0.8, [0, 0, 1, 1])):
                run = root / f"transformer_seed_{seed}"
                run.mkdir()
                (run / "manifest.json").write_text(json.dumps({
                    "source_sha256": "a" * 64,
                    "split_ids": {"test": ["a", "b", "c", "d"]},
                    "config": {"model_seed": seed},
                    "training": {"best_validation_f1_macro": validation, "seconds": 10},
                    "metrics": {"test": {"f1_macro": 0.7333333333333334 if seed == 42 else 1.0}},
                }), encoding="utf-8")
                with (run / "test_predictions.csv").open("w", newline="", encoding="utf-8") as handle:
                    writer = csv.writer(handle)
                    writer.writerow(["id", "true_label", "model_pred", "model_p1"])
                    writer.writerows((item, truth, pred, 0.5) for item, truth, pred in
                                     zip("abcd", [0, 0, 1, 1], predictions))

            result = summarize(root, seeds=[42, 43], bootstrap_replicates=100)
            self.assertEqual(result["selected_seed_by_validation"], 43)
            self.assertEqual(result["test_size"], 4)
            self.assertEqual(result["runs"]["43"]["test_f1_macro"], 1.0)

            with (root / "transformer_seed_43" / "test_predictions.csv").open("a", encoding="utf-8") as handle:
                handle.write("duplicate,0,0,0.5\n")
            with self.assertRaisesRegex(ValueError, "test IDs"):
                summarize(root, seeds=[42, 43], bootstrap_replicates=100)
