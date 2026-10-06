import csv
import json
import tempfile
import unittest
from pathlib import Path

from src.analyze_seconvo_window_transformer import load_window_run, rank_metrics


class AnalyzeSeconvoWindowTransformerTests(unittest.TestCase):
    def test_rank_metrics_detect_perfect_probability_order(self):
        result = rank_metrics([0, 1], [0.1, 0.9])
        self.assertEqual(result["roc_auc"], 1.0)
        self.assertEqual(result["average_precision"], 1.0)

    def test_saved_metrics_are_recomputed_from_matching_dialogue_ids(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            manifest = {
                "split": {"n_test": 2, "test_ids": ["a", "b"]},
                "results": {"f1_macro": 1.0},
            }
            (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            with (root / "test_predictions.csv").open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=["id", "true_label", "model_pred", "model_p1"])
                writer.writeheader()
                writer.writerows([
                    {"id": "a", "true_label": 0, "model_pred": 0, "model_p1": 0.1},
                    {"id": "b", "true_label": 1, "model_pred": 1, "model_p1": 0.9},
                ])
            _, predictions, probabilities = load_window_run(root, ["a", "b"], [0, 1])
            self.assertEqual(predictions, [0, 1])
            self.assertEqual(probabilities, [0.1, 0.9])
            manifest["results"]["f1_macro"] = 0.5
            (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "F1"):
                load_window_run(root, ["a", "b"], [0, 1])


if __name__ == "__main__":
    unittest.main()
