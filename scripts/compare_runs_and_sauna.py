import os, json
from dotenv import load_dotenv
load_dotenv()
from garminconnect import Garmin
import garth

TOKENS = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garmin_tokens")

garth.resume(TOKENS)
api = Garmin()

# Run 1: 2026-07-26 (ID: 23742690763)
# Run 2: 2026-07-28 (ID: 23766461206)

run1 = api.get_activity(23742690763)
run2 = api.get_activity(23766461206)

print("=== RUN 1: 26 LIPCA (NIEDZIELA) ===")
summary1 = run1.get("summaryDTO", {})
print(f"Start: {summary1.get('startTimeLocal')}")
print(f"Duration: {summary1.get('duration')/60:.1f} min")
print(f"Distance: {summary1.get('distance')/1000:.2f} km")
print(f"Avg HR: {summary1.get('averageHR')} bpm | Max HR: {summary1.get('maxHR')} bpm")
print(f"Calories: {summary1.get('calories')} kcal")
print(f"Elevation Gain: {summary1.get('elevationGain')} m")
print(f"RPE / Feel: {summary1.get('directWorkoutRpe')} / {summary1.get('directWorkoutFeel')}")

print("\n=== RUN 2: 28 LIPCA (WTOREK) ===")
summary2 = run2.get("summaryDTO", {})
print(f"Start: {summary2.get('startTimeLocal')}")
print(f"Duration: {summary2.get('duration')/60:.1f} min")
print(f"Distance: {summary2.get('distance')/1000:.2f} km")
print(f"Avg HR: {summary2.get('averageHR')} bpm | Max HR: {summary2.get('maxHR')} bpm")
print(f"Calories: {summary2.get('calories')} kcal")
print(f"Elevation Gain: {summary2.get('elevationGain')} m")
print(f"RPE / Feel: {summary2.get('directWorkoutRpe')} / {summary2.get('directWorkoutFeel')}")

os.makedirs("tmp", exist_ok=True)
with open("tmp/runs_comparison.json", "w", encoding="utf-8") as f:
    json.dump({"run_26": run1, "run_28": run2}, f, indent=2, ensure_ascii=False)
