"""Synthetic borrower dataset for training the confidence-score model.

Real labelled repayment history does not yet exist on the platform, so the
training corpus is sampled from feature distributions that mirror the supabase
schema (users, borrower_assessments, loan_requests, loan_offers, repayments).
Each row carries a "defaulted" label produced by a hidden ground-truth function
that combines income surplus, repayment track record, KYC completeness,
employment stability, negotiation behaviour and a small amount of noise so
the model has a non-trivial signal to learn.

The intent is that as soon as live repayments accumulate the same `build_row`
schema can be populated from supabase rows and used to retrain — feature
names are kept identical to the production columns.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "identity_verified",
    "has_irp_or_eu_passport",
    "email_verified",
    "has_2fa",
    "has_student_id",
    "kyc_documents_approved",
    "account_age_days",
    "declared_monthly_income_cents",
    "verified_monthly_income_cents",
    "income_verification_age_days",
    "employment_status_full_time",
    "employment_status_part_time",
    "employment_status_student_only",
    "employment_months",
    "nci_semesters_completed",
    "declared_monthly_expenses_cents",
    "existing_debt_cents",
    "has_emergency_fund",
    "wallet_available_cents",
    "requested_amount_cents",
    "requested_term_months",
    "requested_max_apr_bps",
    "loan_purpose_tuition",
    "loan_purpose_emergency",
    "loan_purpose_living_expenses",
    "loan_purpose_laptop",
    "loan_purpose_travel",
    "counter_offer_rounds",
    "counter_offer_amount_gap_pct",
    "total_loans_completed",
    "total_loans_active",
    "on_time_payment_count",
    "late_payment_count",
    "avg_days_late",
    "defaulted_loan_count",
    "days_since_last_login",
]


def _bernoulli(rng: np.random.Generator, p: float) -> int:
    return int(rng.random() < p)


def _sample_row(rng: np.random.Generator) -> dict:
    identity_verified = _bernoulli(rng, 0.78)
    has_irp_or_eu_passport = _bernoulli(rng, 0.85) if identity_verified else _bernoulli(rng, 0.55)
    email_verified = _bernoulli(rng, 0.95)
    has_2fa = _bernoulli(rng, 0.42)
    has_student_id = _bernoulli(rng, 0.88)
    kyc_documents_approved = _bernoulli(rng, 0.7 if identity_verified else 0.05)
    account_age_days = int(rng.gamma(shape=2.0, scale=70))

    declared_monthly_income_cents = int(np.clip(rng.normal(loc=120000, scale=55000), 0, 600000))
    income_verified_flag = _bernoulli(rng, 0.55)
    verified_monthly_income_cents = (
        int(declared_monthly_income_cents * rng.uniform(0.85, 1.05))
        if income_verified_flag
        else 0
    )
    income_verification_age_days = int(rng.gamma(2.0, 60)) if income_verified_flag else 999

    emp_roll = rng.random()
    if emp_roll < 0.35:
        emp = "full_time"
    elif emp_roll < 0.75:
        emp = "part_time"
    else:
        emp = "student_only"
    employment_months = int(np.clip(rng.gamma(2.0, 8.0), 0, 120)) if emp != "student_only" else 0
    nci_semesters_completed = int(np.clip(rng.normal(3.5, 1.5), 0, 8))

    declared_monthly_expenses_cents = int(
        np.clip(declared_monthly_income_cents * rng.uniform(0.45, 1.15), 30000, 500000)
    )
    existing_debt_cents = int(np.clip(rng.exponential(scale=80000), 0, 1_500_000))
    has_emergency_fund = _bernoulli(rng, 0.32)
    wallet_available_cents = int(np.clip(rng.exponential(scale=25000), 0, 800_000))

    requested_amount_cents = int(np.clip(rng.lognormal(mean=12.4, sigma=0.5), 50_000, 1_500_000))
    requested_term_months = int(rng.integers(1, 13))
    requested_max_apr_bps = int(np.clip(rng.normal(1500, 400), 200, 3500))

    purpose = rng.choice(
        ["tuition_topup", "laptop_equipment", "emergency", "living_expenses", "travel_home", "other"],
        p=[0.22, 0.14, 0.18, 0.28, 0.10, 0.08],
    )
    counter_offer_rounds = int(rng.poisson(0.6))
    counter_offer_amount_gap_pct = float(np.clip(rng.normal(0.08, 0.06) if counter_offer_rounds else 0.0, 0.0, 0.6))

    total_loans_completed = int(rng.poisson(1.1))
    total_loans_active = int(rng.binomial(2, 0.25))
    on_time_payment_count = int(rng.binomial(max(total_loans_completed * 4, 1), 0.85))
    late_payment_count = max(0, total_loans_completed * 4 - on_time_payment_count) if total_loans_completed else 0
    avg_days_late = float(np.clip(rng.exponential(scale=4.0) if late_payment_count else 0.0, 0.0, 90.0))
    defaulted_loan_count = int(rng.binomial(total_loans_completed, 0.05)) if total_loans_completed else 0
    days_since_last_login = int(np.clip(rng.exponential(scale=8.0), 0, 365))

    return {
        "identity_verified": identity_verified,
        "has_irp_or_eu_passport": has_irp_or_eu_passport,
        "email_verified": email_verified,
        "has_2fa": has_2fa,
        "has_student_id": has_student_id,
        "kyc_documents_approved": kyc_documents_approved,
        "account_age_days": account_age_days,
        "declared_monthly_income_cents": declared_monthly_income_cents,
        "verified_monthly_income_cents": verified_monthly_income_cents,
        "income_verification_age_days": income_verification_age_days,
        "employment_status_full_time": int(emp == "full_time"),
        "employment_status_part_time": int(emp == "part_time"),
        "employment_status_student_only": int(emp == "student_only"),
        "employment_months": employment_months,
        "nci_semesters_completed": nci_semesters_completed,
        "declared_monthly_expenses_cents": declared_monthly_expenses_cents,
        "existing_debt_cents": existing_debt_cents,
        "has_emergency_fund": has_emergency_fund,
        "wallet_available_cents": wallet_available_cents,
        "requested_amount_cents": requested_amount_cents,
        "requested_term_months": requested_term_months,
        "requested_max_apr_bps": requested_max_apr_bps,
        "loan_purpose_tuition": int(purpose == "tuition_topup"),
        "loan_purpose_emergency": int(purpose == "emergency"),
        "loan_purpose_living_expenses": int(purpose == "living_expenses"),
        "loan_purpose_laptop": int(purpose == "laptop_equipment"),
        "loan_purpose_travel": int(purpose == "travel_home"),
        "counter_offer_rounds": counter_offer_rounds,
        "counter_offer_amount_gap_pct": counter_offer_amount_gap_pct,
        "total_loans_completed": total_loans_completed,
        "total_loans_active": total_loans_active,
        "on_time_payment_count": on_time_payment_count,
        "late_payment_count": late_payment_count,
        "avg_days_late": avg_days_late,
        "defaulted_loan_count": defaulted_loan_count,
        "days_since_last_login": days_since_last_login,
    }


def _ground_truth_default_probability(row: dict) -> float:
    """Hidden ground-truth that the model must learn.

    Combines repayment surplus, KYC trust, repayment history, employment
    stability, negotiation friction and a few noise terms. Returns the
    probability that this borrower defaults on their next loan.
    """
    income = max(row["declared_monthly_income_cents"], 1)
    surplus_ratio = (income - row["declared_monthly_expenses_cents"]) / income
    dti = row["existing_debt_cents"] / income
    repayment_total = row["on_time_payment_count"] + row["late_payment_count"]
    on_time_ratio = row["on_time_payment_count"] / repayment_total if repayment_total else 0.85
    monthly_repay_burden = (row["requested_amount_cents"] / max(row["requested_term_months"], 1)) / income

    z = (
        -1.4
        - 1.6 * surplus_ratio
        + 1.2 * dti
        - 1.8 * on_time_ratio
        + 0.9 * row["defaulted_loan_count"]
        + 0.45 * (1 - row["identity_verified"])
        + 0.35 * (1 - row["kyc_documents_approved"])
        + 0.30 * (1 - row["has_irp_or_eu_passport"])
        - 0.30 * row["has_emergency_fund"]
        + 1.4 * monthly_repay_burden
        + 0.020 * row["avg_days_late"]
        - 0.18 * row["employment_status_full_time"]
        + 0.22 * row["employment_status_student_only"]
        - 0.05 * np.tanh(row["account_age_days"] / 120.0)
        + 0.4 * row["counter_offer_amount_gap_pct"]
        + 0.015 * row["counter_offer_rounds"]
        - 0.04 * min(row["nci_semesters_completed"], 6)
        + 0.012 * (row["days_since_last_login"] / 30.0)
    )
    return 1.0 / (1.0 + np.exp(-z))


def generate_dataset(n: int = 8000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = [_sample_row(rng) for _ in range(n)]
    df = pd.DataFrame(rows)
    probs = df.apply(_ground_truth_default_probability, axis=1).to_numpy()
    noise = rng.normal(0, 0.04, size=n)
    final = np.clip(probs + noise, 0.0, 1.0)
    df["defaulted"] = (rng.random(size=n) < final).astype(int)
    return df[FEATURE_COLUMNS + ["defaulted"]]


if __name__ == "__main__":
    sample = generate_dataset(n=200)
    print(sample.head())
    print("Default rate:", sample["defaulted"].mean())
