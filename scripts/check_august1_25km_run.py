import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")

print("Logging in to Garmin Connect...")
api = Garmin(EMAIL, PASSWORD)
api.login()

acts = api.get_activities(0, 5)
print(f"\nFetched {len(acts)} activities:")
for i, a in enumerate(acts):
    act_id = a.get('activityId')
    start = a.get('startTimeLocal')
    name = a.get('activityName')
    act_type = a.get('activityType', {}).get('typeKey')
    avg_hr = a.get('averageHR')
    max_hr = a.get('maxHR')
    dur = (a.get('duration') or 0) // 60
    dist = (a.get('distance') or 0) / 1000
    cal = a.get('calories')
    print(f"[{i}] ID: {act_id} | Start: {start} | Type: {act_type} | Name: {name} | Dist: {dist:.2f}km | Dur: {dur}m | Avg HR: {avg_hr} | Max HR: {max_hr} | Cal: {cal}")

# Look for today's (2026-08-01) 25km run
run_25 = acts[0]
act_id = run_25.get("activityId")

print(f"\n=======================================================")
print(f"ANALYZING 25KM RUN: ID {act_id}")
print(f"=======================================================")

summary = api.get_activity(act_id)
with open("tmp/run_25km_summary.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2, ensure_ascii=False)

try:
    zones = api.get_activity_hr_in_timezones(act_id)
    with open("tmp/run_25km_zones.json", "w", encoding="utf-8") as f:
        json.dump(zones, f, indent=2, ensure_ascii=False)
except Exception as e:
    print("Zones error:", e)

try:
    details = api.get_activity_details(act_id, maxchart=1000)
    with open("tmp/run_25km_details.json", "w", encoding="utf-8") as f:
        json.dump(details, f, indent=2, ensure_ascii=False)
except Exception as e:
    print("Details error:", e)

print("FETCH COMPLETE.")
