import os, json, sys
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")
TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

print("Checking Garmin login...")
api = None

# If token files exist and are non-empty, try garth.resume
if os.path.exists(TOKENS):
    o1 = os.path.join(TOKENS, "oauth1_token.json")
    if os.path.exists(o1) and os.path.getsize(o1) > 10:
        try:
            garth.resume(TOKENS)
            api = Garmin()
            print("Successfully resumed Garth session without fresh login!")
        except Exception as e:
            print(f"Garth resume failed: {e}")

if not api:
    print("Attempting Garmin Connect login...")
    try:
        api = Garmin(EMAIL, PASSWORD)
        api.login()
        os.makedirs(TOKENS, exist_ok=True)
        garth.save(TOKENS)
        print("Logged in successfully and saved tokens!")
    except Exception as e:
        print(f"Garmin Login Error: {e}")

if api:
    date_str = "2026-07-29"
    tz = timezone(timedelta(hours=2))

    print(f"\nFetching Garmin activities for {date_str}...")
    try:
        acts = api.get_activities_by_date(date_str, date_str)
        print(f"Found {len(acts)} Garmin activities today:")
        for a in acts:
            print(f" - {a.get('activityName')} ({a.get('activityType',{}).get('typeKey')}) | Start: {a.get('startTimeLocal')} | Dur: {round((a.get('duration') or 0)/60, 1)}m | Avg HR: {a.get('averageHR')} | Max HR: {a.get('maxHR')} | Cal: {a.get('calories')}")
    except Exception as e:
        print(f"Error fetching Garmin activities: {e}")

    print(f"\nFetching Garmin 24h HR log for {date_str}...")
    try:
        daily_hr = api.get_heart_rates(date_str)
        values = daily_hr.get("heartRateValues") or []
        parsed = []
        for item in values:
            if isinstance(item, list) and len(item) == 2 and item[0]:
                ts_ms, hr_val = item
                dt = datetime.fromtimestamp(ts_ms / 1000, tz=tz)
                time_str = dt.strftime("%H:%M:%S")
                if "19:30:00" <= time_str <= "21:00:00" and hr_val is not None:
                    parsed.append((time_str, hr_val))

        print(f"Garmin HR samples between 19:30 and 21:00: {len(parsed)}")
        if parsed:
            hrs = [hr for _, hr in parsed]
            print(f"Garmin HR summary (19:30 - 21:00): Min={min(hrs)}, Avg={round(sum(hrs)/len(hrs),1)}, Max={max(hrs)}")
            print("\nTimeline (Garmin):")
            step = max(1, len(parsed) // 25)
            for i in range(0, len(parsed), step):
                t, hr = parsed[i]
                bar = "#" * max(0, int((hr - 50) / 3))
                print(f"  {t} | {hr:>3} bpm | {bar}")
    except Exception as e:
        print(f"Error fetching Garmin daily HR: {e}")
