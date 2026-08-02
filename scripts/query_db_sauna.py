import os, json
from dotenv import load_dotenv
load_dotenv()
import urllib.request

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("No Supabase URL/Key")
    exit(1)

def query_table(table, params=""):
    req_url = f"{url}/rest/v1/{table}?{params}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(req_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data
    except Exception as e:
        print(f"Error querying {table}: {e}")
        return []

print("Searching vanguard_stream for sauna...")
stream_data = query_table("vanguard_stream", "raw_content=ilike.*saun*&order=timestamp.desc&limit=20")
print(f"Found {len(stream_data)} entries in vanguard_stream:")
for s in stream_data:
    print(f"  {s.get('timestamp')} | {s.get('raw_content')[:100]}")

print("\nSearching friction_events for sauna...")
friction_data = query_table("friction_events", "notes=ilike.*saun*&order=created_at.desc&limit=20")
print(f"Found {len(friction_data)} entries in friction_events:")
for f in friction_data:
    print(f"  {f.get('created_at')} | {f.get('notes')}")

print("\nSearching workout_sessions for cardio / sauna...")
workout_data = query_table("workout_sessions", "notes=ilike.*saun*&order=date.desc&limit=20")
print(f"Found {len(workout_data)} entries in workout_sessions:")
for w in workout_data:
    print(f"  {w.get('date')} | {w.get('title')} | {w.get('notes')}")

