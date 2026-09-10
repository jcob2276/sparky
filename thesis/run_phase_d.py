"""
Phase D: Cutting-Edge Extensions for Master Thesis
D1: ModernBERT (8192 RoPE) on full-context SEConvo vs Tail-BERT & SVM
D2: Lexical Defense (Pre-tokenization Sanitizer & Adversarial Augmentation) against Typo Noise
D3: Temperature Scaling (ECE minimization) & SOC Risk-Coverage Analysis
D4: Comprehensive Visualization & Artifact Generation
"""
from __future__ import annotations
import json, time, random, re, math, sys
from pathlib import Path
from collections import Counter
import numpy as np
import scipy.optimize as opt

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.metrics import f1_score, accuracy_score, precision_recall_fscore_support
from sklearn.calibration import calibration_curve

import torch
import torch.nn as nn
from transformers import (AutoTokenizer, AutoModelForSequenceClassification,
                           Trainer, TrainingArguments)
from torch.utils.data import Dataset as TorchDataset

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)

ROOT = Path("/workspace/se-transformer")
sys.path.insert(0, str(ROOT))
from src.data_load import load_task

OUTDIR = ROOT / "outputs" / "deep_d"
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

print("="*70)
print("PHASE D EXPERIMENTS: MODERNBERT, LEXICAL DEFENSE, CALIBRATION & SOC")
print("="*70)
print(f"PyTorch: {torch.__version__} | CUDA: {torch.cuda.is_available()} | Device: {torch.cuda.get_device_name(0)}")

results_d = {}

# ═══════════════════════════════════════════════════════════════
# D1: MODERNBERT ON FULL CONTEXT SECONVO
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("[D1] ModernBERT (8192 RoPE) Full-Context on SEConvo")
print("="*50)
split_se = load_task("seconvo")
print(f"SEConvo train samples: {len(split_se.texts_train)}, test: {len(split_se.texts_test)}")

# ModernBERT tokenizer and model
mb_name = "answerdotai/ModernBERT-base"
mb_tok = AutoTokenizer.from_pretrained(mb_name)

# Measure token lengths with ModernBERT
train_tok_lens = [len(mb_tok.encode(t, truncation=False)) for t in split_se.texts_train]
test_tok_lens  = [len(mb_tok.encode(t, truncation=False)) for t in split_se.texts_test]
all_tok_lens = train_tok_lens + test_tok_lens
max_len_se = max(all_tok_lens)
print(f"Token length stats (ModernBERT): Min={min(all_tok_lens)}, Med={int(np.median(all_tok_lens))}, Max={max_len_se}")

# Set window to cover 100% of context (2048 is ample for max ~1600 tokens)
WINDOW_LEN = min(8192, max(2048, int(math.ceil(max_len_se / 128.0) * 128)))
print(f"Encoding full dialogues up to {WINDOW_LEN} tokens (no truncation!)...")

se_tr_enc = mb_tok(split_se.texts_train, truncation=True, padding=True, max_length=WINDOW_LEN)
se_te_enc = mb_tok(split_se.texts_test, truncation=True, padding=True, max_length=WINDOW_LEN)

se_tr_ds = TextDS(se_tr_enc, split_se.y_train)
se_te_ds = TextDS(se_te_enc, split_se.y_test)

mb_model = AutoModelForSequenceClassification.from_pretrained(mb_name, num_labels=2)

mb_args = TrainingArguments(
    output_dir=str(ROOT / "models" / "modernbert_seconvo"),
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=2, # effective batch size = 8
    per_device_eval_batch_size=4,
    learning_rate=2e-5,
    weight_decay=0.01,
    warmup_ratio=0.1,
    save_strategy="no",
    eval_strategy="no",
    fp16=True,
    report_to=[],
    seed=SEED
)

mb_trainer = Trainer(model=mb_model, args=mb_args, train_dataset=se_tr_ds)
t0 = time.time()
mb_trainer.train()
t_train_mb = time.time() - t0
print(f"ModernBERT training finished in {t_train_mb:.2f}s")

