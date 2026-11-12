"""Queue handler integration with fake database and no market/network access."""
import importlib.util
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

class PriceHandlerTest(unittest.TestCase):
    def test_final_position_removal_records_zero_observation(self):
        writes = []
        class Result:
            def __init__(self, rows): self.rows = rows
            def fetchall(self): return self.rows
        class Connection:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def commit(self): pass
            def execute(self, sql, args=None):
                if 'from finance_holdings' in sql: return Result([])
                if 'select distinct user_id' in sql: return Result([{'user_id': 'u'}])
                writes.append(args)
                return Result([])
        psycopg = types.ModuleType('psycopg')
        psycopg.connect = lambda *args, **kwargs: Connection()
        rows = types.ModuleType('psycopg.rows')
        rows.dict_row = object()
        yf = types.ModuleType('yfinance')
        yf.set_tz_cache_location = lambda path: None
        with tempfile.TemporaryDirectory() as cache, patch.dict(os.environ, {'YF_CACHE': cache}), patch.dict(sys.modules, {'psycopg': psycopg, 'psycopg.rows': rows, 'yfinance': yf}):
            spec = importlib.util.spec_from_file_location('finance_prices_under_test', ROOT / 'finance_prices.py')
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            result = module.fetch_prices({}, 'stub')
        self.assertEqual(result['portfolio_rows'], 1)
        self.assertEqual(writes[0][0], 'u')
        self.assertEqual(writes[0][2], 0)
        self.assertEqual(result['skipped_incomplete'], [])

if __name__ == '__main__': unittest.main()
