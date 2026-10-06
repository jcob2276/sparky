import unittest
import tempfile
import json
from pathlib import Path

from src.research_phishing import prepare_phishing_rows, split_phishing_rows, run_svm_baseline, write_baseline_artifacts, load_frozen_phishing_split
from src import research_phishing


class PhishingResearchTests(unittest.TestCase):
    def test_normalized_duplicates_stay_one_observation(self):
        rows = [
            {"text": "Pay now!", "label": 1},
            {"text": "pay, now", "label": 1},
            {"text": "Hello friend", "label": 0},
        ]
        prepared, audit = prepare_phishing_rows(rows, max_chars=4096)
        self.assertEqual(len(prepared), 2)
        self.assertEqual(audit["normalized_duplicate_rows"], 1)
        self.assertEqual([row["id"] for row in prepared], ["phish_0", "phish_2"])

    def test_conflicting_labels_rejected_before_split(self):
        rows = [{"text": "same!", "label": 1}, {"text": "SAME", "label": 0}]
        with self.assertRaisesRegex(ValueError, "conflicting labels"):
            prepare_phishing_rows(rows)

    def test_length_cap_applies_to_both_models_and_is_counted(self):
        rows = [{"text": "abcdefghij", "label": 0}, {"text": " ", "label": 1}]
        prepared, audit = prepare_phishing_rows(rows, max_chars=5)
        self.assertEqual(prepared[0]["text"], "abcde")
        self.assertEqual(audit["length_capped_rows"], 1)
        self.assertEqual(audit["empty_rows"], 1)

    def test_deduplicates_text_after_length_cap_so_visible_inputs_cannot_leak(self):
        rows = [
            {"text": "abcde first ending", "label": 1},
            {"text": "abcde second ending", "label": 1},
            {"text": "other message", "label": 0},
        ]
        prepared, audit = prepare_phishing_rows(rows, max_chars=5)
        self.assertEqual(len(prepared), 2)
        self.assertEqual(audit["normalized_duplicate_rows"], 1)
        self.assertEqual(prepared[0]["text"], "abcde")

    def test_deduplicates_full_normalized_text_even_if_cap_changes_visible_prefix(self):
        rows = [
            {"text": "a,,b c", "label": 1},
            {"text": "a b c", "label": 1},
            {"text": "other", "label": 0},
        ]
        prepared, audit = prepare_phishing_rows(rows, max_chars=5)
        self.assertEqual(len(prepared), 2)
        self.assertEqual(audit["normalized_duplicate_rows"], 1)

    def test_transitive_full_and_visible_duplicates_form_one_group(self):
        rows = [
            {"text": "a,,b c", "label": 1},
            {"text": "a b cx", "label": 1},
            {"text": "a b c", "label": 1},
            {"text": "other", "label": 0},
        ]
        prepared, audit = prepare_phishing_rows(rows, max_chars=5)
        self.assertEqual(len(prepared), 2)
        self.assertEqual(audit["normalized_duplicate_rows"], 2)

    def test_three_way_split_is_disjoint_and_reproducible(self):
        rows = [
            {"id": f"id_{i}", "text": f"message {i}", "label": i % 2}
            for i in range(100)
        ]
        first = split_phishing_rows(rows, seed=42)
        second = split_phishing_rows(rows, seed=42)
        self.assertEqual(first, second)
        self.assertEqual([len(first[name]) for name in ("train", "validation", "test")], [60, 20, 20])
        ids = [row["id"] for name in ("train", "validation", "test") for row in first[name]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual([sum(row["label"] for row in first[name]) for name in ("train", "validation", "test")], [30, 10, 10])

    def test_baseline_predicts_each_held_out_id_once(self):
        rows = [
            {"id": f"id_{i}", "text": ("hello meeting" if i % 2 == 0 else "urgent payment"), "label": i % 2}
            for i in range(100)
        ]
        split = split_phishing_rows(rows)
        result = run_svm_baseline(split)
        self.assertEqual(set(result), {"validation", "test", "fit_seconds"})
        for name in ("validation", "test"):
            self.assertEqual(len(result[name]["predictions"]), len(split[name]))
            self.assertEqual(result[name]["metrics"]["confusion_matrix"], [[10, 0], [0, 10]])

    def test_artifacts_preserve_exact_split_and_predictions(self):
        rows = [
            {"text": (f"hello meeting {i}" if i % 2 == 0 else f"urgent payment {i}"), "label": i % 2}
            for i in range(100)
        ]
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "run"
            write_baseline_artifacts(rows, out, source_sha256="abc")
            manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
            split = json.loads((out / "split.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["source_sha256"], "abc")
            self.assertEqual(manifest["split_counts"], {"train": 60, "validation": 20, "test": 20})
            self.assertEqual(len(split["test"]), len(manifest["svm"]["test"]["predictions"]))
            loaded = load_frozen_phishing_split(out / "split.json", out / "manifest.json")
            self.assertEqual(loaded, split)
            (out / "split.json").write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "split checksum"):
                load_frozen_phishing_split(out / "split.json", out / "manifest.json")

    def test_external_holdout_excludes_local_and_prior_split_overlap(self):
        # A broken filter would admit a known local/prior message or count a repeated test mail twice.
        prepare = getattr(research_phishing, "prepare_external_holdout", None)
        self.assertIsNotNone(prepare)
        local = [{"text": "Local overlap!", "label": 1}]
        prior_train = [{"text": "Earlier mail", "label": 0}]
        prior_validation = [{"text": "Val mail", "label": 1}]
        external_test = [
            {"text": "local, OVERLAP", "label": 1},
            {"text": "Earlier mail", "label": 0},
            {"text": "Val mail", "label": 1},
            {"text": "Unique text", "label": 1},
            {"text": "unique, TEXT", "label": 1},
            {"text": "Other safe", "label": 0},
        ]
        kept, audit = prepare(local, prior_train, prior_validation, external_test)
        self.assertEqual([row["source_index"] for row in kept], [3, 5])
        self.assertEqual([row["text"] for row in kept], ["Unique text", "Other safe"])
        self.assertEqual(audit, {
            "raw_test_rows": 6,
            "local_overlap": 1,
            "prior_split_overlap": 2,
            "within_test_duplicate": 1,
            "empty_visible_text": 0,
            "retained_rows": 2,
            "class_counts": {0: 1, 1: 1},
        })

    def test_external_holdout_filters_on_visible_prefix(self):
        prepare = getattr(research_phishing, "prepare_external_holdout", None)
        self.assertIsNotNone(prepare)
        kept, audit = prepare(
            [{"text": "abcd local suffix", "label": 1}], [], [],
            [{"text": "abcd external suffix", "label": 1},
             {"text": "wxyz unique suffix", "label": 0}],
            max_chars=4,
        )
        self.assertEqual([row["source_index"] for row in kept], [1])
        self.assertEqual([row["text"] for row in kept], ["wxyz"])
        self.assertEqual(audit["local_overlap"], 1)

    def test_rebuilt_svm_must_reproduce_frozen_holdout_predictions(self):
        # A changed vectorizer or label mapping must not silently become the external baseline.
        rebuild = getattr(research_phishing, "rebuild_verified_svm", None)
        self.assertIsNotNone(rebuild)
        split = {
            "train": [
                {"text": "normal meeting tomorrow", "label": 0},
                {"text": "normal meeting today", "label": 0},
                {"text": "urgent password reset", "label": 1},
                {"text": "urgent account reset", "label": 1},
            ],
            "validation": [
                {"text": "normal meeting", "label": 0},
                {"text": "urgent reset", "label": 1},
            ],
            "test": [
                {"text": "normal today", "label": 0},
                {"text": "urgent password", "label": 1},
            ],
        }
        expected = run_svm_baseline(split)
        model = rebuild(split, expected)
        self.assertEqual(model.predict(["urgent password"]).tolist(), [1])
        expected["test"]["predictions"][0] = 1
        with self.assertRaisesRegex(ValueError, "SVM reconstruction mismatch"):
            rebuild(split, expected)

    def test_external_evaluation_artifacts_record_predictions_without_email_text(self):
        # A wrong row order, missing prediction, or accidental raw-email export must fail.
        write_artifacts = getattr(research_phishing, "write_external_evaluation_artifacts", None)
        self.assertIsNotNone(write_artifacts)
        rows = [
            {"source_index": 7, "text": "secret email one", "label": 1},
            {"source_index": 9, "text": "secret email two", "label": 0},
        ]
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "external"
            manifest = write_artifacts(rows, [0, 0], [1, 0], [0.9, 0.1], out, {"source_revision": "fixed"})
            self.assertEqual(manifest["metrics"]["svm"]["confusion_matrix"], [[1, 0], [1, 0]])
            self.assertEqual(manifest["metrics"]["transformer"]["confusion_matrix"], [[1, 0], [0, 1]])
            self.assertEqual(manifest["source_revision"], "fixed")
            csv_text = (out / "predictions.csv").read_text(encoding="utf-8")
            self.assertIn("7,1,0,1", csv_text)
            self.assertNotIn("secret email", csv_text)
            self.assertEqual(len(csv_text.splitlines()), 3)
            with self.assertRaises(FileExistsError):
                write_artifacts(rows, [0, 0], [1, 0], [0.9, 0.1], out, {})

    def test_transformer_inference_preserves_input_order_across_batches(self):
        # Batch slicing bugs must not attach a probability to the wrong email.
        predict = getattr(research_phishing, "predict_frozen_transformer", None)
        self.assertIsNotNone(predict)
        import torch
        from types import SimpleNamespace

        class TinyTokenizer:
            def __call__(self, texts, **kwargs):
                self.last_options = kwargs
                return {"input_ids": torch.tensor([[len(text)] for text in texts])}

        class TinyModel(torch.nn.Module):
            def forward(self, input_ids):
                x = input_ids[:, 0].float() - 2.0
                return SimpleNamespace(logits=torch.stack([-x, x], dim=1))

        tokenizer = TinyTokenizer()
        predictions, probabilities, seconds = predict(
            TinyModel(), tokenizer, ["a", "bb", "cccc"], batch_size=2
        )
        self.assertEqual(predictions, [0, 0, 1])
        self.assertLess(probabilities[0], probabilities[1])
        self.assertLess(probabilities[1], probabilities[2])
        self.assertEqual(tokenizer.last_options["max_length"], 256)
        self.assertGreaterEqual(seconds, 0)


if __name__ == "__main__":
    unittest.main()
