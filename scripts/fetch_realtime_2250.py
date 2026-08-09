import os, json, datetime
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
    except Exception as e:
        api = None

if not api:
    EMAIL = os.getenv("GARMIN_EMAIL")
    PASSWORD = os.getenv("GARMIN_PASSWORD")
    api = Garmin(EMAIL, PASSWORD)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)

print("=== FETCHING REAL-TIME STATE FOR NOW (22:50 CEST) ===")

today_str = datetime.datetime.now().strftime("%Y-%m-%d")

try:
    hr_data = api.get_heart_rates(today_str)
    hr_vals = hr_data.get("heartRateValues") or []
    valid_samples = []
    for item in hr_vals:
        if item and len(item) >= 2 and item[1] is not None:
            ts_ms, hr = item[0], item[1]
            dt = datetime.datetime.fromtimestamp(ts_ms / 1000.0, tz=datetime.timezone.utc)
            dt_local = dt + datetime.timedelta(hours=2) # CEST
            valid_samples.append((dt_local.strftime("%H:%M:%S"), hr, dt_local))
            
    if valid_samples:
        valid_samples.sort(key=lambda x: x[2])
        latest_10 = valid_samples[-10:]
        print("\nLATEST 10 GARMIN HR SAMPLES:")
        for t_str, hr, _ in latest_10:
            print(f"  [{t_str}] -> {hr} bpm")
except Exception as e:
    print(f"Garmin HR error: {e}")

try:
    user_summary = api.get_user_summary(today_str)
    print("\nGARMIN USER SUMMARY:")
    print(f"  Resting HR: {user_summary.get('restingHeartRate')} bpm")
    print(f"  Body Battery Most Recent: {user_summary.get('bodyBatteryMostRecentValue')}")
    print(f"  Average Stress Level: {user_summary.get('averageStressLevel')}")
except Exception as e:
    print(f"Garmin summary error: {e}")
