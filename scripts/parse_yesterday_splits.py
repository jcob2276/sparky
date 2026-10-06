import json

with open('tmp/streams_yesterday.json', 'r') as f:
    streams = json.load(f)

stream_map = {s['type']: s['data'] for s in streams}
times = stream_map.get('time', [])
dists = stream_map.get('distance', [])
hrs = stream_map.get('heartrate', [])
cads = stream_map.get('cadence', [])
alts = stream_map.get('altitude', [])

n = len(dists)
print(f"Total samples: {n}, dist: {dists[-1]:.1f}m, time: {times[-1]}s ({times[-1]//60}m{times[-1]%60}s)")

prev_idx = 0
curr_target = 1000
km = 1
splits = []

for i in range(n):
    if dists[i] >= curr_target or i == n - 1:
        seg_dist = dists[i] - dists[prev_idx]
        seg_time = times[i] - times[prev_idx]
        if seg_dist < 50 and i == n - 1 and splits:
            splits[-1]['dist_m'] += round(seg_dist, 1)
            splits[-1]['time_s'] += seg_time
            splits[-1]['time_str'] = f"{int(splits[-1]['time_s']//60)}:{int(splits[-1]['time_s']%60):02d}"
            pace_sec = (splits[-1]['time_s'] / splits[-1]['dist_m']) * 1000
            pm = int(pace_sec // 60)
            ps = int(round(pace_sec % 60))
            if ps == 60:
                pm += 1
                ps = 0
            splits[-1]['pace_str'] = f"{pm}:{ps:02d}"
            splits[-1]['pace_sec'] = round(pace_sec, 1)
            break
        
        pace_sec = (seg_time / seg_dist) * 1000 if seg_dist > 0 else 0
        pm = int(pace_sec // 60)
        ps = int(round(pace_sec % 60))
        if ps == 60:
            pm += 1
            ps = 0
        
        seg_hrs = [hrs[j] for j in range(prev_idx, i+1) if j < len(hrs) and hrs[j] is not None]
        seg_cads = [cads[j] for j in range(prev_idx, i+1) if j < len(cads) and cads[j] is not None]
        
        avg_hr = round(sum(seg_hrs)/len(seg_hrs), 1) if seg_hrs else None
        max_hr = max(seg_hrs) if seg_hrs else None
        avg_cad = round(sum(seg_cads)/len(seg_cads), 1) if seg_cads else None
        if avg_cad and avg_cad < 100:
            avg_cad = round(avg_cad * 2, 1)
        
        split_info = {
            'km': km,
            'dist_m': round(seg_dist, 1),
            'time_s': seg_time,
            'time_str': f"{int(seg_time//60)}:{int(seg_time%60):02d}",
            'pace_str': f"{pm}:{ps:02d}",
            'pace_sec': round(pace_sec, 1),
            'avg_hr': avg_hr,
            'max_hr': max_hr,
            'cadence': avg_cad
        }
        splits.append(split_info)
        km_label = f"Km {km}" if seg_dist >= 900 else f"Km {km} ({seg_dist:.0f}m)"
        print(f"{km_label:<14} | Czas: {split_info['time_str']:>5} | Tempo: {split_info['pace_str']}/km | HR: {avg_hr} (max {max_hr}) | Kad: {avg_cad}")
        
        prev_idx = i
        curr_target += 1000
        km += 1

with open('tmp/yesterday_splits.json', 'w', encoding='utf-8') as f:
    json.dump(splits, f, indent=2)
print("Saved to tmp/yesterday_splits.json!")
