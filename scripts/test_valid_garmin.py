import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

garth.resume(TOKENS)
api = Garmin()
print("Garth resumed successfully!")

acts = api.get_activities(0, 5)
print(f"Latest 5 activities:")
for a in acts:
    print(f" - {a.get('startTimeLocal')} | {a.get('activityName')} ({a.get('activityType',{}).get('typeKey')})")

date_str = "2026-07-29"
daily_hr = api.get_heart_rates(date_str)
print("Daily HR keys:", daily_hr.keys() if isinstance(daily_hr, dict) else type(daily_hr))
values = daily_hr.get("heartRateValues") or []
print(f"Total HR samples in Garmin for {date_str}: {len(values)}")
if values:
    tz = timezone(timedelta(hours=2))
    parsed = []
    for item in values:
        if isinstance(item, list) and len(item) == 2 and item[0]:
            ts_ms, hr_val = item
            if hr_val:
                dt = datetime.fromtimestamp(ts_ms / 1000, tz=tz)
                parsed.append((dt.strftime("%H:%M:%S"), hr_val))
    print(f"Non-null HR samples: {len(parsed)}")
    if parsed:
        print(f"First sample: {parsed[0]}, Last sample: {parsed[-1]}")
        tennis_garmin = [p for p in parsed if "19:30:00" <= p[0] <= "21:00:00"]
        print(f"Garmin HR samples between 19:30 and 21:00: {len(tennis_garmin)}")
        if tennis_garmin:
            hrs = [hr for _, hr in tennis_garmin]
            print(f"Garmin HR Tennis: Min={min(hrs)}, Avg={round(sum(hrs)/len(hrs), 1)}, Max={max(hrs)}")
