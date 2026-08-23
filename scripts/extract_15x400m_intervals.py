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
print(f"Total valid stream samples: {len(valid_rows)}")

# Print speed profile / smoothed speed to detect 15 fast 400m segments
# 400m rep pace is fast (speed > 3.2 m/s or pace < 5:12/km, max speed reaching 4.2 m/s = 3:58/km)

# Let's inspect distance and speed across the run
interval_candidates = []
in_fast = False
start_idx = 0

for i in range(1, len(valid_rows)):
    prev_r = valid_rows[i-1]
    r = valid_rows[i]
    spd = r.get("directSpeed", 0)
    
    # Threshold for fast 400m rep: speed > 3.0 m/s (4:26 min/km -> 3:58 min/km)
    if spd >= 3.0 and not in_fast:
        in_fast = True
        start_idx = i
    elif spd < 2.6 and in_fast:
        in_fast = False
        end_idx = i
        
        # Calculate distance of this fast segment
        dist_start = valid_rows[start_idx].get("sumDistance", 0)
        dist_end = valid_rows[end_idx].get("sumDistance", 0)
        seg_dist = dist_end - dist_start
        
        t_start = valid_rows[start_idx].get("directTimestamp", 0)
        t_end = valid_rows[end_idx].get("directTimestamp", 0)
        dur_s = (t_end - t_start) / 1000.0
        
        if seg_dist >= 150: # Only count significant reps
            interval_candidates.append((start_idx, end_idx, seg_dist, dur_s))

print(f"\nFound {len(interval_candidates)} candidate fast reps (speed threshold):")
for idx, (s, e, d, t) in enumerate(interval_candidates):
    s_dist = valid_rows[s].get("sumDistance", 0)
    hrs = [valid_rows[k].get("directHeartRate") for k in range(s, e+1) if valid_rows[k].get("directHeartRate")]
    cads = [valid_rows[k].get("directRunCadence") for k in range(s, e+1) if valid_rows[k].get("directRunCadence")]
    avg_hr = sum(hrs)/len(hrs) if hrs else 0
    max_hr = max(hrs) if hrs else 0
    avg_cad = (sum(cads)/len(cads))*2 if cads else 0
    
    pace_sec = (t / d) * 1000 if d > 0 else 0
    pm = int(pace_sec // 60)
    ps = int(pace_sec % 60)
    
    print(f"Rep {idx+1:2d}: Dist={d:5.1f}m | Czas={t:4.1f}s ({int(t//60)}:{int(t%60):02d}) | Tempo={pm}:{ps:02d}/km | HR avg={avg_hr:5.1f} max={max_hr:3.0f} | StartDist={s_dist/1000:.2f}km | Kad={avg_cad:.0f}spm")
