import csv
import json
import tempfile
import unittest
from pathlib import Path

from src.analyze_seconvo_official import load_official_run


class AnalyzeSeconvoTests(unittest.TestCase):
    def test_saved_metrics_must_match_per_dialogue_predictions(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            run_dir = Path(temp_dir)
            manifest = {
                "sources": {"train_sha256": "train", "test_sha256": "test", "script_sha256": "script"},
                "split": {"n_train": 40, "n_test": 2, "test_ids": ["a", "b"]},
                "configuration": {"model": "bert-base-uncased", "seed": 42},
                "results": {"svm": {"f1_macro": 1 / 3}, "transformer": {"f1_macro": 1.0}},
            }
            (run_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            with (run_dir / "test_predictions.csv").open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=["id", "true_label", "svm_pred", "model_pred"])
                writer.writeheader()
                writer.writerows([
                    {"id": "a", "true_label": 0, "svm_pred": 0, "model_pred": 0},
                    {"id": "b", "true_label": 1, "svm_pred": 0, "model_pred": 1},
                ])
            result = load_official_run(run_dir)
            self.assertEqual(result["n_test"], 2)
            self.assertEqual(result["model_f1_macro"], 1.0)
            manifest["results"]["transformer"]["f1_macro"] = 0.5
            (run_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "F1"):
                load_official_run(run_dir)


if __name__ == "__main__":
    unittest.main()
