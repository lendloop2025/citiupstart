"""Inference demo: score two contrasting borrower profiles.

    python -m features.predict_example
"""

from __future__ import annotations

import json

from features.confidence_score import BorrowerConfidenceModel


STRONG_BORROWER = {
    "identity_verified": 1,
    "has_irp_or_eu_passport": 1,
    "email_verified": 1,
    "has_2fa": 1,
    "has_student_id": 1,
    "kyc_documents_approved": 1,
    "account_age_days": 540,
    "declared_monthly_income_cents": 260_000,
    "verified_monthly_income_cents": 255_000,
    "income_verification_age_days": 30,
    "employment_status_full_time": 1,
    "employment_status_part_time": 0,
    "employment_status_student_only": 0,
    "employment_months": 28,
    "nci_semesters_completed": 5,
    "declared_monthly_expenses_cents": 130_000,
    "existing_debt_cents": 20_000,
    "has_emergency_fund": 1,
    "wallet_available_cents": 80_000,
    "requested_amount_cents": 200_000,
    "requested_term_months": 6,
    "requested_max_apr_bps": 1200,
    "loan_purpose_tuition": 1,
    "loan_purpose_emergency": 0,
    "loan_purpose_living_expenses": 0,
    "loan_purpose_laptop": 0,
    "loan_purpose_travel": 0,
    "counter_offer_rounds": 0,
    "counter_offer_amount_gap_pct": 0.0,
    "total_loans_completed": 3,
    "total_loans_active": 0,
    "on_time_payment_count": 12,
    "late_payment_count": 0,
    "avg_days_late": 0.0,
    "defaulted_loan_count": 0,
    "days_since_last_login": 2,
}


WEAK_BORROWER = {
    "identity_verified": 0,
    "has_irp_or_eu_passport": 0,
    "email_verified": 1,
    "has_2fa": 0,
    "has_student_id": 1,
    "kyc_documents_approved": 0,
    "account_age_days": 20,
    "declared_monthly_income_cents": 60_000,
    "verified_monthly_income_cents": 0,
    "income_verification_age_days": 999,
    "employment_status_full_time": 0,
    "employment_status_part_time": 0,
    "employment_status_student_only": 1,
    "employment_months": 0,
    "nci_semesters_completed": 1,
    "declared_monthly_expenses_cents": 70_000,
    "existing_debt_cents": 350_000,
    "has_emergency_fund": 0,
    "wallet_available_cents": 1_000,
    "requested_amount_cents": 500_000,
    "requested_term_months": 12,
    "requested_max_apr_bps": 2800,
    "loan_purpose_tuition": 0,
    "loan_purpose_emergency": 1,
    "loan_purpose_living_expenses": 0,
    "loan_purpose_laptop": 0,
    "loan_purpose_travel": 0,
    "counter_offer_rounds": 3,
    "counter_offer_amount_gap_pct": 0.35,
    "total_loans_completed": 1,
    "total_loans_active": 1,
    "on_time_payment_count": 2,
    "late_payment_count": 2,
    "avg_days_late": 18.0,
    "defaulted_loan_count": 1,
    "days_since_last_login": 41,
}


def main() -> None:
    model = BorrowerConfidenceModel.load()
    for label, features in [("strong", STRONG_BORROWER), ("weak", WEAK_BORROWER)]:
        result = model.predict(features)
        print(f"\n=== {label.upper()} BORROWER ===")
        print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()
