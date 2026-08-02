import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

garth.resume(TOKENS)
api = Garmin()

tz = timezone(timedelta(hours=2))

daily_hr = api.get_heart_rates("2026-07-26")
values = daily_hr.get("heartRateValues") or []

parsed = []
for item in values:
    if isinstance(item, list) and len(item) == 2 and item[0]:
        ts_ms, hr_val = item
        dt = datetime.fromtimestamp(ts_ms / 1000, tz=tz)
        time_str = dt.strftime("%H:%M:%S")
        if hr_val is not None:
            parsed.append((time_str, hr_val))

print("=== ALL SAMPLES BETWEEN 20:30 AND 22:00 ON 2026-07-26 ===")
for t, hr in parsed:
    if "20:30:00" <= t <= "22:00:00":
        print(f"  {t} -> {hr} bpm")
