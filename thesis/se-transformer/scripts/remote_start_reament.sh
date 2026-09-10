#!/bin/bash
set -euo pipefail
cd /workspace
ls -la
python <<'PY'
import zipfile
z = zipfile.ZipFile("/workspace/se-reament-slim.zip")
names = z.namelist()
print("entries", len(names))
print("\n".join(names[:40]))
# extract fixing any backslashes
import os
from pathlib import Path
root = Path("/workspace/se-transformer")
if root.exists():
    import shutil
    shutil.rmtree(root)
for name in names:
    data = z.read(name)
    rel = name.replace("\\", "/")
    # strip leading se-transformer/ if present
    if rel.startswith("se-transformer/"):
        rel = rel[len("se-transformer/"):]
    if not rel or rel.endswith("/"):
        continue
    dest = root / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
print("extracted to", root)
print("top", list(root.iterdir())[:20])
PY
cd /workspace/se-transformer
sed -i 's/\r$//' scripts/*.sh || true
chmod +x scripts/run_reament_gpu.sh
nohup bash scripts/run_reament_gpu.sh > /workspace/reament_train.log 2>&1 &
echo "PID=$!"
sleep 5
head -n 80 /workspace/reament_train.log
