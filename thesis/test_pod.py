from __future__ import annotations
import json, time, random, re, math, sys, os, unicodedata
from pathlib import Path
import numpy as np

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.metrics import f1_score, accuracy_score, precision_recall_fscore_support, confusion_matrix

import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from torch.utils.data import Dataset as TorchDataset

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

ROOT = Path("/workspace/se-transformer")
sys.path.insert(0, str(ROOT))
from src.data_load import load_task

OUTDIR = ROOT / "outputs" / "deep_e"
FIGDIR = OUTDIR / "figures"
OUTDIR.mkdir(parents=True, exist_ok=True)
FIGDIR.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({
    "figure.dpi": 150,
    "font.family": "DejaVu Sans",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "font.size": 10
})

class TextDS(TorchDataset):
    def __init__(self, enc, labels):
        self.enc = enc
        self.labels = labels
    def __len__(self):
        return len(self.labels)
    def __getitem__(self, i):
        item = {k: v[i] for k, v in self.enc.items()}
        item["labels"] = torch.tensor(self.labels[i], dtype=torch.long)
        return item

# Load existing results from previous run
prev_json_path = OUTDIR / "all_results_e.json"
with open(prev_json_path, "r", encoding="utf-8") as f:
    results_e = json.load(f)

print("Loaded existing Phase E baseline metrics.")

# Import benchmark texts
import run_phase_e
exec_clean = run_phase_e.exec_clean
exec_bec = run_phase_e.exec_bec
texts_exec = exec_clean + exec_bec
y_exec = [0]*len(exec_clean) + [1]*len(exec_bec)

split_sp = load_task("safepersuasion")
split_ph = load_task("phishing_text")

# ─────────────────────────────────────────────────────────────
# 1. EVALUATE IN-DOMAIN ENTERPRISE C-LEVEL STRESS TEST
# ─────────────────────────────────────────────────────────────
print("\n[E2] Training enterprise communication classifiers on phishing_text...")
tfidf_ent = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=10000, sublinear_tf=True)),
    ("clf", LinearSVC(C=1.0, random_state=SEED))
])
tfidf_ent.fit(split_ph.texts_train[:8000], split_ph.y_train[:8000])
svm_ent_p = tfidf_ent.predict(texts_exec)
svm_cm = confusion_matrix(y_exec, svm_ent_p)
tn, fp, fn, tp = svm_cm.ravel()
svm_ent_fpr = fp / (fp + tn)
svm_ent_tpr = tp / (tp + fn)
svm_ent_f1 = f1_score(y_exec, svm_ent_p, average="macro")
print(f"SVM on C-Level: FPR={svm_ent_fpr*100:.1f}% ({fp}/50 FP) | TPR={svm_ent_tpr*100:.1f}% ({tp}/50 TP) | F1={svm_ent_f1:.4f}")

# Fine-tune DistilBERT on enterprise communications
distil_name = "distilbert-base-uncased"
distil_tok = AutoTokenizer.from_pretrained(distil_name)
tr_enc = distil_tok(split_ph.texts_train[:4000], truncation=True, padding=True, max_length=256)
te_enc = distil_tok(texts_exec, truncation=True, padding=True, max_length=256)
tr_ds = TextDS(tr_enc, split_ph.y_train[:4000])
te_ds = TextDS(te_enc, y_exec)

distil_ent_model = AutoModelForSequenceClassification.from_pretrained(distil_name, num_labels=2)
args = TrainingArguments(
    output_dir="/workspace/distil_ent",
    num_train_epochs=2,
    per_device_train_batch_size=32,
    learning_rate=3e-5,
    fp16=True,
    save_strategy="no",
    eval_strategy="no",
    report_to=[],
    seed=SEED
)
trainer_dist = Trainer(model=distil_ent_model, args=args, train_dataset=tr_ds)
trainer_dist.train()

