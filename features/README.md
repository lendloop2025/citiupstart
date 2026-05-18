# Borrower Confidence Score

ML model that predicts the probability a borrower repays a loan on time and maps it to a 0-100 confidence score shown to lenders when they browse borrower options.

## Files

| File | Purpose |
| --- | --- |
| `synthetic_data.py` | Generates a labelled training dataset whose feature schema mirrors the supabase tables (users, borrower_assessments, loan_requests, loan_offers, repayments). |
| `confidence_score.py` | `BorrowerConfidenceModel` class — `fit`, `predict`, `predict_batch`, `save`, `load`, plus signed feature-contribution explanations. |
| `train_model.py` | CLI: trains LogReg / RandomForest / GradientBoosting on the dataset, picks the best by ROC-AUC, persists the winner. |
| `predict_example.py` | Scores two contrasting borrower profiles end-to-end. |
| `model_artifacts/` | Output: `confidence_model.joblib`, `metadata.json` (metrics + feature list). |

## Train

```bash
python -m features.train_model
# optional: --n 20000 --seed 7
```

Current baseline on 8 000 synthetic rows: **ROC-AUC ≈ 0.84**, accuracy ≈ 0.82, Brier ≈ 0.13. Gradient boosting wins.

## Predict

```python
from features.confidence_score import BorrowerConfidenceModel

model = BorrowerConfidenceModel.load()
result = model.predict({
    "identity_verified": 1,
    "has_irp_or_eu_passport": 1,
    # ...all 36 features in FEATURE_COLUMNS
})
print(result.score)            # 0–100
print(result.band)             # low | moderate | good | excellent
print(result.top_negative_factors)
```

`predict_batch(df)` returns a DataFrame for scoring every open loan_request at once.

## Features the model uses

Grouped by category — the names match the column names you'd pull from supabase, so the same dict can be assembled from a `users + borrower_assessments + loan_requests + wallets + repayments` join.

- **Identity / KYC**: `identity_verified`, `has_irp_or_eu_passport`, `email_verified`, `has_2fa`, `has_student_id`, `kyc_documents_approved`, `account_age_days`.
- **Income & employment**: `declared_monthly_income_cents`, `verified_monthly_income_cents`, `income_verification_age_days`, `employment_status_*` (one-hot of `full_time` / `part_time` / `student_only`), `employment_months`, `nci_semesters_completed`.
- **Financial health**: `declared_monthly_expenses_cents`, `existing_debt_cents`, `has_emergency_fund`, `wallet_available_cents`.
- **Requested loan**: `requested_amount_cents`, `requested_term_months`, `requested_max_apr_bps`, `loan_purpose_*` (one-hot of tuition / emergency / living_expenses / laptop / travel).
- **Counter-offer behaviour**: `counter_offer_rounds`, `counter_offer_amount_gap_pct`.
- **Repayment history**: `total_loans_completed`, `total_loans_active`, `on_time_payment_count`, `late_payment_count`, `avg_days_late`, `defaulted_loan_count`.
- **Engagement**: `days_since_last_login`.

Full ordered list lives in `synthetic_data.FEATURE_COLUMNS`.

## Wiring into the Next.js lender-browse view

The production app is TypeScript and does **not** import Python. Two practical options:

1. **Batch scoring (recommended for v1)** — run `BorrowerConfidenceModel.predict_batch` periodically (cron / nightly) over every open `loan_request`, write the score and breakdown into `loan_requests.score_at_request` / `score_breakdown_at_request` (those columns already exist). The Next.js browse view reads them as plain columns. Zero runtime coupling.

2. **Inline FastAPI microservice** — wrap `predict()` in a tiny FastAPI app, call it from a Next.js route handler (`app/api/borrowers/[id]/confidence/route.ts`). Add a 5–10 minute Redis/edge cache keyed on borrower id + loan_request id so a hot browse view doesn't hammer the service.

In either path, treat the existing deterministic `lib/scoring/score.ts` as the trust-and-safety floor (KYC, income verification) and the ML confidence score as a separate "repayment likelihood" badge — they answer different questions and should be displayed side by side, not collapsed into one number.

## Retraining on real data

Replace `generate_dataset()` with a function that selects the same columns from supabase for every closed loan (`loans.status in ('paid_off', 'in_default', 'written_off')`), using `defaulted = (status != 'paid_off')` as the label. Everything downstream stays the same — `train_model.py` will pick the strongest model and overwrite the artifact.
