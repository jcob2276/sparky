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
        api.get_user_profile()
        print("Session resumed successfully!")
    except Exception as e:
        print(f"Token resume failed: {e}")
        api = None

if not api:
    print("Logging in fresh with email/password...")
    EMAIL = os.getenv("GARMIN_EMAIL")
    PASSWORD = os.getenv("GARMIN_PASSWORD")
    shutil.rmtree(TOKENS, ignore_errors=True)
    api = Garmin(EMAIL, PASSWORD)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)
    print("Fresh login successful!")

print("Fetching today's heart rate timeline (2026-08-03)...")
try:
    hr_today = api.get_heart_rates("2026-08-03")
    with open("tmp/garmin_hr_today.json", "w", encoding="utf-8") as f:
        json.dump(hr_today, f, indent=2, ensure_ascii=False)
    print("Saved tmp/garmin_hr_today.json!")
except Exception as e:
    print(f"Error fetching today HR: {e}")

print("Fetching July 28 heart rate timeline for comparison...")
try:
    hr_prev = api.get_heart_rates("2026-07-28")
    with open("tmp/garmin_hr_july28.json", "w", encoding="utf-8") as f:
        json.dump(hr_prev, f, indent=2, ensure_ascii=False)
    print("Saved tmp/garmin_hr_july28.json!")
except Exception as e:
    print(f"Error fetching July 28 HR: {e}")

print("Fetching latest activities...")
acts = api.get_activities(0, 10)
with open("tmp/garmin_latest_acts.json", "w", encoding="utf-8") as f:
    json.dump(acts, f, indent=2, ensure_ascii=False)

print("COMPLETE.")