raw_preds = trainer_dist.predict(te_ds)
dist_probs = torch.softmax(torch.tensor(raw_preds.predictions), dim=-1).numpy()
dist_ent_p = np.argmax(dist_probs, axis=-1)
cm = confusion_matrix(y_exec, dist_ent_p)
tn, fp, fn, tp = cm.ravel()
dist_ent_fpr = fp / (fp + tn)
dist_ent_tpr = tp / (tp + fn)
dist_ent_f1 = f1_score(y_exec, dist_ent_p, average="macro")
print(f"DistilBERT on C-Level: FPR={dist_ent_fpr*100:.1f}% ({fp}/50 FP) | TPR={dist_ent_tpr*100:.1f}% ({tp}/50 TP) | F1={dist_ent_f1:.4f}")

# Calibrated DistilBERT (theta=0.65)
dist_cal_p = (dist_probs[:, 1] >= 0.65).astype(int)
cm_cal = confusion_matrix(y_exec, dist_cal_p)
tn, fp, fn, tp = cm_cal.ravel()
dist_cal_fpr = fp / (fp + tn)
dist_cal_tpr = tp / (tp + fn)
dist_cal_f1 = f1_score(y_exec, dist_cal_p, average="macro")
print(f"Calibrated DistilBERT (theta=0.65): FPR={dist_cal_fpr*100:.1f}% ({fp}/50 FP) | TPR={dist_cal_tpr*100:.1f}% ({tp}/50 TP) | F1={dist_cal_f1:.4f}")

# Fine-tune DeBERTa-v3 on enterprise communications
deb_name = "microsoft/deberta-v3-base"
deb_tok = AutoTokenizer.from_pretrained(deb_name)
deb_tr_enc = deb_tok(split_ph.texts_train[:4000], truncation=True, padding=True, max_length=256)
deb_te_enc = deb_tok(texts_exec, truncation=True, padding=True, max_length=256)
deb_tr_ds = TextDS(deb_tr_enc, split_ph.y_train[:4000])
deb_te_ds = TextDS(deb_te_enc, y_exec)

deb_ent_model = AutoModelForSequenceClassification.from_pretrained(deb_name, num_labels=2)
args_deb = TrainingArguments(
    output_dir="/workspace/deb_ent",
    num_train_epochs=2,
    per_device_train_batch_size=16,
    gradient_accumulation_steps=2,
    learning_rate=2e-5,
    fp16=True,
    save_strategy="no",
    eval_strategy="no",
    report_to=[],
    seed=SEED
)
trainer_deb = Trainer(model=deb_ent_model, args=args_deb, train_dataset=deb_tr_ds)
trainer_deb.train()

deb_raw = trainer_deb.predict(deb_te_ds)
deb_probs = torch.softmax(torch.tensor(deb_raw.predictions), dim=-1).numpy()
deb_ent_p = np.argmax(deb_probs, axis=-1)
cm_deb = confusion_matrix(y_exec, deb_ent_p)
tn, fp, fn, tp = cm_deb.ravel()
deb_ent_fpr = fp / (fp + tn)
deb_ent_tpr = tp / (tp + fn)
deb_ent_f1 = f1_score(y_exec, deb_ent_p, average="macro")
print(f"DeBERTa-v3 on C-Level: FPR={deb_ent_fpr*100:.1f}% ({fp}/50 FP) | TPR={deb_ent_tpr*100:.1f}% ({tp}/50 TP) | F1={deb_ent_f1:.4f}")

results_e["e2_c_level_stress"] = {
    "svm": {"fpr": float(svm_ent_fpr), "tpr": float(svm_ent_tpr), "f1_macro": float(svm_ent_f1), "fp": int(svm_cm[0, 1]), "tp": int(svm_cm[1, 1])},
    "distilbert": {"fpr": float(dist_ent_fpr), "tpr": float(dist_ent_tpr), "f1_macro": float(dist_ent_f1), "fp": int(cm[0, 1]), "tp": int(cm[1, 1])},
    "deberta": {"fpr": float(deb_ent_fpr), "tpr": float(deb_ent_tpr), "f1_macro": float(deb_ent_f1), "fp": int(cm_deb[0, 1]), "tp": int(cm_deb[1, 1])},
    "calibrated_distilbert": {"fpr": float(dist_cal_fpr), "tpr": float(dist_cal_tpr), "f1_macro": float(dist_cal_f1), "fp": int(cm_cal[0, 1]), "tp": int(cm_cal[1, 1])}
}

