import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")
TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

if os.path.exists(TOKENS):
    shutil.rmtree(TOKENS, ignore_errors=True)

print("Authenticating with Garmin Connect...")
api = Garmin(EMAIL, PASSWORD)
api.login()
os.makedirs(TOKENS, exist_ok=True)
garth.save(TOKENS)
print("Login successful & tokens saved!")

print("\nFetching 100 activities...")
acts = api.get_activities(0, 100)

os.makedirs("tmp", exist_ok=True)
with open("tmp/garmin_100_activities.json", "w", encoding="utf-8") as f:
    json.dump(acts, f, indent=2, ensure_ascii=False)

print(f"Total activities saved to tmp/garmin_100_activities.json: {len(acts)}")

# Print non-running activities
print("\n--- Non-Running & Special Activities ---")
for a in acts:
    act_id = a.get("activityId")
    name = a.get("activityName", "")
    type_key = a.get("activityType", {}).get("typeKey", "")
    start = a.get("startTimeLocal")
    dur_min = round((a.get("duration") or 0) / 60, 1)
    hr = a.get("averageHR")
    max_hr = a.get("maxHR")
    
    if type_key != "running" or any(w in name.lower() for w in ["sauna", "kardio", "cardio", "inne", "other", "breathwork"]):
        print(f"ID: {act_id} | Date: {start} | Name: '{name}' | Type: {type_key} | Dur: {dur_min}m | Avg HR: {hr} | Max HR: {max_hr}")

