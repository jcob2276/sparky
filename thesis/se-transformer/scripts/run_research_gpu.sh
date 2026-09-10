#!/usr/bin/env bash
# Full research run on GPU (RunPod / Vast / local CUDA).
set -euo pipefail
cd "$(dirname "$0")/.."

python -m pip install -U pip
python -m pip install -r requirements.txt

python -m src.download
python -m src.eda

BATCH="${BATCH_SIZE:-8}"
MAXLEN="${MAX_LENGTH:-512}"
EPOCHS="${EPOCHS:-3}"
MODELS="${MODELS:-all}"

echo "GPU run: models=$MODELS epochs=$EPOCHS batch=$BATCH maxlen=$MAXLEN"
python -m src.run_all \
  --task all \
  --models "$MODELS" \
  --epochs "$EPOCHS" \
  --batch-size "$BATCH" \
  --max-length "$MAXLEN"

python -m src.compare_results --metric f1_macro
python -m src.compare_results --metric f1

echo "DONE — check outputs/results_latest.md and outputs/comparison_*.md"
ls -lah outputs | tail -n 30
