import csv
import json
import tempfile
import unittest
from pathlib import Path

from src.analyze_seconvo_windows import holm_adjust, read_verified_run


class AnalyzeSeconvoWindowsTests(unittest.TestCase):
    def test_holm_correction_handles_three_exploratory_comparisons(self):
        self.assertEqual(holm_adjust([0.01, 0.04, 0.03]), [0.03, 0.06, 0.06])

    def test_saved_metrics_must_match_each_dialogue_prediction(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            manifest = {
                "n_test": 2,
                "results": {
                    "full": {"f1_macro": 1 / 3},
                    "first": {"f1_macro": 1.0},
                    "last": {"f1_macro": 1 / 3},
                },
            }
            (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            with (root / "test_predictions.csv").open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(
                    handle,
                    fieldnames=["id", "true_label", "raw_tokens", "full_pred", "first_pred", "last_pred"],
                )
                writer.writeheader()
                writer.writerows([
                    {"id": "a", "true_label": 0, "raw_tokens": 5, "full_pred": 0, "first_pred": 0, "last_pred": 1},
                    {"id": "b", "true_label": 1, "raw_tokens": 7, "full_pred": 0, "first_pred": 1, "last_pred": 1},
                ])
            _, predictions = read_verified_run(root, ["a", "b"], [0, 1])
            self.assertEqual(predictions["first"], [0, 1])
            manifest["results"]["first"]["f1_macro"] = 0.5
            (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "F1"):
                read_verified_run(root, ["a", "b"], [0, 1])


if __name__ == "__main__":
    unittest.main()
