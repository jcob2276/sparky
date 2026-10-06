import json
import tempfile
import unittest
from pathlib import Path

from src.research_reament_con import load_records, partition_indices, run_svm, load_frozen_split


class ReaMentConProtocolTests(unittest.TestCase):
    def test_loader_rejects_duplicate_ids_before_any_split(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "data.json"
            rows = [
                {"id": "a", "dialogue": "first", "manipulative": "0"},
                {"id": "a", "dialogue": "second", "manipulative": "1"},
            ]
            source.write_text("\n".join(json.dumps(row) for row in rows), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "duplicate ID"):
                load_records(source)

    def test_partition_is_stratified_disjoint_and_reproducible(self):
        labels = [0] * 25 + [1] * 25
        train, validation, test = partition_indices(labels, seed=42)

        self.assertEqual([len(train), len(validation), len(test)], [30, 10, 10])
        self.assertEqual([sum(labels[i] for i in part) for part in (train, validation, test)], [15, 5, 5])
        self.assertEqual(len(set(train) | set(validation) | set(test)), 50)
        self.assertFalse(set(train) & set(validation))
        self.assertFalse(set(train) & set(test))
        self.assertFalse(set(validation) & set(test))
        self.assertEqual((train, validation, test), partition_indices(labels, seed=42))

    def test_baseline_writes_auditable_test_predictions(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "data.json"
            output = Path(tmp) / "results"
            rows = [
                {"id": f"item-{i}", "dialogue": f"{'safe' if i < 25 else 'attack'} sample {i}",
                 "manipulative": str(int(i >= 25))}
                for i in range(50)
            ]
            source.write_text("\n".join(json.dumps(row) for row in rows), encoding="utf-8")

            run_svm(source, output)

            manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
            predictions = (output / "test_predictions.csv").read_text(encoding="utf-8").splitlines()
            self.assertEqual([manifest["split"][key]["n"] for key in ("train", "validation", "test")], [30, 10, 10])
            self.assertEqual(len(predictions), 11)
            self.assertIn("id,true_label,svm_pred", predictions[0])
            self.assertEqual(len(manifest["dataset_sha256"]), 64)
            self.assertEqual(manifest["results"]["svm"]["test"]["confusion_matrix"], [[5, 0], [0, 5]])

            frozen = load_frozen_split(source, output / "manifest.json")
            self.assertEqual([len(frozen[key]) for key in ("train", "validation", "test")], [30, 10, 10])
            self.assertEqual([row["id"] for row in frozen["test"]], manifest["split"]["test"]["ids"])

            source.write_text(source.read_text(encoding="utf-8") + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "dataset SHA-256"):
                load_frozen_split(source, output / "manifest.json")


if __name__ == "__main__":
    unittest.main()
