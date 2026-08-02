import os, json

files_to_check = [
    "tmp/all_garmin_activities.json",
    "tmp/all_garmin_100_clean.json",
    "tmp/all_garmin_200.json",
    "tmp/recent_activities.json"
]

all_acts = []
for fname in files_to_check:
    if os.path.exists(fname):
        try:
            with open(fname, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_acts.extend(data)
                elif isinstance(data, dict) and "data" in data:
                    all_acts.extend(data["data"])
        except Exception as e:
            print(f"Error reading {fname}: {e}")

# Deduplicate by activityId
unique_acts = {}
for a in all_acts:
    aid = a.get("activityId")
    if aid and aid not in unique_acts:
        unique_acts[aid] = a

acts_list = list(unique_acts.values())
print(f"Total unique activities in local cache: {len(acts_list)}")

june_acts = [a for a in acts_list if a.get("startTimeLocal") and a.get("startTimeLocal") >= "2026-06-01"]
print(f"Total activities from June 1 to August 1: {len(june_acts)}")

runs = [a for a in june_acts if a.get("activityType", {}).get("typeKey") in ["running", "treadmill_running"]]
print(f"Total RUNS from June 1: {len(runs)}")

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
