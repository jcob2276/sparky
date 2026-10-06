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

def get_segment(start_m, end_m):
    idx_start = next((i for i, d in enumerate(dists) if d >= start_m), 0)
    idx_end = next((i for i, d in enumerate(dists) if d >= end_m), n - 1)
    
    seg_d = dists[idx_end] - dists[idx_start]
    seg_t = times[idx_end] - times[idx_start]
    seg_vel = [vels[i] for i in range(idx_start, idx_end+1) if vels[i] is not None]
    seg_hr = [hrs[i] for i in range(idx_start, idx_end+1) if hrs[i] is not None]
    seg_cad = [cads[i] for i in range(idx_start, idx_end+1) if cads[i] is not None]
    
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
    
    return {
        'start_m': start_m,
        'end_m': end_m,
        'act_dist_m': round(seg_d, 1),
        'dur_s': seg_t,
        'time_str': f"{int(seg_t//60)}:{int(seg_t%60):02d}",
        'pace_str': f"{pm}:{ps:02d}",
        'pace_sec': round(pace_s, 1),
        'avg_hr': avg_hr,
        'max_hr': max_hr,
        'min_hr': min_hr,
        'avg_cad': avg_cad
    }

# Also let's inspect the velocity profile to see if the user started the first interval exactly at 1000m or where
print("=== SPEED SAMPLES ALONG THE RUN (every 200m) ===")
for d_target in range(0, int(dists[-1]), 200):
    idx = next((i for i, d in enumerate(dists) if d >= d_target), 0)
    spd = vels[idx] if idx < len(vels) and vels[idx] is not None else 0
    pace = 1000/spd if spd > 0 else 0
    hr = hrs[idx] if idx < len(hrs) else 0
    print(f"  {d_target:4d}m | Time: {times[idx]:4d}s | Pace: {int(pace//60)}:{int(pace%60):02d}/km ({spd:.2f} m/s) | HR: {hr}")

