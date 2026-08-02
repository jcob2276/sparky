import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

garth.resume(TOKENS)
api = Garmin()

all_acts = []
print("Fetching 200 activities across batches...")

for start in range(0, 200, 20):
    try:
        batch = api.get_activities(start, 20)
        if not batch:
            print(f"No more activities at start {start}")
            break
        all_acts.extend(batch)
        print(f"Batch {start}..{start+len(batch)-1}: {batch[0].get('startTimeLocal')} to {batch[-1].get('startTimeLocal')} (Count: {len(batch)})")
    except Exception as e:
        print(f"Error fetching batch {start}: {e}")
        break

print(f"\nTotal activities fetched: {len(all_acts)}")

sauna_candidates = []
for a in all_acts:
    act_id = a.get("activityId")
    name = a.get("activityName", "")
    type_key = a.get("activityType", {}).get("typeKey", "")
    start = a.get("startTimeLocal")
    dur_min = round((a.get("duration") or 0) / 60, 1)
    hr = a.get("averageHR")
    max_hr = a.get("maxHR")
    
    if type_key != "running" or any(w in name.lower() for w in ["sauna", "kardio", "cardio", "inne", "other", "breathwork", "odpoczynek"]):
        sauna_candidates.append({
            "id": act_id,
            "date": start,
            "name": name,
            "type": type_key,
            "dur": dur_min,
            "avg_hr": hr,
            "max_hr": max_hr
        })

print(f"\nFound {len(sauna_candidates)} non-running / sauna / cardio activities:")
for m in sauna_candidates:
    print(f"ID: {m['id']} | Date: {m['date']} | Name: '{m['name']}' | Type: {m['type']} | Dur: {m['dur']}m | Avg HR: {m['avg_hr']} | Max HR: {m['max_hr']}")

os.makedirs("tmp", exist_ok=True)
with open("tmp/all_garmin_200_full.json", "w", encoding="utf-8") as f:
    json.dump(all_acts, f, indent=2, ensure_ascii=False)