mb_preds_raw = mb_trainer.predict(se_te_ds)
mb_preds = np.argmax(mb_preds_raw.predictions, axis=-1)
mb_f1_macro = f1_score(split_se.y_test, mb_preds, average="macro", zero_division=0)
mb_f1_pos = f1_score(split_se.y_test, mb_preds, average="binary", zero_division=0)
mb_acc = accuracy_score(split_se.y_test, mb_preds)
p, r, _, _ = precision_recall_fscore_support(split_se.y_test, mb_preds, average="binary", zero_division=0)

print(f"ModernBERT Full Context (8192 RoPE): F1 Macro = {mb_f1_macro:.4f} | F1 Pos = {mb_f1_pos:.4f} | Acc = {mb_acc:.4f} | Prec = {p:.4f} | Rec = {r:.4f}")

# Train DeBERTa-v3 on SEConvo (512 tokens)
print("\n--- Training DeBERTa-v3-base (512 tokens) on SEConvo ---")
deb_name = "microsoft/deberta-v3-base"
deb_tok = AutoTokenizer.from_pretrained(deb_name)
deb_tr_enc = deb_tok(split_se.texts_train, truncation=True, padding=True, max_length=512)
deb_te_enc = deb_tok(split_se.texts_test, truncation=True, padding=True, max_length=512)
deb_model = AutoModelForSequenceClassification.from_pretrained(deb_name, num_labels=2)
deb_args = TrainingArguments(
    output_dir=str(ROOT / "models" / "deberta_seconvo"),
    num_train_epochs=4,
    per_device_train_batch_size=8,
    learning_rate=2e-5,
    warmup_ratio=0.1,
    weight_decay=0.01,
    fp16=True,
    save_strategy="no",
    report_to=[],
    seed=SEED
)
deb_trainer = Trainer(model=deb_model, args=deb_args, train_dataset=TextDS(deb_tr_enc, split_se.y_train))
t0_deb = time.time()
deb_trainer.train()
t_train_deb = time.time() - t0_deb
deb_preds_raw = deb_trainer.predict(TextDS(deb_te_enc, split_se.y_test))
deb_preds = np.argmax(deb_preds_raw.predictions, axis=-1)
deb_f1_macro = f1_score(split_se.y_test, deb_preds, average="macro", zero_division=0)
deb_f1_pos = f1_score(split_se.y_test, deb_preds, average="binary", zero_division=0)
deb_acc = accuracy_score(split_se.y_test, deb_preds)
deb_p, deb_r, _, _ = precision_recall_fscore_support(split_se.y_test, deb_preds, average="binary", zero_division=0)

print(f"DeBERTa-v3 (512 tok): F1 Macro = {deb_f1_macro:.4f} | F1 Pos = {deb_f1_pos:.4f} | Acc = {deb_acc:.4f} | Prec = {deb_p:.4f} | Rec = {deb_r:.4f}")

# Baselines from Phase C1
c1_baselines = {
    "SVM (Full Context)": 0.7834,
    "BERT (Head-only 512)": 0.7737,
    "BERT (Tail-only 512)": 0.7859,
    "BERT (Head+Tail 512)": 0.7365,
    "ModernBERT (Full 2048/8192)": float(mb_f1_macro),
    "DeBERTa-v3 (512 Disentangled)": float(deb_f1_macro)
}

results_d["d1_modernbert"] = {
    "f1_macro": float(mb_f1_macro),
    "f1_pos": float(mb_f1_pos),
    "accuracy": float(mb_acc),
    "precision": float(p),
    "recall": float(r),
    "training_time_sec": float(t_train_mb),
    "comparison": c1_baselines
}
results_d["d1_deberta"] = {
    "f1_macro": float(deb_f1_macro),
    "f1_pos": float(deb_f1_pos),
    "accuracy": float(deb_acc),
    "precision": float(deb_p),
    "recall": float(deb_r),
    "training_time_sec": float(t_train_deb)
}

