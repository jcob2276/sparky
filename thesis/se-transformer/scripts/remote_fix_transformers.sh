#!/bin/bash
set -euo pipefail
cd /workspace/se-transformer
python -m pip install -U 'transformers>=4.44,<5' 'huggingface_hub<1' 'tokenizers<0.21'
# keep torch from image
python -c "import torch; import transformers; print('torch', torch.__version__, 'cuda', torch.cuda.is_available()); print('transformers', transformers.__version__)"
nohup bash -c 'python -m src.run_all --task reament --models all --epochs 3 --batch-size 8 --max-length 512 && python -m src.compare_results --metric f1_macro && python -m src.compare_results --metric f1' > /workspace/reament_train.log 2>&1 &
echo "PID=$!"
sleep 8
tail -n 40 /workspace/reament_train.log
