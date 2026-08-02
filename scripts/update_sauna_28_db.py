import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

row_id = "4df454bf-4b9d-4acf-8ef1-fa254f63d258"

update_payload = {
    "start_time": "2026-07-28T19:07:00+00:00",
    "end_time": "2026-07-28T19:25:00+00:00",
    "duration_minutes": 18,
    "hr_avg_bpm": 146,
    "hr_peak_bpm": 168,
    "session_notes": "Po bieganiu (Sauna 18 min | 21:07-21:25 | Garmin Kardio 21:13-21:21 | śr. HR 146, max 168)"
}

req_url = f"{url}/rest/v1/workout_sessions?id=eq.{row_id}"
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

data_bytes = json.dumps(update_payload).encode('utf-8')
req = urllib.request.Request(req_url, data=data_bytes, headers=headers, method="PATCH")

try:
    with urllib.request.urlopen(req) as resp:
        print("Updated sauna 28 July row successfully!")
except Exception as e:
    print(f"Error updating: {e}")
