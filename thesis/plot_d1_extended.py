import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path

FIGDIR = Path("thesis/figures/deep_d")
FIGDIR.mkdir(parents=True, exist_ok=True)

models = [
    "SVM\n(Pełny kontekst)",
    "BERT Head\n(0–512 tok)",
    "BERT Tail\n(-512 tok)",
    "ModernBERT\n(RoPE 2048 tok)",
    "DeBERTa-v3\n(Disentangled 512)"
]
scores = [0.7834, 0.7737, 0.7859, 0.3162, 0.8249]
colors = ["#4477AA", "#CC6677", "#228833", "#EE6677", "#AA3377"]

fig, ax = plt.subplots(figsize=(10, 5.5))
bars = ax.bar(models, scores, color=colors, width=0.55, edgecolor="black", linewidth=0.8)

ax.axhline(0.7834, color="#4477AA", linestyle="--", alpha=0.7, label="Baseline SVM (0.7834)")

for b, s in zip(bars, scores):
    diff = s - 0.7834
    diff_str = f" ({diff:+.3f})" if abs(diff) > 0.001 else " (base)"
    ax.text(b.get_x() + b.get_width()/2, b.get_height() + 0.01,
            f"{s:.4f}{diff_str}", ha="center", va="bottom", fontsize=9.5, fontweight="bold")

ax.set_ylabel("F1 Macro na zbiorze SEConvo", fontsize=11)
ax.set_ylim(0.20, 0.92)
ax.set_title("D1: Architektura Transformer a problem długiego kontekstu w SEConvo\n(DeBERTa-v3 vs ModernBERT RoPE vs Truncation Surgery vs SVM)", fontsize=11, fontweight="bold")
ax.grid(axis="y", alpha=0.3)
ax.legend(loc="upper left", fontsize=10)
plt.tight_layout()
plt.savefig(FIGDIR / "fig_modernbert_seconvo.png", bbox_inches="tight")
plt.close()
print("Updated fig_modernbert_seconvo.png successfully!")
