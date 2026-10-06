import tempfile
import unittest
from pathlib import Path

from transformers import BertTokenizerFast

from src.audit_seconvo_windows import summarize_input_windows


class AuditSeconvoWindowsTests(unittest.TestCase):
    def test_counts_only_texts_whose_encoded_windows_differ(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            vocab = Path(temp_dir) / "vocab.txt"
            vocab.write_text("\n".join(["[PAD]", "[UNK]", "[CLS]", "[SEP]", "[MASK]", "a", "b", "c", "d", "e", "f"]), encoding="utf-8")
            tokenizer = BertTokenizerFast(str(vocab), do_lower_case=True)
            result = summarize_input_windows(["a b c d e f", "a b"], tokenizer, max_length=5)
            self.assertEqual(result["n"], 2)
            self.assertEqual(result["n_changed"], 1)
            self.assertEqual(result["n_unchanged"], 1)
            self.assertTrue(result["all_at_most_limit"])


if __name__ == "__main__":
    unittest.main()
