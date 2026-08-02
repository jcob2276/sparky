import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")

print("Logging in to Garmin Connect...")
api = Garmin(EMAIL, PASSWORD)
api.login()
print("Logged in successfully!")

acts = api.get_activities(0, 10)
print(f"\nFetched {len(acts)} activities:")
for i, a in enumerate(acts):
    act_id = a.get('activityId')
    start = a.get('startTimeLocal')
    name = a.get('activityName')
    act_type = a.get('activityType', {}).get('typeKey')
    avg_hr = a.get('averageHR')
    max_hr = a.get('maxHR')
    dur = (a.get('duration') or 0) // 60
    dist = (a.get('distance') or 0) / 1000
    print(f"[{i}] ID: {act_id} | Start: {start} | Type: {act_type} | Name: {name} | Dist: {dist:.2f}km | Dur: {dur}m | Avg HR: {avg_hr} | Max HR: {max_hr}")

# Find today's two activities
# 1. Piłeczka / Chodzenie (start ~17:09) - ID 23802715175
# 2. Kardio / Sauna (start ~20:54) - ID 23804435667

results = {}
for act_id in [23802715175, 23804435667]:
    print(f"\n---------------------------------------------")
    print(f"Fetching details for {act_id}...")
    summary = api.get_activity(act_id)
    name = summary.get("activityName")
    
    # zones
    try:
        zones = api.get_activity_hr_in_timezones(act_id)
    except Exception as e:
        zones = str(e)
        
    # details / streams
    samples = []
    try:
        details = api.get_activity_details(act_id)
        descriptors = details.get("metricDescriptors", [])
        desc_map = {d.get("metricsIndex"): d.get("key") or d.get("metricType") for d in descriptors if d.get("metricsIndex") is not None}
        metrics = details.get("activityDetailMetrics", [])
        
        hr_idx = next((i for i, k in desc_map.items() if "heartrate" in str(k).lower() or "heart_rate" in str(k).lower()), None)
        el_idx = next((i for i, k in desc_map.items() if "elapsed" in str(k).lower() or "timestamp" in str(k).lower()), None)
        spd_idx = next((i for i, k in desc_map.items() if "directspeed" in str(k).lower() or "speed" in str(k).lower()), None)
        
        for m in metrics:
            vals = m.get("metrics", []) if isinstance(m, dict) else (m if isinstance(m, list) else [])
            hr_val = vals[hr_idx] if hr_idx is not None and hr_idx < len(vals) else None
            el_val = vals[el_idx] if el_idx is not None and el_idx < len(vals) else None
            spd_val = vals[spd_idx] if spd_idx is not None and spd_idx < len(vals) else None
            if hr_val is not None:
                samples.append({"elapsed": el_val, "hr": hr_val, "speed": spd_val})
    except Exception as e:
        print(f"Details error: {e}")
        
    results[act_id] = {
        "summary": summary,
        "zones": zones,
        "samples_count": len(samples),
        "samples": samples
    }

with open("tmp/today_2_activities_analyzed.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("\nSUCCESS! Saved to tmp/today_2_activities_analyzed.json")
