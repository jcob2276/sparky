#!/usr/bin/env bash
set -euo pipefail
cd /workspace/reament_con_gpu_20260929

export HF_HOME=/workspace/hf-cache
export TOKENIZERS_PARALLELISM=false

python -m pip install --break-system-packages -q \
  'transformers==4.45.2' 'accelerate==0.34.2' 'scikit-learn==1.5.2' 'numpy<2'

mkdir -p outputs
nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv > outputs/hardware.csv
python --version > outputs/python_version.txt
python -m pip freeze > outputs/pip_freeze.txt
sha256sum ReaMent_con.json baseline_manifest.json src/research_reament_con.py \
  src/research_reament_transformer.py > outputs/source_checksums.txt

for seed in "$@"; do
  python -m src.research_reament_transformer \
    --source ReaMent_con.json \
    --baseline-manifest baseline_manifest.json \
    --output-dir "outputs/seed-${seed}" \
    --seed "${seed}" \
    --model distilbert-base-uncased \
    --epochs 3 --batch-size 16 --max-length 256
done

echo REAMENT_CON_RUN_DONE
