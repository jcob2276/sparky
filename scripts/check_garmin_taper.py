import os
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin

EMAIL = os.getenv("GARMIN_EMAIL")
PASSWORD = os.getenv("GARMIN_PASSWORD")

api = Garmin(EMAIL, PASSWORD)
api.login()

for dt in ["2026-10-01", "2026-10-02"]:
    print(f"=== Garmin {dt} ===")
    try:
        stats = api.get_stats(dt)
        print("  Steps:", stats.get("totalSteps"))
        print("  Active calories:", stats.get("activeKilocalories"))
        print("  RHR:", stats.get("restingHeartRate"))
        print("  Stress avg:", stats.get("averageStressLevel"))
        print("  Body Battery charged / drained:", stats.get("bodyBatteryChargedValue"), stats.get("bodyBatteryDrainedValue"))
    except Exception as e:
        print("  Stats error:", e)
    
    try:
        sleep = api.get_sleep_data(dt)
        dto = sleep.get("dailySleepDTO", {})
        dur = dto.get("sleepTimeSeconds", 0) // 3600
        dur_m = (dto.get("sleepTimeSeconds", 0) % 3600) // 60
        score = dto.get("sleepScores", {}).get("overall", {}).get("value")
        deep = dto.get("deepSleepSeconds", 0) // 60
        print(f"  Sleep: {dur}h {dur_m}m | Score: {score} | Deep: {deep}m")
    except Exception as e:
        print("  Sleep error:", e)
