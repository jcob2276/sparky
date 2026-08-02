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

print(f"Oura Token status: {'Found' if oura_token else 'Not found'}")

if oura_token:
    oura_headers = {"Authorization": f"Bearer {oura_token}"}
    
    # Dates: Aug 1 to Aug 2
    start_date = "2026-08-01"
    end_date = "2026-08-02"
    
    # 1. Sleep Session for last night
    try:
        req_s = urllib.request.Request(f"https://api.ouraring.com/v2/usercollection/sleep?start_date={start_date}&end_date={end_date}", headers=oura_headers)
        with urllib.request.urlopen(req_s) as resp:
            sleep_data = json.loads(resp.read().decode('utf-8'))
            print("\n=== OURA SLEEP SESSIONS (AUG 1 - AUG 2) ===")
            print(json.dumps(sleep_data, indent=2, ensure_ascii=False))
            with open("tmp/oura_aug2_sleep.json", "w", encoding="utf-8") as f:
                json.dump(sleep_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Sleep API error: {e}")

    # 2. Daily Readiness & Temperature Deviation for Aug 2
    try:
        req_dr = urllib.request.Request(f"https://api.ouraring.com/v2/usercollection/daily_readiness?start_date={start_date}&end_date={end_date}", headers=oura_headers)
        with urllib.request.urlopen(req_dr) as resp:
            dr_data = json.loads(resp.read().decode('utf-8'))
            print("\n=== OURA DAILY READINESS & TEMP DEVIATION ===")
            print(json.dumps(dr_data, indent=2, ensure_ascii=False))
            with open("tmp/oura_aug2_readiness.json", "w", encoding="utf-8") as f:
                json.dump(dr_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Readiness API error: {e}")

    # 3. Heart rate timeline from 2026-08-01T20:00:00Z to now
    try:
        start_datetime = "2026-08-01T20:00:00Z"
        req_hr = urllib.request.Request(f"https://api.ouraring.com/v2/usercollection/heartrate?start_datetime={start_datetime}", headers=oura_headers)
        with urllib.request.urlopen(req_hr) as resp:
            hr_data = json.loads(resp.read().decode('utf-8')).get("data", [])
            print(f"\nTotal HR samples fetched from Aug 1 22:00 to now: {len(hr_data)}")
            with open("tmp/oura_aug2_hr_full.json", "w", encoding="utf-8") as f:
                json.dump(hr_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"HR API error: {e}")
