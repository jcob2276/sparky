import json

with open('tmp/all_runs_june_sept.json', 'r', encoding='utf-8') as f:
    runs = json.load(f)

# Add today's run
runs.append({
    'date': '2026-09-29',
    'name': 'Krosno Bieganie (Interwały 6x600m)',
    'distance_km': 8.95,
    'duration_min': 58.5,
    'pace': '6:32',
    'pace_sec': 392.4,
    'avg_hr': 166,
    'max_hr': 195,
    'cadence': 160.0,
    'elev_gain': 28.8,
    'efficiency_factor': '0.93'
})

print(f"=== WSZYSTKIE BIEGI OD CZERWCA DO WRZEŚNIA 2026 ({len(runs)} biegów) ===\n")

# Print chronologically
for r in runs:
    hr_str = f"HR {r['avg_hr']:3d}" if r['avg_hr'] else "HR ---"
    cad_str = f"Kad {r['cadence']:5.1f}" if r['cadence'] else "Kad -----"
    ef_str = f"EF {r['efficiency_factor']}" if r['efficiency_factor'] else "EF ----"
    print(f"{r['date']} | {r['distance_km']:5.2f} km | {r['pace']:>5}/km | {hr_str} | {cad_str} | {ef_str} | {r['name']}")

print("\n" + "="*80)
print("=== 1. ANALIZA BIEGÓW NA 10 KM (LUB OKOŁO 10 KM) ===")
runs_10k = [r for r in runs if 9.0 <= r['distance_km'] <= 11.5]
for r in runs_10k:
    print(f"  {r['date']} | {r['distance_km']:5.2f} km | Czas: {r['duration_min']:4.1f} min | Tempo: {r['pace']}/km | HR: {r['avg_hr']} | Kad: {r['cadence']} | EF: {r['efficiency_factor']}")

print("\n=== 2. ANALIZA BIEGÓW NA 5 KM (LUB OKOŁO 5 KM) ===")
runs_5k = [r for r in runs if 4.5 <= r['distance_km'] <= 6.0]
for r in runs_5k:
    print(f"  {r['date']} | {r['distance_km']:5.2f} km | Czas: {r['duration_min']:4.1f} min | Tempo: {r['pace']}/km | HR: {r['avg_hr']} | Kad: {r['cadence']} | EF: {r['efficiency_factor']}")

print("\n=== 3. ANALIZA DŁUGICH WYBIEGAŃ (> 14 KM) ===")
runs_long = [r for r in runs if r['distance_km'] >= 13.0]
for r in runs_long:
    print(f"  {r['date']} | {r['distance_km']:5.2f} km | Czas: {r['duration_min']:4.1f} min | Tempo: {r['pace']}/km | HR: {r['avg_hr']} | Kad: {r['cadence']} | EF: {r['efficiency_factor']}")

print("\n=== 4. ANALIZA INTERWAŁÓW I BIEGÓW SZYBKICH ===")
runs_fast = [r for r in runs if r['pace_sec'] <= 340 or 'interwał' in r['name'].lower() or 'rytmy' in r['name'].lower()]
for r in runs_fast:
    print(f"  {r['date']} | {r['distance_km']:5.2f} km | Tempo: {r['pace']}/km | HR: {r['avg_hr']} | Kad: {r['cadence']} | {r['name']}")
