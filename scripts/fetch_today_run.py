import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")

api = Garmin(EMAIL, PASSWORD)
api.login()

acts = api.get_activities(0, 5)
print("Recent activities in Garmin:")
running_acts = []
for a in acts:
    aid = a.get("activityId")
    name = a.get("activityName")
    start = a.get("startTimeLocal")
    tkey = a.get("activityType", {}).get("typeKey")
    dist = (a.get("distance") or 0) / 1000
    dur = a.get("duration") or 0
    hr = a.get("averageHR")
    print(f"  ID: {aid} | {start} | {name} ({tkey}) | {dist:.2f} km | {int(dur//60)}m{int(dur%60)}s | HR: {hr}")
    if tkey == "running" or "2026-09-29" in str(start):
        running_acts.append(a)

if running_acts:
    today_run = running_acts[0]
    aid = today_run.get("activityId")
    print(f"\n--- Extracting details for run ID: {aid} ---")
    os.makedirs("tmp", exist_ok=True)
    with open("tmp/today_run_summary.json", "w", encoding="utf-8") as f:
        json.dump(today_run, f, indent=2, ensure_ascii=False)
    
    splits = api.get_activity_splits(aid)
    with open("tmp/today_run_splits.json", "w", encoding="utf-8") as f:
        json.dump(splits, f, indent=2, ensure_ascii=False)
    print(f"Saved splits ({len(splits.get('lapDTOs', []))} laps) to tmp/today_run_splits.json!")

    try:
        zones = api.get_activity_hr_in_timezones(aid)
        with open("tmp/today_run_zones.json", "w", encoding="utf-8") as f:
            json.dump(zones, f, indent=2, ensure_ascii=False)
        print("Saved HR zones to tmp/today_run_zones.json!")
    except Exception as e:
        print("Error fetching zones:", e)

    try:
        weather = api.get_activity_weather(aid)
        with open("tmp/today_run_weather.json", "w", encoding="utf-8") as f:
            json.dump(weather, f, indent=2, ensure_ascii=False)
        print("Saved weather to tmp/today_run_weather.json!")
    except Exception as e:
        print("Error fetching weather:", e)
else:
    print("No running activities found today!")
