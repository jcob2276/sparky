import json
import matplotlib.pyplot as plt
import numpy as np
import os

os.makedirs("tmp/charts", exist_ok=True)

# Set style
plt.style.use('dark_background')
plt.rcParams['font.sans-serif'] = 'Segoe UI, Helvetica, Arial'
plt.rcParams['axes.edgecolor'] = '#334155'
plt.rcParams['axes.linewidth'] = 0.8

with open("tmp/parsed_runs_report_data.json", "r", encoding="utf-8") as f:
    runs_data = json.load(f)

# Runs only (exclude or include marathon as baseline)
post_runs = runs_data[1:] # Run 1, Run 2, Run 3
labels = ["Bieg 1 (11.10)\n5.27 km", "Bieg 2 (13.10)\n7.00 km", "Bieg 3 (15.10)\n8.42 km"]
distances = [r["dist_km"] for r in post_runs]
durations = [r["duration_sec"] / 60.0 for r in post_runs]
paces = [r["duration_sec"] / 60.0 / r["dist_km"] for r in post_runs] # min/km
avg_hrs = [r["avg_hr"] for r in post_runs]
cadences = [r["cadence"] for r in post_runs]

# -------------------------------------------------------------
# 1. Progression Chart: Distance, Pace, HR
# -------------------------------------------------------------
fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(13, 4.2), facecolor='#0f172a')
for ax in (ax1, ax2, ax3):
    ax.set_facecolor('#1e293b')
    ax.grid(True, linestyle='--', alpha=0.3, color='#475569')

# Ax1: Distance
bars1 = ax1.bar(labels, distances, color=['#38bdf8', '#0ea5e9', '#0284c7'], width=0.55, edgecolor='#38bdf8', linewidth=1.5, zorder=3)
ax1.set_title("Dystans (km)", fontsize=13, fontweight='bold', color='#f8fafc', pad=12)
ax1.set_ylim(0, 10.5)
for bar in bars1:
    y = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2, y + 0.3, f"{y:.2f} km", ha='center', va='bottom', fontsize=11, fontweight='bold', color='#38bdf8')

# Ax2: Pace (lower is faster)
bars2 = ax2.bar(labels, paces, color=['#a855f7', '#8b5cf6', '#7c3aed'], width=0.55, edgecolor='#c084fc', linewidth=1.5, zorder=3)
ax2.set_title("Średnie Tempo (min/km)", fontsize=13, fontweight='bold', color='#f8fafc', pad=12)
ax2.set_ylim(5.5, 7.2)
pace_strings = [r["avg_pace"] for r in post_runs]
for i, bar in enumerate(bars2):
    y = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2, y + 0.05, pace_strings[i], ha='center', va='bottom', fontsize=11, fontweight='bold', color='#c084fc')

# Ax3: Heart Rate
bars3 = ax3.bar(labels, avg_hrs, color=['#f43f5e', '#e11d48', '#be123c'], width=0.55, edgecolor='#fb7185', linewidth=1.5, zorder=3)
ax3.set_title("Średnie Tętno (bpm)", fontsize=13, fontweight='bold', color='#f8fafc', pad=12)
ax3.set_ylim(130, 180)
for bar in bars3:
    y = bar.get_height()
    ax3.text(bar.get_x() + bar.get_width()/2, y + 1.2, f"{int(y)} bpm", ha='center', va='bottom', fontsize=11, fontweight='bold', color='#fb7185')

plt.tight_layout()
fig.savefig("tmp/charts/progression_summary.png", dpi=200, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close(fig)
print("Saved progression_summary.png")

# -------------------------------------------------------------
# 2. Heart Rate Zones Distribution (Marathon vs 3 post-runs)
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(10, 4.8), facecolor='#0f172a')
ax.set_facecolor('#1e293b')
ax.grid(axis='x', linestyle='--', alpha=0.3, color='#475569')

all_labels = ["Maraton (04.10)", "Bieg 1 (11.10)", "Bieg 2 (13.10)", "Bieg 3 (15.10)"]
zone_colors = {
    1: '#94a3b8', # Z1 szary
    2: '#38bdf8', # Z2 niebieski
    3: '#22c55e', # Z3 zielony
    4: '#f59e0b', # Z4 pomarańczowy
    5: '#ef4444', # Z5 czerwony
}

y_pos = np.arange(len(all_labels))
bar_height = 0.52

lefts = np.zeros(len(all_labels))

