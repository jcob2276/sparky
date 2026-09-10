"""Download all thesis corpora (core + extra). Retries on 429."""

from __future__ import annotations

import shutil
import time
import urllib.error
import urllib.request
from pathlib import Path

from src.paths import (
    MENTAL_CSV,
    MENTAL_DIR,
    PHISH_DIR,
    PHISH_JSON,
    REAMENT_DIR,
    REAMENT_JSON,
    SAFE_CSV,
    SAFE_DIR,
    SCAM_DIR,
    SCAM_TEST,
    SCAM_TRAIN,
    SECONVO_DIR,
    SECONVO_TEST,
    SECONVO_TRAIN,
)

FILES: list[tuple[str, Path]] = [
    (
        "https://zenodo.org/records/12170260/files/annotated_train.json?download=1",
        SECONVO_TRAIN,
    ),
    (
        "https://zenodo.org/records/12170260/files/annotated_test.json?download=1",
        SECONVO_TEST,
    ),
    (
        "https://huggingface.co/datasets/audreyeleven/MentalManip/resolve/main/mentalmanip_maj.csv?download=true",
        MENTAL_CSV,
    ),
    (
        "https://raw.githubusercontent.com/haeinkong/SafePersuasion/main/dataset/SafePersuasion.csv",
        SAFE_CSV,
    ),
    (
        "https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation/resolve/main/agent_conversation_train.csv?download=true",
        SCAM_TRAIN,
    ),
    (
        "https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation/resolve/main/agent_conversation_test.csv?download=true",
        SCAM_TEST,
    ),
    (
        "https://huggingface.co/datasets/ealvaradob/phishing-dataset/resolve/main/texts.json?download=true",
        PHISH_JSON,
    ),
    (
        "https://huggingface.co/datasets/YSGao/ReaMent/resolve/main/ReaMent.json?download=true",
        REAMENT_JSON,
    ),
]


def _fetch_urllib(url: str, dest: Path, attempts: int = 6) -> None:
    tmp = dest.with_suffix(dest.suffix + ".part")
    last_err: Exception | None = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "thesis-se-transformer/1.0"})
            with urllib.request.urlopen(req, timeout=120) as resp, tmp.open("wb") as out:
                shutil.copyfileobj(resp, out)
            shutil.move(tmp, dest)
            return
        except urllib.error.HTTPError as exc:
            last_err = exc
            if tmp.exists():
                tmp.unlink(missing_ok=True)
            wait = 15 * (i + 1)
            if exc.code in (429, 503):
                print(f"  HTTP {exc.code}, wait {wait}s ({i + 1}/{attempts})")
                time.sleep(wait)
                continue
            raise
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            if tmp.exists():
                tmp.unlink(missing_ok=True)
            wait = 10 * (i + 1)
            print(f"  error {exc}, wait {wait}s ({i + 1}/{attempts})")
            time.sleep(wait)
    raise RuntimeError(f"failed to download {dest.name}: {last_err}")


def _fetch_hf_hub(repo_file: str, dest: Path) -> bool:
    """repo_file like 'ealvaradob/phishing-dataset@texts.json'."""
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        return False
    repo_id, filename = repo_file.split("@", 1)
    path = hf_hub_download(repo_id=repo_id, filename=filename, repo_type="dataset")
    shutil.copy(path, dest)
    return True


def _fetch(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"skip {dest.name} ({dest.stat().st_size} bytes)")
        return
    print(f"download {dest.name}")
    # Prefer HF hub for large HF files (better rate limits).
    if "ealvaradob/phishing-dataset" in url and "texts.json" in url:
        if _fetch_hf_hub("ealvaradob/phishing-dataset@texts.json", dest):
            print(f"  -> {dest.stat().st_size} bytes (hf_hub)")
            return
    _fetch_urllib(url, dest)
    print(f"  -> {dest.stat().st_size} bytes")


def main() -> None:
    for folder in (SECONVO_DIR, MENTAL_DIR, SAFE_DIR, SCAM_DIR, PHISH_DIR, REAMENT_DIR):
        folder.mkdir(parents=True, exist_ok=True)
    for url, dest in FILES:
        _fetch(url, dest)


if __name__ == "__main__":
    main()
