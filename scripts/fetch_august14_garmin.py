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

today_str = date.today().isoformat()
print(f"Fetching activities for {today_str}...")

acts = api.get_activities(0, 5)
os.makedirs("tmp", exist_ok=True)

today_acts = [a for a in acts if a.get("startTimeLocal", "").startswith(today_str)]
print(f"Found {len(today_acts)} activities for today ({today_str}).")

if today_acts:
    act = today_acts[0]
    act_id = act.get("activityId")
    print(f"\n==========================================")
    print(f"ANALYZING SHAKEOUT RUN ID: {act_id}")
    print(f"Name: {act.get('activityName')} | Start: {act.get('startTimeLocal')}")
    print(f"Dist: {act.get('distance', 0)/1000:.2f} km | Dur: {act.get('movingDuration', 0)/60:.1f} min | HR: {act.get('averageHR')}")
    print(f"==========================================")
    
    with open("tmp/garmin_aug14_summary.json", "w", encoding="utf-8") as f:
        json.dump(act, f, indent=2, ensure_ascii=False)
        
    try:
        laps = api.get_activity_splits(act_id)
        with open("tmp/garmin_aug14_laps.json", "w", encoding="utf-8") as f:
            json.dump(laps, f, indent=2, ensure_ascii=False)
        print("Saved laps!")
    except Exception as e:
        print("Laps error:", e)

    try:
        zones = api.get_activity_hr_in_timezones(act_id)
        with open("tmp/garmin_aug14_zones.json", "w", encoding="utf-8") as f:
            json.dump(zones, f, indent=2, ensure_ascii=False)
        print("Saved HR zones!")
    except Exception as e:
        print("Zones error:", e)
