import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
import garth
from garminconnect import Garmin
from datetime import date

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

api = None
if os.path.exists(TOKENS):
    try:
        garth.resume(TOKENS)
        api = Garmin()
        api.login()
        print("Resumed Garth session successfully!")
    except Exception as e:
        print(f"Token resume error: {e}, re-logging...")
        shutil.rmtree(TOKENS, ignore_errors=True)

if not api:
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    api = Garmin(email, password)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)
    print("New session logged in and tokens saved!")

today_str = date.today().isoformat()
print(f"\n==========================================")
print(f"FETCHING GARMIN DATA FOR TODAY: {today_str}")
print(f"==========================================")

# 1. Activities
print("\nFetching latest activities...")
acts = api.get_activities(0, 10)
print(f"Found {len(acts)} activities.")

os.makedirs("tmp", exist_ok=True)

today_acts = []
for i, a in enumerate(acts):
    act_id = a.get("activityId")
    name = a.get("activityName")
    start = a.get("startTimeLocal")
    dist = (a.get("distance") or 0) / 1000
    dur = (a.get("movingDuration") or a.get("duration") or 0) / 60
    hr = a.get("averageHR")
    print(f"[{i}] ID: {act_id} | Name: {name} | Date: {start} | Dist: {dist:.2f} km | Dur: {dur:.1f} min | HR: {hr}")
    if start and start.startswith(today_str):
        today_acts.append(a)

with open("tmp/garmin_aug26_all_recent_acts.json", "w", encoding="utf-8") as f:
    json.dump(acts, f, indent=2, ensure_ascii=False)

if today_acts:
    print(f"\nFound {len(today_acts)} activity/activities for today ({today_str})")
    act = today_acts[0]
    act_id = act.get("activityId")
    
    with open("tmp/garmin_aug26_summary.json", "w", encoding="utf-8") as f:
        json.dump(act, f, indent=2, ensure_ascii=False)
        
    try:
        laps = api.get_activity_splits(act_id)
        with open("tmp/garmin_aug26_laps.json", "w", encoding="utf-8") as f:
            json.dump(laps, f, indent=2, ensure_ascii=False)
        print("Saved laps!")
    except Exception as e:
        print("Laps error:", e)

    try:
        details = api.get_activity_details(act_id)
        with open("tmp/garmin_aug26_details.json", "w", encoding="utf-8") as f:
            json.dump(details, f, indent=2, ensure_ascii=False)
        print("Saved details stream!")
    except Exception as e:
        print("Details error:", e)

    try:
        zones = api.get_activity_hr_in_timezones(act_id)
        with open("tmp/garmin_aug26_zones.json", "w", encoding="utf-8") as f:
            json.dump(zones, f, indent=2, ensure_ascii=False)
        print("Saved zones!")
    except Exception as e:
        print("Zones error:", e)

    try:
        weather = api.get_activity_weather(act_id)
        with open("tmp/garmin_aug26_weather.json", "w", encoding="utf-8") as f:
            json.dump(weather, f, indent=2, ensure_ascii=False)
        print("Saved weather!")
    except Exception as e:
        print("Weather error:", e)

# 2. Daily wellness & sleep data
print("\nFetching Daily Stats & Sleep Data...")
try:
    sleep_data = api.get_sleep_data(today_str)
    with open("tmp/garmin_aug26_sleep.json", "w", encoding="utf-8") as f:
        json.dump(sleep_data, f, indent=2, ensure_ascii=False)
    print("Saved sleep data!")
except Exception as e:
    print("Sleep error:", e)

try:
    stats = api.get_stats(today_str)
    with open("tmp/garmin_aug26_stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print("Saved stats data!")
except Exception as e:
    print("Stats error:", e)

print("\nDONE!")
