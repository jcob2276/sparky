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

req_url = f"{url}/rest/v1/user_settings?select=oura_token"
req = urllib.request.Request(req_url, headers=headers)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode('utf-8'))[0]["oura_token"]

oura_headers = {"Authorization": f"Bearer {token}"}
req_ds = urllib.request.Request("https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=2026-07-26&end_date=2026-07-29", headers=oura_headers)
with urllib.request.urlopen(req_ds) as resp:
    ds = json.loads(resp.read().decode('utf-8'))

for item in ds.get("data", []):
    print(f"Day: {item.get('day')} | Sleep Score: {item.get('score')} | Contributors: {item.get('contributors')}")
