import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

api = None
if os.path.exists(TOKENS):
    try:
        # Check if oauth1_token.json is not empty
        o1 = os.path.join(TOKENS, "oauth1_token.json")
        if os.path.exists(o1) and os.path.getsize(o1) > 10:
            garth.resume(TOKENS)
            api = Garmin()
            api.get_activities(0, 1)
            print("Session resumed successfully via garth!")
    except Exception as e:
        print(f"Token resume failed: {e}")
        api = None

if not api:
    print("Logging in with email/password...")
    shutil.rmtree(TOKENS, ignore_errors=True)
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    api = Garmin(email, password)
    api.login()
    # Save tokens ONLY after successful login
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)
    print("Login successful & valid tokens saved!")

print("\nFetching up to 100 activities across 5 batches...")
all_acts = []
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

print("\n--- ALL NON-RUNNING ACTIVITIES ---")
non_running = []
for i, a in enumerate(all_acts):
    act_id = a.get("activityId")
    name = a.get("activityName", "")
    type_key = a.get("activityType", {}).get("typeKey", "")
    start = a.get("startTimeLocal")
    dur_min = round((a.get("duration") or 0) / 60, 1)
    hr = a.get("averageHR")
    max_hr = a.get("maxHR")
    
    if type_key != "running" or any(w in name.lower() for w in ["sauna", "kardio", "cardio", "inne", "other", "breathwork"]):
        non_running.append((act_id, start, name, type_key, dur_min, hr, max_hr))
        print(f"[{i}] ID: {act_id} | Date: {start} | Name: '{name}' | Type: {type_key} | Dur: {dur_min}m | Avg HR: {hr} | Max HR: {max_hr}")

if not non_running:
    print("No non-running activities found in the last 100 activities!")

os.makedirs("tmp", exist_ok=True)
with open("tmp/all_garmin_100_clean.json", "w", encoding="utf-8") as f:
    json.dump(all_acts, f, indent=2, ensure_ascii=False)

