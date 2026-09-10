from pathlib import Path
for p in Path('/workspace/se-transformer/models').glob('*'):
    print(p.name, p.is_dir(), [x.name for x in p.glob('*')][:5])
