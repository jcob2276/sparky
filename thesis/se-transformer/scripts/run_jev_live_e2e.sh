#!/usr/bin/env bash
# Read the API credential from SSH stdin; never persist or print it.
set -u
read -r OPENROUTER_API_KEY || exit 91
export OPENROUTER_API_KEY
cd /workspace/se-thesis || exit 90
mkdir -p outputs/jev_live_e2e_20260930
date -u +%FT%TZ > outputs/jev_live_e2e_20260930/started_at_utc.txt
python3 -m pip freeze > outputs/jev_live_e2e_20260930/pip_freeze.txt
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv > outputs/jev_live_e2e_20260930/gpu.csv
python3 -u -m src.benchmark_cascade \
  --protocol outputs/jev_fresh_20260930/protocol.json \
  --threshold-file outputs/jev_fresh_20260930/threshold.json \
  --model-run outputs/jev_fresh_20260930/a40_seed45 \
  --output-dir outputs/jev_live_e2e_20260930 \
  --hourly-price 0.49 --max-api-cost 0.10
status=$?
printf '%s\n' "$status" > outputs/jev_live_e2e_20260930/exit_code.txt
date -u +%FT%TZ > outputs/jev_live_e2e_20260930/finished_at_utc.txt
exit "$status"
