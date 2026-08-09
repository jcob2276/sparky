import json

def analyze_km_splits(act_id):
    with open(f"tmp/act_{act_id}_details.json", "r", encoding="utf-8") as f:
        details = json.load(f)
    
    descriptors = details.get("metricDescriptors", [])
    desc_map = {d.get("metricsIndex"): d.get("key") or d.get("metricType") for d in descriptors if d.get("metricsIndex") is not None}
    
    # print keys
    # print("Keys:", desc_map)
    
    metrics = details.get("activityDetailMetrics", [])
    
    dist_idx = next((i for i, k in desc_map.items() if "distance" in str(k).lower()), None)
    time_idx = next((i for i, k in desc_map.items() if "sumelapsedduration" in str(k).lower() or "directtimestamp" in str(k).lower() or "duration" in str(k).lower()), None)
    hr_idx = next((i for i, k in desc_map.items() if "heartrate" in str(k).lower() or "heart_rate" in str(k).lower()), None)
    cad_idx = next((i for i, k in desc_map.items() if "cadence" in str(k).lower() or "steps" in str(k).lower()), None)
    elev_idx = next((i for i, k in desc_map.items() if "elevation" in str(k).lower() or "altitude" in str(k).lower()), None)
    speed_idx = next((i for i, k in desc_map.items() if "speed" in str(k).lower()), None)
    
    print(f"Indices -> Dist: {dist_idx}, Time: {time_idx}, HR: {hr_idx}, Cadence: {cad_idx}, Elev: {elev_idx}, Speed: {speed_idx}")

    curr_km = 1
    km_start_time = 0
    km_start_dist = 0
    hrs = []
    cads = []
    
    print(f"\n--- KM SPLITS FOR ACTIVITY {act_id} ---")
    for m in metrics:
        vals = m.get("metrics", [])
        if not vals:
            continue
        d = vals[dist_idx] if dist_idx is not None and dist_idx < len(vals) else None
        t = vals[time_idx] if time_idx is not None and time_idx < len(vals) else None
        hr = vals[hr_idx] if hr_idx is not None and hr_idx < len(vals) else None
        cad = vals[cad_idx] if cad_idx is not None and cad_idx < len(vals) else None
        
        if hr is not None:
            hrs.append(hr)
        if cad is not None:
            cads.append(cad)
            
        if d is not None and d >= curr_km * 1000:
            dur_km = (t - km_start_time) if t and km_start_time else 0
            if dur_km <= 0:
                # estimate from previous sample
                dur_km = 0
            m_p, s_p = divmod(int(dur_km), 60)
            avg_hr_km = sum(hrs)/len(hrs) if hrs else 0
            avg_cad_km = sum(cads)/len(cads) if cads else 0
            print(f"KM {curr_km:02d}: Time {m_p}:{s_p:02d} | Pace {m_p}:{s_p:02d}/km | Avg HR: {avg_hr_km:.1f} bpm | Cadence: {avg_cad_km:.1f}")
            
            curr_km += 1
            km_start_time = t
            km_start_dist = d
            hrs = []
            cads = []
            
    # last partial km
    if hrs and d is not None and d > (curr_km-1)*1000:
        rem_dist = (d - (curr_km-1)*1000) / 1000
        dur_km = (t - km_start_time) if t and km_start_time else 0
        pace_s = dur_km / rem_dist if rem_dist > 0 else 0
        m_p, s_p = divmod(int(pace_s), 60)
        avg_hr_km = sum(hrs)/len(hrs) if hrs else 0
        avg_cad_km = sum(cads)/len(cads) if cads else 0
        print(f"KM {curr_km:02d} (partial {rem_dist:.2f}km): Time {int(dur_km//60)}:{int(dur_km%60):02d} | Pace {m_p}:{s_p:02d}/km | Avg HR: {avg_hr_km:.1f} bpm | Cadence: {avg_cad_km:.1f}")

print("TODAY RUN (AUG 3):")
analyze_km_splits("23839065583")
print("\n" + "="*60 + "\n")
print("SATURDAY 25KM RUN (AUG 1):")
analyze_km_splits("23816559852")
