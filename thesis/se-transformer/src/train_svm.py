from __future__ import annotations

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from src.data_load import Split
from src.metrics import score


def train_eval_svm(split: Split, max_features: int = 50_000) -> dict:
    pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    min_df=2,
                    max_features=max_features,
                ),
            ),
            ("clf", LinearSVC(class_weight="balanced", random_state=42, max_iter=4000)),
        ]
    )
    pipe.fit(split.texts_train, split.y_train)
    pred = pipe.predict(split.texts_test).tolist()
    metrics = score(split.y_test, pred)
    return {
        "task": split.task,
        "model": "tfidf_linearsvc",
        "n_train": len(split.y_train),
        "n_test": len(split.y_test),
        "metrics": metrics,
    }
