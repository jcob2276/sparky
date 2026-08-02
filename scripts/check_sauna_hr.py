import os, json
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
        # Test a simple API call to check if garth session is valid
        api.get_user_profile()
        print("✅ Session resumed successfully via garth!")
    except Exception as e:
        print(f"Garth resume test failed: {e}")
        api = None

if not api:
    print("Attempting login with credentials...")
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    api = Garmin(email, password)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)

print("\nFetching recent 30 activities...")
acts = api.get_activities(0, 30)

print(f"Fetched {len(acts)} activities:\n")
for a in acts:
    act_id = a.get("activityId")
    name = a.get("activityName")
    type_key = a.get("activityType", {}).get("typeKey")
    start = a.get("startTimeLocal")
    dur = a.get("duration", 0) // 60
    hr = a.get("averageHR")
    max_hr = a.get("maxHR")
    print(f"ID: {act_id} | Start: {start} | Name: {name} | Type: {type_key} | Dur: {dur} min | Avg HR: {hr} | Max HR: {max_hr}")

# Save activities to tmp/garmin_recent_acts.json
os.makedirs("tmp", exist_ok=True)
with open("tmp/garmin_recent_acts.json", "w", encoding="utf-8") as f:
    json.dump(acts, f, indent=2, ensure_ascii=False)

