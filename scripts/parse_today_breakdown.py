import os, json, shutil
from dotenv import load_dotenv
load_dotenv()
import garth
from garminconnect import Garmin

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

api = None
if os.path.exists(TOKENS):
    try:
        garth.resume(TOKENS)
        api = Garmin()
        api.login()
    except Exception as e:
        print(f"Token resume error: {e}, re-logging...")
        shutil.rmtree(TOKENS, ignore_errors=True)

if not api:
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    api = Garmin(email, password)
    api.login()
    os.makedirs(TOKENS, exist_ok=True)
    garth.save(TOKENS)

act_id = 23926423778

print(f"Fetching details for activity {act_id}...")

try:
    details = api.get_activity_details(act_id)
    with open("tmp/garmin_today_details.json", "w", encoding="utf-8") as f:
        json.dump(details, f, indent=2, ensure_ascii=False)
    print("Saved details to tmp/garmin_today_details.json!")
except Exception as e:
    print(f"Error fetching details: {e}")

try:
    split_summaries = api.get_activity_split_summaries(act_id)
    with open("tmp/garmin_today_split_summaries.json", "w", encoding="utf-8") as f:
        json.dump(split_summaries, f, indent=2, ensure_ascii=False)
    print("Saved split_summaries to tmp/garmin_today_split_summaries.json!")
except Exception as e:
    print(f"Error fetching split_summaries: {e}")
