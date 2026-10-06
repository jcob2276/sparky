import unittest

from src.analyze_jev import combine_predictions


class AnalyzeJevTests(unittest.TestCase):
    def test_safe_high_confidence_bypasses_downstream_model(self):
        jev = [
            {"dataset_id": "a", "true_label": "Manipulation", "jev_choice": "safe", "confidence": 0.9, "cost_usd": 0.01, "latency_ms": 10, "error": ""},
            {"dataset_id": "b", "true_label": "Rational Persuasion", "jev_choice": "safe", "confidence": 0.9, "cost_usd": 0.01, "latency_ms": 10, "error": ""},
            {"dataset_id": "c", "true_label": "Manipulation", "jev_choice": "manipulation", "confidence": 0.7, "cost_usd": 0.01, "latency_ms": 10, "error": ""},
            {"dataset_id": "d", "true_label": "Rational Persuasion", "jev_choice": "safe", "confidence": 0.4, "cost_usd": 0.01, "latency_ms": 10, "error": ""},
        ]
        downstream = [
            {"id": "a", "true_label": "1", "model_pred": "1", "svm_pred": "1"},
            {"id": "b", "true_label": "0", "model_pred": "1", "svm_pred": "1"},
            {"id": "c", "true_label": "1", "model_pred": "1", "svm_pred": "1"},
            {"id": "d", "true_label": "0", "model_pred": "1", "svm_pred": "1"},
        ]
        rows = combine_predictions(jev, downstream, threshold=0.85)
        self.assertEqual([row["cascade_model_pred"] for row in rows], [0, 0, 1, 1])
        self.assertEqual([row["passed_gate"] for row in rows], [True, True, False, False])

    def test_mismatched_gold_label_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "label"):
            combine_predictions(
                [{"dataset_id": "a", "true_label": "Manipulation", "jev_choice": "safe", "confidence": 0.9, "error": ""}],
                [{"id": "a", "true_label": "0", "model_pred": "0", "svm_pred": "0"}],
                threshold=0.85,
            )


if __name__ == "__main__":
    unittest.main()
