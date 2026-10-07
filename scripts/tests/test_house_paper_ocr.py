import importlib.util
from pathlib import Path
import unittest
import numpy as np

spec = importlib.util.spec_from_file_location('house_ocr', Path(__file__).parents[1] / 'ops' / 'house-paper-ocr.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PaperOcrTest(unittest.TestCase):
    def test_blank_and_checked_cells(self):
        empty = np.zeros((60, 60), dtype=bool)
        checked = empty.copy()
        for i in range(15, 45):
            checked[i, i-1:i+2] = True
            checked[i, 59-i-1:59-i+2] = True
        self.assertFalse(module.is_checked(empty))
        self.assertTrue(module.is_checked(checked))

    def test_ambiguous_multiple_marks_are_rejected(self):
        with self.assertRaises(ValueError):
            module.selected_cell([True, True, False])
        with self.assertRaises(ValueError):
            module.selected_cell([False, False, False])
        self.assertEqual(module.selected_cell([False, True, False]), 1)

    def test_scanned_dates_are_validated_against_disclosure(self):
        self.assertEqual(module.paper_date('8/5/26', '2026-09-23'), '2026-08-05')
        for value in ['8/5/28', '2/30/26', 'S/5/26', '8/5/']:
            with self.assertRaises(ValueError):
                module.paper_date(value, '2026-09-23')

    def test_ruled_border_is_not_a_transaction_mark(self):
        border = np.zeros((60, 60), dtype=bool)
        border[:4, :] = True
        border[-4:, :] = True
        border[:, :4] = True
        border[:, -4:] = True
        self.assertFalse(module.is_checked(border))

    def test_small_checkbox_crop_is_rejected(self):
        with self.assertRaises(ValueError):
            module.is_checked(np.ones((8, 60), dtype=bool))

if __name__ == '__main__':
    unittest.main()
