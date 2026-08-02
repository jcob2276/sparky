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

print("=== OURA DAILY SUMMARY FOR 2026-07-26, 2026-07-27, 2026-07-28, 2026-07-29 ===")
ds = query_sb("oura_daily_summary", "date=in.(2026-07-26,2026-07-27,2026-07-28,2026-07-29)")
print(json.dumps(ds, indent=2, ensure_ascii=False))

print("\n=== OURA ENHANCED FOR 2026-07-26, 2026-07-27, 2026-07-28, 2026-07-29 ===")
enh = query_sb("oura_enhanced", "date=in.(2026-07-26,2026-07-27,2026-07-28,2026-07-29)")
print(json.dumps(enh, indent=2, ensure_ascii=False))

print("\n=== OURA SLEEP HR TIMELINE FOR 2026-07-26, 2026-07-27, 2026-07-28, 2026-07-29 ===")
hr_tl = query_sb("oura_sleep_hr_timeline", "date=in.(2026-07-26,2026-07-27,2026-07-28,2026-07-29)")
print(f"Fetched {len(hr_tl)} HR timeline entries")

print("\n=== CHECKING OURA TOKEN FROM VANGUARD TOKENS / USER SETTINGS ===")
tokens = query_sb("vanguard_tokens", "select=*")
print(f"Tokens found in vanguard_tokens: {len(tokens)}")

user_settings = query_sb("user_settings", "select=*")
oura_token = None
for u in user_settings:
    if u.get("oura_token"):
        oura_token = u.get("oura_token")
        print("Found oura_token in user_settings!")

for t in tokens:
    if t.get("oura_token"):
        oura_token = t.get("oura_token")
        print("Found oura_token in vanguard_tokens!")

os.makedirs("tmp", exist_ok=True)
with open("tmp/oura_sleep_comparison.json", "w", encoding="utf-8") as f:
    json.dump({
        "oura_daily_summary": ds,
        "oura_enhanced": enh,
        "oura_sleep_hr_timeline": hr_tl,
        "oura_token_exists": bool(oura_token)
    }, f, indent=2, ensure_ascii=False)

