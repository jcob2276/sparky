import unittest

from src.analyze_phishing import validate_and_pair, select_seed_by_validation


class PhishingAnalysisTests(unittest.TestCase):
    def test_rejects_prediction_id_mismatch_before_scoring(self):
        expected = [{"id": "a", "label": 0}, {"id": "b", "label": 1}]
        saved = [
            {"id": "a", "true_label": "0", "svm_pred": "0", "model_pred": "0"},
            {"id": "wrong", "true_label": "1", "svm_pred": "0", "model_pred": "1"},
        ]
        with self.assertRaisesRegex(ValueError, "ID"):
            validate_and_pair(expected, [0, 0], saved)

    def test_selects_seed_only_from_validation_not_test(self):
        runs = {
            42: {"validation_f1_macro": 0.8, "test_f1_macro": 0.99},
            43: {"validation_f1_macro": 0.9, "test_f1_macro": 0.7},
        }
        self.assertEqual(select_seed_by_validation(runs), 43)


if __name__ == "__main__":
    unittest.main()
