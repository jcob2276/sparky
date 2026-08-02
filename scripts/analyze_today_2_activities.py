import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timezone, timedelta

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

garth.resume(TOKENS)
api = Garmin()
api.get_user_profile()

act1_id = 23802715175 # Krosno Chodzenie (Gra w piłeczkę)
act2_id = 23804435667 # Kardio (Sauna 10m + ochłodzenie)

def analyze_act(act_id, label):
    print(f"\n=======================================================")
    print(f"ANALYZING ACTIVITY: {label} (ID: {act_id})")
    print(f"=======================================================")
    summary = api.get_activity(act_id)
    print(f"Name: {summary.get('activityName')}")
    print(f"Type: {summary.get('activityType', {}).get('typeKey')}")
    print(f"Start: {summary.get('startTimeLocal')}")
    print(f"Duration: {summary.get('duration')}s (moving: {summary.get('movingDuration')}s)")
    print(f"Avg HR: {summary.get('averageHR')} | Max HR: {summary.get('maxHR')}")
    print(f"Calories: {summary.get('calories')}")
    if summary.get('distance'):
        print(f"Distance: {summary.get('distance')/1000:.2f} km")
    
    # Save summary
    with open(f"tmp/{label}_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
        
    # Zones
    try:
        zones = api.get_activity_hr_in_timezones(act_id)
        print("\nHR Zones:")
        for z in zones:
            print(f"  {z.get('zoneName')} ({z.get('secsInZone')}s / {z.get('secsInZone', 0)//60}m) : {z.get('zoneLowBoundary')} - {z.get('zoneHighBoundary')} bpm")
        with open(f"tmp/{label}_zones.json", "w", encoding="utf-8") as f:
            json.dump(zones, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print("Zones error:", e)

    # Details per sec
    try:
        details = api.get_activity_details(act_id, maxchart=1000)
        with open(f"tmp/{label}_details.json", "w", encoding="utf-8") as f:
            json.dump(details, f, indent=2, ensure_ascii=False)
            
        descriptors = details.get("metricDescriptors", [])
        desc_map = {d.get("metricsIndex"): d.get("key") or d.get("metricType") for d in descriptors if d.get("metricsIndex") is not None}
        metrics = details.get("activityDetailMetrics", [])
        
        hr_idx = next((i for i, k in desc_map.items() if "heartrate" in str(k).lower() or "heart_rate" in str(k).lower()), None)
        el_idx = next((i for i, k in desc_map.items() if "elapsed" in str(k).lower() or "timestamp" in str(k).lower()), None)
        spd_idx = next((i for i, k in desc_map.items() if "directspeed" in str(k).lower() or "speed" in str(k).lower()), None)
        
        samples = []
        for m in metrics:
            vals = m.get("metrics", []) if isinstance(m, dict) else (m if isinstance(m, list) else [])
            hr_val = vals[hr_idx] if hr_idx is not None and hr_idx < len(vals) else None
            el_val = vals[el_idx] if el_idx is not None and el_idx < len(vals) else None
            spd_val = vals[spd_idx] if spd_idx is not None and spd_idx < len(vals) else None
            if hr_val is not None:
                samples.append((el_val, hr_val, spd_val))
                
        print(f"\nExtracted {len(samples)} HR samples.")
        if samples:
            # Print timeline every ~1-2 min
            step = max(1, len(samples) // 15)
            print("Timeline sample (elapsed_s, HR, speed m/s):")
            for idx in range(0, len(samples), step):
                el, hr, spd = samples[idx]
                min_sec = f"{int(el)//60:02d}:{int(el)%60:02d}" if el is not None else "??"
                spd_kmh = f"{spd * 3.6:.1f} km/h" if spd is not None else "-"
                print(f"  [{min_sec}] HR: {hr} bpm | Speed: {spd_kmh}")
            # Also print the absolute max HR point
            max_sample = max(samples, key=lambda x: x[1])
            el, hr, spd = max_sample
            min_sec = f"{int(el)//60:02d}:{int(el)%60:02d}" if el is not None else "??"
            print(f"  MAX HR point: [{min_sec}] HR: {hr} bpm")
    except Exception as e:
        print("Details error:", e)

analyze_act(act1_id, "pilka_trucht")
analyze_act(act2_id, "sauna_kardio")
