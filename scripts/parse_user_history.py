import json

with open("tmp/all_garmin_activities.json", "r", encoding="utf-8") as f:
    acts = json.load(f)

print(f"Total historical activities: {len(acts)}")
runs = [a for a in acts if a.get("activityType", {}).get("typeKey") == "running"]
print(f"Total runs: {len(runs)}")

max_hrs = [a.get("maxHR") for a in acts if a.get("maxHR")]
print(f"All-time Max HR in dataset: {max(max_hrs)} bpm")

recent_runs = runs[:10]
print("\nRecent 10 runs summary:")
for r in recent_runs:
    dt = r.get("startTimeLocal")
    dist = (r.get("distance") or 0) / 1000
    dur = (r.get("duration") or 0) / 60
    avg_hr = r.get("averageHR")
    max_hr = r.get("maxHR")
    pace = dur / dist if dist > 0 else 0
    print(f"  {dt} | {dist:.2f}km in {dur:.1f}m (Pace: {int(pace)}:{int((pace%1)*60):02d}/km) | Avg HR: {avg_hr} | Max HR: {max_hr}")
