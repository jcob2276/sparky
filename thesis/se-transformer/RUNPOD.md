# RunPod / Vast — jak dociągnąć 3 Transformery tanio

Zamiast Colab Pro: GPU na godziny (~0.20–0.50 USD/h). **Gas pod zaraz po wynikach.**

## 1) RunPod (rekomendowane)

1. Konto: https://www.runpod.io → doładuj kilka USD.
2. **Deploy → GPU Cloud → Community / Secure**
3. Wybierz np.:
   - **RTX 3090 / 4090** albo **L4/T4** (cokolwiek z ≥12 GB VRAM, tanio)
4. Template: **PyTorch** / **RunPod Pytorch** (z Jupyter).
5. Volume: wystarczy tymczasowy dysk kontenera (20–40 GB).
6. Deploy → otwórz **Jupyter** albo **SSH**.

## 2) Wrzuć projekt

### Opcja A — Jupyter (najłatwiej)
1. Spakuj lokalnie folder `thesis/se-transformer` (bez `models/`, bez ogromnego cache).
2. W Jupyter: Upload zip → Terminal:

```bash
cd /workspace
unzip se-transformer.zip -d se-transformer
cd se-transformer
python -m pip install -U pip
python -m pip install -r requirements.txt
python -m src.download
python -m src.eda
python -m src.run_all --task all --models all --epochs 3 --batch-size 8 --max-length 512
python -m src.compare_results --metric f1_macro
python -m src.compare_results --metric f1
```

### Opcja B — skrypt one-shot
```bash
bash scripts/run_research_gpu.sh
```

## 3) Po zakończeniu
1. Pobierz z `outputs/`:
   - `results_latest.md`
   - `comparison_f1_macro.md`
   - `comparison_f1.md`
   - `eda_summary.md`
   - najnowszy `results_full_*.json`
2. **Stop / Terminate pod** (żeby nie płacić).

## Parametry przy małym VRAM (np. 8–10 GB)
```bash
python -m src.run_all --task all --models all --epochs 3 --batch-size 4 --max-length 384
```

## Vast.ai
To samo, tylko UI bardziej „surowy”: wybierz ofertę z PyTorch + CUDA, SSH, potem te same komendy. Na start **RunPod jest wygodniejszy**.

## Uwaga
Jeśli Colab nadal liczy — **nie odpalaj równolegle**. Dokończ jedno albo drugie.
