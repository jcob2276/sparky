import json

with open("tmp/oura_api_direct_sleep.json", "r", encoding="utf-8") as f:
    s_data = json.load(f).get("data", [])

print("=== SLEEP SESSIONS IN OURA API DATA ===")
for s in s_data:
    day = s.get("day")
    t_sleep = round(s.get("total_sleep_duration", 0) / 3600, 2)
    deep = round(s.get("deep_sleep_duration", 0) / 3600, 2)
    rem = round(s.get("rem_sleep_duration", 0) / 3600, 2)
    eff = s.get("efficiency")
    lowest_hr = s.get("lowest_heart_rate")
    avg_hr = s.get("average_heart_rate")
    avg_hrv = s.get("average_hrv")
    readiness = s.get("readiness", {})
    temp_dev = readiness.get("temperature_deviation")
    read_score = readiness.get("score")
    
    print(f"Day: {day} | Total: {t_sleep}h | Deep: {deep}h | REM: {rem}h | Eff: {eff}% | Lowest HR: {lowest_hr} | Avg HR: {avg_hr} | Avg HRV: {avg_hrv} | Temp Dev: {temp_dev} | Readiness: {read_score}")
