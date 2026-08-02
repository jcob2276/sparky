import json

with open("tmp/oura_api_direct_sleep.json", "r", encoding="utf-8") as f:
    s_data = json.load(f).get("data", [])

print("=== EXACT OURA SLEEP SESSIONS BY DAY ===")
for s in s_data:
    day = s.get("day")
    t_start = s.get("bedtime_start")
    t_end = s.get("bedtime_end")
    t_sleep = round(s.get("total_sleep_duration", 0) / 3600, 2)
    deep = round(s.get("deep_sleep_duration", 0) / 3600, 2)
    rem = round(s.get("rem_sleep_duration", 0) / 3600, 2)
    eff = s.get("efficiency")
    lowest_hr = s.get("lowest_heart_rate")
    avg_hr = round(s.get("average_heart_rate") or 0, 1)
    avg_hrv = round(s.get("average_hrv") or 0, 1)
    readiness = s.get("readiness", {})
    temp_dev = readiness.get("temperature_deviation")
    read_score = readiness.get("score")
    
    print(f"Day (waking date): {day}")
    print(f"  Bedtime: {t_start} -> {t_end}")
    print(f"  Total Sleep: {t_sleep}h | Deep: {deep}h | REM: {rem}h | Efficiency: {eff}%")
    print(f"  Lowest HR: {lowest_hr} bpm | Avg HR: {avg_hr} bpm | Avg HRV: {avg_hrv} ms")
    print(f"  Readiness Score: {read_score} | Temp Dev: {temp_dev}°C")
    print("-" * 50)
