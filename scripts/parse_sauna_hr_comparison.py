import json, os, datetime

def parse_hr_file(filepath, label):
    if not os.path.exists(filepath):
        print(f"File {filepath} does not exist.")
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"\n==========================================")
    print(f"   HR DATA: {label}")
    print(f"==========================================")
    
    rhr = data.get("restingHeartRate")
    max_hr_day = data.get("maxHeartRate")
    min_hr_day = data.get("minHeartRate")
    print(f"Resting HR: {rhr} bpm | Max HR: {max_hr_day} bpm | Min HR: {min_hr_day} bpm")
    
    hr_values = data.get("heartRateValues") or []
    print(f"Total HR samples: {len(hr_values)}")
    
    # Filter for evening samples (20:00 - 22:30)
    evening_samples = []
    for item in hr_values:
        if not item or len(item) < 2:
            continue
        ts_ms, hr = item[0], item[1]
        if hr is None:
            continue
        # Convert timestamp
        dt = datetime.datetime.fromtimestamp(ts_ms / 1000.0, tz=datetime.timezone.utc)
        # Local time +2
        dt_local = dt + datetime.timedelta(hours=2)
        if dt_local.hour >= 19:
            evening_samples.append((dt_local.strftime("%H:%M:%S"), hr))
            
    print(f"Evening HR samples (19:00+): {len(evening_samples)}")
    if evening_samples:
        print("Sample of evening HR (19:00 - 22:25):")
        # Print max HR in evening and step sample
        max_e_hr = max(evening_samples, key=lambda x: x[1])
        min_e_hr = min(evening_samples, key=lambda x: x[1])
        print(f"  Max Evening HR: {max_e_hr[1]} bpm at {max_e_hr[0]}")
        print(f"  Min Evening HR: {min_e_hr[1]} bpm at {min_e_hr[0]}")
        
        # print timeline in 10-minute intervals
        for time_str, hr in evening_samples[::5]:
            print(f"  [{time_str}] HR: {hr} bpm")

parse_hr_file("tmp/garmin_hr_today.json", "DZISIAJ (3 SIERPNIA 2026)")
parse_hr_file("tmp/garmin_hr_july28.json", "POPRZEDNIA SAUNA (28 LIPCA 2026)")
