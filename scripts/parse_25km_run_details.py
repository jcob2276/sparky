import json

with open("tmp/run_25km_summary.json", "r", encoding="utf-8") as f:
    raw_summary = json.load(f)

summary = raw_summary.get("summaryDTO") or raw_summary.get("activityDetailMetrics") or raw_summary

start = raw_summary.get("startTimeLocal") or summary.get("startTimeLocal")
dist = raw_summary.get("distance") or summary.get("distance") or 25010
dur = raw_summary.get("duration") or summary.get("duration") or 9600
avg_hr = raw_summary.get("averageHR") or summary.get("averageHR")
max_hr = raw_summary.get("maxHR") or summary.get("maxHR")
cal = raw_summary.get("calories") or summary.get("calories")

print("=== 25KM RUN SUMMARY ===")
print("Start:", start)
print(f"Distance: {dist/1000:.2f} km")
print(f"Duration: {dur//60:.0f} min {dur%60:.0f} s ({dur} s)")
pace = (dur / 60) / (dist / 1000)
print(f"Pace: {int(pace)}:{int((pace%1)*60):02d} min/km")
print(f"Avg HR: {avg_hr} | Max HR: {max_hr}")
print(f"Calories: {cal} kcal")

try:
    with open("tmp/run_25km_zones.json", "r", encoding="utf-8") as f:
        zones = json.load(f)
    print("\n--- HR ZONES ---")
    if isinstance(zones, list):
        for z in zones:
            sec = z.get('secsInZone', 0)
            m, s = divmod(int(sec), 60)
            print(f"  {z.get('zoneName')} ({z.get('zoneLowBoundary')}-{z.get('zoneHighBoundary')} bpm): {m}m {s:02d}s")
except Exception as e:
    print("Zones parse error:", e)

try:
    with open("tmp/run_25km_details.json", "r", encoding="utf-8") as f:
        details = json.load(f)
    descriptors = details.get("metricDescriptors", [])
    desc_map = {d.get("metricsIndex"): d.get("key") or d.get("metricType") for d in descriptors if d.get("metricsIndex") is not None}
    metrics = details.get("activityDetailMetrics", [])
    
    hr_idx = next((i for i, k in desc_map.items() if "heartrate" in str(k).lower() or "heart_rate" in str(k).lower()), None)
    el_idx = next((i for i, k in desc_map.items() if "elapsed" in str(k).lower() or "timestamp" in str(k).lower()), None)
    
    samples = []
    for m in metrics:
        vals = m.get("metrics", []) if isinstance(m, dict) else (m if isinstance(m, list) else [])
        hr_val = vals[hr_idx] if hr_idx is not None and hr_idx < len(vals) else None
        el_val = vals[el_idx] if el_idx is not None and el_idx < len(vals) else None
        if hr_val is not None and el_val is not None:
            samples.append((el_val, hr_val))
            
    print(f"\nExtracted {len(samples)} HR samples.")
    if samples:
        print(f"First HR sample at 00:00 -> {samples[0][1]} bpm")
        step = max(1, len(samples) // 10)
        for idx in range(0, len(samples), step):
            el, hr = samples[idx]
            m = int(el)//60
            s = int(el)%60
            print(f"  [{m:03d}:{s:02d}] HR: {hr} bpm")
except Exception as e:
    print("Details parse error:", e)
