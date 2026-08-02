import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin

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

# Query Oura summary & enhanced for July 30 & July 31
oura_30 = query_sb("oura_daily_summary", "date=eq.2026-07-30")
oura_31 = query_sb("oura_daily_summary", "date=eq.2026-07-31")
enh_30 = query_sb("oura_enhanced", "date=eq.2026-07-30")
enh_31 = query_sb("oura_enhanced", "date=eq.2026-07-31")

print("=== OURA DAILY SUMMARY 30 ===", oura_30)
print("=== OURA DAILY SUMMARY 31 ===", oura_31)
print("=== OURA ENHANCED 30 ===", enh_30)
print("=== OURA ENHANCED 31 ===", enh_31)

# Inspect Garmin Activity 23792783046 (10km run on 2026-07-30)
with open("tmp/recent_activities.json", "r", encoding="utf-8") as f:
    acts = json.load(f)

run_30 = next((a for a in acts if a.get("activityId") == 23792783046), None)
if run_30:
    print("\n=== GARMIN RUN JULY 30 ===")
    print(f"Start: {run_30.get('startTimeLocal')}")
    print(f"Duration: {run_30.get('duration')//60} min {run_30.get('duration')%60} s")
    print(f"Distance: {run_30.get('distance')/1000:.2f} km")
    print(f"Avg HR: {run_30.get('averageHR')} | Max HR: {run_30.get('maxHR')}")
    print(f"Calories: {run_30.get('calories')}")
