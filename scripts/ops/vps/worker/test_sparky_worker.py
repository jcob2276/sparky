"""Testy handlera archive_oura_hr (bez bazy Supabase i bez sieci).

Uruchomienie:  python -I scripts/ops/vps/worker/test_sparky_worker.py
Modul workera wymaga psycopg i zmiennych srodowiskowych tylko przy imporcie, wiec stubujemy je tutaj.
"""
import contextlib
import importlib.util
import os
import sqlite3
import sys
import tempfile
import types
import unittest
from pathlib import Path

USER = "11111111-2222-3333-4444-555555555555"


def load_worker(db_path):
    os.environ.update({
        "WORKER_DATABASE_URL": "postgresql://stub",
        "SUPABASE_URL": "https://stub.supabase.co",
        "ARCHIVE_SECRET": "s" * 40,
        "ARCHIVE_DB": db_path,
    })
    psycopg = types.ModuleType("psycopg")
    psycopg.connect = lambda *a, **k: None
    rows = types.ModuleType("psycopg.rows")
    rows.dict_row = object()
    sys.modules["psycopg"], sys.modules["psycopg.rows"] = psycopg, rows
    spec = importlib.util.spec_from_file_location("sparky_worker", Path(__file__).with_name("sparky-worker.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ArchiveHandlerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = os.path.join(self.tmp.name, "archive.db")
        self.worker = load_worker(self.db)
        self.calls = []

        def fake(name, body, timeout=120):
            self.calls.append((name, body))
            # stale probki w kazdym oknie sprawdzaja deduplikacje po (user, ts, source)
            return {"samples": [["2026-11-01T10:00:00.000Z", 71, "awake"], ["2026-11-01T10:05:00.000Z", 60, None]]}

        self.worker.call_archive_function = fake

    def tearDown(self):
        self.tmp.cleanup()

    def count(self):
        with contextlib.closing(sqlite3.connect(self.db)) as c:
            return c.execute("select count(*) from hr_samples").fetchone()[0]

    def test_splits_range_into_seven_day_windows(self):
        res = self.worker.h_archive_oura_hr({"user_id": USER, "days_back": 15})
        self.assertEqual(res["windows"], 3)  # 7 + 7 + 1 dni
        self.assertEqual({c[0] for c in self.calls}, {"sync"})
        self.assertTrue(all(c[1]["service"] == "oura-hr-raw" and c[1]["userId"] == USER for c in self.calls))

    def test_is_idempotent(self):
        first = self.worker.h_archive_oura_hr({"user_id": USER, "days_back": 15})
        self.assertEqual((first["fetched"], first["inserted"]), (6, 2))  # 3 okna x 2 probki, 2 unikalne
        again = self.worker.h_archive_oura_hr({"user_id": USER, "days_back": 15})
        self.assertEqual(again["inserted"], 0)
        self.assertEqual(self.count(), 2)

    def test_empty_source_is_stored_as_empty_string(self):
        self.worker.h_archive_oura_hr({"user_id": USER, "days_back": 1})
        with contextlib.closing(sqlite3.connect(self.db)) as c:
            self.assertIn("", [r[0] for r in c.execute("select source from hr_samples")])

    def test_caps_days_back_at_400(self):
        res = self.worker.h_archive_oura_hr({"user_id": USER, "days_back": 9999})
        self.assertEqual(res["windows"], 58)  # ceil(400 / 7)

    def test_rejects_invalid_user_id(self):
        with self.assertRaises(ValueError):
            self.worker.h_archive_oura_hr({"user_id": "x; drop table hr_samples"})
        self.assertEqual(self.calls, [])

    def test_archive_call_requires_long_secret(self):
        real = load_worker(self.db)  # swieży modul z prawdziwa funkcja, bez atrapy
        real.ARCHIVE_SECRET = "short"
        with self.assertRaises(RuntimeError):
            real.call_archive_function("sync", {})


if __name__ == "__main__":
    unittest.main()
