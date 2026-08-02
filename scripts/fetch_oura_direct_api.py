import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

# Fetch token
req_url = f"{url}/rest/v1/user_settings?select=oura_token"
req = urllib.request.Request(req_url, headers=headers)
oura_token = None
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        if res and res[0].get("oura_token"):
            oura_token = res[0].get("oura_token")
except Exception as e:
    print(f"Error fetching oura_token: {e}")

if not oura_token:
    # Try vanguard_tokens
    req_url2 = f"{url}/rest/v1/vanguard_tokens?select=oura_token"
    req2 = urllib.request.Request(req_url2, headers=headers)
    try:
        with urllib.request.urlopen(req2) as resp:
            res2 = json.loads(resp.read().decode('utf-8'))
            if res2 and res2[0].get("oura_token"):
                oura_token = res2[0].get("oura_token")
    except Exception as e:
        print(f"Error fetching oura_token from vanguard_tokens: {e}")

print(f"Oura token retrieved: {oura_token[:10]}..." if oura_token else "No Oura token found!")

if oura_token:
    # Query Oura API v2 for sleep and daily_sleep for 2026-07-28 to 2026-07-29
    oura_headers = {
        "Authorization": f"Bearer {oura_token}"
    }
    
    # 1. Daily Sleep
    try:
        req_ds = urllib.request.Request("https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=2026-07-26&end_date=2026-07-29", headers=oura_headers)
        with urllib.request.urlopen(req_ds) as resp:
            ds_data = json.loads(resp.read().decode('utf-8'))
            print("\n=== OURA API v2 DAILY SLEEP ===")
            print(json.dumps(ds_data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Oura API Daily Sleep error: {e}")
        
    # 2. Sleep Sessions (Detailed)
    try:
        req_s = urllib.request.Request("https://api.ouraring.com/v2/usercollection/sleep?start_date=2026-07-26&end_date=2026-07-29", headers=oura_headers)
        with urllib.request.urlopen(req_s) as resp:
            s_data = json.loads(resp.read().decode('utf-8'))
            print("\n=== OURA API v2 SLEEP SESSIONS ===")
            print(json.dumps(s_data, indent=2, ensure_ascii=False))
            with open("tmp/oura_api_direct_sleep.json", "w", encoding="utf-8") as f:
                json.dump(s_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Oura API Sleep Sessions error: {e}")

    # 3. Daily Readiness
    try:
        req_dr = urllib.request.Request("https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=2026-07-26&end_date=2026-07-29", headers=oura_headers)
        with urllib.request.urlopen(req_dr) as resp:
            dr_data = json.loads(resp.read().decode('utf-8'))
            print("\n=== OURA API v2 DAILY READINESS ===")
            print(json.dumps(dr_data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Oura API Daily Readiness error: {e}")

