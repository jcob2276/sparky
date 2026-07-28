import json

with open("tmp/today_summary_28.json", "r", encoding="utf-8") as f:
    s = json.load(f)

print("=== TODAY'S RUN (28 LIPCA 2026) ===")
print("ID:", s.get("activityId"))
print("Nazwa:", s.get("activityName"))
print("Start:", s.get("startTimeLocal"))
print("Dystans:", s.get("distance"), "m = ", s.get("distance")/1000, "km")
print("Czas:", s.get("duration"), "s = ", s.get("duration")/60, "min")
print("Kalorie:", s.get("calories"))
print("Śr. HR:", s.get("averageHR"))
print("Max HR:", s.get("maxHR"))
print("Śr. Kadencja:", s.get("averageRunningCadenceInStepsPerMinute"))
print("Przewyższenie:", s.get("elevationGain"))

# Check details
try:
    with open("tmp/today_details_28.json", "r", encoding="utf-8") as f:
        d = json.load(f)
    
    metrics = d.get("activityDetailMetrics", [])
    print("\nLiczba próbek szczegółowych:", len(metrics))
    
    # Compute 1km splits for TODAY'S run
    km_target = 1000.0
    start_idx = 0
    current_km = 1

    for i, m in enumerate(metrics):
        vals = m.get("metrics", [])
        if not vals or len(vals) < 8:
            continue
        dist = vals[0] if vals[0] is not None else 0
        if dist >= km_target or i == len(metrics) - 1:
            m_start = metrics[start_idx]["metrics"]
            d_start = m_start[0] or 0
            split_dist = dist - d_start
            
            t_start = m_start[4] or 0
            t_end = vals[4] or 0
            split_time = t_end - t_start
            
            sub = metrics[start_idx:i+1]
            hrs = [s["metrics"][7] for s in sub if len(s["metrics"]) > 7 and s["metrics"][7] is not None and s["metrics"][7] > 0]
            cads = [s["metrics"][3] for s in sub if len(s["metrics"]) > 3 and s["metrics"][3] is not None and s["metrics"][3] > 0]
            
            avg_hr = sum(hrs)/len(hrs) if hrs else 0
            max_hr = max(hrs) if hrs else 0
            avg_cad = sum(cads)/len(cads) if cads else 0
            
            pace_sec = (split_time / split_dist) * 1000 if split_dist > 0 else 0
            p_min = int(pace_sec // 60)
            p_sec = int(round(pace_sec % 60))
            
            time_m = int(split_time // 60)
            time_s = int(round(split_time % 60))
            
            print(f"Km {current_km:2d}: {split_dist/1000:4.2f} km | Czas: {time_m:02d}:{time_s:02d} | Tempo: {p_min}:{p_sec:02d}/km | HR śr: {avg_hr:3.0f} (max {max_hr:3.0f}) | Kad: {avg_cad:3.0f}")
            
            current_km += 1
            km_target += 1000.0
            start_idx = i + 1

except Exception as e:
    print("Error parsing details:", e)
