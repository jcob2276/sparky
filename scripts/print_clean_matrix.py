import json

with open("tmp/full_historical_matrix.json", "r", encoding="utf-8") as f:
    history = json.load(f)

print("=== FULL HISTORICAL SAUNA & SLEEP ANALYSIS MATRIX ===")
for h in history:
    print(f"\nSAUNA DATE: {h['sauna_date']} | (Waking Date: {h['waking_date']})")
    print(f"  Sauna Notes: '{h['sauna_notes']}' | Duration: {h['sauna_dur_min']}m | Start: {h['sauna_start']}")
    
    if h['ws_runs'] or h['strava_runs']:
        print("  RUNNING/WORKOUT SAME DAY:")
        for r in h['ws_runs']:
            print(f"    - App Workout: {r['day']} | Dur: {r['dur']}m | RPE: {r['rpe']} | Notes: {r['notes']}")
        for st in h['strava_runs']:
            print(f"    - Strava Activity: {st['name']} ({st['type']}) | Dist: {st['distance_km']}km | Dur: {st['dur_min']}m | HR: {st['hr_avg']}")
    else:
        print("  RUNNING/WORKOUT SAME DAY: None recorded")
        
    o = h['oura']
    t_sleep = round(o['total_sleep'], 2) if o['total_sleep'] is not None else 'N/A'
    d_sleep = round(o['deep_sleep'], 2) if o['deep_sleep'] is not None else 'N/A'
    r_sleep = round(o['rem_sleep'], 2) if o['rem_sleep'] is not None else 'N/A'
    
    print(f"  OURA SLEEP NEXT MORNING ({h['waking_date']}):")
    print(f"    Sleep Score: {o['sleep_score']} | Readiness: {o['readiness_score']} | Total Sleep: {t_sleep}h")
    print(f"    Lowest RHR: {o['lowest_hr']} bpm | Avg RHR: {o['rhr_avg']} bpm | Avg HRV: {o['hrv_avg']} ms")
    print(f"    Temp Dev: {o['temp_dev']}degC | Efficiency: {o['efficiency']}% | Deep: {d_sleep}h | REM: {r_sleep}h")
