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

def query_sb(table, query_params):
    req_url = f"{url}/rest/v1/{table}?{query_params}"
    req = urllib.request.Request(req_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {table}: {e}")
        return []

# Query Oura daytime HR or daily summary for July 31
oura_hr = query_sb("oura_hr_5min", "day=eq.2026-07-31")
oura_ds = query_sb("oura_daily_summary", "date=eq.2026-07-31")

print("=== OURA DAILY SUMMARY TODAY ===")
print(oura_ds)

if oura_hr:
    print("\n=== OURA 5-MIN HR TODAY (LAST 10 SAMPLES) ===")
    hr_data = oura_hr[0].get("hr_samples", []) or []
    print(f"Total samples today: {len(hr_data)}")
    for s in hr_data[-15:]:
        print(s)