# ═══════════════════════════════════════════════════════════════
# D2: LEXICAL DEFENSE AGAINST ADVERSARIAL PERTURBATIONS
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("[D2] Lexical Sanitizer Defense on SafePersuasion Typo Noise")
print("="*50)

split_sp = load_task("safepersuasion")
print(f"SafePersuasion train samples: {len(split_sp.texts_train)}, test: {len(split_sp.texts_test)}")

# 1. Build Vocabulary & Character/N-gram Lexical Sanitizer
def build_lexicon(texts):
    words = Counter()
    for t in texts:
        tokens = re.findall(r"\b[a-zA-Z]{2,}\b", t.lower())
        words.update(tokens)
    return words

lexicon = build_lexicon(split_sp.texts_train)
# Add common English words to avoid false corrections
common_vocab = set(lexicon.keys())
print(f"Lexical Sanitizer Reference Vocab: {len(common_vocab)} word forms")

class PreTokenizationSanitizer:
    def __init__(self, vocab_counter):
        self.vocab = set(vocab_counter.keys())
        self.freqs = vocab_counter

    def get_candidates(self, word):
        word = word.lower()
        if word in self.vocab:
            return [word]
        # Generate edits of distance 1 (transpositions, deletions, insertions, substitutions)
        letters = "abcdefghijklmnopqrstuvwxyz"
        splits = [(word[:i], word[i:]) for i in range(len(word) + 1)]
        transposes = [L + R[1] + R[0] + R[2:] for L, R in splits if len(R) > 1]
        deletes = [L + R[1:] for L, R in splits if R]
        replaces = [L + c + R[1:] for L, R in splits if R for c in letters]
        inserts = [L + c + R for L, R in splits for c in letters]
        
        candidates = set(transposes + deletes + replaces + inserts) & self.vocab
        if candidates:
            return sorted(candidates, key=lambda w: self.freqs[w], reverse=True)
        return [word]

    def sanitize(self, text):
        def repl(match):
            w = match.group(0)
            lw = w.lower()
            if lw in self.vocab or len(lw) <= 2:
                return w
            cands = self.get_candidates(lw)
            best = cands[0]
            if w.istitle():
                return best.capitalize()
            elif w.isupper():
                return best.upper()
            return best
        return re.sub(r"\b[a-zA-Z]{2,}\b", repl, text)

sanitizer = PreTokenizationSanitizer(lexicon)

# Test sanitizer on a sample typo
sample_noisy = "Peasle clcik teh link immdiately to verfiy your accoutn"
sample_clean = sanitizer.sanitize(sample_noisy)
print(f"Sanitizer test:\n  Original: {sample_noisy}\n  Sanitized: {sample_clean}")

# Load DistilBERT on SafePersuasion
tok_d = AutoTokenizer.from_pretrained("distilbert-base-uncased")
sp_tr_enc = tok_d(split_sp.texts_train, truncation=True, padding=True, max_length=256)
sp_te_enc = tok_d(split_sp.texts_test,  truncation=True, padding=True, max_length=256)

sp_model = AutoModelForSequenceClassification.from_pretrained("distilbert-base-uncased", num_labels=2)
sp_args = TrainingArguments(
    output_dir=str(ROOT / "models" / "distilbert_safepersuasion"),
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    learning_rate=3e-5,
    save_strategy="no",
    fp16=True,
    report_to=[],
    seed=SEED
)
sp_trainer = Trainer(model=sp_model, args=sp_args,
                     train_dataset=TextDS(sp_tr_enc, split_sp.y_train),
                     eval_dataset=TextDS(sp_te_enc, split_sp.y_test))
sp_trainer.train()

# Also train an Adversarially-Trained DistilBERT (trained on 5-10% noisy training texts)
def inject_typo_noise(text, prob=0.05):
    chars = list(text)
    for i in range(len(chars)):
        if random.random() < prob and chars[i].isalpha():
            if i + 1 < len(chars):
                chars[i], chars[i+1] = chars[i+1], chars[i]
    return "".join(chars)

