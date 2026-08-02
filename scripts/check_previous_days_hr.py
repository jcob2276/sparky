import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

api = None
if os.path.exists(TOKENS):
    try:
        o1 = os.path.join(TOKENS, "oauth1_token.json")
        if os.path.exists(o1) and os.path.getsize(o1) > 10:
            garth.resume(TOKENS)
            api = Garmin()
            api.get_activities(0, 1)
            print("Session resumed!")
    except Exception as e:
        print(f"Resume failed: {e}")
        api = None

if not api:
    print("Logging in fresh...")
    shutil.rmtree(TOKENS, ignore_errors=True)
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    api = Garmin(email, password)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)

tz = timezone(timedelta(hours=2))
days_to_check = ["2026-07-26", "2026-07-22", "2026-07-20"]

for date_str in days_to_check:
    print(f"\n==========================================")
    print(f"CHECKING DAILY HR FOR {date_str}")
    print(f"==========================================")
    try:
        daily_hr = api.get_heart_rates(date_str)
        values = daily_hr.get("heartRateValues") or []
        
        parsed = []
        for item in values:
            if isinstance(item, list) and len(item) == 2 and item[0]:
                ts_ms, hr_val = item
                dt = datetime.fromtimestamp(ts_ms / 1000, tz=tz)
                time_str = dt.strftime("%H:%M:%S")
                if hr_val is not None:
                    parsed.append((time_str, hr_val))
                    
        print(f"Total HR samples: {len(parsed)}")
        evening_high = []
        for t, hr in parsed:
            if "20:00:00" <= t <= "23:59:00":
                if hr > 110:
                    evening_high.append((t, hr))
                    
        if evening_high:
            print(f"HR spikes >110 bpm in evening of {date_str}:")
            for t, hr in evening_high:
                print(f"  {t} -> {hr} bpm")
        else:
            print(f"No HR spikes >110 bpm found in evening of {date_str}")
            
    except Exception as e:
        print(f"Error checking {date_str}: {e}")
