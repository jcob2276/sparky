import json

with open("tmp/all_garmin_activities.json", "r", encoding="utf-8") as f:
    acts = json.load(f)

print(f"Total activities in all_garmin_activities.json: {len(acts)}")
for i, a in enumerate(acts):
    act_id = a.get("activityId")
    name = a.get("activityName", "")
    type_key = a.get("activityType", {}).get("typeKey", "")
    start = a.get("startTimeLocal")
    dur_min = round((a.get("duration") or 0) / 60, 1)
    hr = a.get("averageHR")
    max_hr = a.get("maxHR")
    print(f"[{i}] ID: {act_id} | Date: {start} | Name: '{name}' | Type: {type_key} | Dur: {dur_min}m | Avg HR: {hr} | Max HR: {max_hr}")
