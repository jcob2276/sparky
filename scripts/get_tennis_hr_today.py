import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_session")
if not os.path.exists(TOKENS):
    TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

api = None
try:
    garth.resume(TOKENS)
    api = Garmin()
    print("Session resumed successfully via Garth tokens!")
except Exception as e:
    print(f"Resume failed: {e}")
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    api = Garmin(email, password)
    api.login()


date_str = "2026-07-29"
tz = timezone(timedelta(hours=2)) # Warsaw / local time (UTC+2)

print(f"\n==========================================")
print(f"1. CHECKING ACTIVITIES FOR {date_str}")
print(f"==========================================")
try:
    acts = api.get_activities_by_date(date_str, date_str)
    print(f"Found {len(acts)} activities today:")
    for a in acts:
        act_id = a.get("activityId")
        name = a.get("activityName")
        type_name = a.get("activityType", {}).get("typeKey")
        start_time_local = a.get("startTimeLocal")
        duration = a.get("duration")
        avg_hr = a.get("averageHR")
        max_hr = a.get("maxHR")
        calories = a.get("calories")
        print(f" - Activity ID: {act_id} | Name: {name} | Type: {type_name} | Start: {start_time_local} | Duration: {duration}s ({round(duration/60, 1)}m) | Avg HR: {avg_hr} | Max HR: {max_hr} | Cal: {calories}")
        
        try:
            hr_zones = api.get_activity_hr_in_timezones(act_id)
            print(f"   HR Zones: {json.dumps(hr_zones, ensure_ascii=False)}")
        except Exception as ze:
            print(f"   Could not fetch HR zones: {ze}")
            
except Exception as e:
    print(f"Error fetching activities: {e}")

print(f"\n==========================================")
print(f"2. CHECKING 24H HR LOG FOR {date_str} (19:30 - 21:00)")
print(f"==========================================")
try:
    daily_hr = api.get_heart_rates(date_str)
    values = daily_hr.get("heartRateValues") or []
    
    window_samples = []
    for item in values:
        if isinstance(item, list) and len(item) == 2 and item[0]:
            ts_ms, hr_val = item
            dt = datetime.fromtimestamp(ts_ms / 1000, tz=tz)
            time_str = dt.strftime("%H:%M:%S")
            if "19:30:00" <= time_str <= "21:00:00":
                window_samples.append((time_str, hr_val))
                
    print(f"Total HR samples between 19:30 and 21:00: {len(window_samples)}")
    
    valid_hrs = [hr for _, hr in window_samples if hr is not None]
    if valid_hrs:
        avg_w_hr = round(sum(valid_hrs) / len(valid_hrs), 1)
        min_w_hr = min(valid_hrs)
        max_w_hr = max(valid_hrs)
        print(f"Summary 19:30-21:00: Min HR = {min_w_hr}, Avg HR = {avg_w_hr}, Max HR = {max_w_hr}")
        
        print("\nDetailed timeline (19:30 - 21:00):")
        step = max(1, len(window_samples) // 30)
        for i in range(0, len(window_samples), step):
            t, hr = window_samples[i]
            bar = "#" * max(0, int((hr - 50) / 3)) if hr else "N/A"
            print(f"  {t} | {hr if hr else 'N/A':>3} bpm | {bar}")
    else:
        print("No valid HR samples in this time window.")
        
except Exception as e:
    print(f"Error fetching daily HR: {e}")
