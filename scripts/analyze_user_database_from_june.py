import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin

# 1. Try querying Supabase
url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

def query_sb(table, query_params):
    req_url = f"{url}/rest/v1/{table}?{query_params}"
    req = urllib.request.Request(req_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {table}: {e}")
        return []

st_acts = query_sb("strava_activities_clean", "order=start_date.desc&limit=100")
ws_acts = query_sb("workout_sessions", "order=start_time.desc&limit=100")

print(f"Supabase strava_activities_clean count: {len(st_acts)}")
print(f"Supabase workout_sessions count: {len(ws_acts)}")

# 2. Also fetch from Garmin Connect API directly for 100 activities
EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")

garmin_acts = []
try:
    api = Garmin(EMAIL, PASSWORD)
    api.login()
    garmin_acts = api.get_activities(0, 100)
    print(f"Garmin API activities count: {len(garmin_acts)}")
except Exception as e:
    print(f"Garmin fetch error: {e}")

# Save garmin acts
with open("tmp/all_garmin_from_june.json", "w", encoding="utf-8") as f:
    json.dump(garmin_acts, f, indent=2, ensure_ascii=False)

# Filter activities from June 1, 2026 to August 1, 2026
june_acts = [a for a in garmin_acts if a.get("startTimeLocal") and a.get("startTimeLocal") >= "2026-06-01"]
print(f"\nTotal Garmin activities from June 1 to August 1: {len(june_acts)}")

runs = [a for a in june_acts if a.get("activityType", {}).get("typeKey") in ["running", "treadmill_running"]]
print(f"Total RUNNING activities from June 1: {len(runs)}")

runs_sorted = sorted(runs, key=lambda x: x.get("startTimeLocal"))

total_km = 0
monthly_km = {"2026-06": 0, "2026-07": 0, "2026-08": 0}
monthly_count = {"2026-06": 0, "2026-07": 0, "2026-08": 0}

print("\n=== ALL RUNS FROM JUNE 1, 2026 TO AUGUST 1, 2026 ===")
for r in runs_sorted:
    dt = r.get("startTimeLocal")
    month_key = dt[:7]
    dist = (r.get("distance") or 0) / 1000
    dur = (r.get("duration") or 0) / 60
    avg_hr = r.get("averageHR")
    max_hr = r.get("maxHR")
    pace = dur / dist if dist > 0 else 0
    name = r.get("activityName")
    
    total_km += dist
    if month_key in monthly_km:
        monthly_km[month_key] += dist
        monthly_count[month_key] += 1
        
    print(f"  {dt[:10]} | {dist:5.2f} km | {dur:5.1f} min | Pace: {int(pace)}:{int((pace%1)*60):02d}/km | Avg HR: {avg_hr} | Max HR: {max_hr} | {name}")

print(f"\n=======================================================")
print(f"TOTAL KM RUN SINCE JUNE 1: {total_km:.2f} km across {len(runs)} runs")
print("=======================================================")
for m, km in monthly_km.items():
    print(f"  Month {m}: {km:.2f} km across {monthly_count[m]} runs")

long_runs = [r for r in runs if (r.get("distance") or 0)/1000 >= 10.0]
print(f"\nTotal Long Runs (>= 10km) since June 1: {len(long_runs)}")
for lr in sorted(long_runs, key=lambda x: x.get("distance", 0), reverse=True):
    dist = (lr.get("distance") or 0) / 1000
    dur = (lr.get("duration") or 0) / 60
    pace = dur / dist if dist > 0 else 0
    print(f"  {lr.get('startTimeLocal')[:10]} | {dist:.2f} km in {dur:.1f} min (Pace: {int(pace)}:{int((pace%1)*60):02d}) | Avg HR: {lr.get('averageHR')}")
