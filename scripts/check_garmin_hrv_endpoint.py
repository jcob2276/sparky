import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")

api = Garmin(EMAIL, PASSWORD)
api.login()

for d in ["2026-07-30", "2026-07-29", "2026-07-28"]:
    print(f"\n--- Checking Garmin HRV Data for {d} ---")
    try:
        hrv = api.get_hrv_data(d)
        print("HRV Summary:", hrv.get("hrvSummary") if isinstance(hrv, dict) else hrv)
    except Exception as e:
        print("HRV Error:", e)

    try:
        rhr = api.get_rhr_day(d)
        print("RHR Data:", rhr)
    except Exception as e:
        print("RHR Error:", e)
