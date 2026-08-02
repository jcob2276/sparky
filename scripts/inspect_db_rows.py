import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

def fetch_table(table):
    req_url = f"{url}/rest/v1/{table}?select=*"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(req_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {table}: {e}")
        return []

print("=== ALL VANGUARD STREAM ROWS ===")
vs = fetch_table("vanguard_stream")
print(json.dumps(vs, indent=2, ensure_ascii=False))

print("\n=== ALL FRICTION EVENTS ROWS ===")
fe = fetch_table("friction_events")
print(json.dumps(fe, indent=2, ensure_ascii=False))

print("\n=== ALL WORKOUT SESSIONS ROWS ===")
ws = fetch_table("workout_sessions")
print(json.dumps(ws, indent=2, ensure_ascii=False))
