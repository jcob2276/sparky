import os, json, urllib.request
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

oura_token = None
for table in ["vanguard_tokens", "user_settings"]:
    req_url = f"{url}/rest/v1/{table}?select=oura_token"
    req = urllib.request.Request(req_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            if res and res[0].get("oura_token"):
                oura_token = res[0].get("oura_token")
                break
    except Exception as e:
        pass

if oura_token:
    oura_headers = {"Authorization": f"Bearer {oura_token}"}
    today_str = "2026-08-01"
    
    # 1. Fetch heart rate (5 min samples) for today
    print(f"\n=== FETCHING OURA REAL-TIME HEART RATE FOR {today_str} ===")
    try:
        start_datetime = f"{today_str}T00:00:00Z"
        req_hr = urllib.request.Request(f"https://api.ouraring.com/v2/usercollection/heartrate?start_datetime={start_datetime}", headers=oura_headers)
        with urllib.request.urlopen(req_hr) as resp:
            hr_data = json.loads(resp.read().decode('utf-8')).get("data", [])
            print(f"Total HR samples fetched today: {len(hr_data)}")
            
            tz = timezone(timedelta(hours=2))
            print("\n--- LATEST HR SAMPLES FROM OURA RING TONIGHT ---")
            for item in hr_data[-30:]:
                ts = item.get("timestamp")
                bpm = item.get("bpm")
                source = item.get("source")
                if ts:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(tz)
                    print(f"  [{dt.strftime('%H:%M:%S')}] HR: {bpm:3.0f} bpm (source: {source})")
                    
            with open("tmp/oura_hr_tonight.json", "w", encoding="utf-8") as f:
                json.dump(hr_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error fetching Oura HR: {e}")

    # 2. Fetch daily stress if available
    try:
        req_st = urllib.request.Request(f"https://api.ouraring.com/v2/usercollection/daily_stress?start_date={today_str}&end_date={today_str}", headers=oura_headers)
        with urllib.request.urlopen(req_st) as resp:
            st_data = json.loads(resp.read().decode('utf-8'))
            print("\n=== OURA DAILY STRESS ===")
            print(json.dumps(st_data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error fetching Oura Stress: {e}")
