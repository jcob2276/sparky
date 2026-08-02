import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

garth.resume(TOKENS)
api = Garmin()

print("Fetching 100 activities using resumed session...")
acts = api.get_activities(0, 100)
print(f"Successfully fetched {len(acts)} activities!\n")

sauna_list = []
for a in acts:
    act_id = a.get("activityId")
    name = a.get("activityName", "")
    type_key = a.get("activityType", {}).get("typeKey", "")
    start = a.get("startTimeLocal")
    dur_min = (a.get("duration") or 0) / 60
    hr = a.get("averageHR")
    max_hr = a.get("maxHR")
    
    # Filter non-running activities or activities with sauna/cardio/indoor in name/type
    if type_key != "running" or any(w in name.lower() for w in ["sauna", "kardio", "cardio", "inne", "other", "breathwork"]):
        sauna_list.append((act_id, start, name, type_key, round(dur_min, 1), hr, max_hr))

print("=== ALL NON-RUNNING / CARDIO / SAUNA ACTIVITIES ===")
for item in sauna_list:
    print(f"ID: {item[0]} | Date: {item[1]} | Name: '{item[2]}' | Type: {item[3]} | Dur: {item[4]}m | Avg HR: {item[5]} | Max HR: {item[6]}")

# Also print all activities chronologically from recent
print("\n=== ALL 100 RECENT ACTIVITIES LIST ===")
for a in acts:
    print(f"ID: {a.get('activityId')} | Date: {a.get('startTimeLocal')} | Name: '{a.get('activityName')}' | Type: {a.get('activityType',{}).get('typeKey')} | Dur: {round((a.get('duration') or 0)/60, 1)}m | HR: {a.get('averageHR')}")

os.makedirs("tmp", exist_ok=True)
with open("tmp/all_100_activities.json", "w", encoding="utf-8") as f:
    json.dump(acts, f, indent=2, ensure_ascii=False)