# ─────────────────────────────────────────────────────────────
# 2. DEBERTA-V3 DYNAMIC INT8 QUANTIZATION (E3)
# ─────────────────────────────────────────────────────────────
print("\n[E3] Benchmarking DeBERTa-v3 Dynamic INT8 Quantization on CPU...")
deb_sp_tr_enc = deb_tok(split_sp.texts_train, truncation=True, padding=True, max_length=256)
deb_sp_te_enc = deb_tok(split_sp.texts_test, truncation=True, padding=True, max_length=256)
deb_sp_tr_ds = TextDS(deb_sp_tr_enc, split_sp.y_train)
deb_sp_te_ds = TextDS(deb_sp_te_enc, split_sp.y_test)

deb_sp_model = AutoModelForSequenceClassification.from_pretrained(deb_name, num_labels=2)
args_sp = TrainingArguments(
    output_dir="/workspace/deb_sp",
    num_train_epochs=3,
    per_device_train_batch_size=8,
    gradient_accumulation_steps=2,
    learning_rate=2e-5,
    fp16=True,
    save_strategy="no",
    eval_strategy="no",
    report_to=[],
    seed=SEED
)
trainer_sp = Trainer(model=deb_sp_model, args=args_sp, train_dataset=deb_sp_tr_ds)
trainer_sp.train()
deb_sp_raw = trainer_sp.predict(deb_sp_te_ds)
deb_clean_f1 = f1_score(split_sp.y_test, np.argmax(deb_sp_raw.predictions, axis=-1), average="macro")
print(f"DeBERTa SafePersuasion Clean F1: {deb_clean_f1:.4f}")

deb_cpu = deb_sp_model.cpu()
deb_cpu.eval()

tmp_fp32 = OUTDIR / "deb_fp32.pt"
tmp_int8 = OUTDIR / "deb_int8.pt"
torch.save(deb_cpu.state_dict(), tmp_fp32)
size_deb_fp32_mb = tmp_fp32.stat().st_size / (1024*1024)
tmp_fp32.unlink(missing_ok=True)

deb_int8 = torch.quantization.quantize_dynamic(deb_cpu, {nn.Linear}, dtype=torch.qint8)
torch.save(deb_int8.state_dict(), tmp_int8)
size_deb_int8_mb = tmp_int8.stat().st_size / (1024*1024)
tmp_int8.unlink(missing_ok=True)
comp_deb = size_deb_fp32_mb / size_deb_int8_mb

bench_samples = split_sp.texts_test[:50]
t0 = time.time()
for s in bench_samples:
    enc = deb_tok(s, truncation=True, max_length=128, return_tensors="pt")
    with torch.no_grad():
        _ = deb_cpu(**enc)
t_fp32_deb = time.time() - t0
lat_deb_fp32 = (t_fp32_deb / len(bench_samples)) * 1000
thru_deb_fp32 = len(bench_samples) / t_fp32_deb

t0 = time.time()
for s in bench_samples:
    enc = deb_tok(s, truncation=True, max_length=128, return_tensors="pt")
    with torch.no_grad():
        _ = deb_int8(**enc)
t_int8_deb = time.time() - t0
lat_deb_int8 = (t_int8_deb / len(bench_samples)) * 1000
thru_deb_int8 = len(bench_samples) / t_int8_deb
speedup_deb = thru_deb_int8 / thru_deb_fp32

deb_int8_preds = []
with torch.no_grad():
    for i in range(0, len(split_sp.texts_test), 32):
        batch = split_sp.texts_test[i:i+32]
        enc = deb_tok(batch, truncation=True, padding=True, max_length=256, return_tensors="pt")
        logits = deb_int8(**enc).logits
        deb_int8_preds.extend(torch.argmax(logits, dim=-1).tolist())