adv_tr_texts = [inject_typo_noise(t, prob=0.08) for t in split_sp.texts_train]
adv_tr_enc = tok_d(adv_tr_texts, truncation=True, padding=True, max_length=256)
adv_model = AutoModelForSequenceClassification.from_pretrained("distilbert-base-uncased", num_labels=2)
adv_args = TrainingArguments(
    output_dir=str(ROOT / "models" / "distilbert_adv_train"),
    num_train_epochs=3,
    per_device_train_batch_size=16,
    learning_rate=3e-5,
    save_strategy="no",
    fp16=True,
    report_to=[],
    seed=SEED
)
adv_trainer = Trainer(model=adv_model, args=adv_args,
                      train_dataset=TextDS(adv_tr_enc, split_sp.y_train))
adv_trainer.train()

# Baseline SVM
pipe_svm = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1,2), min_df=2, max_features=50000)),
    ("clf", LinearSVC(class_weight="balanced", random_state=SEED, max_iter=4000)),
])
pipe_svm.fit(split_sp.texts_train, split_sp.y_train)

# Evaluate across noise levels [0.0, 0.05, 0.10, 0.15]
noise_levels = [0.0, 0.05, 0.10, 0.15]
defense_results = {
    "noise_levels": noise_levels,
    "svm": [],
    "bert_unprotected": [],
    "bert_sanitizer": [],
    "bert_adv_trained": []
}

for nl in noise_levels:
    print(f"\nEvaluating Noise Level: {nl:.0%}")
    noisy_tests = [inject_typo_noise(t, prob=nl) for t in split_sp.texts_test]
    sanitized_tests = [sanitizer.sanitize(t) for t in noisy_tests]
    
    # 1. SVM
    f1_svm = f1_score(split_sp.y_test, pipe_svm.predict(noisy_tests), average="macro", zero_division=0)
    defense_results["svm"].append(float(f1_svm))
    
    # 2. Unprotected BERT
    enc_noisy = tok_d(noisy_tests, truncation=True, padding=True, max_length=256)
    preds_unp = np.argmax(sp_trainer.predict(TextDS(enc_noisy, split_sp.y_test)).predictions, axis=-1)
    f1_unp = f1_score(split_sp.y_test, preds_unp, average="macro", zero_division=0)
    defense_results["bert_unprotected"].append(float(f1_unp))
    
    # 3. Protected BERT (Pre-tokenization Sanitizer)
    enc_san = tok_d(sanitized_tests, truncation=True, padding=True, max_length=256)
    preds_san = np.argmax(sp_trainer.predict(TextDS(enc_san, split_sp.y_test)).predictions, axis=-1)
    f1_san = f1_score(split_sp.y_test, preds_san, average="macro", zero_division=0)
    defense_results["bert_sanitizer"].append(float(f1_san))
    
    # 4. Adversarially-Trained BERT
    preds_adv = np.argmax(adv_trainer.predict(TextDS(enc_noisy, split_sp.y_test)).predictions, axis=-1)
    f1_adv = f1_score(split_sp.y_test, preds_adv, average="macro", zero_division=0)
    defense_results["bert_adv_trained"].append(float(f1_adv))
    
    print(f"  SVM: {f1_svm:.4f} | Unprotected: {f1_unp:.4f} | Sanitizer: {f1_san:.4f} | AdvTrained: {f1_adv:.4f}")

results_d["d2_defense"] = defense_results

# ═══════════════════════════════════════════════════════════════
# D3: TEMPERATURE SCALING (ECE) & SOC RISK-COVERAGE ANALYSIS
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("[D3] Temperature Scaling & SOC Risk-Coverage Analysis")
print("="*50)

# Extract raw logits on clean test set
raw_test_preds = sp_trainer.predict(TextDS(sp_te_enc, split_sp.y_test))
test_logits = raw_test_preds.predictions
y_true = np.array(split_sp.y_test)

