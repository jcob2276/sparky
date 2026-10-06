import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")

api = Garmin(EMAIL, PASSWORD)
api.login()

aid = 24570325323
print(f"=== Run 2026-10-01 Details (ID: {aid}) ===")
with open("tmp/run_2026-10-01.json", "r", encoding="utf-8") as f:
    summary = json.load(f)

dist_km = (summary.get("distance") or 0) / 1000
dur_sec = summary.get("duration") or 0
mov_sec = summary.get("movingDuration") or 0
avg_hr = summary.get("averageHR")
max_hr = summary.get("maxHR")
cad = summary.get("averageRunningCadenceInStepsPerMinute")
elev = summary.get("elevationGain")
start_time = summary.get("startTimeLocal")

spd = summary.get("averageMovingSpeed") or summary.get("averageSpeed", 0)
pace_s = (1000 / spd) if spd > 0 else 0
pace_str = f"{int(pace_s//60)}:{int(round(pace_s%60)):02d}"

print(f"Start: {start_time}")
print(f"Dystans: {dist_km:.2f} km")
print(f"Czas: {int(dur_sec//60)}m {int(dur_sec%60)}s (moving: {int(mov_sec//60)}m {int(mov_sec%60)}s)")
print(f"Średnie tempo: {pace_str} /km")
print(f"Średnie HR: {avg_hr} bpm | Max HR: {max_hr} bpm")
print(f"Średnia kadencja: {cad} spm")
print(f"Przewyższenie: +{elev} m")

splits = api.get_activity_splits(aid)
with open("tmp/splits_2026-10-01.json", "w", encoding="utf-8") as f:
    json.dump(splits, f, indent=2, ensure_ascii=False)

laps = splits.get("lapDTOs", [])
print(f"\n--- Splity kilometrowe ({len(laps)} lapów) ---")
for i, l in enumerate(laps):
    ldist = l.get("distance", 0)
    ldur = l.get("duration", 0)
    lspd = l.get("averageMovingSpeed") or l.get("averageSpeed", 0)
    lpace_s = (1000 / lspd) if lspd > 0 else 0
    lpace_str = f"{int(lpace_s//60)}:{int(round(lpace_s%60)):02d}"
    lhr = l.get("averageHR")
    lmax_hr = l.get("maxHR")
    lcad = l.get("averageRunCadence")
    lelev = l.get("elevationGain")
    print(f"  Km {i+1}: {ldist:.0f} m | {int(ldur//60)}:{int(ldur%60):02d} | Tempo {lpace_str}/km | HR: {lhr} (max {lmax_hr}) | Kad: {lcad} spm | +{lelev}m")

zones = api.get_activity_hr_in_timezones(aid)
print("\n--- Strefy tętna ---")
for z in zones:
    znum = z.get("zoneNumber")
    zsec = z.get("secsInZone", 0)
    zlow = z.get("zoneLowBoundary")
    print(f"  Strefa {znum}: {int(zsec//60)} min ({zsec:.0f}s) | próg >= {zlow} bpm")