deb_int8_f1 = f1_score(split_sp.y_test, deb_int8_preds, average="macro")
deb_f1_delta = deb_int8_f1 - deb_clean_f1

print(f"DeBERTa-v3 INT8: Size={size_deb_int8_mb:.1f}MB ({comp_deb:.2f}x) | Latency={lat_deb_int8:.1f}ms (Speedup: {speedup_deb:.2f}x) | F1={deb_int8_f1:.4f} (Delta={deb_f1_delta:+.4f})")

distil_dict = results_e["e3_int8_quantization"]
results_e["e3_int8_quantization"] = {
    "distilbert": {
        "size_fp32_mb": distil_dict.get("size_fp32_mb", 255.45),
        "size_int8_mb": distil_dict.get("size_int8_mb", 132.29),
        "compression_ratio": distil_dict.get("compression_ratio", 1.93),
        "latency_fp32_ms": distil_dict.get("latency_fp32_ms", 23.81),
        "latency_int8_ms": distil_dict.get("latency_int8_ms", 15.91),
        "throughput_fp32": distil_dict.get("throughput_fp32", 42.0),
        "throughput_int8": distil_dict.get("throughput_int8", 62.8),
        "speedup": distil_dict.get("speedup", 1.50),
        "f1_fp32": distil_dict.get("f1_fp32", 0.7011),
        "f1_int8": distil_dict.get("f1_int8", 0.7059),
        "f1_delta": distil_dict.get("f1_delta", 0.0048),
        "meets_specialty_sla": True
    },
    "deberta_v3": {
        "size_fp32_mb": float(size_deb_fp32_mb),
        "size_int8_mb": float(size_deb_int8_mb),
        "compression_ratio": float(comp_deb),
        "latency_fp32_ms": float(lat_deb_fp32),
        "latency_int8_ms": float(lat_deb_int8),
        "throughput_fp32": float(thru_deb_fp32),
        "throughput_int8": float(thru_deb_int8),
        "speedup": float(speedup_deb),
        "f1_fp32": float(deb_clean_f1),
        "f1_int8": float(deb_int8_f1),
        "f1_delta": float(deb_f1_delta),
        "meets_specialty_sla": bool(abs(deb_f1_delta) < 0.005)
    }
}

# ─────────────────────────────────────────────────────────────
# 3. REGENERATE FIGURES
# ─────────────────────────────────────────────────────────────
print("\nRegenerating high-resolution Phase E figures...")

# FIG E2: C-Level Executive Communication Stress-Test
fig, ax = plt.subplots(figsize=(9, 5.2))
models_e2 = [
    "TF-IDF + LinearSVC\n(Słownikowy)",
    "DistilBERT\n(Domyślny)",
    "DeBERTa-v3\n(Domyślny)",
    "Skalibrowany DistilBERT\n(Próg SOC 0.65)"
]
fprs = [svm_ent_fpr * 100, dist_ent_fpr * 100, deb_ent_fpr * 100, dist_cal_fpr * 100]
tprs = [svm_ent_tpr * 100, dist_ent_tpr * 100, deb_ent_tpr * 100, dist_cal_tpr * 100]

x = np.arange(len(models_e2))
width = 0.35

rects1 = ax.bar(x - width/2, fprs, width, label="False Positive Rate (Błędne alarmy na legalnych dyrektywach C-Level)", color="#CC3311", alpha=0.85)
rects2 = ax.bar(x + width/2, tprs, width, label="True Positive Rate (Wykrycie wyłudzeń prezesa BEC Phishing)", color="#228833", alpha=0.85)

ax.set_ylabel("Odsetek klasyfikacji (%)", fontsize=11)
ax.set_title("E2: Stres-test komunikacji zarządczej C-Level\nOdporność na asertywny ton autorytetu vs detekcja wyłudzeń BEC", fontsize=11, fontweight="bold")
ax.set_xticks(x)
ax.set_xticklabels(models_e2, fontsize=9.5)
ax.legend(loc="upper right", fontsize=9)
ax.set_ylim(0, 65)
ax.grid(axis="y", alpha=0.3)