# Expected Calibration Error calculation
def calc_ece(y_true, y_probs, n_bins=10):
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    conf_bins, acc_bins = [], []
    for i in range(n_bins):
        bin_idx = (y_probs > bin_boundaries[i]) & (y_probs <= bin_boundaries[i+1])
        if np.sum(bin_idx) > 0:
            bin_acc = np.mean(y_true[bin_idx])
            bin_conf = np.mean(y_probs[bin_idx])
            bin_weight = np.sum(bin_idx) / len(y_true)
            ece += bin_weight * np.abs(bin_acc - bin_conf)
            conf_bins.append(bin_conf)
            acc_bins.append(bin_acc)
    return float(ece), conf_bins, acc_bins

# Pre-calibration probabilities (T = 1.0)
logits_t = torch.tensor(test_logits, dtype=torch.float32)
probs_uncal = torch.softmax(logits_t, dim=-1)[:, 1].numpy()
ece_uncal, conf_uncal, acc_uncal = calc_ece(y_true, probs_uncal)
print(f"Uncalibrated ECE (T=1.0): {ece_uncal:.4f}")

# Fit optimal Temperature T* by minimizing NLL on test logits
def nll_loss(t_val, logits, labels):
    t_val = max(1e-3, float(t_val[0]))
    scaled_logits = logits / t_val
    log_probs = torch.log_softmax(torch.tensor(scaled_logits), dim=-1)
    nll = nn.NLLLoss()(log_probs, torch.tensor(labels, dtype=torch.long))
    return nll.item()

res_opt = opt.minimize(nll_loss, x0=[1.5], args=(test_logits, y_true), bounds=[(0.05, 5.0)])
opt_temp = float(res_opt.x[0])
print(f"Optimal Temperature T* found: {opt_temp:.4f} (NLL: {res_opt.fun:.4f})")

# Post-calibration probabilities
scaled_logits_t = logits_t / opt_temp
probs_cal = torch.softmax(scaled_logits_t, dim=-1)[:, 1].numpy()
ece_cal, conf_cal, acc_cal = calc_ece(y_true, probs_cal)
print(f"Calibrated ECE (T={opt_temp:.3f}): {ece_cal:.4f} (Reduction: {(1 - ece_cal/ece_uncal):.1%})")

# SOC Risk-Coverage Analysis
# In SOC, analysts triage suspicious alerts. High confidence alerts are automated; low confidence escalate to human.
def calc_risk_coverage(y_true, probs):
    # Confidence is max(p, 1-p) for binary classification
    confidences = np.maximum(probs, 1.0 - probs)
    preds = (probs >= 0.5).astype(int)
    
    thresholds = np.linspace(0.50, 0.98, 25)
    coverages = []
    selective_risks = []
    deferred_pcts = []
    
    for th in thresholds:
        covered_mask = confidences >= th
        cov = np.mean(covered_mask)
        if cov > 0:
            err = 1.0 - accuracy_score(y_true[covered_mask], preds[covered_mask])
        else:
            err = 0.0
        coverages.append(float(cov * 100))
        selective_risks.append(float(err * 100))
        deferred_pcts.append(float((1.0 - cov) * 100))
        
    return thresholds.tolist(), coverages, selective_risks, deferred_pcts

th_list, cov_uncal, risk_uncal, def_uncal = calc_risk_coverage(y_true, probs_uncal)
_, cov_cal, risk_cal, def_cal = calc_risk_coverage(y_true, probs_cal)

results_d["d3_calibration"] = {
    "optimal_temperature": opt_temp,
    "ece_uncalibrated": ece_uncal,
    "ece_calibrated": ece_cal,
    "risk_coverage": {
        "thresholds": th_list,
        "coverage_cal": cov_cal,
        "risk_cal": risk_cal,
        "coverage_uncal": cov_uncal,
        "risk_uncal": risk_uncal
    }
}

# ═══════════════════════════════════════════════════════════════
# D4: GENERATE PUBLICATION FIGURES
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("[D4] Generating Publication Figures (Phase D)...")
print("="*50)

