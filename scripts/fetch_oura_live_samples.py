import os, json, urllib.request, datetime
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

req_url = f"{url}/rest/v1/user_settings?select=oura_token"
req = urllib.request.Request(req_url, headers=headers)
oura_token = None
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        if res and res[0].get("oura_token"):
            oura_token = res[0].get("oura_token")
except Exception as e:
    pass

if not oura_token:
    req_url2 = f"{url}/rest/v1/vanguard_tokens?select=oura_token"
    req2 = urllib.request.Request(req_url2, headers=headers)
    try:
        with urllib.request.urlopen(req2) as resp:
            res2 = json.loads(resp.read().decode('utf-8'))
            if res2 and res2[0].get("oura_token"):
                oura_token = res2[0].get("oura_token")
    except Exception as e:
        pass

if oura_token:
    oura_headers = { "Authorization": f"Bearer {oura_token}" }
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    
    hr_url = f"https://api.ouraring.com/v2/usercollection/heartrate?start_datetime={today_str}T20:00:00%2B02:00"
    try:
        req_hr = urllib.request.Request(hr_url, headers=oura_headers)
        with urllib.request.urlopen(req_hr) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            samples = data.get("data", [])
            print(f"Oura HR samples count (20:00+): {len(samples)}")
            if samples:
                print("LATEST OURA HR SAMPLES:")
                for s in samples[-8:]:
                    print(f"  [{s.get('timestamp')}] -> {s.get('bpm')} bpm ({s.get('source')})")
    except Exception as e:
        print(f"Oura error: {e}")
