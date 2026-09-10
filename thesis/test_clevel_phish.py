import sys, time
from pathlib import Path
import numpy as np
import torch
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.metrics import confusion_matrix, f1_score
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from torch.utils.data import Dataset as TorchDataset

ROOT = Path('/workspace/se-transformer')
sys.path.insert(0, str(ROOT))
from src.data_load import load_task

class TextDS(TorchDataset):
    def __init__(self, enc, labels):
        self.enc = enc
        self.labels = labels
    def __len__(self):
        return len(self.labels)
    def __getitem__(self, i):
        item = {k: v[i] for k, v in self.enc.items()}
        item['labels'] = torch.tensor(self.labels[i], dtype=torch.long)
        return item

import run_phase_e
exec_clean = run_phase_e.exec_clean
exec_bec = run_phase_e.exec_bec
texts_exec = exec_clean + exec_bec
y_exec = [0]*len(exec_clean) + [1]*len(exec_bec)

print('Loading phishing_text task...')
split_ph = load_task('phishing_text')
print(f'Train samples: {len(split_ph.texts_train)}')

# Train SVM on phishing_text
tfidf_pipe = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=10000, sublinear_tf=True)),
    ('clf', LinearSVC(C=1.0, random_state=42))
])
tfidf_pipe.fit(split_ph.texts_train, split_ph.y_train)

svm_preds = tfidf_pipe.predict(texts_exec)
cm = confusion_matrix(y_exec, svm_preds)
tn, fp, fn, tp = cm.ravel()
svm_f1 = f1_score(y_exec, svm_preds, average='macro')
print(f'SVM on C-Level: FPR={fp/(fp+tn)*100:.1f}% ({fp}/50 FP) | TPR={tp/(tp+fn)*100:.1f}% ({tp}/50 TP) | F1={svm_f1:.4f}')

# Train DistilBERT on phishing_text
distil_name = 'distilbert-base-uncased'
distil_tok = AutoTokenizer.from_pretrained(distil_name)
tr_sub_x = split_ph.texts_train[:4000]
tr_sub_y = split_ph.y_train[:4000]
tr_enc = distil_tok(tr_sub_x, truncation=True, padding=True, max_length=256)
te_enc = distil_tok(texts_exec, truncation=True, padding=True, max_length=256)

tr_ds = TextDS(tr_enc, tr_sub_y)
te_ds = TextDS(te_enc, y_exec)

distil_model = AutoModelForSequenceClassification.from_pretrained(distil_name, num_labels=2)
args = TrainingArguments(
    output_dir='/workspace/distil_phish',
    num_train_epochs=2,
    per_device_train_batch_size=32,
    learning_rate=3e-5,
    fp16=True,
    save_strategy='no',
    eval_strategy='no',
    report_to=[]
)
trainer = Trainer(model=distil_model, args=args, train_dataset=tr_ds)
trainer.train()

raw_preds = trainer.predict(te_ds)
probs = torch.softmax(torch.tensor(raw_preds.predictions), dim=-1).numpy()
preds = np.argmax(probs, axis=-1)

cm = confusion_matrix(y_exec, preds)
tn, fp, fn, tp = cm.ravel()
dist_f1 = f1_score(y_exec, preds, average='macro')
print(f'DistilBERT on C-Level: FPR={fp/(fp+tn)*100:.1f}% ({fp}/50 FP) | TPR={tp/(tp+fn)*100:.1f}% ({tp}/50 TP) | F1={dist_f1:.4f}')

for th in [0.5, 0.65, 0.80, 0.90]:
    cal_preds = (probs[:, 1] >= th).astype(int)
    cm = confusion_matrix(y_exec, cal_preds)
    tn, fp, fn, tp = cm.ravel()
    cal_f1 = f1_score(y_exec, cal_preds, average='macro')
    print(f'DistilBERT (theta={th}): FPR={fp/(fp+tn)*100:.1f}% ({fp}/50 FP) | TPR={tp/(tp+fn)*100:.1f}% ({tp}/50 TP) | F1={cal_f1:.4f}')
