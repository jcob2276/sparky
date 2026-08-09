import json, math

def get_exact_splits(act_id, name):
    with open(f"tmp/act_{act_id}_details.json", "r", encoding="utf-8") as f:
        details = json.load(f)
    
    descriptors = details.get("metricDescriptors", [])
    desc_map = {d.get("metricsIndex"): d.get("key") for d in descriptors if d.get("metricsIndex") is not None}
    
    dist_idx = next(i for i, k in desc_map.items() if k == "sumDistance")
    dur_idx = next(i for i, k in desc_map.items() if k == "sumDuration" or k == "sumElapsedDuration")
    hr_idx = next(i for i, k in desc_map.items() if k == "directHeartRate")
    cad_idx = next((i for i, k in desc_map.items() if k == "directDoubleCadence"), None)
    if cad_idx is None:
        cad_idx = next(i for i, k in desc_map.items() if k == "directRunCadence")
        cad_mult = 2
    else:
        cad_mult = 1
        
    elev_idx = next((i for i, k in desc_map.items() if k == "directCorrectedElevation" or k == "directElevation"), None)
    
    metrics = details.get("activityDetailMetrics", [])
    
    print(f"\n==========================================")
    print(f"   {name} (ID: {act_id})")
    print(f"==========================================")
    
    target_km = 1
    prev_dur = 0.0
    prev_dist = 0.0
    
    hrs = []
    cads = []
    elevs = []
    
    total_dist = 0
    total_dur = 0
    
    for m in metrics:
        vals = m.get("metrics", [])
        if not vals:
            continue
        d = vals[dist_idx]
        t = vals[dur_idx]
        hr = vals[hr_idx]
        cad = vals[cad_idx]
        el = vals[elev_idx] if elev_idx is not None else None
        
        if d is None or t is None:
            continue
            
        total_dist = d
        total_dur = t
        
        if hr is not None and hr > 0:
            hrs.append(hr)
        if cad is not None and cad > 0:
            cads.append(cad * cad_mult)
        if el is not None:
            elevs.append(el)
            
        if d >= target_km * 1000:
            km_dur = t - prev_dur
            km_dist = d - prev_dist
            pace_sec = km_dur / (km_dist / 1000)
            pm, ps = divmod(int(pace_sec), 60)
            
            avg_hr = sum(hrs)/len(hrs) if hrs else 0
            avg_cad = sum(cads)/len(cads) if cads else 0
            elev_diff = (elevs[-1] - elevs[0]) if len(elevs) > 1 else 0
            
            print(f"KM {target_km:02d}: Czas {int(km_dur//60)}:{int(km_dur%60):02d} | Tempo {pm}:{ps:02d}/km | HR: {avg_hr:.1f} bpm | Kaden: {avg_cad:.0f} spm")
            
            target_km += 1
            prev_dur = t
            prev_dist = d
            hrs = []
            cads = []
            elevs = []
            
    if prev_dist < total_dist:
        rem_dist = (total_dist - prev_dist) / 1000
        km_dur = total_dur - prev_dur
        if rem_dist > 0.01:
            pace_sec = km_dur / rem_dist
            pm, ps = divmod(int(pace_sec), 60)
            avg_hr = sum(hrs)/len(hrs) if hrs else 0
            avg_cad = sum(cads)/len(cads) if cads else 0
            print(f"KM {target_km:02d} ({rem_dist:.2f} km): Czas {int(km_dur//60)}:{int(km_dur%60):02d} | Tempo {pm}:{ps:02d}/km | HR: {avg_hr:.1f} bpm | Kaden: {avg_cad:.0f} spm")

get_exact_splits("23839065583", "DZISIEJSZY BIEG EASY RUN (3 SIERPNIA 2026)")
get_exact_splits("23816559852", "BIEG 25 KM (1 SIERPNIA 2026)")
