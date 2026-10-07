import importlib.util
from pathlib import Path
import unittest
import numpy as np
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('house_ocr', Path(__file__).parents[1] / 'ops' / 'house-paper-ocr.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PaperOcrTest(unittest.TestCase):
    def test_header_crop_keeps_both_header_bands_on_the_actual_modern_geometry(self):
        # House 9116361: the fixed 20%-height crop cuts through FULL ASSET NAME.
        image = Image.new('L', (2200, 1697), 255)
        ImageDraw.Draw(image).rectangle((200, 800, 600, 820), fill=0)
        cropped = module.modern_header_crop(image, [190, 2050], 1162,
                                          [265,384,535,742,894,1162,1210,1286])
        self.assertEqual(cropped.size, (1860, 420))
        self.assertEqual(cropped.getpixel((20,70)), 0)

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

    def test_framed_checkbox_ignores_its_printed_square(self):
        blank = np.zeros((60, 60), dtype=bool)
        blank[8:12, 8:52] = True
        blank[48:52, 8:52] = True
        blank[8:52, 8:12] = True
        blank[8:52, 48:52] = True
        checked = blank.copy()
        for i in range(20, 40):
            checked[i, i-2:i+3] = True
            checked[i, 59-i-2:59-i+3] = True
        self.assertFalse(module.is_framed_checked(blank))
        self.assertTrue(module.is_framed_checked(checked))

    def test_new_form_continuation_page_can_have_transactions_without_example_row(self):
        image = Image.new('L', (1000, 1200), 255)
        draw = ImageDraw.Draw(image)
        columns = [20,60,300,340,380,420,460,540,620,650,680,710,740,770,800,830,860,890,920,950]
        for x in columns:
            draw.line((x,300,x,380), fill=0, width=2)
        for y in [300,380]:
            draw.line((20,y,950,y), fill=0, width=2)
        draw.rectangle((100,325,200,335), fill=0)
        for index in [*range(2,6), *range(8,19)]:
            left,right = columns[index:index+2]
            draw.rectangle((left+6,310,right-6,370), outline=0, width=2)
        draw.line((312,325,328,350), fill=0, width=4)
        draw.line((660,325,670,350), fill=0, width=4)
        values = iter(['FULL ASSET NAME AMOUNT OF TRANSACTION', 'Conroe TX bond', '', '7/30/26', '8/19/26'])
        rows = module.read_new_grid(image, '2026-09-11', lambda _: next(values))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['type'], 'buy')
        self.assertEqual(rows[0]['amountLow'], 15001)
        self.assertEqual(rows[0]['transactionDate'], '2026-07-30')

    def test_real_scanned_double_frames_do_not_create_extra_amount_marks(self):
        # Official House 9116331.pdf, page 1 rendered at 2200px; all four rows
        # select B ($15,001-$50,000), including shifted/double printed squares.
        pixels = np.asarray(Image.open(Path(__file__).parent / 'fixtures' / 'house-2020-amounts.png').convert('L')) < 200
        for top,bottom in [(0,57),(57,114),(114,170),(170,228)]:
            marks = [module.is_framed_checked(pixels[top:bottom,i*60:min((i+1)*60,659)])
                     for i in range(11)]
            self.assertEqual(module.selected_cell(marks), 1)

if __name__ == '__main__':
    unittest.main()
