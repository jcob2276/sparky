import json

with open("tmp/post_marathon_runs_full.json", "r", encoding="utf-8") as f:
    data = json.load(f)

act_order = [
    ("Maraton (Koszyce)", "24601829743"),
    ("Bieg 1 (Rozruch / 1. bieg po maratonie)", "24689904533"),
    ("Bieg 2 (2. bieg po maratonie)", "24712853849"),
    ("Bieg 3 (3. bieg po maratonie)", "24738059747"),
]

def format_sec(seconds):
    if not seconds:
        return "--:--"
    m = int(seconds) // 60
    s = int(seconds) % 60
    h = m // 60
    m = m % 60
    if h > 0:
        return f"{h}h {m:02d}m {s:02d}s"
    return f"{m:02d}m {s:02d}s"

def format_pace(speed_m_s):
    if not speed_m_s or speed_m_s <= 0:
        return "--:--"
    pace_sec = 1000.0 / speed_m_s
    m = int(pace_sec) // 60
    s = int(pace_sec) % 60
    return f"{m}:{s:02d} /km"

results = []

for label, aid in act_order:
    act = data.get(aid, {})
    raw_summary = act.get("summary") or {}
    summary = raw_summary.get("summaryDTO") or {}
    splits = act.get("splits") or {}
    zones = act.get("hr_zones") or []
    weather = act.get("weather") or {}
    
    name = raw_summary.get("activityName")
    start = summary.get("startTimeLocal")
    dist_km = (summary.get("distance") or 0) / 1000.0
    dur = summary.get("duration") or 0
    mov_dur = summary.get("movingDuration") or dur
    elapsed_dur = summary.get("elapsedDuration") or dur
    avg_speed = summary.get("averageSpeed") or 0
    mov_speed = summary.get("averageMovingSpeed") or avg_speed
    max_speed = summary.get("maxSpeed") or 0
    
    avg_hr = summary.get("averageHR")
    max_hr = summary.get("maxHR")
    min_hr = summary.get("minHR")
    calories = summary.get("calories")
    elev_gain = summary.get("elevationGain") or 0
    elev_loss = summary.get("elevationLoss") or 0
    cadence = summary.get("averageRunCadence")
    max_cadence = summary.get("maxRunCadence")
    stride = summary.get("strideLength")
    steps = summary.get("steps")
    
    # Weather
    w_temp = weather.get("temperature")
    w_feel = weather.get("apparentTemp")
    w_hum = weather.get("relativeHumidity")
    w_wind = weather.get("windSpeed")
    
    # Zones
    total_z_secs = sum(z.get("secsInZone", 0) for z in zones)
    zone_stats = []
    for z in zones:
        z_num = z.get("zoneNumber")
        z_low = z.get("zoneLowBoundary")
        z_high = z.get("zoneHighBoundary")
        secs = z.get("secsInZone") or 0
        pct = (secs / total_z_secs * 100) if total_z_secs else 0
        zone_stats.append({
            "zone": z_num,
            "low": z_low,
            "high": z_high,
            "secs": secs,
            "pct": pct
        })

    # Laps
    laps = []
    for lap in (splits.get("lapDTOs") or []):
        laps.append({
            "index": lap.get("lapIndex"),
            "dist_km": (lap.get("distance") or 0) / 1000.0,
            "duration": lap.get("duration"),
            "speed": lap.get("averageSpeed"),
            "pace": format_pace(lap.get("averageSpeed")),
            "hr": lap.get("averageHR"),
            "max_hr": lap.get("maxHR"),
            "elev_gain": lap.get("elevationGain") or 0,
            "elev_loss": lap.get("elevationLoss") or 0,
        })
        
    res = {
        "id": aid,
        "label": label,
        "name": name,
        "start": start,
        "dist_km": dist_km,
        "duration_sec": dur,
        "duration_str": format_sec(dur),
        "moving_duration_sec": mov_dur,
        "moving_duration_str": format_sec(mov_dur),
        "elapsed_duration_sec": elapsed_dur,
        "elapsed_duration_str": format_sec(elapsed_dur),
        "avg_speed": avg_speed,
        "avg_pace": format_pace(avg_speed),
        "mov_pace": format_pace(mov_speed),
        "max_pace": format_pace(max_speed),
        "avg_hr": avg_hr,
        "max_hr": max_hr,
        "min_hr": min_hr,
        "cadence": cadence,
        "max_cadence": max_cadence,
        "stride_m": (stride / 100.0) if stride else None,
        "calories": calories,
        "steps": steps,
        "elev_gain": elev_gain,
        "elev_loss": elev_loss,
        "weather": {
            "temp": w_temp,
            "feel": w_feel,
            "humidity": w_hum,
            "wind": w_wind
        },
        "zones": zone_stats,
        "laps": laps
    }
    results.append(res)
    
    print("\n" + "="*60)
    print(f"{label} — {start}")
    print(f"Dystans: {dist_km:.2f} km | Czas: {format_sec(dur)} | Ruchu: {format_sec(mov_dur)}")
    print(f"Śr. tempo: {format_pace(avg_speed)} (ruch: {format_pace(mov_speed)}) | HR: {avg_hr} bpm (max: {max_hr})")
    print(f"Kadencja: {cadence} spm | Dł. kroku: {stride/100:.2f} m | Kalorie: {calories} kcal" if stride else f"Kadencja: {cadence} spm")
    print(f"Przewyższenie: +{elev_gain:.1f} m / -{elev_loss:.1f} m | Kroki: {steps}")
    print(f"Pogoda: {w_temp}°C (odcz. {w_feel}°C), wilgotność {w_hum}%, wiatr {w_wind} km/h")
    print("Strefy tętna:")
    for z in zone_stats:
        print(f"  Z{z['zone']} ({z['low']}-{z['high']} bpm): {format_sec(z['secs'])} ({z['pct']:.1f}%)")

with open("tmp/parsed_runs_report_data.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
