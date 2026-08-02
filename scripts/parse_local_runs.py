import json

with open("tmp/all_garmin_activities.json", "r", encoding="utf-8") as f:
    acts = json.load(f)

run_26 = next((a for a in acts if a.get("activityId") == 23742690763), {})
run_28 = next((a for a in acts if a.get("activityId") == 23766461206), {})

print("=== BIEG 26 LIPCA (NIEDZIELA) ===")
print(f"Start: {run_26.get('startTimeLocal')}")
print(f"Duration: {(run_26.get('duration') or 0)/60:.1f} min")
print(f"Distance: {(run_26.get('distance') or 0)/1000:.2f} km")
print(f"Avg HR: {run_26.get('averageHR')} bpm | Max HR: {run_26.get('maxHR')} bpm")
print(f"Calories: {run_26.get('calories')} kcal")

print("\n=== BIEG 28 LIPCA (WTOREK) ===")
print(f"Start: {run_28.get('startTimeLocal')}")
print(f"Duration: {(run_28.get('duration') or 0)/60:.1f} min")
print(f"Distance: {(run_28.get('distance') or 0)/1000:.2f} km")
print(f"Avg HR: {run_28.get('averageHR')} bpm | Max HR: {run_28.get('maxHR')} bpm")
print(f"Calories: {run_28.get('calories')} kcal")
