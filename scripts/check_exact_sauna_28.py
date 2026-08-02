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

req_url = f"{url}/rest/v1/workout_sessions?date=eq.2026-07-28&select=*"
req = urllib.request.Request(req_url, headers=headers)
with urllib.request.urlopen(req) as resp:
    ws = json.loads(resp.read().decode('utf-8'))
    print("=== WORKOUT SESSIONS FOR 2026-07-28 ===")
    print(json.dumps(ws, indent=2, ensure_ascii=False))

# Also check Garmin details saved in tmp/sauna_details_23767902989.json or tmp/garmin_recent_acts.json
if os.path.exists("tmp/garmin_recent_acts.json"):
    with open("tmp/garmin_recent_acts.json", "r", encoding="utf-8") as f:
        acts = json.load(f)
        for a in acts:
            if a.get("activityId") == 23767902989:
                print("\n=== GARMIN ACTIVITY SUMMARY ===")
                print(f"Name: {a.get('activityName')}")
                print(f"Start Time Local: {a.get('startTimeLocal')}")
                print(f"Duration: {a.get('duration')} sec ({a.get('duration')/60:.2f} min)")
                print(f"Elapsed Duration: {a.get('elapsedDuration')} sec ({a.get('elapsedDuration')/60:.2f} min)")
