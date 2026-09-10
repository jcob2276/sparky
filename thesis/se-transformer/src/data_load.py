"""Load labeled texts for core + extra thesis tasks."""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass

from sklearn.model_selection import train_test_split

from src.paths import (
    ALL_TASKS,
    MENTAL_CSV,
    PHISH_JSON,
    REAMENT_JSON,
    SAFE_CSV,
    SCAM_TEST,
    SCAM_TRAIN,
    SECONVO_TEST,
    SECONVO_TRAIN,
)

SEED = 42


@dataclass(frozen=True)
class Split:
    task: str
    texts_train: list[str]
    y_train: list[int]
    texts_test: list[str]
    y_test: list[int]
    ids_train: list[str]
    ids_test: list[str]


def _dialogue_to_text(turns: list[dict]) -> str:
    lines: list[str] = []
    for turn in turns:
        name = str(turn.get("Name", "Speaker")).strip()
        msg = str(turn.get("Message", "")).strip()
        if msg:
            lines.append(f"{name}: {msg}")
    return "\n".join(lines)


def load_seconvo_all() -> tuple[list[str], list[int], list[str]]:
    texts: list[str] = []
    labels: list[int] = []
    ids: list[str] = []
    for path in (SECONVO_TRAIN, SECONVO_TEST):
        raw = json.loads(path.read_text(encoding="utf-8"))
        for item in raw["Conversations"]:
            gt = item["GroundTruth"]
            cid = str(gt.get("ConversationID", len(ids)))
            texts.append(_dialogue_to_text(item["Conversation"]))
            labels.append(1 if gt["IsMalicious"] else 0)
            ids.append(cid)
    return texts, labels, ids


def load_mentalmanip_all() -> tuple[list[str], list[int], list[str]]:
    texts: list[str] = []
    labels: list[int] = []
    ids: list[str] = []
    with MENTAL_CSV.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            texts.append(row["dialogue"].strip())
            labels.append(int(row["manipulative"]))
            ids.append(str(row["id"]))
    return texts, labels, ids


def load_safepersuasion_all() -> tuple[list[str], list[int], list[str]]:
    """Manipulation=1, Rational Persuasion=0 (semantic manipulation in online comments)."""
    texts: list[str] = []
    labels: list[int] = []
    ids: list[str] = []
    with SAFE_CSV.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for i, row in enumerate(reader):
            label_name = row["first_label"].strip()
            if label_name == "Manipulation":
                y = 1
            elif label_name == "Rational Persuasion":
                y = 0
            else:
                continue
            text = row["text"].strip()
            if not text:
                continue
            texts.append(text)
            labels.append(y)
            ids.append(f"safe_{i}")
    return texts, labels, ids


def _normalize_scam_dialogue(text: str) -> str:
    # Strip role tags that are identical across classes (reduce template leakage).
    return (
        text.replace("Innocent:", "Receiver:")
        .replace("Suspect:", "Caller:")
        .strip()
    )


def load_scam_phone_split() -> Split:
    """Official train/test from BothBosu multi-agent scam conversations."""

    def _read(path, prefix: str) -> tuple[list[str], list[int], list[str]]:
        texts: list[str] = []
        labels: list[int] = []
        ids: list[str] = []
        with path.open(encoding="utf-8", newline="") as handle:
            for i, row in enumerate(csv.DictReader(handle)):
                texts.append(_normalize_scam_dialogue(row["dialogue"]))
                labels.append(int(row["labels"]))
                ids.append(f"{prefix}_{i}")
        return texts, labels, ids

    x_tr, y_tr, id_tr = _read(SCAM_TRAIN, "tr")
    x_te, y_te, id_te = _read(SCAM_TEST, "te")
    return Split("scam_phone", x_tr, y_tr, x_te, y_te, id_tr, id_te)


def load_phishing_text_all() -> tuple[list[str], list[int], list[str]]:
    """Email/SMS-style phishing vs benign (ealvaradob texts subset)."""
    raw = json.loads(PHISH_JSON.read_text(encoding="utf-8"))
    texts: list[str] = []
    labels: list[int] = []
    ids: list[str] = []
    seen: set[str] = set()
    for i, row in enumerate(raw):
        text = str(row.get("text", "")).strip()
        if not text:
            continue
        # Drop exact duplicates before split (avoid train/test leakage).
        if text in seen:
            continue
        seen.add(text)
        texts.append(text)
        labels.append(int(row["label"]))
        ids.append(f"phish_{i}")
    return texts, labels, ids


def load_reament_all() -> tuple[list[str], list[int], list[str]]:
    """Real-world mental manipulation dialogues (YSGao/ReaMent majority labels).

    File is JSONL despite .json extension: one object per line with
    dialogue + manipulative ('0'|'1').
    """
    texts: list[str] = []
    labels: list[int] = []
    ids: list[str] = []
    with REAMENT_JSON.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            text = str(row.get("dialogue", "")).strip()
            if not text:
                continue
            texts.append(text)
            labels.append(int(row["manipulative"]))
            ids.append(str(row.get("id", len(ids))))
    return texts, labels, ids


def stratified_split(
    task: str,
    texts: list[str],
    labels: list[int],
    ids: list[str],
    test_size: float = 0.2,
    limit: int | None = None,
) -> Split:
    if limit is not None:
        # stratified subsample before split so smoke stays class-balanced
        if len(texts) > limit:
            texts, _, labels, _, ids, _ = train_test_split(
                texts,
                labels,
                ids,
                train_size=limit,
                random_state=SEED,
                stratify=labels if len(set(labels)) > 1 else None,
            )
    x_tr, x_te, y_tr, y_te, id_tr, id_te = train_test_split(
        texts,
        labels,
        ids,
        test_size=test_size,
        random_state=SEED,
        stratify=labels if len(set(labels)) > 1 else None,
    )
    return Split(task, x_tr, y_tr, x_te, y_te, id_tr, id_te)


def load_task(task: str, limit: int | None = None) -> Split:
    if task not in ALL_TASKS:
        raise ValueError(f"unknown task: {task}; expected one of {ALL_TASKS}")
    if task == "scam_phone":
        split = load_scam_phone_split()
        if limit is None:
            return split
        # smoke: shrink train/test proportionally
        n_tr = max(8, int(limit * 0.8))
        n_te = max(4, limit - n_tr)
        return Split(
            split.task,
            split.texts_train[:n_tr],
            split.y_train[:n_tr],
            split.texts_test[:n_te],
            split.y_test[:n_te],
            split.ids_train[:n_tr],
            split.ids_test[:n_te],
        )
    if task == "seconvo":
        texts, labels, ids = load_seconvo_all()
    elif task == "mentalmanip":
        texts, labels, ids = load_mentalmanip_all()
    elif task == "safepersuasion":
        texts, labels, ids = load_safepersuasion_all()
    elif task == "phishing_text":
        texts, labels, ids = load_phishing_text_all()
    elif task == "reament":
        texts, labels, ids = load_reament_all()
    else:
        raise ValueError(f"unknown task: {task}")
    return stratified_split(task, texts, labels, ids, limit=limit)
