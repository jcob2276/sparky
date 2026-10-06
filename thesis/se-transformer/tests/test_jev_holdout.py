import unittest

from src.data_load import Split
from src.jev_holdout import make_holdout_records, select_latest_responses


class JevHoldoutTests(unittest.TestCase):
    def test_only_test_partition_is_sent_to_jev(self):
        split = Split(
            task="safepersuasion",
            texts_train=["do not send this"],
            y_train=[1],
            texts_test=["a safe comment", "a manipulative comment"],
            y_test=[0, 1],
            ids_train=["train-1"],
            ids_test=["test-1", "test-2"],
        )
        records = make_holdout_records(split)
        self.assertEqual([record["dataset_id"] for record in records], ["test-1", "test-2"])
        self.assertEqual([record["label"] for record in records], ["Rational Persuasion", "Manipulation"])
        self.assertTrue(all("do not send this" not in record["text"] for record in records))

    def test_resume_uses_latest_success_without_discarding_a_pending_error(self):
        records = [
            {"dataset_id": "a", "text_sha256": "sha-a"},
            {"dataset_id": "b", "text_sha256": "sha-b"},
        ]
        events = [
            {"dataset_id": "a", "text_sha256": "sha-a", "error": "HTTP 529"},
            {"dataset_id": "a", "text_sha256": "sha-a", "error": "", "jev_choice": "safe"},
            {"dataset_id": "b", "text_sha256": "sha-b", "error": "HTTP 529"},
        ]
        latest = select_latest_responses(records, events)
        self.assertEqual(latest["a"]["jev_choice"], "safe")
        self.assertNotIn("b", latest)

    def test_resume_rejects_stale_dataset_text(self):
        with self.assertRaisesRegex(ValueError, "hash"):
            select_latest_responses(
                [{"dataset_id": "a", "text_sha256": "new"}],
                [{"dataset_id": "a", "text_sha256": "old", "error": ""}],
            )


if __name__ == "__main__":
    unittest.main()
