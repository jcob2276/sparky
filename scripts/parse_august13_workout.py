import json

with open("tmp/garmin_aug13_laps.json", "r", encoding="utf-8") as f:
    laps_data = json.load(f)

laps = laps_data.get("lapDTOs", [])
print(f"Total laps in activity: {len(laps)}")

print("\n=== LAPS SUMMARY ===")
for i, l in enumerate(laps):
    idx = l.get("lapIndex")
    dist = l.get("distance", 0)
    dur = l.get("duration", 0)
    moving_dur = l.get("movingDuration", 0)
    avg_hr = l.get("averageHR")
    max_hr = l.get("maxHR")
    avg_speed = l.get("averageMovingSpeed") or l.get("averageSpeed", 0)
    pace_sec = (1000.0 / avg_speed) if avg_speed > 0 else 0
    pm = int(pace_sec // 60)
    ps = int(pace_sec % 60)
    cad = l.get("averageRunCadence")
    max_cad = l.get("maxRunCadence")
    print(f"Lap {idx:2d}: {dist:6.1f}m | Czas: {dur:5.1f}s ({int(dur//60)}:{int(dur%60):02d}) | Tempo: {pm}:{ps:02d}/km | HR avg: {avg_hr:5.1f} (max {max_hr}) | Kad: {cad}")

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

valid_rows = [r for r in rows if r.get("sumDistance") is not None]
print(f"\nTotal stream samples: {len(valid_rows)}")
