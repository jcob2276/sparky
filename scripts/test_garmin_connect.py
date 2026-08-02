import os, json, shutil, time
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")
TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

api = None
if os.path.exists(TOKENS):
    try:
        garth.resume(TOKENS)
        api = Garmin()
        api.get_user_profile()
        print("Resumed session successfully!")
    except Exception as e:
        print(f"Token resume failed: {e}")
        api = None

if not api:
    print("Logging in fresh with email/password...")
    shutil.rmtree(TOKENS, ignore_errors=True)
    try:
        api = Garmin(EMAIL, PASSWORD)
        api.login()
        os.makedirs(TOKENS, exist_ok=True)
        garth.save(TOKENS)
        print("Fresh login successful & tokens saved!")
    except Exception as e:
        print(f"Login failed: {e}")
        exit(1)

# Fetch latest 5 activities
acts = api.get_activities(0, 10)
print(f"\nFetched {len(acts)} activities:")
for a in acts:
    print(f"ID: {a.get('activityId')} | Start: {a.get('startTimeLocal')} | Name: {a.get('activityName')} | Avg HR: {a.get('averageHR')} | Max HR: {a.get('maxHR')} | Dur: {(a.get('duration') or 0)//60}m")

# Look specifically for yesterday's Kardio / Sauna session (2026-07-28)
sauna_act = None
for a in acts:
    if a.get("activityId") == 23767902989 or "kardio" in a.get("activityName", "").lower():
        sauna_act = a
        break

if not sauna_act:
    sauna_act = acts[0] # fall back to top activity

sauna_id = sauna_act.get("activityId")
sauna_start = sauna_act.get("startTimeLocal")
sauna_name = sauna_act.get("activityName")
sauna_dur = (sauna_act.get("duration") or 0) // 60

print(f"\n==========================================")
print(f"ANALYZING SAUNA ACTIVITY: {sauna_name} (ID: {sauna_id})")
print(f"Start: {sauna_start} | Duration: {sauna_dur} min")
print(f"==========================================")

# Try fetching per-second / detail metrics for the activity
try:
    details = api.get_activity_details(sauna_id)
    os.makedirs("tmp", exist_ok=True)
    with open("tmp/sauna_details.json", "w", encoding="utf-8") as f:
        json.dump(details, f, indent=2, ensure_ascii=False)
    print("Activity details saved to tmp/sauna_details.json")
    
    descriptors = details.get("metricDescriptors", [])
    desc_map = {d.get("metricsIndex"): d.get("key") or d.get("metricType") for d in descriptors if d.get("metricsIndex") is not None}
    metrics = details.get("activityDetailMetrics", [])
    print(f"Activity has {len(metrics)} per-second data points.")
    
    hr_idx = next((i for i, k in desc_map.items() if "heartrate" in str(k).lower() or "heart_rate" in str(k).lower()), None)
    el_idx = next((i for i, k in desc_map.items() if "elapsed" in str(k).lower()), None)
    
    print(f"HR descriptor index: {hr_idx}, Elapsed descriptor index: {el_idx}")
    
    act_hr_samples = []
    for m in metrics:
        vals = m.get("metrics", []) if isinstance(m, dict) else (m if isinstance(m, list) else [])
        hr_val = vals[hr_idx] if hr_idx is not None and hr_idx < len(vals) else None
        el_val = vals[el_idx] if el_idx is not None and el_idx < len(vals) else None
        if hr_val is not None:
            act_hr_samples.append((el_val, hr_val))
            
    print(f"Total HR samples in activity detail: {len(act_hr_samples)}")
    if act_hr_samples:
        print("First 5 activity HR samples (elapsed_sec, hr):", act_hr_samples[:5])
        print("Last 5 activity HR samples (elapsed_sec, hr):", act_hr_samples[-5:])
except Exception as e:
    print(f"Error fetching activity details: {e}")

# Now fetch daily HR data for 2026-07-28 (all day)
print("\nFetching daily HR for 2026-07-28...")
try:
    daily_hr = api.get_heart_rates("2026-07-28")
    with open("tmp/daily_hr_2026-07-28.json", "w", encoding="utf-8") as f:
        json.dump(daily_hr, f, indent=2, ensure_ascii=False)
    
    values = daily_hr.get("heartRateValues") or []
    print(f"Total daily HR samples: {len(values)}")
    
    # Poland local time is UTC+2
    tz = timezone(timedelta(hours=2))
    parsed = []
    for item in values:
        if isinstance(item, list) and len(item) == 2 and item[0]:
            ts_ms, hr_val = item
            dt = datetime.fromtimestamp(ts_ms / 1000, tz=tz)
            time_str = dt.strftime("%H:%M:%S")
            parsed.append((time_str, hr_val))
    
    print("\n--- All-Day HR Timeline (Every 15-30 mins & Sauna Window) ---")
    # Filter and display key hours: before sauna (18:00 - 21:13) and during sauna (21:13 - 22:00)
    for t, hr in parsed:
        if "18:00:00" <= t <= "23:00:00":
            print(f"  {t} -> HR: {hr}")

except Exception as e:
    print(f"Error fetching daily HR: {e}")
