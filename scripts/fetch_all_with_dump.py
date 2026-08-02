import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "valid_garmin_tokens")

api = None
if os.path.exists(TOKENS):
    try:
        garth.resume(TOKENS)
        api = Garmin()
        api.get_activities(0, 1)
        print("Session resumed successfully from valid_garmin_tokens!")
    except Exception as e:
        print(f"Token resume failed: {e}")

if not api:
    print("Logging in with email/password...")
    if os.path.exists(TOKENS):
        shutil.rmtree(TOKENS, ignore_errors=True)
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    api = Garmin(email, password)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    api.garth.dump(TOKENS)
    print("Login successful and tokens dumped with api.garth.dump!")

all_acts = []
print("\nFetching up to 100 activities in batches of 20...")
for start in range(0, 100, 20):
    try:
        batch = api.get_activities(start, 20)
        if not batch:
            break
        all_acts.extend(batch)
        print(f"Batch {start}..{start+len(batch)-1}: {batch[0].get('startTimeLocal')} to {batch[-1].get('startTimeLocal')} (Count: {len(batch)})")
    except Exception as e:
        print(f"Batch {start} error: {e}")
        break

print(f"\nTotal activities fetched: {len(all_acts)}")

print("\n--- ALL ACTIVITIES LIST ---")
for i, a in enumerate(all_acts):
    act_id = a.get("activityId")
    name = a.get("activityName", "")
    type_key = a.get("activityType", {}).get("typeKey", "")
    start = a.get("startTimeLocal")
    dur_min = round((a.get("duration") or 0) / 60, 1)
    hr = a.get("averageHR")
    max_hr = a.get("maxHR")
    print(f"[{i}] ID: {act_id} | Date: {start} | Name: '{name}' | Type: {type_key} | Dur: {dur_min}m | Avg HR: {hr} | Max HR: {max_hr}")

os.makedirs("tmp", exist_ok=True)
with open("tmp/all_garmin_100_full.json", "w", encoding="utf-8") as f:
    json.dump(all_acts, f, indent=2, ensure_ascii=False)
