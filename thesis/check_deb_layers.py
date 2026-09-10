import sys, time
from pathlib import Path
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import f1_score

ROOT = Path('/workspace/se-transformer')
sys.path.insert(0, str(ROOT))
from src.data_load import load_task

split_sp = load_task('safepersuasion')
deb_name = 'microsoft/deberta-v3-base'
tok = AutoTokenizer.from_pretrained(deb_name)

# Inspect modules in DeBERTa-v3
model = AutoModelForSequenceClassification.from_pretrained(deb_name, num_labels=2)
linear_names = []
for name, mod in model.named_modules():
    if isinstance(mod, nn.Linear):
        linear_names.append(name)
print('Total nn.Linear in DeBERTa:', len(linear_names))
print('Sample linear module names:', linear_names[:10])

# What if we only quantize the FFN layers (dense layers in intermediate and output), leaving attention linear layers intact?
# In DeBERTa, intermediate is 'intermediate.dense' and output is 'output.dense'
ffn_names = [n for n in linear_names if 'intermediate' in n or 'output.dense' in n]
print(f'FFN linear modules: {len(ffn_names)} / {len(linear_names)}')
