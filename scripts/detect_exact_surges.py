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

valid_rows = [r for r in rows if r.get("sumDistance") is not None and r.get("directSpeed") is not None]

print(f"Total samples: {len(valid_rows)}")
t0 = valid_rows[0].get("directTimestamp", 0)

# Let's find all high speed surges (speed > 3.0 m/s or pace < 5:33/km)
surges = []
in_surge = False
start_idx = 0

for i in range(len(valid_rows)):
    r = valid_rows[i]
    spd = r.get("directSpeed", 0)
    # Surge threshold
    if spd >= 2.9 and not in_surge:
        in_surge = True
        start_idx = i
    elif spd < 2.5 and in_surge:
        in_surge = False
        end_idx = i
        d_start = valid_rows[start_idx].get("sumDistance", 0)
        d_end = valid_rows[end_idx].get("sumDistance", 0)
        dur = (valid_rows[end_idx].get("directTimestamp", 0) - valid_rows[start_idx].get("directTimestamp", 0)) / 1000.0
        dist = d_end - d_start
        if dist >= 100: # significant surge
            t_start_s = (valid_rows[start_idx].get("directTimestamp", 0) - t0) / 1000.0
            t_end_s = (valid_rows[end_idx].get("directTimestamp", 0) - t0) / 1000.0
            surges.append({
                "start_idx": start_idx,
                "end_idx": end_idx,
                "d_start": d_start,
                "d_end": d_end,
                "dist": dist,
                "dur": dur,
                "t_start_min": f"{int(t_start_s//60)}:{int(t_start_s%60):02d}",
                "t_end_min": f"{int(t_end_s//60)}:{int(t_end_s%60):02d}",
            })

print(f"Detected {len(surges)} fast surges in the stream:")
for idx, s in enumerate(surges):
    seg = valid_rows[s['start_idx']:s['end_idx']+1]
    hrs = [x.get("directHeartRate") for x in seg if x.get("directHeartRate")]
    cads = [x.get("directRunCadence") for x in seg if x.get("directRunCadence")]
    avg_hr = sum(hrs)/len(hrs) if hrs else 0
    max_hr = max(hrs) if hrs else 0
    avg_cad = (sum(cads)/len(cads))*2 if cads else 0
    pace_s = (s['dur'] / s['dist']) * 1000.0 if s['dist'] > 0 else 0
    pm = int(pace_s // 60)
    ps = int(pace_s % 60)
    print(f"Surge {idx+1:2d}: Od {s['d_start']:6.1f}m do {s['d_end']:6.1f}m (Dystans={s['dist']:5.1f}m) | Czas biegu: {s['t_start_min']} -> {s['t_end_min']} ({s['dur']:4.1f}s) | Tempo: {pm}:{ps:02d}/km | HR: {avg_hr:.1f} (max {max_hr}) | Kad: {avg_cad:.0f}")

