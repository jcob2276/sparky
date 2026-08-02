import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime, timedelta

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

saunas = query_sb("workout_sessions", "workout_day=eq.Sauna&order=date.desc")
all_ws = query_sb("workout_sessions", "select=*&order=date.desc&limit=200")
strava = query_sb("strava_activities", "select=*&order=start_date.desc&limit=200")
oura_ds = query_sb("oura_daily_summary", "select=*&order=date.desc&limit=200")
oura_enh = query_sb("oura_enhanced", "select=*&order=date.desc&limit=200")

history = []

for s in saunas:
    s_date = s.get("date")
    if not s_date:
        continue
    dt = datetime.strptime(s_date, "%Y-%m-%d")
    waking_date = (dt + timedelta(days=1)).strftime("%Y-%m-%d")
    
    ws_runs = [w for w in all_ws if w.get("date") == s_date and w.get("workout_day") != "Sauna"]
    strava_runs = [st for st in strava if (st.get("start_date") or "")[:10] == s_date]
    
    ds = next((d for d in oura_ds if d.get("date") == waking_date), {})
    enh = next((e for e in oura_enh if e.get("date") == waking_date), {})
    
    history.append({
        "sauna_date": s_date,
        "waking_date": waking_date,
        "sauna_notes": s.get("session_notes"),
        "sauna_dur_min": s.get("duration_minutes"),
        "sauna_start": s.get("start_time"),
        "ws_runs": [{ "day": r.get("workout_day"), "dur": r.get("duration_minutes"), "notes": r.get("session_notes"), "rpe": r.get("session_rpe") } for r in ws_runs],
        "strava_runs": [{ "name": st.get("name"), "type": st.get("sport_type") or st.get("type"), "dur_min": round((st.get("moving_time") or st.get("elapsed_time") or 0)/60, 1), "distance_km": round((st.get("distance") or 0)/1000, 2), "hr_avg": st.get("average_heartrate") } for st in strava_runs],
        "oura": {
            "sleep_score": ds.get("sleep_score"),
            "readiness_score": ds.get("readiness_score"),
            "total_sleep": ds.get("total_sleep_hours"),
            "rhr_avg": ds.get("rhr_avg"),
            "hrv_avg": ds.get("hrv_avg"),
            "lowest_hr": enh.get("sleep_lowest_heart_rate"),
            "temp_dev": enh.get("temperature_deviation"),
            "efficiency": enh.get("sleep_efficiency"),
            "deep_sleep": enh.get("deep_sleep_hours"),
            "rem_sleep": enh.get("rem_sleep_hours")
        }
    })

os.makedirs("tmp", exist_ok=True)
with open("tmp/full_historical_matrix.json", "w", encoding="utf-8") as f:
    json.dump(history, f, indent=2, ensure_ascii=False)

print(f"Successfully saved {len(history)} historical sauna entries to tmp/full_historical_matrix.json!")

