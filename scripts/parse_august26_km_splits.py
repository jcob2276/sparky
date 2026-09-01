import json

with open("tmp/garmin_aug26_details.json", "r", encoding="utf-8") as f:
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

valid_rows = [r for r in rows if r.get("sumDistance") is not None]

prev_dist = 0
km_target = 1000
km_count = 1
splits_data = []

for r in valid_rows:
    dist = r.get("sumDistance", 0)
    
    if dist >= km_target:
        seg_rows = [x for x in valid_rows if prev_dist <= x.get("sumDistance", 0) <= dist]
        seg_dist = dist - prev_dist
        
        t_start = seg_rows[0].get("directTimestamp", 0)
        t_end = seg_rows[-1].get("directTimestamp", 0)
        dur_s = (t_end - t_start) / 1000.0 if (t_end > t_start) else 0
        
        hrs = [x.get("directHeartRate") for x in seg_rows if x.get("directHeartRate") is not None]
        cads = [x.get("directRunCadence") for x in seg_rows if x.get("directRunCadence") is not None]
        elevs = [x.get("directElevation") for x in seg_rows if x.get("directElevation") is not None]
        
        avg_hr = sum(hrs) / len(hrs) if hrs else 0
        max_hr = max(hrs) if hrs else 0
        min_hr = min(hrs) if hrs else 0
        avg_cad = (sum(cads) / len(cads))*2 if cads else 0
        max_cad = (max(cads))*2 if cads else 0
        
        elev_gain = sum(max(0, elevs[i] - elevs[i-1]) for i in range(1, len(elevs))) if len(elevs) > 1 else 0
        elev_loss = sum(max(0, elevs[i-1] - elevs[i]) for i in range(1, len(elevs))) if len(elevs) > 1 else 0

        pace_sec_km = (dur_s / seg_dist) * 1000 if seg_dist > 0 else 0
        pm = int(pace_sec_km // 60)
        ps = int(pace_sec_km % 60)
        
        dur_m = int(dur_s // 60)
        dur_s_rem = int(dur_s % 60)

        split_info = {
            "km": km_count,
            "dist": seg_dist,
            "duration": f"{dur_m:02d}:{dur_s_rem:02d}",
            "dur_s": dur_s,
            "pace": f"{pm}:{ps:02d}",
            "min_hr": round(min_hr),
            "avg_hr": round(avg_hr, 1),
            "max_hr": round(max_hr),
            "avg_cad": round(avg_cad),
            "max_cad": round(max_cad),
            "elev_gain": round(elev_gain, 1),
            "elev_loss": round(elev_loss, 1)
        }
        splits_data.append(split_info)

        print(f"KM {km_count:2d}: {seg_dist:5.1f}m | Czas: {dur_m:02d}:{dur_s_rem:02d} | Tempo: {pm}:{ps:02d}/km | HR: {min_hr:3.0f} - {avg_hr:5.1f} - {max_hr:3.0f} | Kad: {avg_cad:3.0f}/{max_cad:3.0f} spm | Elev: +{elev_gain:4.1f}m/-{elev_loss:4.1f}m")
        
        prev_dist = dist
        km_count += 1
        km_target += 1000

if valid_rows:
    last_r = valid_rows[-1]
    dist = last_r.get("sumDistance", 0)
    if dist - prev_dist > 10:
        seg_rows = [x for x in valid_rows if x.get("sumDistance", 0) >= prev_dist]
        seg_dist = dist - prev_dist
        t_start = seg_rows[0].get("directTimestamp", 0)
        t_end = seg_rows[-1].get("directTimestamp", 0)
        dur_s = (t_end - t_start) / 1000.0
        hrs = [x.get("directHeartRate") for x in seg_rows if x.get("directHeartRate") is not None]
        cads = [x.get("directRunCadence") for x in seg_rows if x.get("directRunCadence") is not None]
        elevs = [x.get("directElevation") for x in seg_rows if x.get("directElevation") is not None]
        avg_hr = sum(hrs) / len(hrs) if hrs else 0
        max_hr = max(hrs) if hrs else 0
        min_hr = min(hrs) if hrs else 0
        avg_cad = (sum(cads) / len(cads))*2 if cads else 0
        max_cad = (max(cads))*2 if cads else 0
        pace_sec_km = (dur_s / seg_dist) * 1000 if seg_dist > 0 else 0
        pm = int(pace_sec_km // 60)
        ps = int(pace_sec_km % 60)
        dur_m = int(dur_s // 60)
        dur_s_rem = int(dur_s % 60)
        
        split_info = {
            "km": f"{km_count} (finisz)",
            "dist": seg_dist,
            "duration": f"{dur_m:02d}:{dur_s_rem:02d}",
            "dur_s": dur_s,
            "pace": f"{pm}:{ps:02d}",
            "min_hr": round(min_hr),
            "avg_hr": round(avg_hr, 1),
            "max_hr": round(max_hr),
            "avg_cad": round(avg_cad),
            "max_cad": round(max_cad),
            "elev_gain": round(elev_gain, 1),
            "elev_loss": round(elev_loss, 1)
        }
        splits_data.append(split_info)
        print(f"KM {km_count:2d} (Finisz {seg_dist:.1f}m): Czas: {dur_m:02d}:{dur_s_rem:02d} | Tempo: {pm}:{ps:02d}/km | HR: {min_hr:3.0f} - {avg_hr:5.1f} - {max_hr:3.0f} | Kad: {avg_cad:3.0f}/{max_cad:3.0f} spm")

with open("tmp/aug26_km_splits_parsed.json", "w", encoding="utf-8") as f:
    json.dump(splits_data, f, indent=2, ensure_ascii=False)
