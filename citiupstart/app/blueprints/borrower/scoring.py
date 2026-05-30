from datetime import date
from utils.db import query


SALARY_BAND_POINTS = {
    'Under €10,000': 2,
    '€10,001–€20,000': 5,
    '€20,001–€30,000': 8,
    '€30,001–€40,000': 11,
    '€40,001–€60,000': 13,
    '€60,001–€80,000': 14,
    'Over €80,000': 15,
}


def calculate_credibility_score(assessment: dict, borrower_id: int) -> dict:
    """
    Pure scoring function — no side effects, no DB writes.
    assessment: dict of form fields
    borrower_id: used for live credit history lookup
    Returns: {'total': int, 'breakdown': {identity, financial, credit_history, stability, reputation}}
    """

    years_at = int(assessment.get('years_at_address') or 0)

    # ── Component 1: Identity Verification (max 20) ────────
    identity = 2  # email always present (account requires it)
    if assessment.get('phone'):
        identity += 3
    if assessment.get('id_type') and assessment.get('id_number') and assessment.get('id_expiry'):
        identity += 10
    if years_at > 2:
        identity += 5
    elif years_at > 0:
        identity += 3
    identity = min(identity, 20)

    # ── Component 2: Financial Strength (max 30) ──────────
    financial = 0
    financial += SALARY_BAND_POINTS.get(assessment.get('salary_band', ''), 0)
    if assessment.get('monthly_debt') is not None:
        financial += 5
    cs = assessment.get('self_reported_credit_score')
    if cs:
        try:
            cs = int(cs)
            if cs >= 750:    financial += 10
            elif cs >= 700:  financial += 9
            elif cs >= 650:  financial += 7
            elif cs >= 600:  financial += 5
            elif cs >= 500:  financial += 2
        except (ValueError, TypeError):
            pass
    financial = min(financial, 30)

    # ── Component 3: Credit History (max 25) ──────────────
    history = query("""
        SELECT
            COALESCE(SUM(CASE WHEN r.is_late = 0 AND r.status = 'completed' THEN 1 ELSE 0 END), 0) AS on_time,
            COALESCE(SUM(CASE WHEN l.status = 'default' THEN 1 ELSE 0 END), 0) AS defaults
        FROM repayments r
        JOIN loans l ON r.loan_id = l.loan_id
        WHERE l.borrower_id = %s
    """, (borrower_id,), one=True)

    on_time  = int(history['on_time']  or 0)
    defaults = int(history['defaults'] or 0)

    if on_time == 0 and defaults == 0:
        platform_score = 10          # new user baseline: unknown ≠ bad
    else:
        platform_score = min(on_time * 2, 20)
        if defaults > 0:
            platform_score = 0

    default_bonus = 0 if defaults > 0 else 5
    credit_history = min(platform_score + default_bonus, 25)

    # ── Component 4: Stability (max 15) ───────────────────
    stability = 0
    emp_status  = assessment.get('employment_status', '')
    years_emp   = int(assessment.get('years_with_employer') or
                      assessment.get('years_in_business') or 0)

    if emp_status == 'Retired':
        stability += 5
    elif emp_status == 'Student':
        stability += 2
    elif emp_status == 'Unemployed':
        stability += 1
    elif emp_status in ('Employed', 'Self-employed'):
        if years_emp > 5:    stability += 8
        elif years_emp > 3:  stability += 7
        elif years_emp > 1:  stability += 5
        else:                stability += 3

    if years_at > 2:    stability += 7
    elif years_at > 1:  stability += 3
    else:               stability += 1
    stability = min(stability, 15)

    # ── Component 5: Platform Reputation (max 10) ─────────
    reputation = 0
    key_fields = [
        'full_name', 'date_of_birth', 'phone', 'current_address',
        'years_at_address', 'id_type', 'id_number', 'employment_status',
        'salary_band', 'loan_purpose', 'loan_amount_needed',
        'preferred_duration_months', 'reference_name',
    ]
    filled = sum(1 for f in key_fields if assessment.get(f))
    reputation += round((filled / len(key_fields)) * 5)

    if assessment.get('reference_name') and assessment.get('reference_phone'):
        reputation += 3
    elif assessment.get('reference_name'):
        reputation += 1

    user_row = query(
        """SELECT u.created_at FROM users u
           JOIN borrowers b ON b.user_id = u.user_id
           WHERE b.borrower_id = %s""",
        (borrower_id,), one=True
    )
    if user_row:
        days_old = (date.today() - user_row['created_at'].date()).days
        reputation += min(days_old // 30, 2)

    reputation = min(reputation, 10)

    total = identity + financial + credit_history + stability + reputation

    return {
        'total': total,
        'breakdown': {
            'identity':       identity,
            'financial':      financial,
            'credit_history': credit_history,
            'stability':      stability,
            'reputation':     reputation,
        }
    }


def score_label(score: int) -> dict:
    if score >= 85:    return {'label': 'Excellent', 'css': 'green'}
    elif score >= 70:  return {'label': 'Strong',    'css': 'green'}
    elif score >= 55:  return {'label': 'Good',      'css': 'amber'}
    elif score >= 40:  return {'label': 'Fair',      'css': 'amber'}
    else:              return {'label': 'Poor',       'css': 'red'}
