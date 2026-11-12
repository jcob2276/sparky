"""Offline checks for complete, observation-dated portfolio snapshots."""
import importlib.util
import unittest
from datetime import date
from pathlib import Path

spec = importlib.util.spec_from_file_location('finance_snapshots', Path(__file__).with_name('finance_snapshots.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SnapshotTests(unittest.TestCase):
    def test_missing_quote_never_becomes_partial_total(self):
        rows = [{'ticker': 'A', 'quantity': 2, 'asset_class': 'stock'}, {'ticker': 'B', 'quantity': 1, 'asset_class': 'etf'}]
        self.assertIsNone(module.build_snapshot(rows, {'A': {date(2026,11,10): 100}}, date(2026,11,12)))

    def test_uses_last_known_quote_and_observation_day(self):
        rows = [{'ticker': 'A', 'quantity': 2, 'asset_class': 'stock'}]
        result = module.build_snapshot(rows, {'A': {date(2026,11,10): 100, date(2026,11,13): 999}}, date(2026,11,12))
        self.assertEqual(result['as_of'], '2026-11-12')
        self.assertEqual(result['total_pln'], 200)
        self.assertEqual(result['positions'][0]['price_date'], '2026-11-10')

    def test_zero_positions_need_no_quote(self):
        self.assertEqual(module.build_snapshot([{'ticker':'A','quantity':0,'asset_class':'stock'}], {}, date(2026,11,12))['total_pln'],0)

if __name__ == '__main__':
    unittest.main()
