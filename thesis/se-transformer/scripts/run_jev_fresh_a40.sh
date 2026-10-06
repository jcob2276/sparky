#!/usr/bin/env bash
# One frozen SafePersuasion/JeV replication. No API secrets are used on the pod.
cd /workspace/se-thesis || exit 90
export HF_HOME=/workspace/se-thesis/hf-cache
python3 -m src.research_run \
  --protocol /workspace/se-thesis/protocol.json \
  --output-dir /workspace/se-thesis/outputs/a40_seed45 \
  --seed 45 --epochs 3 --batch-size 16 --max-length 256 \
  --save-model --gpu-hourly-price 0.49
status=$?
printf '%s\n' "$status" > /workspace/se-thesis/outputs/a40_seed45.exit
exit "$status"
