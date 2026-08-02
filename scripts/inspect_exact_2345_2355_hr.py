import json
from datetime import datetime, timezone, timedelta

with open("tmp/oura_aug2_hr_full.json", "r", encoding="utf-8") as f:
    hr_data = json.load(f)

tz = timezone(timedelta(hours=2))

print("=======================================================")
print("  OURA RING - EXACT HR SAMPLES BETWEEN 23:30 AND 00:15 ")
print("=======================================================")

target_samples = []
for item in hr_data:
    ts = item.get("timestamp")
    bpm = item.get("bpm")
    source = item.get("source")
    if ts:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(tz)
        time_str = dt.strftime("%H:%M:%S")
        if "23:30:00" <= time_str <= "23:59:59" or "00:00:00" <= time_str <= "00:15:00":
            target_samples.append((time_str, bpm, source))
            print(f"  [{time_str}] HR: {bpm:3.0f} bpm | Source: {source}")

if not target_samples:
    print("No samples found in that range. Printing all samples around 23:00 - 00:30:")
    for item in hr_data:
        ts = item.get("timestamp")
        bpm = item.get("bpm")
        source = item.get("source")
        if ts:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(tz)
            time_str = dt.strftime("%H:%M:%S")
            if "23:00:00" <= time_str <= "23:59:59" or "00:00:00" <= time_str <= "00:30:00":
                print(f"  [{time_str}] HR: {bpm:3.0f} bpm | Source: {source}")
