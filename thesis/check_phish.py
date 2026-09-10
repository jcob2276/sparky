import sys
from pathlib import Path
ROOT = Path('/workspace/se-transformer')
sys.path.insert(0, str(ROOT))
from src.data_load import load_task
split_ph = load_task('phishing_text')
print(f'phishing_text: train={len(split_ph.texts_train)}, test={len(split_ph.texts_test)}')
print('Example train pos:', split_ph.texts_train[0][:150])
