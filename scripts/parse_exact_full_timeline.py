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
t0 = valid_rows[0].get("directTimestamp", 0)

# Full 1km splits of the whole run
km_splits = []
prev_d = 0
prev_t = t0
target_km = 1000
km_num = 1

for r in valid_rows:
    d = r.get("sumDistance", 0)
    t = r.get("directTimestamp", 0)
    if d >= target_km:
        seg = [x for x in valid_rows if prev_d <= x.get("sumDistance", 0) <= d]
        dur_s = (t - prev_t) / 1000.0
        hrs = [x.get("directHeartRate") for x in seg if x.get("directHeartRate")]
        cads = [x.get("directRunCadence") for x in seg if x.get("directRunCadence")]
        avg_hr = sum(hrs)/len(hrs) if hrs else 0
        max_hr = max(hrs) if hrs else 0
        avg_cad = (sum(cads)/len(cads))*2 if cads else 0
        pace_s = (dur_s / (d - prev_d)) * 1000.0
        
        km_splits.append({
            "km": km_num,
            "dist": round(d - prev_d, 1),
            "dur_str": f"{int(dur_s//60):02d}:{int(dur_s%60):02d}",
            "pace_str": f"{int(pace_s//60)}:{int(pace_s%60):02d}",
            "avg_hr": round(avg_hr, 1),
            "max_hr": round(max_hr),
            "avg_cad": round(avg_cad)
        })
        prev_d = d
        prev_t = t
        target_km += 1000
        km_num += 1

if valid_rows:
    last_r = valid_rows[-1]
    d = last_r.get("sumDistance", 0)
    t = last_r.get("directTimestamp", 0)
    if d - prev_d > 20:
        seg = [x for x in valid_rows if x.get("sumDistance", 0) >= prev_d]
        dur_s = (t - prev_t) / 1000.0
        hrs = [x.get("directHeartRate") for x in seg if x.get("directHeartRate")]
        cads = [x.get("directRunCadence") for x in seg if x.get("directRunCadence")]
        avg_hr = sum(hrs)/len(hrs) if hrs else 0
        max_hr = max(hrs) if hrs else 0
        avg_cad = (sum(cads)/len(cads))*2 if cads else 0
        pace_s = (dur_s / (d - prev_d)) * 1000.0
        km_splits.append({
            "km": f"{km_num} (finisz)",
            "dist": round(d - prev_d, 1),
            "dur_str": f"{int(dur_s//60):02d}:{int(dur_s%60):02d}",
            "pace_str": f"{int(pace_s//60)}:{int(pace_s%60):02d}",
            "avg_hr": round(avg_hr, 1),
            "max_hr": round(max_hr),
            "avg_cad": round(avg_cad)
        })

print("=== CAŁE SPLITY KILOMETROWE (KM 1 - KM 9.44) ===")
for k in km_splits:
    print(f"KM {k['km']}: Dystans={k['dist']}m | Czas={k['dur_str']} | Tempo={k['pace_str']}/km | HR avg={k['avg_hr']} (max {k['max_hr']}) | Kad={k['avg_cad']} spm")

with open("tmp/aug27_km_splits_full.json", "w", encoding="utf-8") as f:
    json.dump(km_splits, f, indent=2, ensure_ascii=False)