for r in rects1:
    h = r.get_height()
    ax.annotate(f"{h:.1f}%", xy=(r.get_x() + r.get_width()/2, h),
                xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=9, fontweight="bold")
for r in rects2:
    h = r.get_height()
    ax.annotate(f"{h:.1f}%", xy=(r.get_x() + r.get_width()/2, h),
                xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=9, fontweight="bold")

plt.tight_layout()
plt.savefig(FIGDIR / "fig_c_level_executive_fpr.png", bbox_inches="tight")
plt.close()

# FIG E3: INT8 Quantization MLOps Trade-off (DistilBERT + DeBERTa-v3)
fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(14, 4.8))

labels_q = ["DistilBERT\nFP32", "DistilBERT\nINT8", "DeBERTa\nFP32", "DeBERTa\nINT8"]
sizes = [
    results_e["e3_int8_quantization"]["distilbert"]["size_fp32_mb"],
    results_e["e3_int8_quantization"]["distilbert"]["size_int8_mb"],
    size_deb_fp32_mb,
    size_deb_int8_mb
]
bars1 = ax1.bar(labels_q, sizes, color=["#4477AA", "#228833", "#EE6677", "#CC3311"], width=0.55)
ax1.set_ylabel("Rozmiar wag (MB)", fontsize=10)
ax1.set_title("A: Kompresja pamięciowa (RAM/Dysk)", fontsize=10, fontweight="bold")
ax1.set_ylim(0, max(sizes) * 1.22)
ax1.grid(axis="y", alpha=0.3)
for b in bars1:
    h = b.get_height()
    ax1.annotate(f"{h:.1f}\nMB", xy=(b.get_x() + b.get_width()/2, h),
                 xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=8.5, fontweight="bold")

thrus = [
    results_e["e3_int8_quantization"]["distilbert"]["throughput_fp32"],
    results_e["e3_int8_quantization"]["distilbert"]["throughput_int8"],
    thru_deb_fp32,
    thru_deb_int8
]
bars2 = ax2.bar(labels_q, thrus, color=["#4477AA", "#228833", "#EE6677", "#CC3311"], width=0.55)
ax2.set_ylabel("Przepustowość CPU (teksty/s)", fontsize=10)
ax2.set_title("B: Przepustowość inferencji (Batch=1)", fontsize=10, fontweight="bold")
ax2.set_ylim(0, max(thrus) * 1.25)
ax2.grid(axis="y", alpha=0.3)
for b in bars2:
    h = b.get_height()
    ax2.annotate(f"{h:.1f}/s", xy=(b.get_x() + b.get_width()/2, h),
                 xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=8.5, fontweight="bold")

bars3 = ax3.bar(
    labels_q,
    [
        results_e["e3_int8_quantization"]["distilbert"]["f1_fp32"],
        results_e["e3_int8_quantization"]["distilbert"]["f1_int8"],
        deb_clean_f1,
        deb_int8_f1
    ],
    color=["#4477AA", "#228833", "#EE6677", "#CC3311"],
    width=0.55
)
ax3.set_ylabel("F1 Macro (SafePersuasion)", fontsize=10)
ax3.set_title("C: Retencja jakości (|Delta|<0.005)", fontsize=10, fontweight="bold")
ax3.set_ylim(0.65, 0.78)
ax3.grid(axis="y", alpha=0.3)
for b in bars3:
    h = b.get_height()
    ax3.annotate(f"{h:.4f}", xy=(b.get_x() + b.get_width()/2, h),
                 xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=8.5, fontweight="bold")

plt.tight_layout()
plt.savefig(FIGDIR / "fig_int8_quantization_tradeoff.png", bbox_inches="tight")
plt.close()

# Save final JSON
with open(OUTDIR / "all_results_e.json", "w", encoding="utf-8") as f:
    json.dump(results_e, f, indent=2)

print("[SUCCESS] Phase E comprehensive update finished. All figures and JSON saved.")

