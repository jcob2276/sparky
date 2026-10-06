import unittest

from src.audit_edge_cases import normalized_overlap_stats


class DatasetAuditTests(unittest.TestCase):
    def test_normalized_overlap_and_label_conflict(self):
        result = normalized_overlap_stats(
            ["Hello,  World!", "Safe message"],
            [0, 0],
            ["hello world", "SAFE   MESSAGE", "Different"],
            [0, 1, 1],
        )
        self.assertEqual(result["cross_split_normalized_values"], 2)
        self.assertEqual(result["cross_split_label_conflicts"], 1)


if __name__ == "__main__":
    unittest.main()
