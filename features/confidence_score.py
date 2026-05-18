"""Borrower Confidence Score model.

Predicts the probability that a borrower will repay on time, then maps that
probability to a 0-100 confidence score that lenders see when browsing
borrower options.

The model is intentionally small and explainable: a gradient-boosted tree
fronted by a thin Python class that:

* loads borrower features in exactly the schema produced by
  ``features.synthetic_data.FEATURE_COLUMNS``
* returns a 0-100 score plus a per-feature contribution breakdown so the UI
  can show *why* the score is what it is
* persists to ``features/model_artifacts/confidence_model.joblib`` and
  re-hydrates from that file at inference time

Replace the synthetic training set with real repayment outcomes once enough
loans have completed — the feature contract is deliberately the same.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Mapping

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from features.synthetic_data import FEATURE_COLUMNS

ARTIFACT_DIR = Path(__file__).resolve().parent / "model_artifacts"
MODEL_PATH = ARTIFACT_DIR / "confidence_model.joblib"
METADATA_PATH = ARTIFACT_DIR / "metadata.json"


@dataclass
class ConfidenceResult:
    score: int                              # 0-100, higher = safer
    repay_probability: float                # P(repay on time)
    default_probability: float              # 1 - repay_probability
    band: str                               # "low" | "moderate" | "good" | "excellent"
    top_positive_factors: list[dict]        # features pushing score up
    top_negative_factors: list[dict]        # features pushing score down
    model_version: str

    def to_dict(self) -> dict:
        return asdict(self)


def attach_feature_directions(
    pipeline: Pipeline, X: pd.DataFrame, y: pd.Series
) -> None:
    """Stamp +1 / -1 per feature on the pipeline based on correlation with the
    *repay* target (1 = repaid on time, 0 = defaulted) so the explainer can
    say whether a feature's value is helping or hurting the borrower.
    """
    repay = 1 - y
    directions = []
    for col in X.columns:
        x = X[col].to_numpy()
        if np.std(x) == 0:
            directions.append(0.0)
            continue
        corr = float(np.corrcoef(x, repay)[0, 1])
        directions.append(np.sign(corr))
    pipeline.feature_directions_ = np.array(directions, dtype=float)
    pipeline.feature_names_in_order_ = list(X.columns)


def _band_for(score: int) -> str:
    if score >= 80:
        return "excellent"
    if score >= 65:
        return "good"
    if score >= 45:
        return "moderate"
    return "low"


class BorrowerConfidenceModel:
    """Train / load / predict wrapper around the underlying sklearn pipeline."""

    MODEL_VERSION = "ml-v1.0"

    def __init__(self, pipeline: Pipeline | None = None):
        self.pipeline = pipeline
        self.feature_columns = FEATURE_COLUMNS

    # ---------- training ----------------------------------------------------

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "BorrowerConfidenceModel":
        if list(X.columns) != FEATURE_COLUMNS:
            raise ValueError(
                "Training data columns must match FEATURE_COLUMNS exactly."
            )
        self.pipeline = Pipeline(
            steps=[
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
        )
        self.pipeline.fit(X, y)
        attach_feature_directions(self.pipeline, X, y)
        return self

    # ---------- persistence -------------------------------------------------

    def save(self, path: Path = MODEL_PATH, metadata: Mapping | None = None) -> None:
        if self.pipeline is None:
            raise RuntimeError("Cannot save an untrained model.")
        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.pipeline, path)
        if metadata is not None:
            METADATA_PATH.write_text(json.dumps(dict(metadata), indent=2))

    @classmethod
    def load(cls, path: Path = MODEL_PATH) -> "BorrowerConfidenceModel":
        if not path.exists():
            raise FileNotFoundError(
                f"No trained model at {path}. Run `python -m features.train_model` first."
            )
        return cls(pipeline=joblib.load(path))

    # ---------- inference ---------------------------------------------------

    def predict(self, features: Mapping[str, float]) -> ConfidenceResult:
        if self.pipeline is None:
            raise RuntimeError("Model is not trained or loaded.")
        row = self._row_from_features(features)
        default_prob = float(self.pipeline.predict_proba(row)[0, 1])
        repay_prob = 1.0 - default_prob
        score = int(round(repay_prob * 100))
        positive, negative = self._explain(row, features)
        return ConfidenceResult(
            score=score,
            repay_probability=repay_prob,
            default_probability=default_prob,
            band=_band_for(score),
            top_positive_factors=positive,
            top_negative_factors=negative,
            model_version=self.MODEL_VERSION,
        )

    def predict_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        if self.pipeline is None:
            raise RuntimeError("Model is not trained or loaded.")
        missing = set(FEATURE_COLUMNS) - set(df.columns)
        if missing:
            raise ValueError(f"Missing feature columns: {sorted(missing)}")
        default_probs = self.pipeline.predict_proba(df[FEATURE_COLUMNS])[:, 1]
        repay_probs = 1.0 - default_probs
        scores = np.round(repay_probs * 100).astype(int)
        return pd.DataFrame(
            {
                "confidence_score": scores,
                "repay_probability": repay_probs,
                "default_probability": default_probs,
                "band": [_band_for(int(s)) for s in scores],
            }
        )

    # ---------- internals ---------------------------------------------------

    def _row_from_features(self, features: Mapping[str, float]) -> pd.DataFrame:
        missing = [c for c in FEATURE_COLUMNS if c not in features]
        if missing:
            raise ValueError(f"Missing feature(s): {missing}")
        values = [[features[c] for c in FEATURE_COLUMNS]]
        return pd.DataFrame(values, columns=FEATURE_COLUMNS)

    def _explain(
        self, row: pd.DataFrame, raw_features: Mapping[str, float]
    ) -> tuple[list[dict], list[dict]]:
        """Signed feature contributions: feature_importance × scaled_value × direction.

        ``direction`` is +1 if higher values of the feature correlate with
        on-time repayment and -1 if they correlate with default — set at
        ``fit`` time via ``attach_feature_directions``. Not a SHAP value,
        but enough signal for a lender-facing "why this score" panel.
        """
        scaler: StandardScaler = self.pipeline.named_steps["scaler"]
        clf = self.pipeline.steps[-1][1]
        scaled = scaler.transform(row)[0]
        if hasattr(clf, "feature_importances_"):
            magnitudes = clf.feature_importances_
        elif hasattr(clf, "coef_"):
            magnitudes = np.abs(clf.coef_[0])
        else:
            magnitudes = np.zeros_like(scaled)
        directions = getattr(self.pipeline, "feature_directions_", np.ones_like(scaled))
        contributions = magnitudes * scaled * directions

        order = np.argsort(contributions)
        bottom = order[:5]
        top = order[-5:][::-1]
        positives = [
            self._factor_entry(i, raw_features, contributions[i], "positive")
            for i in top
            if contributions[i] > 0
        ]
        negatives = [
            self._factor_entry(i, raw_features, contributions[i], "negative")
            for i in bottom
            if contributions[i] < 0
        ]
        return positives, negatives

    def _factor_entry(
        self,
        idx: int,
        raw_features: Mapping[str, float],
        contribution: float,
        direction: str,
    ) -> dict:
        feature = FEATURE_COLUMNS[idx]
        return {
            "feature": feature,
            "value": raw_features.get(feature),
            "direction": direction,
            "weight": float(abs(contribution)),
        }
