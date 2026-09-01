import json

with open("tmp/garmin_aug27_laps.json", "r", encoding="utf-8") as f:
    laps_data = json.load(f)

print("=== RAW GARMIN LAPS ===")
laps = laps_data.get("lapDTOs", [])
for i, l in enumerate(laps):
    idx = l.get("lapIndex")
    d = l.get("distance", 0)
    dur = l.get("duration", 0)
    avg_s = l.get("averageMovingSpeed") or l.get("averageSpeed", 0)
    pace_s = 1000.0 / avg_s if avg_s > 0 else 0
    pm = int(pace_s // 60)
    ps = int(pace_s % 60)
    hr = l.get("averageHR")
    max_hr = l.get("maxHR")
    cad = l.get("averageRunCadence")
    print(f"Lap {idx:2d}: Dist={d:6.1f}m | Czas={dur:5.1f}s ({int(dur//60)}:{int(dur%60):02d}) | Tempo={pm}:{ps:02d}/km | HR avg={hr} (max {max_hr}) | Kad={cad}")
