import os
import json
import shutil
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from garminconnect import Garmin
import garth

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

api = None
if os.path.exists(TOKENS):
    try:
        garth.resume(TOKENS)
        api = Garmin()
        api.login()
        print("Logged in using existing garth session.")
    except Exception as e:
        print(f"Resume failed: {e}")
        api = None

if not api:
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    print("Logging in with email/password...")
    api = Garmin(email, password)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)
    print("New session saved to tokens directory.")

# Fetch activities
print("\nFetching activities...")
all_acts = api.get_activities(0, 50)
print(f"Total fetched: {len(all_acts)}")

# Let's inspect activities to find marathon and all runs
runs = []
marathon = None

for a in all_acts:
    atype = a.get("activityType", {}).get("typeKey", "")
    dist_km = (a.get("distance") or 0) / 1000.0
    start = a.get("startTimeLocal", "")
    name = a.get("activityName", "")
    act_id = a.get("activityId")
    dur_min = (a.get("duration") or 0) / 60.0
    
    print(f"{start} | ID: {act_id} | Type: {atype:<12} | Dist: {dist_km:6.2f} km | Dur: {dur_min:5.1f} min | {name}")
    
    # Check if this is a run
    if "running" in atype or atype in ["run", "trail_running", "treadmill_running"]:
        runs.append(a)
        if dist_km >= 40.0 or "maraton" in name.lower() or "marathon" in name.lower():
            if not marathon:
                marathon = a

print("\n" + "="*50)
if marathon:
    print(f"FOUND MARATHON: {marathon.get('startTimeLocal')} | {marathon.get('activityName')} | {marathon.get('distance', 0)/1000:.2f} km | ID: {marathon.get('activityId')}")
else:
    print("Marathon not found in first 50 activities. Fetching next 50...")
    more_acts = api.get_activities(50, 50)
    for a in more_acts:
        atype = a.get("activityType", {}).get("typeKey", "")
        dist_km = (a.get("distance") or 0) / 1000.0
        start = a.get("startTimeLocal", "")
        name = a.get("activityName", "")
        act_id = a.get("activityId")
        if "running" in atype or atype in ["run", "trail_running", "treadmill_running"]:
            runs.append(a)
            if dist_km >= 40.0 or "maraton" in name.lower() or "marathon" in name.lower():
                if not marathon:
                    marathon = a
                    print(f"FOUND MARATHON: {start} | {name} | {dist_km:.2f} km | ID: {act_id}")

os.makedirs("tmp", exist_ok=True)
with open("tmp/all_runs_summary.json", "w", encoding="utf-8") as f:
    json.dump({
        "marathon": marathon,
        "runs": runs[:15]
    }, f, indent=2, ensure_ascii=False)
