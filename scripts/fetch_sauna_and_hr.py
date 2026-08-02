import os, json, time, shutil
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")
TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

# Clear corrupted tokens
if os.path.exists(TOKENS):
    shutil.rmtree(TOKENS, ignore_errors=True)

print("Logging in to Garmin Connect...")
api = Garmin(EMAIL, PASSWORD)
api.login()
os.makedirs(TOKENS, exist_ok=True)
garth.save(TOKENS)
print("✅ Login successful!")

# 1. Fetch Kardio activity (23767902989) details
act_id = 23767902989
print(f"\n1. Fetching summary for activity {act_id}...")
try:
    act_summary = api.get_activity(act_id)
    with open("tmp/sauna_summary_23767902989.json", "w", encoding="utf-8") as f:
        json.dump(act_summary, f, indent=2, ensure_ascii=False)
except Exception as e:
    print(f"Error fetching summary: {e}")

print(f"\n2. Fetching activity details for {act_id}...")
try:
    act_details = api.get_activity_details(act_id)
    with open("tmp/sauna_details_23767902989.json", "w", encoding="utf-8") as f:
        json.dump(act_details, f, indent=2, ensure_ascii=False)
    print("Saved details to tmp/sauna_details_23767902989.json")
except Exception as e:
    print(f"Error fetching details: {e}")

print(f"\n3. Fetching activity HR in timezones for {act_id}...")
try:
    act_zones = api.get_activity_hr_in_timezones(act_id)
    with open("tmp/sauna_zones_23767902989.json", "w", encoding="utf-8") as f:
        json.dump(act_zones, f, indent=2, ensure_ascii=False)
except Exception as e:
    print(f"Error fetching zones: {e}")

# 2. Fetch Daily HR for 2026-07-28 (yesterday)
print(f"\n4. Fetching daily HR for 2026-07-28...")
try:
    daily_hr_28 = api.get_heart_rates("2026-07-28")
    with open("tmp/daily_hr_2026-07-28.json", "w", encoding="utf-8") as f:
        json.dump(daily_hr_28, f, indent=2, ensure_ascii=False)
    print("Saved daily HR to tmp/daily_hr_2026-07-28.json")
except Exception as e:
    print(f"Error fetching daily HR: {e}")

# 3. Fetch Daily HR for 2026-07-29 (today) just in case
print(f"\n5. Fetching daily HR for 2026-07-29...")
try:
    daily_hr_29 = api.get_heart_rates("2026-07-29")
    with open("tmp/daily_hr_2026-07-29.json", "w", encoding="utf-8") as f:
        json.dump(daily_hr_29, f, indent=2, ensure_ascii=False)
    print("Saved daily HR to tmp/daily_hr_2026-07-29.json")
except Exception as e:
    print(f"Error fetching daily HR: {e}")

print("\nDone fetching all data!")
