import csv
import json
import tempfile
import unittest
from pathlib import Path

from src.research_run import prepare_partition, write_predictions
from src.analyze_repeats import compare_predictions, paired_bootstrap_ci


class ResearchRunTests(unittest.TestCase):
    def test_validation_partition_is_stratified_reproducible_and_disjoint(self):
        labels = [0] * 20 + [1] * 20
        ids = [f"item-{i}" for i in range(40)]

        train, validation = prepare_partition(labels, ids, seed=42, validation_size=0.2)

        self.assertEqual((len(train), len(validation)), (32, 8))
        self.assertEqual(sum(labels[i] for i in validation), 4)
        self.assertFalse(set(train) & set(validation))
        self.assertEqual(set(train) | set(validation), set(range(40)))
        self.assertEqual((train, validation), prepare_partition(labels, ids, seed=42, validation_size=0.2))

    def test_predictions_preserve_ids_and_true_labels(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "predictions.csv"
            write_predictions(
                target,
                ids=["a", "b"],
                true_labels=[0, 1],
                svm_predictions=[0, 0],
                model_predictions=[0, 1],
                model_probabilities=[0.1, 0.8],
            )
            with target.open(newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]["id"], "a")
            self.assertEqual(rows[1]["true_label"], "1")
            self.assertEqual(rows[1]["model_pred"], "1")
            self.assertEqual(rows[1]["model_p1"], "0.8")

    def test_paired_comparison_counts_discordant_errors(self):
        result = compare_predictions(
            true_labels=[0, 0, 1, 1],
            baseline_predictions=[0, 1, 0, 1],
            model_predictions=[0, 0, 1, 1],
        )
        self.assertEqual(result["only_baseline_correct"], 0)
        self.assertEqual(result["only_model_correct"], 2)
        self.assertEqual(result["mcnemar_exact_p"], 0.5)

    def test_identical_predictions_have_zero_paired_delta(self):
        lo, hi = paired_bootstrap_ci(
            true_labels=[0, 0, 1, 1],
            baseline_predictions=[0, 1, 0, 1],
            model_predictions=[0, 1, 0, 1],
            replicates=100,
            seed=7,
        )
        self.assertEqual((lo, hi), (0.0, 0.0))


if __name__ == "__main__":
    unittest.main()
