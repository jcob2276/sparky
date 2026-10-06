import unittest

from src.analyze_seconvo_lengths import summarize_lengths


class FakeTokenizer:
    def encode(self, text):
        return type("Encoding", (), {"ids": [1] * int(text)})()


class AnalyzeSeconvoLengthsTests(unittest.TestCase):
    def test_counts_and_class_breakdown_are_computed_before_truncation(self):
        result = summarize_lengths(["4", "6", "10"], [0, 1, 1], FakeTokenizer(), limit=5)
        self.assertEqual(result["n"], 3)
        self.assertEqual(result["median_tokens"], 6)
        self.assertEqual(result["n_over_limit"], 2)
        self.assertAlmostEqual(result["tokens_after_limit_fraction"], 6 / 20)
        self.assertEqual(result["class_0"]["n_over_limit"], 0)
        self.assertEqual(result["class_1"]["n_over_limit"], 2)


if __name__ == "__main__":
    unittest.main()
