import json

with open('tmp/streams_today_run.json', 'r') as f:
    streams = json.load(f)

stream_map = {s['type']: s['data'] for s in streams}
times = stream_map.get('time', [])
dists = stream_map.get('distance', [])
hrs = stream_map.get('heartrate', [])
cads = stream_map.get('cadence', [])
vels = stream_map.get('velocity_smooth', [])
alts = stream_map.get('altitude', [])

n = len(dists)

def get_exact_segment(start_m, end_m, label, seg_type):
    idx_start = next((i for i, d in enumerate(dists) if d >= start_m), 0)
    idx_end = next((i for i, d in enumerate(dists) if d >= end_m), n - 1)
    
    seg_d = dists[idx_end] - dists[idx_start]
    seg_t = times[idx_end] - times[idx_start]
    seg_hr = [hrs[i] for i in range(idx_start, idx_end+1) if hrs[i] is not None]
    seg_cad = [cads[i] for i in range(idx_start, idx_end+1) if cads[i] is not None]
    seg_alts = [alts[i] for i in range(idx_start, idx_end+1) if alts[i] is not None]
    
    pace_s = (seg_t / seg_d) * 1000 if seg_d > 0 else 0
    pm = int(pace_s // 60)
    ps = int(round(pace_s % 60))
    if ps == 60:
        pm += 1
        ps = 0
    
    avg_hr = round(sum(seg_hr)/len(seg_hr), 1) if seg_hr else 0
    max_hr = max(seg_hr) if seg_hr else 0
    min_hr = min(seg_hr) if seg_hr else 0
    avg_cad = round(sum(seg_cad)/len(seg_cad), 1) if seg_cad else 0
    if avg_cad < 100: avg_cad = round(avg_cad * 2, 1)
    
    elev_gain = 0
    for j in range(idx_start + 1, idx_end + 1):
        if j < len(alts) and alts[j] is not None and alts[j-1] is not None:
            diff = alts[j] - alts[j-1]
            if diff > 0:
                elev_gain += diff

    return {
        'label': label,
        'type': seg_type,  # 'warmup', 'fast', 'recovery', 'cooldown'
        'start_m': start_m,
        'end_m': end_m,
        'dist_m': round(seg_d, 1),
        'time_s': seg_t,
        'time_str': f"{int(seg_t//60)}:{int(seg_t%60):02d}",
        'pace_str': f"{pm}:{ps:02d}",
        'pace_sec': round(pace_s, 1),
        'avg_hr': avg_hr,
        'max_hr': max_hr,
        'min_hr': min_hr,
        'avg_cad': avg_cad,
        'elev_gain': round(elev_gain, 1)
    }

segments = []

# 1. Rozgrzewka: 0 - 1000m
segments.append(get_exact_segment(0, 1000, "Rozgrzewka (Warmup)", "warmup"))

# 6 powtórzeń (600m szybki + 400m przerwa)
for rep in range(1, 7):
    base = 1000 + (rep - 1) * 1000
    iv_start = base
    iv_end = base + 600
    rec_start = iv_end
    rec_end = base + 1000
    
    iv = get_exact_segment(iv_start, iv_end, f"Seria {rep}: Interwał 600m (Szybki)", "fast")
    rec = get_exact_segment(rec_start, rec_end, f"Seria {rep}: Przerwa 400m (Marsz/Trucht)", "recovery")
    segments.append(iv)
    segments.append(rec)

# Schłodzenie: 7000m - 8948m
segments.append(get_exact_segment(7000, dists[-1], "Schłodzenie / Rytmy (Cooldown)", "cooldown"))

print(f"{'Segment':<35} | {'Dystans':<8} | {'Czas':<6} | {'Tempo':<8} | {'HR śr':<6} | {'HR skrajne':<12} | {'Kadencja':<8}")
print("-" * 95)
for s in segments:
    skrajne = f"max {s['max_hr']}" if s['type'] in ['warmup', 'fast', 'cooldown'] else f"min {s['min_hr']}"
    print(f"{s['label']:<35} | {s['dist_m']:>6.0f} m | {s['time_str']:>6} | {s['pace_str']:>5} /km | {s['avg_hr']:>5.1f} | {skrajne:<12} | {s['avg_cad']:>6.1f} spm")

with open('tmp/exact_workout_segments.json', 'w', encoding='utf-8') as f:
    json.dump(segments, f, indent=2, ensure_ascii=False)
print("\nSaved to tmp/exact_workout_segments.json")
