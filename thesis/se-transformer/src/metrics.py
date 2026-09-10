from __future__ import annotations

from collections import Counter

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


def score(y_true: list[int], y_pred: list[int]) -> dict[str, float | list | str]:
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "report": classification_report(y_true, y_pred, digits=4, zero_division=0),
    }


def majority_baseline(y_true: list[int]) -> dict[str, float | int]:
    maj = Counter(y_true).most_common(1)[0][0]
    pred = [maj] * len(y_true)
    return {
        "majority_class": int(maj),
        "accuracy": float(accuracy_score(y_true, pred)),
        "f1": float(f1_score(y_true, pred, zero_division=0)),
        "f1_macro": float(f1_score(y_true, pred, average="macro", zero_division=0)),
    }
