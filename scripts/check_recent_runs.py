import os, json, urllib.request
from dotenv import load_dotenv

load_dotenv()
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('SB_SECRET_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

req = urllib.request.Request(f'{url}/rest/v1/user_settings?select=user_id', headers=headers)
with urllib.request.urlopen(req) as resp:
    uid = json.loads(resp.read().decode('utf-8'))[0]['user_id']

# check strava_activities
req2 = urllib.request.Request(f'{url}/rest/v1/strava_activities?user_id=eq.{uid}&order=start_date.desc&limit=25', headers=headers)
with urllib.request.urlopen(req2) as resp:
    acts = json.loads(resp.read().decode('utf-8'))
    print(f'Total activities found: {len(acts)}')
    for a in acts:
        dist_km = round(a.get('distance', 0) / 1000, 2)
        time_min = round(a.get('moving_time', 0) / 60, 1)
        pace_sec = (a.get('moving_time', 0) / (a.get('distance', 1)/1000)) if a.get('distance', 0) > 0 else 0
        pace_min = int(pace_sec // 60)
        pace_rem = int(pace_sec % 60)
        print(f"{a.get('start_date')} | {a.get('name')} | Dist: {dist_km} km | Time: {time_min} min | Pace: {pace_min}:{pace_rem:02d}/km | HR: {a.get('average_heartrate')} bpm (max {a.get('max_heartrate')})")

with open('tmp/recent_runs_strava.json', 'w', encoding='utf-8') as f:
    json.dump(acts, f, indent=2, ensure_ascii=False)
