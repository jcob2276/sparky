import tempfile
import unittest
from pathlib import Path

from transformers import BertTokenizerFast

from src.research_seconvo_window_transformer import encode_window


class SeconvoWindowTransformerTests(unittest.TestCase):
    def test_first_and_last_keep_opposite_ends_with_same_length(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            vocab = Path(temp_dir) / "vocab.txt"
            vocab.write_text("\n".join(["[PAD]", "[UNK]", "[CLS]", "[SEP]", "[MASK]", "a", "b", "c", "d", "e", "f"]), encoding="utf-8")
            tokenizer = BertTokenizerFast(str(vocab), do_lower_case=True)
            text = ["a b c d e f"]
            first = encode_window(tokenizer, text, "first", 5)
            last = encode_window(tokenizer, text, "last", 5)
            self.assertEqual(tokenizer.convert_ids_to_tokens(first["input_ids"][0]), ["[CLS]", "a", "b", "c", "[SEP]"])
            self.assertEqual(tokenizer.convert_ids_to_tokens(last["input_ids"][0]), ["[CLS]", "d", "e", "f", "[SEP]"])

    def test_invalid_window_is_rejected(self):
        with self.assertRaises(ValueError):
            encode_window(None, ["text"], "middle", 512)


if __name__ == "__main__":
    unittest.main()
