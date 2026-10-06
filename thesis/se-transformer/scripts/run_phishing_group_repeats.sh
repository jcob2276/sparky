#!/usr/bin/env bash
set -euo pipefail
cd /workspace/phishing_group_v3
export HF_HOME=/workspace/hf-cache
export TOKENIZERS_PARALLELISM=false

for seed in 43 44 45 46; do
  echo "START_SEED_${seed}"
  python -m src.research_phishing_transformer \
    --split-file split.json \
    --baseline-manifest manifest.json \
    --output-dir "outputs/seed-${seed}" \
    --seed "${seed}"
  echo "DONE_SEED_${seed}"
done
echo PHISHING_REPEATS_DONE
