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

print('Loading DeBERTa-v3 model on CPU...')
model = AutoModelForSequenceClassification.from_pretrained(deb_name, num_labels=2)
model.eval()

# Measure FP32 size
tmp_fp32 = Path('/workspace/deb_fp32.pt')
torch.save(model.state_dict(), tmp_fp32)
size_fp32_mb = tmp_fp32.stat().st_size / (1024*1024)
tmp_fp32.unlink(missing_ok=True)
print(f'DeBERTa FP32 size: {size_fp32_mb:.2f} MB')

# Apply dynamic INT8 quantization
t0 = time.time()
try:
    int8_model = torch.quantization.quantize_dynamic(
        model,
        {nn.Linear},
        dtype=torch.qint8
    )
    t_q = time.time() - t0
    print(f'DeBERTa quantize_dynamic completed in {t_q:.2f}s')

    tmp_int8 = Path('/workspace/deb_int8.pt')
    torch.save(int8_model.state_dict(), tmp_int8)
    size_int8_mb = tmp_int8.stat().st_size / (1024*1024)
    tmp_int8.unlink(missing_ok=True)
    print(f'DeBERTa INT8 size: {size_int8_mb:.2f} MB (Compression: {size_fp32_mb/size_int8_mb:.2f}x)')

    # Test single-sample inference
    bench_samples = split_sp.texts_test[:20]
    t0 = time.time()
    for s in bench_samples:
        enc = tok(s, truncation=True, max_length=128, return_tensors='pt')
        with torch.no_grad():
            _ = model(**enc)
    t_fp32 = time.time() - t0

    t0 = time.time()
    for s in bench_samples:
        enc = tok(s, truncation=True, max_length=128, return_tensors='pt')
        with torch.no_grad():
            _ = int8_model(**enc)
    t_int8 = time.time() - t0

    print(f'DeBERTa FP32 lat: {t_fp32/len(bench_samples)*1000:.1f}ms | INT8 lat: {t_int8/len(bench_samples)*1000:.1f}ms (Speedup: {t_fp32/t_int8:.2f}x)')

except Exception as e:
    print(f'Quantization error on DeBERTa: {e}')
