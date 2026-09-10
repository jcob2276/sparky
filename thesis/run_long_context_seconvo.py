"""
Extended Long Context SEConvo Experiment:
Comparing ModernBERT-base and DeBERTa-v3 on SEConvo
"""
import sys, time, json, math
from pathlib import Path
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from sklearn.metrics import f1_score, accuracy_score, precision_recall_fscore_support

ROOT = Path("/workspace/se-transformer")
sys.path.insert(0, str(ROOT))
from src.data_load import load_task

split_se = load_task("seconvo")
print(f"SEConvo: {len(split_se.texts_train)} train, {len(split_se.texts_test)} test")

class TextDS(torch.utils.data.Dataset):
    def __init__(self, enc, labels):
        self.enc = enc
        self.labels = labels
    def __len__(self): return len(self.labels)
    def __getitem__(self, i):
        item = {k: v[i] for k, v in self.enc.items()}
        item["labels"] = torch.tensor(self.labels[i], dtype=torch.long)
        return item

results = {}

# 1. ModernBERT with lr=5e-5, epochs=6
print("\n--- Training ModernBERT (lr=5e-5, epochs=6, max_len=2048) ---")
mb_tok = AutoTokenizer.from_pretrained("answerdotai/ModernBERT-base")
tr_enc = mb_tok(split_se.texts_train, truncation=True, padding=True, max_length=2048)
te_enc = mb_tok(split_se.texts_test, truncation=True, padding=True, max_length=2048)
mb_model = AutoModelForSequenceClassification.from_pretrained("answerdotai/ModernBERT-base", num_labels=2)
args = TrainingArguments(
    output_dir="/tmp/mb_tuned",
    num_train_epochs=6,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=2,
    learning_rate=5e-5,
    warmup_ratio=0.1,
    weight_decay=0.01,
    fp16=True,
    save_strategy="no",
    report_to=[],
    seed=42
)
trainer = Trainer(model=mb_model, args=args, train_dataset=TextDS(tr_enc, split_se.y_train))
trainer.train()
preds = np.argmax(trainer.predict(TextDS(te_enc, split_se.y_test)).predictions, axis=-1)
f1_m = f1_score(split_se.y_test, preds, average="macro", zero_division=0)
f1_p = f1_score(split_se.y_test, preds, average="binary", zero_division=0)
acc = accuracy_score(split_se.y_test, preds)
print(f"ModernBERT (tuned full 2048): F1 Macro = {f1_m:.4f} | F1 Pos = {f1_p:.4f} | Acc = {acc:.4f}")
results["modernbert_full_2048"] = {"f1_macro": float(f1_m), "f1_pos": float(f1_p), "acc": float(acc)}

# 2. DeBERTa-v3 on 512
print("\n--- Training DeBERTa-v3-base (512 tokens) ---")
deb_tok = AutoTokenizer.from_pretrained("microsoft/deberta-v3-base")
tr_enc_deb = deb_tok(split_se.texts_train, truncation=True, padding=True, max_length=512)
te_enc_deb = deb_tok(split_se.texts_test, truncation=True, padding=True, max_length=512)
deb_model = AutoModelForSequenceClassification.from_pretrained("microsoft/deberta-v3-base", num_labels=2)
args_deb = TrainingArguments(
    output_dir="/tmp/deb_512",
    num_train_epochs=4,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=2,
    learning_rate=2e-5,
    warmup_ratio=0.1,
    fp16=True,
    save_strategy="no",
    report_to=[],
    seed=42
)
trainer_deb = Trainer(model=deb_model, args=args_deb, train_dataset=TextDS(tr_enc_deb, split_se.y_train))
trainer_deb.train()
preds_deb = np.argmax(trainer_deb.predict(TextDS(te_enc_deb, split_se.y_test)).predictions, axis=-1)
f1_m_deb = f1_score(split_se.y_test, preds_deb, average="macro", zero_division=0)
f1_p_deb = f1_score(split_se.y_test, preds_deb, average="binary", zero_division=0)
acc_deb = accuracy_score(split_se.y_test, preds_deb)
print(f"DeBERTa-v3 (512 tokens): F1 Macro = {f1_m_deb:.4f} | F1 Pos = {f1_p_deb:.4f} | Acc = {acc_deb:.4f}")
results["deberta_v3_512"] = {"f1_macro": float(f1_m_deb), "f1_pos": float(f1_p_deb), "acc": float(acc_deb)}

print("\nFinal Comparison on SEConvo:")
print("SVM Full Context: 0.7834")
print("BERT Head-512:    0.7737")
print("BERT Tail-512:    0.7859")
print(f"DeBERTa-v3:       {f1_m_deb:.4f}")
print(f"ModernBERT:       {f1_m:.4f}")

out_p = Path("/workspace/se-transformer/outputs/deep_d/seconvo_extended.json")
out_p.write_text(json.dumps(results, indent=2))
print(f"Saved to {out_p}")
