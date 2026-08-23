import json

with open("tmp/garmin_aug13_details.json", "r", encoding="utf-8") as f:
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

valid_rows = [r for r in rows if r.get("sumDistance") is not None and r.get("directSpeed") is not None]

# We know warmup ends around dist = 1430m
# The 15 interval reps start around 1.43km and end around 13.0km
# Let's write an algorithm to precisely partition the 15 fast 400m reps and 14 recovery breaks between them

reps_raw_starts = [
    1430, 2240, 3030, 3840, 4640, 5420, 6240, 7020, 7830, 8630, 9440, 10280, 11020, 11830, 12580
]

parsed_reps = []
parsed_recoveries = []

for idx, start_d in enumerate(reps_raw_starts):
    # Find start sample (where speed starts rising above 3.0 m/s around start_d)
    start_candidates = [i for i, r in enumerate(valid_rows) if abs(r.get("sumDistance", 0) - start_d) < 150]
    
    # Pick local peak speed start
    best_start = min(start_candidates, key=lambda i: abs(valid_rows[i].get("sumDistance", 0) - start_d))
    
    # Track forward ~400m
    d0 = valid_rows[best_start].get("sumDistance", 0)
    end_candidates = [i for i in range(best_start, len(valid_rows)) if 370 <= valid_rows[i].get("sumDistance", 0) - d0 <= 440]
    if not end_candidates:
        end_candidates = [i for i in range(best_start, len(valid_rows)) if valid_rows[i].get("sumDistance", 0) - d0 >= 350]
    best_end = end_candidates[0] if end_candidates else best_start + 20

    rep_rows = valid_rows[best_start:best_end+1]
    
    dist_m = rep_rows[-1].get("sumDistance", 0) - rep_rows[0].get("sumDistance", 0)
    t_start = rep_rows[0].get("directTimestamp", 0)
    t_end = rep_rows[-1].get("directTimestamp", 0)
    dur_s = (t_end - t_start) / 1000.0
    
    hrs = [r.get("directHeartRate") for r in rep_rows if r.get("directHeartRate")]
    cads = [r.get("directRunCadence") for r in rep_rows if r.get("directRunCadence")]
    speeds = [r.get("directSpeed") for r in rep_rows if r.get("directSpeed")]
    
    avg_hr = sum(hrs)/len(hrs) if hrs else 0
    max_hr = max(hrs) if hrs else 0
    min_hr = min(hrs) if hrs else 0
    avg_cad = (sum(cads)/len(cads))*2 if cads else 0
    max_cad = (max(cads))*2 if cads else 0
    
    pace_sec = (dur_s / dist_m) * 1000 if dist_m > 0 else 0
    pm = int(pace_sec // 60)
    ps = int(pace_sec % 60)
    
    max_speed_m_s = max(speeds) if speeds else 0
    max_pace_sec = (1000.0 / max_speed_m_s) if max_speed_m_s > 0 else 0
    mpm = int(max_pace_sec // 60)
    mps = int(max_pace_sec % 60)

    rep_info = {
        "rep": idx + 1,
        "start_dist_km": round(d0 / 1000.0, 2),
        "dist_m": round(dist_m, 1),
        "dur_s": round(dur_s, 1),
        "dur_str": f"{int(dur_s//60)}:{int(dur_s%60):02d}",
        "pace_str": f"{pm}:{ps:02d}",
        "max_pace_str": f"{mpm}:{mps:02d}",
        "avg_hr": round(avg_hr, 1),
        "max_hr": round(max_hr),
        "min_hr": round(min_hr),
        "avg_cad": round(avg_cad),
        "max_cad": round(max_cad)
    }
    parsed_reps.append(rep_info)

print("=== 15 REPS PARSED ===")
for r in parsed_reps:
    print(f"Rep {r['rep']:2d}: Dystans={r['dist_m']}m | Czas={r['dur_str']} | Tempo={r['pace_str']}/km (max {r['max_pace_str']}) | HR avg={r['avg_hr']} max={r['max_hr']} | Kad={r['avg_cad']}spm")

with open("tmp/garmin_aug13_15reps_parsed.json", "w", encoding="utf-8") as f:
    json.dump(parsed_reps, f, indent=2, ensure_ascii=False)
