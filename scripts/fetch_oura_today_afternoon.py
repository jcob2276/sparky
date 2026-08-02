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
    
    # Query from 08:00 UTC (10:00 local time) today (Aug 2) to now (16:30 local time)
    start_dt = "2026-08-02T08:00:00Z"
    print(f"Fetching Oura HR starting from {start_dt}...")
    try:
        req_hr = urllib.request.Request(f"https://api.ouraring.com/v2/usercollection/heartrate?start_datetime={start_dt}", headers=oura_headers)
        with urllib.request.urlopen(req_hr) as resp:
            hr_data = json.loads(resp.read().decode('utf-8')).get("data", [])
            print(f"Total daytime samples fetched: {len(hr_data)}")
            
            tz = timezone(timedelta(hours=2))
            print("\n=======================================================")
            print("   OURA RING - AFTERNOON HR SAMPLES TODAY (UTC+2)      ")
            print("=======================================================")
            for item in hr_data[-30:]:
                ts = item.get("timestamp")
                bpm = item.get("bpm")
                source = item.get("source")
                if ts:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(tz)
                    print(f"  [{dt.strftime('%H:%M:%S')}] HR: {bpm:3.0f} bpm | Source: {source}")
                    
            with open("tmp/oura_afternoon_today.json", "w", encoding="utf-8") as f:
                json.dump(hr_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error: {e}")
