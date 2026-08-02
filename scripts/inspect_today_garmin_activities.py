import os, json, shutil, time
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

api = None
if os.path.exists(TOKENS):
    try:
        garth.resume(TOKENS)
        api = Garmin()
        api.get_user_profile()
        print("Resumed session successfully via Garth tokens!")
    except Exception as e:
        print(f"Token resume failed: {e}")
        api = None

if not api:
    print("Logging in fresh with email/password...")
    EMAIL = os.getenv("GARMIN_EMAIL")
    PASSWORD = os.getenv("GARMIN_PASSWORD")
    shutil.rmtree(TOKENS, ignore_errors=True)
    try:
        api = Garmin(EMAIL, PASSWORD)
        api.login()
        os.makedirs(TOKENS, exist_ok=True)
        garth.save(TOKENS)
        print("Fresh login successful & tokens saved!")
    except Exception as e:
        print(f"Login failed: {e}")
        exit(1)

# Fetch latest 10 activities
acts = api.get_activities(0, 10)
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

# Dump today's activities details
today_str = datetime.now().strftime("%Y-%m-%d")
print(f"\nAnalyzing activities for today ({today_str}) or recent...")

os.makedirs("tmp", exist_ok=True)
with open("tmp/recent_activities.json", "w", encoding="utf-8") as f:
    json.dump(acts, f, indent=2, ensure_ascii=False)

for i, a in enumerate(acts[:5]):
    act_id = a.get("activityId")
    try:
        details = api.get_activity_details(act_id)
        with open(f"tmp/act_{act_id}_details.json", "w", encoding="utf-8") as f:
            json.dump(details, f, indent=2, ensure_ascii=False)
        print(f"Saved details for activity {act_id}")
    except Exception as e:
        print(f"Error fetching details for {act_id}: {e}")

    try:
        splits = api.get_activity_splits(act_id)
        with open(f"tmp/act_{act_id}_splits.json", "w", encoding="utf-8") as f:
            json.dump(splits, f, indent=2, ensure_ascii=False)
        print(f"Saved splits for activity {act_id}")
    except Exception as e:
        print(f"Error fetching zones/splits for {act_id}: {e}")

    try:
        zones = api.get_activity_hr_in_timezones(act_id)
        with open(f"tmp/act_{act_id}_zones.json", "w", encoding="utf-8") as f:
            json.dump(zones, f, indent=2, ensure_ascii=False)
        print(f"Saved HR zones for activity {act_id}")
    except Exception as e:
        print(f"Error fetching zones for {act_id}: {e}")

print("FETCH COMPLETE.")
