import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SB_SECRET_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

row_id = "b20ba564-b25d-4dc6-b71f-f16a598630e8"

req_url = f"{url}/rest/v1/workout_sessions?id=eq.{row_id}&select=*"
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

req = urllib.request.Request(req_url, headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print(json.dumps(data, indent=2, ensure_ascii=True))
