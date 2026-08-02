import os, json, urllib.request
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth
from datetime import datetime, timedelta

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

# Fetch Oura sleep data from Supabase
oura_ds = query_sb("oura_daily_summary", "order=date.desc&limit=14")
oura_enh = query_sb("oura_enhanced", "order=date.desc&limit=14")

oura_by_date = {}
for r in oura_ds:
    d = r.get("date")
    if d:
        oura_by_date[d] = {"summary": r}
for r in oura_enh:
    d = r.get("date")
    if d and d in oura_by_date:
        oura_by_date[d]["enhanced"] = r

# Fetch Garmin sleep data via Garmin API
TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")
garmin_api = None
if os.path.exists(TOKENS):
    try:
        garth.resume(TOKENS)
        garmin_api = Garmin()
        garmin_api.get_user_profile()
    except Exception as e:
        print(f"Garth resume error: {e}")

if not garmin_api:
    try:
        EMAIL = os.getenv("GARMIN_EMAIL")
        PASSWORD = os.getenv("GARMIN_PASSWORD")
        garmin_api = Garmin(EMAIL, PASSWORD)
        garmin_api.login()
    except Exception as e:
        print(f"Garmin login error: {e}")

garmin_by_date = {}
if garmin_api:
    # check recent dates
    today = datetime.now()
    for i in range(1, 8):
        dt_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        try:
            sleep_data = garmin_api.get_sleep_data(dt_str)
            garmin_by_date[dt_str] = sleep_data
        except Exception as e:
            print(f"Garmin sleep error for {dt_str}: {e}")

# Compare dates
print("==========================================================================")
print("              GARMIN vs OURA RING - SLEEP COMPARISON                     ")
print("==========================================================================")

dates = sorted(list(set(list(oura_by_date.keys()) + list(garmin_by_date.keys()))), reverse=True)

comparison = []

for d in dates[:7]: # Recent 7 nights
    o_data = oura_by_date.get(d, {})
    o_sum = o_data.get("summary", {})
    o_enh = o_data.get("enhanced", {})
    
    g_data = garmin_by_date.get(d, {})
    g_daily = g_data.get("dailySleepDTO", {}) or {}
    
    # Oura metrics
    o_score = o_sum.get("sleep_score")
    o_total_h = o_sum.get("total_sleep_hours")
    o_deep_h = o_enh.get("deep_sleep_hours")
    o_rem_h = o_enh.get("rem_sleep_hours")
    o_rhr = o_sum.get("rhr_avg") or o_enh.get("sleep_lowest_heart_rate")
    o_hrv = o_sum.get("hrv_avg") or o_enh.get("sleep_average_hrv")
    
    # Garmin metrics
    g_score = g_daily.get("sleepScores", {}).get("overall", {}).get("value") if isinstance(g_daily.get("sleepScores"), dict) else None
    g_total_s = g_daily.get("sleepTimeSeconds")
    g_total_h = round(g_total_s / 3600, 2) if g_total_s else None
    g_deep_s = g_daily.get("deepSleepSeconds")
    g_deep_h = round(g_deep_s / 3600, 2) if g_deep_s else None
    g_rem_s = g_daily.get("remSleepSeconds")
    g_rem_h = round(g_rem_s / 3600, 2) if g_rem_s else None
    g_rhr = g_daily.get("restingHeartRate")
    g_hrv = g_daily.get("avgOvernightHrv")
    
    entry = {
        "date": d,
        "oura": {
            "score": o_score,
            "total_h": o_total_h,
            "deep_h": o_deep_h,
            "rem_h": o_rem_h,
            "rhr": o_rhr,
            "hrv": o_hrv
        },
        "garmin": {
            "score": g_score,
            "total_h": g_total_h,
            "deep_h": g_deep_h,
            "rem_h": g_rem_h,
            "rhr": g_rhr,
            "hrv": g_hrv,
            "raw_dto": g_daily
        }
    }
    comparison.append(entry)
    
    print(f"\n--- DATE: {d} ---")
    print(f"  [Sleep Score]       Oura: {o_score or 'N/A':>5}  |  Garmin: {g_score or 'N/A':>5}")
    print(f"  [Total Sleep Time]  Oura: {f'{o_total_h}h' if o_total_h else 'N/A':>5}  |  Garmin: {f'{g_total_h}h' if g_total_h else 'N/A':>5}")
    print(f"  [Deep Sleep]        Oura: {f'{o_deep_h}h' if o_deep_h else 'N/A':>5}  |  Garmin: {f'{g_deep_h}h' if g_deep_h else 'N/A':>5}")
    print(f"  [REM Sleep]         Oura: {f'{o_rem_h}h' if o_rem_h else 'N/A':>5}  |  Garmin: {f'{g_rem_h}h' if g_rem_h else 'N/A':>5}")
    print(f"  [Resting HR (RHR)]  Oura: {f'{o_rhr} bpm' if o_rhr else 'N/A':>5}  |  Garmin: {f'{g_rhr} bpm' if g_rhr else 'N/A':>5}")
    print(f"  [Overnight HRV]     Oura: {f'{o_hrv} ms' if o_hrv else 'N/A':>5}  |  Garmin: {f'{g_hrv} ms' if g_hrv else 'N/A':>5}")

with open("tmp/sleep_garmin_vs_oura.json", "w", encoding="utf-8") as f:
    json.dump(comparison, f, indent=2, ensure_ascii=False)

print("\nSaved full comparison to tmp/sleep_garmin_vs_oura.json")
