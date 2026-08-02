import json

with open("tmp/today_2_activities_analyzed.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for act_id, item in data.items():
    raw_summary = item.get("summary", {})
    # Garmin get_activity returns summaryDTO or top-level keys
    summary = raw_summary.get("summaryDTO") or raw_summary.get("activityDetailMetrics") or raw_summary
    metadata = raw_summary.get("metadataDTO") or raw_summary
    
    name = raw_summary.get("activityName") or summary.get("activityName") or "Activity"
    start = raw_summary.get("startTimeLocal") or summary.get("startTimeLocal")
    dur = raw_summary.get("duration") or summary.get("duration") or 0
    avg_hr = raw_summary.get("averageHR") or summary.get("averageHR")
    max_hr = raw_summary.get("maxHR") or summary.get("maxHR")
    cal = raw_summary.get("calories") or summary.get("calories")
    
    zones = item.get("zones")
    samples = item.get("samples") or []
    
    print(f"\n=======================================================")
    print(f"ACTIVITY ID: {act_id} - {name}")
    print(f"=======================================================")
    print(f"Start: {start}")
    print(f"Total Duration: {dur//60:.0f}m {dur%60:.0f}s ({dur}s)")
    print(f"Calories: {cal}")
    print(f"Avg HR: {avg_hr} bpm | Max HR: {max_hr} bpm")
    
    print("\n--- ZONES ---")
    if isinstance(zones, list):
        for z in zones:
            sec = z.get('secsInZone', 0)
            m, s = divmod(int(sec), 60)
            print(f"  {z.get('zoneName')} ({z.get('zoneLowBoundary')}-{z.get('zoneHighBoundary')} bpm): {m}m {s:02d}s")
            
    print(f"\n--- TIMELINE SAMPLES (Total: {len(samples)}) ---")
    if samples:
        step = max(1, len(samples) // 20)
        for i in range(0, len(samples), step):
            s = samples[i]
            el = s.get('elapsed')
            hr = s.get('hr')
            spd = s.get('speed')
            if el is not None and hr is not None:
                m, sec = divmod(int(el), 60)
                spd_str = f" | Speed: {spd*3.6:.1f} km/h" if spd is not None else ""
                print(f"  [{m:02d}:{sec:02d}] HR: {hr:3.0f} bpm{spd_str}")
        
        # Max HR sample
        valid_samples = [x for x in samples if x.get('hr') is not None]
        if valid_samples:
            max_s = max(valid_samples, key=lambda x: x.get('hr', 0))
            m, sec = divmod(int(max_s['elapsed']), 60)
            print(f"\n  >>> PEAK HR: {max_s['hr']} bpm at [{m:02d}:{sec:02d}] <<<")
            
            print("\n  --- LAST 10 SAMPLES / RECOVERY ---")
            for s in valid_samples[-10:]:
                el = s.get('elapsed')
                hr = s.get('hr')
                m, sec = divmod(int(el), 60)
                print(f"  [{m:02d}:{sec:02d}] HR: {hr:3.0f} bpm")
