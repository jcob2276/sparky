import unittest

from tokenizers import Tokenizer, models, pre_tokenizers, processors

from src.seconvo_window_svm import clip_to_token_window


def tokenizer_for_fixture():
    vocabulary = {"[UNK]": 0, "[CLS]": 1, "[SEP]": 2}
    vocabulary.update({letter: number for number, letter in enumerate("abcdef", start=3)})
    tokenizer = Tokenizer(models.WordLevel(vocabulary, unk_token="[UNK]"))
    tokenizer.pre_tokenizer = pre_tokenizers.Whitespace()
    tokenizer.post_processor = processors.TemplateProcessing(
        single="[CLS] $A [SEP]",
        special_tokens=[("[CLS]", 1), ("[SEP]", 2)],
    )
    return tokenizer


class SeconvoWindowSvmTests(unittest.TestCase):
    def test_first_and_last_windows_keep_original_text_spans(self):
        tokenizer = tokenizer_for_fixture()
        text = "a b c d e f"
        self.assertEqual(clip_to_token_window(text, tokenizer, 5, "first"), "a b c")
        self.assertEqual(clip_to_token_window(text, tokenizer, 5, "last"), "d e f")

    def test_short_text_is_not_rewritten(self):
        tokenizer = tokenizer_for_fixture()
        self.assertEqual(clip_to_token_window("a b", tokenizer, 5, "first"), "a b")
        self.assertEqual(clip_to_token_window("a b", tokenizer, 5, "last"), "a b")


if __name__ == "__main__":
    unittest.main()
