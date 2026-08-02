import json
from datetime import datetime, timezone, timedelta

with open("tmp/oura_aug2_sleep.json", "r", encoding="utf-8") as f:
    data = json.load(f).get("data", [])

tz = timezone(timedelta(hours=2))

for s in data:
    b_start = s.get("bedtime_start")
    b_end = s.get("bedtime_end")
    latency_sec = s.get("latency", 0)
    total_sec = s.get("total_sleep_duration", 0)
    in_bed_sec = s.get("time_in_bed", 0)
    deep_sec = s.get("deep_sleep_duration", 0)
    rem_sec = s.get("rem_sleep_duration", 0)
    light_sec = s.get("light_sleep_duration", 0)
    awake_sec = in_bed_sec - total_sec
    eff = s.get("efficiency")
    lowest_hr = s.get("lowest_heart_rate")
    avg_hr = s.get("average_heart_rate")
    avg_hrv = s.get("average_hrv")
    
    dt_start = datetime.fromisoformat(b_start.replace("Z", "+00:00")).astimezone(tz) if b_start else None
    dt_end = datetime.fromisoformat(b_end.replace("Z", "+00:00")).astimezone(tz) if b_end else None
    
    # Calculate exact sleep onset time
    dt_asleep = dt_start + timedelta(seconds=latency_sec) if dt_start else None
    
    print("=== OURA SLEEP SESSION ANALYSIS (AUG 1 / AUG 2) ===")
    print(f"Bedtime Start (Wejście do łóżka): {dt_start.strftime('%Y-%m-%d %H:%M:%S') if dt_start else 'N/A'}")
    print(f"Latency (Czas zasypiania): {latency_sec//60} min {latency_sec%60} s ({latency_sec} s)")
    print(f"EXACT TIME ASLEEP (Dokładna godzina zaśnięcia): {dt_asleep.strftime('%H:%M:%S') if dt_asleep else 'N/A'}")
    print(f"Bedtime End (Pobudka): {dt_end.strftime('%Y-%m-%d %H:%M:%S') if dt_end else 'N/A'}")
    print(f"Total Time in Bed: {in_bed_sec//3600}h {(in_bed_sec%3600)//60}m")
    print(f"Total Asleep Time: {total_sec//3600}h {(total_sec%3600)//60}m")
    print(f"Awake Time (Czuwanie/Wybudzenia): {awake_sec//3600}h {(awake_sec%3600)//60}m ({awake_sec//60} min)")
    print(f"Sleep Efficiency: {eff}%")
    print(f"Deep Sleep: {deep_sec//3600}h {(deep_sec%3600)//60}m ({deep_sec//60} min)")
    print(f"REM Sleep: {rem_sec//3600}h {(rem_sec%3600)//60}m ({rem_sec//60} min)")
    print(f"Light Sleep: {light_sec//3600}h {(light_sec%3600)//60}m ({light_sec//60} min)")
    print(f"Lowest HR: {lowest_hr} bpm | Avg HR: {avg_hr} bpm | Avg HRV: {avg_hrv} ms")
    
    # Phase 5-min string
    phases = s.get("sleep_phase_5_min") or s.get("app_sleep_phase_5_min")
    print("\nPhases 5-min string length:", len(phases) if phases else 0)
    print("Phases string:", phases)
