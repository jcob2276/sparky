import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

def fetch_table(table):
    req_url = f"{url}/rest/v1/{table}?select=*&order=created_at.desc&limit=50"
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
        # try without created_at order
        req_url2 = f"{url}/rest/v1/{table}?select=*&limit=50"
        req2 = urllib.request.Request(req_url2, headers=headers)
        try:
            with urllib.request.urlopen(req2) as resp2:
                return json.loads(resp2.read().decode('utf-8'))
        except Exception as e2:
            print(f"Error fetching {table}: {e2}")
            return []

result = {
    "vanguard_stream": fetch_table("vanguard_stream"),
    "friction_events": fetch_table("friction_events"),
    "workout_sessions": fetch_table("workout_sessions"),
    "vanguard_daily_reconciliation": fetch_table("vanguard_daily_reconciliation")
}

os.makedirs("tmp", exist_ok=True)
with open("tmp/db_export_sauna.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("Saved database export to tmp/db_export_sauna.json")
