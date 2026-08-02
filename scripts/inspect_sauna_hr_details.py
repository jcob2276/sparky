import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

garth.resume(TOKENS)
api = Garmin()

# Activity ID 23767902989 is the Kardio activity (sauna session) on 2026-07-28 21:13:24
sauna_act_id = 23767902989

print("Fetching summary for sauna activity 23767902989...")
sauna_act = api.get_activity(sauna_act_id)
print(json.dumps(sauna_act, indent=2, ensure_ascii=False))

print("\n--- Fetching activity details / per-second HR streams ---")
try:
    sauna_details = api.get_activity_details(sauna_act_id)
    with open("tmp/sauna_activity_details.json", "w", encoding="utf-8") as f:
        json.dump(sauna_details, f, indent=2, ensure_ascii=False)
    print("Saved sauna activity details to tmp/sauna_activity_details.json")
except Exception as e:
    print(f"Error fetching activity details: {e}")

# Fetch daily HR for 2026-07-28
print("\n--- Daily HR data for 2026-07-28 ---")
daily_hr = api.get_heart_rates("2026-07-28")
with open("tmp/daily_hr_2026-07-28.json", "w", encoding="utf-8") as f:
    json.dump(daily_hr, f, indent=2, ensure_ascii=False)

values = daily_hr.get("heartRateValues") or []
print(f"Total HR entries in daily_hr: {len(values)}")

# Convert timestamp (ms) to Local Time (UTC+2)
# Poland is currently CEST (UTC+2)
tz_offset = timedelta(hours=2)

parsed_hr = []
for ts, hr_val in values:
    if ts:
        dt_utc = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
        dt_local = dt_utc + tz_offset
        parsed_hr.append((dt_local.strftime("%Y-%m-%d %H:%M:%S"), hr_val))

print("\nSample HR readings throughout 2026-07-28:")
for time_str, hr_val in parsed_hr:
    # Focus especially on evening 18:00 - 23:59
    if " 18:" <= time_str <= " 23:59:":
        print(f"  {time_str} | HR: {hr_val}")

