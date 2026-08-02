import os, json
from dotenv import load_dotenv
load_dotenv()
import urllib.request
import urllib.parse

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

def get_supabase(table, params=""):
    full_url = f"{url}/rest/v1/{table}?{params}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(full_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {table}: {e}")
        return []

# Search vanguard_stream
print("=== VANGUARD STREAM (SAUNA SEARCH) ===")
vs_sauna = get_supabase("vanguard_stream", "raw_content=ilike.*saun*&order=timestamp.desc")
if not vs_sauna:
    # Try without filter and search in python
    vs_all = get_supabase("vanguard_stream", "order=timestamp.desc&limit=200")
    vs_sauna = [x for x in vs_all if "saun" in json.dumps(x).lower()]

print(f"Found {len(vs_sauna)} entries in vanguard_stream:")
for s in vs_sauna:
    print(f"  {s.get('timestamp')} | {s.get('raw_content')}")

print("\n=== FRICTION EVENTS ===")
fe_all = get_supabase("friction_events", "order=created_at.desc&limit=100")
fe_sauna = [x for x in fe_all if "saun" in json.dumps(x).lower()]
print(f"Found {len(fe_sauna)} entries in friction_events:")
for f in fe_sauna:
    print(f"  {f.get('created_at')} | {f.get('notes') or f.get('trigger_description') or f.get('context')}")

print("\n=== WORKOUT SESSIONS / LOGS ===")
ws_all = get_supabase("workout_sessions", "order=date.desc&limit=100")
ws_sauna = [x for x in ws_all if "saun" in json.dumps(x).lower()]
print(f"Found {len(ws_sauna)} entries in workout_sessions:")
for w in ws_sauna:
    print(f"  {w.get('date')} | {w.get('title')} | {w.get('notes')}")

print("\n=== NOTES ===")
notes_all = get_supabase("notes", "order=created_at.desc&limit=100")
notes_sauna = [x for x in notes_all if "saun" in json.dumps(x).lower()]
print(f"Found {len(notes_sauna)} entries in notes:")
for n in notes_sauna:
    print(f"  {n.get('created_at')} | {n.get('title')} | {n.get('content')[:100]}")

print("\n=== VANGUARD WIKI / STATE ===")
wiki_all = get_supabase("vanguard_wiki", "order=updated_at.desc&limit=50")
wiki_sauna = [x for x in wiki_all if "saun" in json.dumps(x).lower()]
print(f"Found {len(wiki_sauna)} entries in vanguard_wiki:")
for wk in wiki_sauna:
    print(f"  {wk.get('title')} | {wk.get('content')[:100]}")

