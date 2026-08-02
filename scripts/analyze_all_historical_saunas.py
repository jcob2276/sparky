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

def query_sb(table, query_params=""):
    req_url = f"{url}/rest/v1/{table}?{query_params}"
    req = urllib.request.Request(req_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {table}: {e}")
        return []

# 1. Fetch all sauna sessions from workout_sessions
all_ws = query_sb("workout_sessions", "workout_day=eq.Sauna&order=date.desc")
print(f"Found {len(all_ws)} sauna entries in workout_sessions")

# 2. Fetch all running workouts from workout_sessions
all_runs = query_sb("workout_sessions", "workout_day=neq.Sauna&order=date.desc&limit=100")

# 3. Fetch Oura summary and enhanced for all dates
dates = [w.get("date") for w in all_ws if w.get("date")]
# Oura sleep date corresponds to waking up on the NEXT day (date + 1 day)
from datetime import datetime, timedelta
oura_dates = []
for d in dates:
    dt = datetime.strptime(d, "%Y-%m-%d")
    waking_dt = dt + timedelta(days=1)
    oura_dates.append(waking_dt.strftime("%Y-%m-%d"))

in_dates = ",".join(oura_dates)
oura_ds = query_sb("oura_daily_summary", f"date=in.({in_dates})")
oura_enh = query_sb("oura_enhanced", f"date=in.({in_dates})")

results = []
for w in all_ws:
    d = w.get("date")
    dt = datetime.strptime(d, "%Y-%m-%d")
    waking_d = (dt + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Find running workout on same date
    run = next((r for r in all_runs if r.get("date") == d), None)
    
    # Find Oura metrics for waking_d
    ds = next((s for s in oura_ds if s.get("date") == waking_d), {})
    enh = next((e for e in oura_enh if e.get("date") == waking_d), {})
    
    results.append({
        "sauna_date": d,
        "waking_date": waking_d,
        "sauna_notes": w.get("session_notes"),
        "sauna_duration": w.get("duration_minutes"),
        "sauna_start": w.get("start_time"),
        "run_present": bool(run),
        "run_notes": run.get("session_notes") if run else None,
        "sleep_score": ds.get("sleep_score"),
        "readiness_score": ds.get("readiness_score"),
        "total_sleep": ds.get("total_sleep_hours"),
        "rhr_avg": ds.get("rhr_avg"),
        "hrv_avg": ds.get("hrv_avg"),
        "lowest_hr": enh.get("sleep_lowest_heart_rate"),
        "deep_sleep": enh.get("deep_sleep_hours"),
        "rem_sleep": enh.get("rem_sleep_hours"),
        "efficiency": enh.get("sleep_efficiency"),
        "temp_dev": enh.get("temperature_deviation")
    })

print("\n=== ALL HISTORICAL SAUNA SESSIONS ANALYSIS ===")
for r in results:
    print(f"Date: {r['sauna_date']} (Sleep: {r['waking_date']}) | Sauna Dur: {r['sauna_duration']}m | Run Same Day: {r['run_present']}")
    print(f"  Sleep Score: {r['sleep_score']} | Readiness: {r['readiness_score']} | Total Sleep: {r['total_sleep']}h")
    print(f"  RHR Avg: {r['rhr_avg']} | Lowest HR: {r['lowest_hr']} | HRV Avg: {r['hrv_avg']} | Temp Dev: {r['temp_dev']}°C | Efficiency: {r['efficiency']}%")
    print("-" * 70)

os.makedirs("tmp", exist_ok=True)
with open("tmp/historical_saunas_full.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
