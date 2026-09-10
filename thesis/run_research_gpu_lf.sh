#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m pip install -U pip --break-system-packages
python3 -m pip install -r requirements.txt --break-system-packages
python3 -m src.download
python3 -m src.eda
BATCH="${BATCH_SIZE:-8}"
MAXLEN="${MAX_LENGTH:-512}"
EPOCHS="${EPOCHS:-3}"
MODELS="${MODELS:-all}"
echo "GPU run: models=$MODELS epochs=$EPOCHS batch=$BATCH maxlen=$MAXLEN"
python3 -m src.run_all --task all --models "$MODELS" --epochs "$EPOCHS" --batch-size "$BATCH" --max-length "$MAXLEN"
python3 -m src.compare_results --metric f1_macro
python3 -m src.compare_results --metric f1
echo DONE
ls -lah outputs | tail -n 30