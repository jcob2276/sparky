import os, json, urllib.request, datetime
from dotenv import load_dotenv

load_dotenv()
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('SB_SECRET_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

req = urllib.request.Request(f'{url}/rest/v1/user_settings?select=oura_token', headers=headers)
oura_token = None
try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        oura_token = res[0].get('oura_token') if res else None
except Exception:
    pass

if not oura_token:
    req2 = urllib.request.Request(f'{url}/rest/v1/vanguard_tokens?select=oura_token', headers=headers)
    with urllib.request.urlopen(req2) as resp:
        res2 = json.loads(resp.read().decode('utf-8'))
        oura_token = res2[0].get('oura_token') if res2 else None

if not oura_token:
    print("No Oura token found!")
    exit(1)

oura_headers = {'Authorization': f'Bearer {oura_token}'}
start_date = "2026-09-14"
end_date = "2026-09-23"

endpoints = [
    ("daily_readiness", f"https://api.ouraring.com/v2/usercollection/daily_readiness?start_date={start_date}&end_date={end_date}"),
    ("daily_sleep", f"https://api.ouraring.com/v2/usercollection/daily_sleep?start_date={start_date}&end_date={end_date}"),
    ("sleep", f"https://api.ouraring.com/v2/usercollection/sleep?start_date={start_date}&end_date={end_date}"),
    ("daily_resilience", f"https://api.ouraring.com/v2/usercollection/daily_resilience?start_date={start_date}&end_date={end_date}"),
    ("daily_stress", f"https://api.ouraring.com/v2/usercollection/daily_stress?start_date={start_date}&end_date={end_date}"),
    ("daily_activity", f"https://api.ouraring.com/v2/usercollection/daily_activity?start_date={start_date}&end_date={end_date}")
]

results = {}
for name, ep in endpoints:
    try:
        req = urllib.request.Request(ep, headers=oura_headers)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results[name] = data.get("data", [])
    except Exception as e:
        results[name] = {"error": str(e)}

with open("tmp/oura_health_check.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("Fetched endpoints successfully. Summarizing:")

print("\n=== DAILY READINESS ===")
for r in results.get("daily_readiness", []):
    day = r.get("day")
    score = r.get("score")
    temp_dev = r.get("temperature_deviation")
    temp_trend = r.get("temperature_trend_deviation")
    contrib = r.get("contributors", {})
    print(f"[{day}] Score: {score} | Temp dev: {temp_dev}°C (trend: {temp_trend}) | RHR c: {contrib.get('resting_heart_rate')}, HRV bal: {contrib.get('hrv_balance')}, Recovery index: {contrib.get('recovery_index')}, Sleep bal: {contrib.get('sleep_balance')}")

print("\n=== SLEEP SESSIONS (last nights) ===")
for s in results.get("sleep", []):
    day = s.get("day")
    typ = s.get("type")
    score = s.get("score")
    dur = s.get("total_sleep_duration", 0) / 3600
    hr_lowest = s.get("lowest_heart_rate")
    hr_avg = s.get("average_heart_rate")
    hrv_avg = s.get("average_hrv")
    breath = s.get("average_breath")
    eff = s.get("efficiency")
    print(f"[{day} - {typ}] Score: {score} | Dur: {dur:.1f}h | Eff: {eff}% | Lowest HR: {hr_lowest} bpm | Avg HR: {hr_avg} bpm | HRV: {hrv_avg} ms | Breath: {breath}/min")

print("\n=== DAILY RESILIENCE ===")
for res in results.get("daily_resilience", []):
    print(f"[{res.get('day')}] Level: {res.get('level')} | Contributors: {res.get('contributors')}")

print("\n=== DAILY STRESS (last 3 days) ===")
for st in results.get("daily_stress", [])[-4:]:
    day = st.get("day")
    stress_high = st.get("stress_high")
    recovery_high = st.get("recovery_high")
    day_summary = st.get("day_summary")
    print(f"[{day}] Summary: {day_summary} | Stress high: {stress_high}s | Recovery high: {recovery_high}s")
