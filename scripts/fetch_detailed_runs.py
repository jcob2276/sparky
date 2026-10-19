import os
import json
from dotenv import load_dotenv

load_dotenv()

from garminconnect import Garmin

email = os.getenv("GARMIN_EMAIL")
password = os.getenv("GARMIN_PASSWORD")
print("Logging in to Garmin...")
api = Garmin(email, password)
api.login()
print("Login successful!")

act_ids = [
    24601829743, # Marathon: 2026-10-04 Košice (42.83 km)
    24689904533, # Run 1: 2026-10-11 Rzeszów (5.27 km)
    24712853849, # Run 2: 2026-10-13 Rzeszów (7.00 km)
    24738059747, # Run 3: 2026-10-15 Rzeszów (8.42 km)
]

data = {}

for aid in act_ids:
    print(f"Fetching data for activity {aid}...")
    act_data = {}
    
    # 1. Summary from get_activity
    try:
        act_data["summary"] = api.get_activity(aid)
    except Exception as e:
        print(f"  Error get_activity: {e}")
        act_data["summary"] = None

    # 2. Splits / laps
    try:
        act_data["splits"] = api.get_activity_splits(aid)
    except Exception as e:
        print(f"  Error splits: {e}")
        act_data["splits"] = None
        
    # 3. HR zones
    try:
        act_data["hr_zones"] = api.get_activity_hr_in_timezones(aid)
    except Exception as e:
        print(f"  Error hr_zones: {e}")
        act_data["hr_zones"] = None
        
    # 4. Weather
    try:
        act_data["weather"] = api.get_activity_weather(aid)
    except Exception as e:
        print(f"  Error weather: {e}")
        act_data["weather"] = None

    # 5. Activity details (streams/per-second summary)
    try:
        act_data["details"] = api.get_activity_details(aid, maxchart=2000)
    except Exception as e:
        print(f"  Error details: {e}")
        act_data["details"] = None

    data[str(aid)] = act_data

os.makedirs("tmp", exist_ok=True)
with open("tmp/post_marathon_runs_full.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("SUCCESS: Saved all detailed activity data to tmp/post_marathon_runs_full.json")
