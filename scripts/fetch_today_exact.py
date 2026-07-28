import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin

email = os.getenv("GARMIN_EMAIL")
password = os.getenv("GARMIN_PASSWORD")
api = Garmin(email, password)
api.login()

act_id = 23766461206 # TODAY'S RUN (28 July 2026)

print(f"Fetching data for TODAY activity {act_id}...")
summary = api.get_activity(act_id)
print("Summary name:", summary.get("activityName"))
print("Summary dist:", summary.get("distance"), "m")
print("Summary dur:", summary.get("duration"), "s")

with open("tmp/today_summary_28.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2, ensure_ascii=False)

try:
    splits = api.get_activity_splits(act_id)
    with open("tmp/today_splits_28.json", "w", encoding="utf-8") as f:
        json.dump(splits, f, indent=2, ensure_ascii=False)
    print("Saved splits!")
except Exception as e:
    print("Splits error:", e)

try:
    details = api.get_activity_details(act_id, maxchart=1000)
    with open("tmp/today_details_28.json", "w", encoding="utf-8") as f:
        json.dump(details, f, indent=2, ensure_ascii=False)
    print("Saved details!")
except Exception as e:
    print("Details error:", e)
