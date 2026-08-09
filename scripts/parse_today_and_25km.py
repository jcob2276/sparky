import json, os

def parse_act(act_id):
    summary_path = f"tmp/act_{act_id}_details.json"
    splits_path = f"tmp/act_{act_id}_splits.json"
    zones_path = f"tmp/act_{act_id}_zones.json"
    
    print(f"=== ACTIVITY {act_id} ===")
    if os.path.exists(splits_path):
        with open(splits_path, 'r', encoding='utf-8') as f:
            splits = json.load(f)
            print("SPLITS / LAPS:")
            lap_list = splits.get('lapDTOs') or splits.get('splitDTOs') or []
            if isinstance(splits, list):
                lap_list = splits
            for i, lap in enumerate(lap_list):
                dist = lap.get('distance', 0) / 1000
                dur = lap.get('duration', 0)
                m, s = divmod(int(dur), 60)
                pace_s = dur / dist if dist > 0 else 0
                pm, ps = divmod(int(pace_s), 60)
                hr = lap.get('averageHR') or lap.get('averageHeartRate')
                cad = lap.get('averageRunCadence') or lap.get('averageRunningCadenceInStepsPerMinute')
                elev = lap.get('elevationGain') or lap.get('elevationDifference')
                print(f"  Lap {i+1}: {dist:.2f}km | Time: {m}:{s:02d} | Pace: {pm}:{ps:02d}/km | Avg HR: {hr} | Cadence: {cad} | Elev: {elev}")
    
    if os.path.exists(zones_path):
        with open(zones_path, 'r', encoding='utf-8') as f:
            zones = json.load(f)
            print("HR ZONES:")
            if isinstance(zones, list):
                for z in zones:
                    sec = z.get('secsInZone', 0)
                    zm, zs = divmod(int(sec), 60)
                    print(f"  {z.get('zoneName')} ({z.get('zoneLowBoundary')}-{z.get('zoneHighBoundary')} bpm): {zm}m {zs:02d}s")

parse_act("23839065583") # Today Aug 3
print("\n" + "="*50 + "\n")
parse_act("23816559852") # Aug 1 (25km)
