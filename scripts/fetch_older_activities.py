import os, json, shutil
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
        api.get_activities(0, 1)
        print("Session resumed successfully!")
    except Exception as e:
        print(f"Token resume error: {e}")
        api = None

if not api:
    print("Re-authenticating...")
    if os.path.exists(TOKENS):
        shutil.rmtree(TOKENS, ignore_errors=True)
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    api = Garmin(email, password)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)
    print("Fresh login success!")

all_acts = []
for start in range(0, 200, 20):
    try:
        batch = api.get_activities(start, 20)
        if not batch:
            break
        all_acts.extend(batch)
        print(f"Fetched batch {start}..{start+len(batch)-1}: {batch[0].get('startTimeLocal')} to {batch[-1].get('startTimeLocal')}")
    except Exception as e:
        print(f"Batch {start} error: {e}")
        break

print(f"\nTotal activities fetched: {len(all_acts)}")

sauna_matches = []
for a in all_acts:
    name = a.get("activityName", "")
    type_key = a.get("activityType", {}).get("typeKey", "")
    start = a.get("startTimeLocal")
    dur_min = round((a.get("duration") or 0) / 60, 1)
    hr = a.get("averageHR")
    max_hr = a.get("maxHR")
    act_id = a.get("activityId")
    
    if type_key != "running" or any(w in name.lower() for w in ["sauna", "kardio", "cardio", "inne", "other", "breathwork"]):
        sauna_matches.append({
            "id": act_id,
            "date": start,
            "name": name,
            "type": type_key,
            "dur": dur_min,
            "avg_hr": hr,
            "max_hr": max_hr
        })

print(f"\nFound {len(sauna_matches)} non-running / sauna / cardio activities:")
for m in sauna_matches:
    print(f"ID: {m['id']} | Date: {m['date']} | Name: '{m['name']}' | Type: {m['type']} | Dur: {m['dur']}m | Avg HR: {m['avg_hr']} | Max HR: {m['max_hr']}")

os.makedirs("tmp", exist_ok=True)
with open("tmp/all_garmin_200_full.json", "w", encoding="utf-8") as f:
    json.dump(all_acts, f, indent=2, ensure_ascii=False)
