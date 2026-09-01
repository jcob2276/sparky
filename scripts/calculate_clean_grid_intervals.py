import json

with open("tmp/garmin_aug27_details.json", "r", encoding="utf-8") as f:
    data = json.load(f)

descriptors = data.get("metricDescriptors", [])
idx_to_key = {d.get("metricsIndex"): d.get("key") for d in descriptors}
metrics = data.get("activityDetailMetrics", [])

rows = []
for m in metrics:
    m_arr = m.get("metrics", [])
    row = {}
    for i, val in enumerate(m_arr):
        key = idx_to_key.get(i, f"idx_{i}")
        row[key] = val
    rows.append(row)

valid_rows = [r for r in rows if r.get("sumDistance") is not None and r.get("directTimestamp") is not None]

# Exact theoretical grid:
# Warmup: 0 - 1000m
# Interwał 1: 1000 - 1400m (Przerwa 1: 1400 - 1800m)
# Interwał 2: 1800 - 2200m (Przerwa 2: 2200 - 2600m)
# Interwał 3: 2600 - 3000m (Przerwa 3: 3000 - 3400m)
# Interwał 4: 3400 - 3800m (Przerwa 4: 3800 - 4200m)
# Interwał 5: 4200 - 4600m (Przerwa 5: 4600 - 5000m)
# Interwał 6: 5000 - 5400m (Przerwa 6: 5400 - 5800m)
# Interwał 7: 5800 - 6200m (Przerwa 7: 6200 - 6600m)
# Interwał 8: 6600 - 7000m (Przerwa 8: 7000 - 7400m)
# Interwał 9: 7400 - 7800m (Przerwa 9: 7800 - 8200m)
# Interwał 10: 8200 - 8600m (Przerwa 10: 8600 - 9000m)

reps_table = []

for i in range(10):
    start_d = 1000.0 + (i * 800.0)
    end_d = start_d + 400.0
    
    seg = [r for r in valid_rows if start_d <= r.get("sumDistance", 0) <= end_d]
    if len(seg) >= 2:
        t_start = seg[0].get("directTimestamp", 0)
        t_end = seg[-1].get("directTimestamp", 0)
        dur_s = (t_end - t_start) / 1000.0
        dist_m = seg[-1].get("sumDistance", 0) - seg[0].get("sumDistance", 0)
        
        hrs = [r.get("directHeartRate") for r in seg if r.get("directHeartRate")]
        cads = [r.get("directRunCadence") for r in seg if r.get("directRunCadence")]
        
        avg_hr = sum(hrs)/len(hrs) if hrs else 0
        max_hr = max(hrs) if hrs else 0
        min_hr = min(hrs) if hrs else 0
        avg_cad = (sum(cads)/len(cads))*2 if cads else 0
        max_cad = (max(cads))*2 if cads else 0
        
        pace_s = (dur_s / dist_m) * 1000.0 if dist_m > 0 else 0
        pm = int(pace_s // 60)
        ps = int(pace_s % 60)
        
        dur_m = int(dur_s // 60)
        dur_s_rem = int(dur_s % 60)
        
        rep_data = {
            "rep": i + 1,
            "range_km": f"{start_d/1000:.1f} – {end_d/1000:.1f} km",
            "dist_m": round(dist_m, 1),
            "dur_str": f"{dur_m:02d}:{dur_s_rem:02d}",
            "pace_str": f"{pm}:{ps:02d}",
            "min_hr": round(min_hr),
            "avg_hr": round(avg_hr, 1),
            "max_hr": round(max_hr),
            "avg_cad": round(avg_cad),
            "max_cad": round(max_cad)
        }
        reps_table.append(rep_data)

print("=== EXACT CLEAN GRID 10x 400M REPS ===")
for r in reps_table:
    print(f"Seria #{r['rep']:2d} ({r['range_km']}): Czas={r['dur_str']} | Tempo={r['pace_str']}/km | HR avg={r['avg_hr']} (max {r['max_hr']}) | Kad={r['avg_cad']} spm")

with open("tmp/clean_grid_reps.json", "w", encoding="utf-8") as f:
    json.dump(reps_table, f, indent=2, ensure_ascii=False)