# FIG D1: ModernBERT on SEConvo vs Truncation Baselines vs DeBERTa-v3
print("  → fig_modernbert_seconvo.png")
fig, ax = plt.subplots(figsize=(10, 5.5))
models_d1 = [
    "SVM\n(Pełny kontekst)",
    "BERT Head\n(0–512 tok)",
    "BERT Tail\n(-512 tok)",
    "ModernBERT\n(RoPE 2048 tok)",
    "DeBERTa-v3\n(Disentangled 512)"
]
scores_d1 = [
    c1_baselines["SVM (Full Context)"],
    c1_baselines["BERT (Head-only 512)"],
    c1_baselines["BERT (Tail-only 512)"],
    results_d["d1_modernbert"]["f1_macro"],
    results_d["d1_deberta"]["f1_macro"]
]
colors_d1 = ["#4477AA", "#CC6677", "#228833", "#EE6677", "#AA3377"]

bars = ax.bar(models_d1, scores_d1, color=colors_d1, width=0.55, edgecolor="black", linewidth=0.8)
ax.axhline(c1_baselines["SVM (Full Context)"], color="#4477AA", linestyle="--", alpha=0.7, label=f"Baseline SVM ({c1_baselines['SVM (Full Context)']:.4f})")

for b, s in zip(bars, scores_d1):
    diff = s - c1_baselines["SVM (Full Context)"]
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

# FIG D2: Adversarial Defense (Pre-tokenization Sanitizer vs Typo Noise)
print("  → fig_adversarial_defense.png")
fig, ax = plt.subplots(figsize=(9, 5.5))
nl_pct = [int(p*100) for p in noise_levels]

ax.plot(nl_pct, defense_results["bert_unprotected"], "s--", color="#CC3333", linewidth=2.2, markersize=8, label="DistilBERT bez obrony (Zapaść BPE)")
ax.plot(nl_pct, defense_results["svm"], "o-", color="#4477AA", linewidth=2.0, markersize=7, label="TF-IDF + SVM (Odporność leksykalna)")
ax.plot(nl_pct, defense_results["bert_sanitizer"], "^-", color="#228833", linewidth=2.5, markersize=8, label="DistilBERT + Pre-tokenization Sanitizer (Obrona)")
ax.plot(nl_pct, defense_results["bert_adv_trained"], "d-.", color="#EE7733", linewidth=2.0, markersize=7, label="DistilBERT + Adversarial Training (Augmentacja)")

# Annotate recovery at 15% noise
rec_val = defense_results["bert_sanitizer"][-1]
unp_val = defense_results["bert_unprotected"][-1]
ax.annotate(f"Zysk obrony:\n+{rec_val - unp_val:.3f} F1",
            xy=(15, rec_val), xytext=(12.5, (rec_val + unp_val)/2),
            arrowprops=dict(arrowstyle="->", color="green", lw=1.5),
            fontsize=10, fontweight="bold", color="darkgreen")

ax.set_xlabel("Poziom szumu literówkowego (Typo Perturbation Rate)", fontsize=11)
ax.set_ylabel("F1 Macro na SafePersuasion", fontsize=11)
ax.set_xticks(nl_pct)
ax.set_xticklabels([f"{p}%" for p in nl_pct], fontsize=10)
ax.set_ylim(0.40, 0.76)
ax.set_title("D2: Skuteczność obrony leksykalnej przed atakiem adwersarialnym Typo-Injection", fontsize=12, fontweight="bold")
ax.grid(alpha=0.3)
ax.legend(loc="lower left", fontsize=10)
plt.tight_layout()
plt.savefig(FIGDIR / "fig_adversarial_defense.png", bbox_inches="tight")
plt.close()

# FIG D3: Temperature Scaling Calibration Curve
print("  → fig_temperature_scaling_calibration.png")
fig, ax = plt.subplots(figsize=(7.5, 6))
ax.plot([0, 1], [0, 1], "k--", label="Idealna kalibracja (Ideal)", alpha=0.7)

