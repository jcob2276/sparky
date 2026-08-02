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

ds = query_sb("oura_daily_summary", "order=date.desc&limit=10")
enh = query_sb("oura_enhanced", "order=date.desc&limit=10")

print("=== OURA DAILY SUMMARY (RECENT) ===")
for r in ds:
    t_sleep = f"{r.get('total_sleep_hours'):.2f}h" if r.get('total_sleep_hours') is not None else "N/A"
    print(f"Date: {r.get('date')} | Sleep Score: {r.get('sleep_score')} | Readiness: {r.get('readiness_score')} | Total Sleep: {t_sleep} | RHR Avg: {r.get('rhr_avg')} | HRV Avg: {r.get('hrv_avg')}")

print("\n=== OURA ENHANCED (RECENT) ===")
for r in enh:
    print(f"Date: {r.get('date')} | Deep: {r.get('deep_sleep_hours')}h | REM: {r.get('rem_sleep_hours')}h | Efficiency: {r.get('sleep_efficiency')}% | Lowest HR: {r.get('sleep_lowest_heart_rate')} | Avg HRV: {r.get('sleep_average_hrv')} | Restless: {r.get('restless_periods')} | Temp Dev: {r.get('temperature_deviation')}")

s_27 = next((x for x in ds if x.get("date") == "2026-07-27"), {})
s_29 = next((x for x in ds if x.get("date") == "2026-07-29"), {})

e_27 = next((x for x in enh if x.get("date") == "2026-07-27"), {})
e_29 = next((x for x in enh if x.get("date") == "2026-07-29"), {})

with open("tmp/oura_two_nights.json", "w", encoding="utf-8") as f:
    json.dump({
        "night_after_26_summary": s_27,
        "night_after_26_enhanced": e_27,
        "night_after_28_summary": s_29,
        "night_after_28_enhanced": e_29
    }, f, indent=2, ensure_ascii=False)

