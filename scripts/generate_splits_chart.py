import json
import matplotlib.pyplot as plt
import numpy as np

plt.style.use('dark_background')
plt.rcParams['font.sans-serif'] = 'Segoe UI, Helvetica, Arial'
plt.rcParams['axes.edgecolor'] = '#334155'
plt.rcParams['axes.linewidth'] = 0.8

with open("tmp/calculated_km_splits.json", "r", encoding="utf-8") as f:
    splits_data = json.load(f)

fig, ax = plt.subplots(figsize=(10, 4.4), facecolor='#0f172a')
ax.set_facecolor('#1e293b')
ax.grid(True, linestyle='--', alpha=0.3, color='#475569')

colors = {
    "24689904533": ('#38bdf8', 'Bieg 1 (11.10 - 5.27 km)'),
    "24712853849": ('#a855f7', 'Bieg 2 (13.10 - 7.00 km)'),
    "24738059747": ('#f43f5e', 'Bieg 3 (15.10 - 8.42 km)'),
}

offsets = {
    "24689904533": (0, -12),  # Series 1 below point
    "24712853849": (0, 8),    # Series 2 above point
    "24738059747": (6, 6),    # Series 3 offset right/up
}

for aid, (col, label) in colors.items():
    sp_list = splits_data.get(aid, [])
    kms = []
    pace_decimals = []
    for sp in sp_list:
        km_label = sp["km"]
        # parse pace_str mm:ss into decimal minutes
        parts = sp["pace_str"].split(":")
        dec = int(parts[0]) + int(parts[1]) / 60.0
        if isinstance(km_label, int):
            kms.append(km_label)
        elif str(km_label).endswith("+"):
            kms.append(int(str(km_label)[:-1]) + 0.3)
        else:
            kms.append(float(km_label))
        pace_decimals.append(dec)
        
    ax.plot(kms, pace_decimals, marker='o', markersize=6, linewidth=2.4, color=col, label=label)
    dx, dy = offsets[aid]
    for k, p, sp in zip(kms, pace_decimals, sp_list):
        ax.annotate(sp["pace_str"], (k, p), textcoords="offset points", xytext=(dx, dy), ha='center', fontsize=7.5, color=col, fontweight='bold')

ax.set_title("Tempo na Poszczególnych Kilometrach (min/km)", fontsize=13, fontweight='bold', color='#f8fafc', pad=14)
ax.set_xlabel("Kilometr Biegu", fontsize=11, color='#94a3b8')
ax.set_ylabel("Tempo (min/km)", fontsize=11, color='#94a3b8')
ax.set_ylim(5.3, 8.4)
ax.invert_yaxis() # Faster pace (lower number) higher up!
ax.legend(loc='lower right', framealpha=0.4, facecolor='#0f172a', edgecolor='#334155', fontsize=9.5)

plt.tight_layout()
fig.savefig("tmp/charts/splits_pace_comparison.png", dpi=200, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close(fig)
print("Saved splits_pace_comparison.png")
