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

valid_rows = [r for r in rows if r.get("sumDistance") is not None and r.get("directTimestamp") is not None]

# Warmup: 0 to 1400m
# 15 Reps of 400m fast + 400m recovery jog
reps_400m = []
recoveries_400m = []

start_warmup_dist = 1400.0

for i in range(15):
    fast_start_d = start_warmup_dist + (i * 800.0)
    fast_end_d = fast_start_d + 400.0
    rec_end_d = fast_end_d + 400.0
    
    # Extract rows for 400m fast
    fast_rows = [r for r in valid_rows if fast_start_d <= r.get("sumDistance", 0) <= fast_end_d]
    if len(fast_rows) < 2:
        # Fallback to closest bounds
        fast_rows = [r for r in valid_rows if abs(r.get("sumDistance", 0) - (fast_start_d + 200)) <= 210]
        
    d_fast = fast_rows[-1].get("sumDistance", 0) - fast_rows[0].get("sumDistance", 0) if fast_rows else 400.0
    t_start = fast_rows[0].get("directTimestamp", 0)
    t_end = fast_rows[-1].get("directTimestamp", 0)
    dur_s = (t_end - t_start) / 1000.0 if t_end > t_start else 0
    
    hrs = [r.get("directHeartRate") for r in fast_rows if r.get("directHeartRate")]
    cads = [r.get("directRunCadence") for r in fast_rows if r.get("directRunCadence")]
    speeds = [r.get("directSpeed") for r in fast_rows if r.get("directSpeed")]
    
    avg_hr = sum(hrs)/len(hrs) if hrs else 0
    max_hr = max(hrs) if hrs else 0
    avg_cad = (sum(cads)/len(cads))*2 if cads else 0
    
    pace_sec = (dur_s / d_fast) * 1000.0 if d_fast > 0 else 0
    pm = int(pace_sec // 60)
    ps = int(pace_sec % 60)
    
    max_sp = max(speeds) if speeds else 0
    max_p_sec = (1000.0 / max_sp) if max_sp > 0 else 0
    mpm = int(max_p_sec // 60)
    mps = int(max_p_sec % 60)

    # Recovery 400m jog
    if i < 14: # 14 recovery jogs between 15 reps
        rec_rows = [r for r in valid_rows if fast_end_d <= r.get("sumDistance", 0) <= rec_end_d]
        d_rec = rec_rows[-1].get("sumDistance", 0) - rec_rows[0].get("sumDistance", 0) if rec_rows else 400.0
        tr_start = rec_rows[0].get("directTimestamp", 0)
        tr_end = rec_rows[-1].get("directTimestamp", 0)
        dur_rec_s = (tr_end - tr_start) / 1000.0 if tr_end > tr_start else 0
        
        r_hrs = [r.get("directHeartRate") for r in rec_rows if r.get("directHeartRate")]
        rec_pace_sec = (dur_rec_s / d_rec) * 1000.0 if d_rec > 0 else 0
        rpm = int(rec_pace_sec // 60)
        rps = int(rec_pace_sec % 60)
        
        recoveries_400m.append({
            "rep": i + 1,
            "dur_s": dur_rec_s,
            "dur_str": f"{int(dur_rec_s//60)}:{int(dur_rec_s%60):02d}",
            "pace_str": f"{rpm}:{rps:02d}",
            "avg_hr": round(sum(r_hrs)/len(r_hrs), 1) if r_hrs else 0
        })

    rep_info = {
        "rep": i + 1,
        "dist_m": 400.0,
        "real_dist_m": round(d_fast, 1),
        "dur_s": round(dur_s, 1),
        "dur_str": f"{int(dur_s//60)}:{int(dur_s%60):02d}",
        "pace_str": f"{pm}:{ps:02d}",
        "max_pace_str": f"{mpm}:{mps:02d}",
        "avg_hr": round(avg_hr, 1),
        "max_hr": round(max_hr),
        "avg_cad": round(avg_cad)
    }
    reps_400m.append(rep_info)

print("=== EXACT 400M FAST REPS PARSED ===")
for r in reps_400m:
    print(f"Seria #{r['rep']:2d}: Dystans=400.0m | Czas={r['dur_str']} | Tempo śr={r['pace_str']}/km (max {r['max_pace_str']}) | HR avg={r['avg_hr']} max={r['max_hr']} | Kad={r['avg_cad']} spm")

with open("tmp/garmin_aug13_strict_400m_reps.json", "w", encoding="utf-8") as f:
    json.dump(reps_400m, f, indent=2, ensure_ascii=False)

with open("tmp/garmin_aug13_strict_400m_recovers.json", "w", encoding="utf-8") as f:
    json.dump(recoveries_400m, f, indent=2, ensure_ascii=False)