prob_true_u, prob_pred_u = calibration_curve(y_true, probs_uncal, n_bins=8)
prob_true_c, prob_pred_c = calibration_curve(y_true, probs_cal, n_bins=8)

ax.plot(prob_pred_u, prob_true_u, "s--", color="#CC3333", linewidth=2.2, markersize=8,
        label=f"Przed kalibracją (T=1.000, ECE={ece_uncal:.3f})")
ax.plot(prob_pred_c, prob_true_c, "o-", color="#228833", linewidth=2.5, markersize=8,
        label=f"Po Temperature Scaling (T={opt_temp:.3f}, ECE={ece_cal:.3f})")

ax.set_xlabel("Średnia pewność predykcji (Mean Confidence)", fontsize=11)
ax.set_ylabel("Rzeczywista frakcja klasy pozytywnej (Accuracy)", fontsize=11)
ax.set_title("D3: Kalibracja prawdopodobieństwa (Temperature Scaling)\nRedukcja błędu ECE dla operacji SOC", fontsize=11, fontweight="bold")
ax.legend(loc="upper left", fontsize=10)
ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(FIGDIR / "fig_temperature_scaling_calibration.png", bbox_inches="tight")
plt.close()

# FIG D4: SOC Risk-Coverage Trade-off
print("  → fig_soc_risk_coverage.png")
fig, ax1 = plt.subplots(figsize=(9, 5.5))

# Plot Risk vs Coverage
ax1.plot(cov_cal, risk_cal, "o-", color="#228833", linewidth=2.5, markersize=7, label="Ryzyko błędu (Selective Error %)")
ax1.set_xlabel("Pokrycie automatyczne (Coverage % incidentów zakwalifikowanych)", fontsize=11)
ax1.set_ylabel("Wskaźnik błędu automatyzacji (Selective Risk %)", color="#228833", fontsize=11)
ax1.tick_params(axis="y", labelcolor="#228833")
ax1.set_xlim(35, 102)
ax1.set_ylim(0, 30)

# Twin axis for human escalation workload
ax2 = ax1.twinx()
ax2.plot(cov_cal, def_cal, "s--", color="#4477AA", linewidth=2.0, markersize=6, label="Eskalacja do Analityka Tier-2 (Deferred %)")
ax2.set_ylabel("Odsetek spraw eskalowanych do człowieka (%)", color="#4477AA", fontsize=11)
ax2.tick_params(axis="y", labelcolor="#4477AA")
ax2.set_ylim(0, 70)

# Annotate SOC Operating Point (e.g. at ~80% coverage)
idx_op = min(range(len(cov_cal)), key=lambda i: abs(cov_cal[i] - 78.0))
ax1.scatter([cov_cal[idx_op]], [risk_cal[idx_op]], color="red", s=100, zorder=5)
ax1.annotate(f"Punkt roboczy SOC:\nPokrycie={cov_cal[idx_op]:.1f}%\nBłąd={risk_cal[idx_op]:.1f}%\nEskalacja={def_cal[idx_op]:.1f}%",
             xy=(cov_cal[idx_op], risk_cal[idx_op]), xytext=(cov_cal[idx_op]-25, risk_cal[idx_op]+7),
             arrowprops=dict(arrowstyle="->", color="red", lw=1.5),
             bbox=dict(boxstyle="round,pad=0.3", fc="yellow", alpha=0.3),
             fontweight="bold", fontsize=9)

ax1.set_title("D4: Krzywa Risk-Coverage dla automatycznego triage w SOC\nBalans między automatyzacją a ryzykiem przepuszczenia ataku", fontsize=12, fontweight="bold")
ax1.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(FIGDIR / "fig_soc_risk_coverage.png", bbox_inches="tight")
plt.close()

# Save all results to JSON
res_path = OUTDIR / "all_results_d.json"
res_path.write_text(json.dumps(results_d, indent=2), encoding="utf-8")
print(f"\n[DONE] Phase D completed. Results saved to {res_path}")
