import os, json, shutil, time
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
        # Test call
        api.get_activities(0, 1)
        print("Session resumed successfully!")
    except Exception as e:
        print(f"Token resume failed ({e}), logging in fresh...")
        api = None

if not api:
    shutil.rmtree(TOKENS, ignore_errors=True)
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    api = Garmin(email, password)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)
    print("Fresh login successful & tokens saved!")

print("\nFetching up to 200 activities...")
all_acts = []
for start in range(0, 200, 20):
    try:
        batch = api.get_activities(start, 20)
        if not batch:
            break
        all_acts.extend(batch)
    except Exception as e:
        print(f"Error fetching batch starting at {start}: {e}")
        break

print(f"Total fetched: {len(all_acts)} activities.")

sauna_candidates = []
non_running = []

for a in all_acts:
    act_id = a.get("activityId")
    name = a.get("activityName", "")
    type_key = a.get("activityType", {}).get("typeKey", "")
    start = a.get("startTimeLocal")
    dur_min = round((a.get("duration") or 0) / 60, 1)
    hr = a.get("averageHR")
    max_hr = a.get("maxHR")
    
    item = {
        "id": act_id,
        "date": start,
        "name": name,
        "type": type_key,
        "dur_min": dur_min,
        "avg_hr": hr,
        "max_hr": max_hr
    }
    
    if type_key != "running":
        non_running.append(item)
    
    if any(w in name.lower() for w in ["sauna", "kardio", "cardio", "inne", "other", "breathwork", "odpoczynek"]) or type_key in ["indoor_cardio", "uncategorized", "other", "relaxation", "breathwork"]:
        sauna_candidates.append(item)

print("\n=== SAUNA / CARDIO / SPECIAL CANDIDATES ===")
for s in sauna_candidates:
    print(f"ID: {s['id']} | Date: {s['date']} | Name: '{s['name']}' | Type: {s['type']} | Dur: {s['dur_min']}m | Avg HR: {s['avg_hr']} | Max HR: {s['max_hr']}")

print("\n=== ALL NON-RUNNING ACTIVITIES ===")
for n in non_running:
    print(f"ID: {n['id']} | Date: {n['date']} | Name: '{n['name']}' | Type: {n['type']} | Dur: {n['dur_min']}m | Avg HR: {n['avg_hr']} | Max HR: {n['max_hr']}")

os.makedirs("tmp", exist_ok=True)
with open("tmp/all_garmin_200.json", "w", encoding="utf-8") as f:
    json.dump(all_acts, f, indent=2, ensure_ascii=False)