for z_num in range(1, 6):
    pcts = []
    for r in runs_data:
        z_dict = next((z for z in r["zones"] if z["zone"] == z_num), None)
        pct = z_dict["pct"] if z_dict else 0
        pcts.append(pct)
    pcts = np.array(pcts)
    
    bars = ax.barh(y_pos, pcts, left=lefts, height=bar_height, color=zone_colors[z_num], label=f"Z{z_num}", edgecolor='#0f172a', linewidth=1)
    
    # Label inside bar if large enough
    for i, p in enumerate(pcts):
        if p > 8.0:
            ax.text(lefts[i] + p/2, y_pos[i], f"{p:.0f}%", ha='center', va='center', fontsize=9, fontweight='bold', color='#ffffff')
            
    lefts += pcts

ax.set_yticks(y_pos)
ax.set_yticklabels(all_labels, fontsize=11, fontweight='bold', color='#f8fafc')
ax.invert_yaxis()
ax.set_xlim(0, 100)
ax.set_xlabel("% Czasu w Strefach Tętna", fontsize=11, color='#94a3b8', labelpad=10)
ax.set_title("Rozkład Stref Tętna: Maraton vs Regeneracja", fontsize=13, fontweight='bold', color='#f8fafc', pad=15)
ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.25), ncol=5, frameon=False, fontsize=10)

plt.tight_layout()
fig.savefig("tmp/charts/zones_comparison.png", dpi=200, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close(fig)
print("Saved zones_comparison.png")

# -------------------------------------------------------------
# 3. Time-Series Heart Rate Profile for the 3 Runs
# -------------------------------------------------------------
with open("tmp/post_marathon_runs_full.json", "r", encoding="utf-8") as f:
    full_data = json.load(f)

fig, ax = plt.subplots(figsize=(10, 4.4), facecolor='#0f172a')
ax.set_facecolor('#1e293b')
ax.grid(True, linestyle='--', alpha=0.3, color='#475569')

plot_runs = [
    ("Bieg 1 (11.10 - 5.27 km)", "24689904533", '#38bdf8'),
    ("Bieg 2 (13.10 - 7.00 km)", "24712853849", '#a855f7'),
    ("Bieg 3 (15.10 - 8.42 km)", "24738059747", '#f43f5e'),
]

for name, aid, col in plot_runs:
    det = full_data.get(aid, {}).get("details", {})
    descriptors = {d.get("metricsIndex"): d.get("key") for d in det.get("metricDescriptors", []) if d.get("metricsIndex") is not None}
    hr_idx = next((i for i, k in descriptors.items() if k == "directHeartRate"), None)
    dist_idx = next((i for i, k in descriptors.items() if k == "sumDistance"), None)
    
    xs = []
    ys = []
    for m in det.get("activityDetailMetrics", []):
        vals = m.get("metrics", [])
        if hr_idx is not None and hr_idx < len(vals) and dist_idx is not None and dist_idx < len(vals):
            hr = vals[hr_idx]
            dist = vals[dist_idx]
            if hr and dist is not None:
                xs.append(dist / 1000.0)
                ys.append(hr)
                
    if xs and ys:
        # Smooth with rolling average
        window = 10
        if len(ys) > window:
            ys_smooth = np.convolve(ys, np.ones(window)/window, mode='valid')
            xs_smooth = xs[window-1:]
        else:
            xs_smooth, ys_smooth = xs, ys
        ax.plot(xs_smooth, ys_smooth, color=col, linewidth=2.2, label=name)

ax.axhline(157, color='#f59e0b', linestyle=':', alpha=0.7, label='Próg Z4 (157 bpm)')
ax.axhline(176, color='#ef4444', linestyle=':', alpha=0.7, label='Próg Z5 (176 bpm)')

ax.set_title("Profil Tętna w Funkcji Dystansu (3 Biegi)", fontsize=13, fontweight='bold', color='#f8fafc', pad=12)
ax.set_xlabel("Dystans (km)", fontsize=11, color='#94a3b8')
ax.set_ylabel("Tętno (bpm)", fontsize=11, color='#94a3b8')
ax.set_ylim(110, 195)
ax.legend(loc='lower right', framealpha=0.4, facecolor='#0f172a', edgecolor='#334155', fontsize=9)

plt.tight_layout()
fig.savefig("tmp/charts/hr_profiles_distance.png", dpi=200, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close(fig)
print("Saved hr_profiles_distance.png")
