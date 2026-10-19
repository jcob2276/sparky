import json
import numpy as np

with open("tmp/post_marathon_runs_full.json", "r", encoding="utf-8") as f:
    full_data = json.load(f)

runs = [
    ("Bieg 1 (11.10.2026 - Rzeszów)", "24689904533"),
    ("Bieg 2 (13.10.2026 - Rzeszów)", "24712853849"),
    ("Bieg 3 (15.10.2026 - Rzeszów)", "24738059747"),
]

def format_pace_sec(seconds):
    m = int(seconds) // 60
    s = int(seconds) % 60
    return f"{m}:{s:02d}"

calculated_splits = {}

for label, aid in runs:
    det = full_data.get(aid, {}).get("details", {})
    descriptors = {d.get("metricsIndex"): d.get("key") for d in det.get("metricDescriptors", []) if d.get("metricsIndex") is not None}
    
    hr_idx = next((i for i, k in descriptors.items() if k == "directHeartRate"), None)
    dist_idx = next((i for i, k in descriptors.items() if k == "sumDistance"), None)
    dur_idx = next((i for i, k in descriptors.items() if k == "sumDuration"), None)
    cad_idx = next((i for i, k in descriptors.items() if k == "directRunCadence"), None)
    elev_idx = next((i for i, k in descriptors.items() if k in ["directCorrectedElevation", "directElevation"]), None)
    
    samples = []
    for m in det.get("activityDetailMetrics", []):
        vals = m.get("metrics", [])
        if dist_idx is not None and dur_idx is not None and dist_idx < len(vals) and dur_idx < len(vals):
            dist = vals[dist_idx]
            dur = vals[dur_idx]
            hr = vals[hr_idx] if hr_idx is not None and hr_idx < len(vals) else None
            cad = vals[cad_idx] if cad_idx is not None and cad_idx < len(vals) else None
            elev = vals[elev_idx] if elev_idx is not None and elev_idx < len(vals) else None
            if dist is not None and dur is not None:
                samples.append({
                    "dist": dist,
                    "dur": dur,
                    "hr": hr,
                    "cad": cad,
                    "elev": elev
                })
                
    # Sort samples by distance
    samples.sort(key=lambda s: s["dist"])
    
    # Calculate km splits
    splits = []
    current_target_km = 1.0
    prev_dur = 0.0
    prev_dist = 0.0
    hrs_in_km = []
    cads_in_km = []
    elev_start = samples[0]["elev"] if samples and samples[0]["elev"] else 0
    
    for s in samples:
        d_km = s["dist"] / 1000.0
        if s["hr"]:
            hrs_in_km.append(s["hr"])
        if s["cad"]:
            cads_in_km.append(s["cad"])
            
        if d_km >= current_target_km:
            km_dist = (s["dist"] - prev_dist) / 1000.0
            km_dur = s["dur"] - prev_dur
            km_pace_sec = (km_dur / km_dist) if km_dist > 0 else 0
            avg_hr = round(sum(hrs_in_km) / len(hrs_in_km)) if hrs_in_km else None
            avg_cad = round(sum(cads_in_km) / len(cads_in_km)) if cads_in_km else None
            
            splits.append({
                "km": int(current_target_km),
                "dist_km": round(km_dist, 2),
                "dur_sec": km_dur,
                "pace_str": format_pace_sec(km_pace_sec),
                "avg_hr": avg_hr,
                "avg_cad": avg_cad,
            })
            
            prev_dur = s["dur"]
            prev_dist = s["dist"]
            hrs_in_km = []
            cads_in_km = []
            current_target_km += 1.0
            
    # Remaining fraction
    if samples and (samples[-1]["dist"] - prev_dist) > 100: # at least 100m
        rem_dist = (samples[-1]["dist"] - prev_dist) / 1000.0
        rem_dur = samples[-1]["dur"] - prev_dur
        rem_pace_sec = (rem_dur / rem_dist) if rem_dist > 0 else 0
        avg_hr = round(sum(hrs_in_km) / len(hrs_in_km)) if hrs_in_km else None
        avg_cad = round(sum(cads_in_km) / len(cads_in_km)) if cads_in_km else None
        splits.append({
            "km": f"{int(current_target_km)}+",
            "dist_km": round(rem_dist, 2),
            "dur_sec": rem_dur,
            "pace_str": format_pace_sec(rem_pace_sec),
            "avg_hr": avg_hr,
            "avg_cad": avg_cad,
        })
        
    calculated_splits[aid] = splits
    print(f"\n{label} ({len(splits)} splits):")
    for sp in splits:
        print(f"  Km {sp['km']} ({sp['dist_km']} km): Tempo {sp['pace_str']} /km | HR {sp['avg_hr']} bpm | Kadencja {sp['avg_cad']} spm")

with open("tmp/calculated_km_splits.json", "w", encoding="utf-8") as f:
    json.dump(calculated_splits, f, indent=2, ensure_ascii=False)
