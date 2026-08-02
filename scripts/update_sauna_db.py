import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

row_id = "b20ba564-b25d-4dc6-b71f-f16a598630e8"

update_payload = {
    "start_time": "2026-07-26T19:12:00+00:00",
    "end_time": "2026-07-26T19:36:00+00:00",
    "duration_minutes": 24,
    "hr_avg_bpm": 131,
    "hr_peak_bpm": 154,
    "session_notes": "Po bieganiu (Garmin API 21:12-21:36 | śr. HR 131, max 154)",
    "hr_rescored_at": "2026-07-29T09:16:22Z"
}

req_url = f"{url}/rest/v1/workout_sessions?id=eq.{row_id}"
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

data_bytes = json.dumps(update_payload).encode('utf-8')
req = urllib.request.Request(req_url, data=data_bytes, headers=headers, method="PATCH")

try:
    with urllib.request.urlopen(req) as resp:
        updated = json.loads(resp.read().decode('utf-8'))
        print("✅ Successfully updated row in workout_sessions:")
        print(json.dumps(updated, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error updating row: {e}")
