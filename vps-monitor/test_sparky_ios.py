import importlib
import unittest
from unittest.mock import patch

renewal = importlib.import_module("sparky_ios")


class RenewalResultTest(unittest.TestCase):
    def test_records_only_a_confirmed_install(self):
        output = "new profile valid until 2026-11-26T08:52:20Z\ninstalled on the phone\nRENEWED app.vanguard.os.widgets\n"
        self.assertEqual(renewal.interpret(0, output, "app.vanguard.os.widgets", True),
                         ("renewed", "2026-11-26T08:52:20Z"))
        self.assertEqual(renewal.interpret(0, output, "app.vanguard.os", True), ("failed", None))
        self.assertEqual(renewal.interpret(1, output, "app.vanguard.os.widgets", True), ("failed", None))

    def test_distinguishes_a_scheduled_noop_from_a_failed_manual_run(self):
        output = "app.vanguard.os: expires in 6 days, no renewal needed"
        self.assertEqual(renewal.interpret(0, output, "app.vanguard.os", False), ("current", None))
        self.assertEqual(renewal.interpret(0, output, "app.vanguard.os", True), ("failed", None))

    def test_failed_attempt_keeps_last_success(self):
        saved = {"lastRenewed": "2026-11-19T08:52:22Z", "expires": "2026-11-26T08:52:20Z"}
        with patch.object(renewal, "run_profile", return_value=("offline", None)):
            result = renewal.update_profile(saved, "app.vanguard.os.widgets", True)
        self.assertEqual(result["lastRenewed"], saved["lastRenewed"])
        self.assertEqual(result["expires"], saved["expires"])
        self.assertEqual(result["result"], "offline")
