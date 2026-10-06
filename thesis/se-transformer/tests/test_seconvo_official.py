import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from src.research_seconvo_official import load_official_split


class SeconvoOfficialTests(unittest.TestCase):
    def test_author_split_is_preserved_without_crossing_ids(self):
        split = load_official_split()
        self.assertEqual((len(split.y_train), len(split.y_test)), (40, 360))
        self.assertEqual((sum(split.y_train), sum(split.y_test)), (24, 191))
        self.assertFalse(set(split.ids_train) & set(split.ids_test))
        self.assertEqual(len(set(split.ids_test)), 360)

    def test_local_svm_run_writes_one_prediction_per_author_test_dialogue(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir) / "run"
            command = [
                sys.executable,
                "-m",
                "src.research_seconvo_official",
                "--output-dir",
                str(output_dir),
                "--skip-transformer",
            ]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            manifest = json.loads((output_dir / "manifest.json").read_text(encoding="utf-8"))
            with (output_dir / "test_predictions.csv").open(encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual((manifest["split"]["n_train"], manifest["split"]["n_test"]), (40, 360))
            self.assertEqual(len(rows), 360)
            self.assertEqual([row["id"] for row in rows], manifest["split"]["test_ids"])
            self.assertAlmostEqual(manifest["results"]["svm"]["f1_macro"], 0.7019363995809537)


if __name__ == "__main__":
    unittest.main()
