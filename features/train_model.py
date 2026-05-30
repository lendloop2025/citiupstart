"""Train the borrower confidence-score model.

Run from the repo root:

    python -m features.train_model

This trains three candidate models on a synthetic dataset that follows the
same feature contract as production, picks the strongest by ROC-AUC on a
held-out fold, and persists it to ``features/model_artifacts/``.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from features.confidence_score import (
    ARTIFACT_DIR,
    METADATA_PATH,
    MODEL_PATH,
    BorrowerConfidenceModel,
    attach_feature_directions,
)
from features.synthetic_data import FEATURE_COLUMNS, generate_dataset


def _candidate_pipelines() -> dict[str, Pipeline]:
    return {
        "logreg": Pipeline(
            [
                ("scaler", StandardScaler(with_mean=True)),
                (
                    "clf",
                    LogisticRegression(max_iter=1000, C=1.0, n_jobs=None, solver="lbfgs"),
                ),
            ]
        ),
        "random_forest": Pipeline(
            [
                ("scaler", StandardScaler(with_mean=True)),
                (
                    "clf",
                    RandomForestClassifier(
                        n_estimators=350,
                        max_depth=10,
                        min_samples_leaf=4,
                        random_state=42,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
        "gradient_boosting": Pipeline(
            [
                ("scaler", StandardScaler(with_mean=True)),
                (
                    "clf",
                    GradientBoostingClassifier(
                        n_estimators=220,
                        max_depth=3,
                        learning_rate=0.06,
                        subsample=0.85,
                        random_state=42,
                    ),
                ),
            ]
        ),
    }


def _evaluate(
    pipeline: Pipeline,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> dict[str, float]:
    proba = pipeline.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)
    return {
        "roc_auc": float(roc_auc_score(y_test, proba)),
        "accuracy": float(accuracy_score(y_test, preds)),
        "brier": float(brier_score_loss(y_test, proba)),
    }


def _train_and_select(
    df: pd.DataFrame,
) -> Tuple[str, Pipeline, dict[str, dict[str, float]]]:
    X = df[FEATURE_COLUMNS]
    y = df["defaulted"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    metrics: dict[str, dict[str, float]] = {}
    fitted: dict[str, Pipeline] = {}
    for name, pipe in _candidate_pipelines().items():
        pipe.fit(X_train, y_train)
        fitted[name] = pipe
        m = _evaluate(pipe, X_test, y_test)
        metrics[name] = m
        print(
            f"  {name:<18s}  ROC-AUC={m['roc_auc']:.3f}  "
            f"ACC={m['accuracy']:.3f}  Brier={m['brier']:.3f}"
        )

    best_name = max(metrics, key=lambda n: metrics[n]["roc_auc"])
    print(f"\nBest model: {best_name}")
    attach_feature_directions(fitted[best_name], X_train, y_train)

    proba = fitted[best_name].predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)
    print("\nClassification report (best model):")
    print(classification_report(y_test, preds, digits=3))

    return best_name, fitted[best_name], metrics


def _top_features(pipeline: Pipeline, k: int = 12) -> list[tuple[str, float]]:
    clf = pipeline.named_steps["clf"]
    if hasattr(clf, "feature_importances_"):
        weights = clf.feature_importances_
    elif hasattr(clf, "coef_"):
        weights = np.abs(clf.coef_[0])
    else:
        return []
    pairs = sorted(zip(FEATURE_COLUMNS, weights), key=lambda x: x[1], reverse=True)
    return pairs[:k]


def main(n: int, seed: int) -> None:
    print(f"Generating {n} synthetic borrower rows (seed={seed})…")
    df = generate_dataset(n=n, seed=seed)
    print(f"Class balance — defaults: {df['defaulted'].mean():.3f}\n")

    print("Training candidate models…")
    best_name, best_pipeline, metrics = _train_and_select(df)

    print("\nTop feature importances:")
    for feature, weight in _top_features(best_pipeline):
        print(f"  {feature:<35s}  {weight:.4f}")

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model = BorrowerConfidenceModel(pipeline=best_pipeline)
    model.save(
        MODEL_PATH,
        metadata={
            "best_model": best_name,
            "metrics": metrics,
            "training_rows": int(len(df)),
            "feature_columns": FEATURE_COLUMNS,
            "model_version": BorrowerConfidenceModel.MODEL_VERSION,
        },
    )
    print(f"\nSaved model → {MODEL_PATH}")
    print(f"Saved metadata → {METADATA_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=8000, help="Synthetic dataset size")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    main(n=args.n, seed=args.seed)
