# 121.ai by LendLoop — Credibility Scoring Algorithm
**Version:** 1.0 (MLP)
**Module:** `blueprints/borrower/scoring.py`
**Max Score:** 100 points

---

## Overview

The credibility score is a **0–100 composite score** that represents a borrower's trustworthiness and financial reliability within the 121.ai platform. It is the primary signal that lenders use to evaluate borrowers.

The score is:
- Calculated at the time of assessment submission
- Recalculated on any re-submission
- Updated incrementally as platform behaviour accumulates (repayments, history)
- Displayed with a full component breakdown — never a black box

---

## Score Components

| Component | Max Points | What It Measures |
|---|---|---|
| Identity Verification | 20 | Who you are — completeness of identity proof |
| Financial Strength | 30 | Your income capacity and existing obligations |
| Credit History | 25 | Your track record with past borrowing |
| Stability | 15 | How settled you are — employment and residence |
| Platform Reputation | 10 | Your behaviour specifically on 121.ai |
| **Total** | **100** | |

---

## Component 1: Identity Verification (max 20 pts)

| Signal | Points | Logic |
|---|---|---|
| Government ID provided | +10 | ID type selected AND ID number provided AND ID expiry provided |
| Address provided | +5 | `current_address` is not empty |
| Years at address provided | +0 to +5 | If years_at_address > 0: +3. If > 2: +5 |
| Phone provided | +3 | `phone` field not empty |
| Email on file | +2 | Always (email is required for account) |

**Note:** The address sub-score replaces the simple +5 to reward stability even within identity.

---

## Component 2: Financial Strength (max 30 pts)

### Salary Band Mapping (max 15 pts)

| Salary Band | Points |
|---|---|
| Under €10,000 | 2 |
| €10,001 – €20,000 | 5 |
| €20,001 – €30,000 | 8 |
| €30,001 – €40,000 | 11 |
| €40,001 – €60,000 | 13 |
| €60,001 – €80,000 | 14 |
| Over €80,000 | 15 |

### Monthly Debt Provided (max 5 pts)
- `monthly_debt` field filled in: +5
- Not provided: 0

### Self-Reported Credit Score (max 10 pts)

| Credit Score Range | Points |
|---|---|
| Not provided | 0 |
| Below 500 | 2 |
| 500 – 599 | 5 |
| 600 – 699 | 7 |
| 700 – 749 | 9 |
| 750 and above | 10 |

**Design note:** Self-reported scores are taken at face value for MLP. Phase 2 will pull verified scores from Central Credit Register.

---

## Component 3: Credit History (max 25 pts)

This component blends platform history (repayment behaviour) with any available external credit data.

### Platform Repayment History (max 20 pts)
Queried live from the `repayments` table:

```python
on_time = COUNT(repayments WHERE borrower_id = X AND is_late = FALSE AND status = 'completed')
late    = COUNT(repayments WHERE borrower_id = X AND is_late = TRUE AND status = 'completed')
defaults = COUNT(loans WHERE borrower_id = X AND status = 'default')

# Points: 2 per on-time payment, capped at 20
platform_repayment_score = min(on_time * 2, 20)

# Penalty: defaults wipe the platform repayment score
if defaults > 0:
    platform_repayment_score = 0
```

### New User Baseline
A borrower with no loan history at all (new to platform):
- Platform repayment score defaults to **10** (not 0)
- Rationale: They are unknown, not bad. This supports financial inclusion — giving everyone a fair starting point.

### Default Penalty (max 5 pts)
- Zero defaults on record: +5
- Any default: 0

---

## Component 4: Stability (max 15 pts)

### Employment Duration (max 8 pts)

| Employment Status / Duration | Points |
|---|---|
| Unemployed | 1 |
| Student | 2 |
| Retired | 5 |
| Employed / Self-Employed, < 1 year | 3 |
| Employed / Self-Employed, 1–3 years | 5 |
| Employed / Self-Employed, 3–5 years | 7 |
| Employed / Self-Employed, > 5 years | 8 |

### Residential Stability (max 7 pts)

| Years at Current Address | Points |
|---|---|
| < 1 year | 1 |
| 1–2 years | 3 |
| > 2 years | 7 |

---

## Component 5: Platform Reputation (max 10 pts)

### Profile Completeness (max 5 pts)
Count of non-empty fields in `borrower_assessments` / total fields × 5, rounded to nearest integer.

Key fields counted: full_name, date_of_birth, phone, current_address, years_at_address, id_type, id_number, employment_status, salary_band, loan_purpose, loan_amount_needed, preferred_duration_months, reference_name.

### References Provided (max 3 pts)
- Reference name AND phone provided: +3
- Reference name only: +1
- Neither: 0

### Account Age (max 2 pts)
```python
days_since_registration = (today - user.created_at).days
account_age_score = min(days_since_registration / 30, 2)  # 1 pt per 30 days, max 2
```

---

## Score Interpretation

| Score Range | Label | Badge Colour | Meaning |
|---|---|---|---|
| 0 – 39 | Poor | Red | High risk; lenders advised caution |
| 40 – 54 | Fair | Amber | Some risk; limited history or income |
| 55 – 69 | Good | Yellow-green | Reasonable credibility |
| 70 – 84 | Strong | Green | Solid borrower; good track record |
| 85 – 100 | Excellent | Dark green | Highly trustworthy borrower |

---

## Python Implementation

```python
# blueprints/borrower/scoring.py

def calculate_credibility_score(assessment: dict, borrower_id: int, db_cursor) -> dict:
    """
    assessment: dict of form fields from borrower_assessments
    borrower_id: to query platform repayment history
    db_cursor: live DB cursor for repayment history queries
    
    Returns:
    {
        'total': int,
        'breakdown': {
            'identity': int,
            'financial': int,
            'credit_history': int,
            'stability': int,
            'reputation': int
        }
    }
    """

    # ── Component 1: Identity ──────────────────────────────
    identity = 0
    identity += 2  # email always present

    if assessment.get('phone'):
        identity += 3

    if assessment.get('id_type') and assessment.get('id_number') and assessment.get('id_expiry'):
        identity += 10

    years_at = assessment.get('years_at_address', 0) or 0
    if years_at > 2:
        identity += 5
    elif years_at > 0:
        identity += 3
    elif assessment.get('current_address'):
        identity += 0  # address present but no years — no bonus

    identity = min(identity, 20)

    # ── Component 2: Financial Strength ───────────────────
    financial = 0

    salary_band_map = {
        'Under €10,000': 2,
        '€10,001–€20,000': 5,
        '€20,001–€30,000': 8,
        '€30,001–€40,000': 11,
        '€40,001–€60,000': 13,
        '€60,001–€80,000': 14,
        'Over €80,000': 15,
    }
    financial += salary_band_map.get(assessment.get('salary_band', ''), 0)

    if assessment.get('monthly_debt') is not None:
        financial += 5

    credit_score = assessment.get('self_reported_credit_score')
    if credit_score:
        if credit_score >= 750:   financial += 10
        elif credit_score >= 700: financial += 9
        elif credit_score >= 650: financial += 7
        elif credit_score >= 600: financial += 5
        elif credit_score >= 500: financial += 2

    financial = min(financial, 30)

    # ── Component 3: Credit History ───────────────────────
    db_cursor.execute("""
        SELECT
            SUM(CASE WHEN r.is_late = 0 AND r.status = 'completed' THEN 1 ELSE 0 END) AS on_time,
            SUM(CASE WHEN r.is_late = 1 AND r.status = 'completed' THEN 1 ELSE 0 END) AS late,
            SUM(CASE WHEN l.status = 'default' THEN 1 ELSE 0 END) AS defaults
        FROM repayments r
        JOIN loans l ON r.loan_id = l.loan_id
        WHERE l.borrower_id = %s
    """, (borrower_id,))
    row = db_cursor.fetchone()
    on_time = row[0] or 0
    defaults = row[2] or 0

    if on_time == 0 and defaults == 0:
        # New user — fair baseline
        platform_repayment_score = 10
    else:
        platform_repayment_score = min(on_time * 2, 20)
        if defaults > 0:
            platform_repayment_score = 0

    default_bonus = 0 if defaults > 0 else 5
    credit_history = min(platform_repayment_score + default_bonus, 25)

    # ── Component 4: Stability ────────────────────────────
    stability = 0

    emp_status = assessment.get('employment_status', '')
    years_employed = assessment.get('years_with_employer') or assessment.get('years_in_business') or 0

    if emp_status == 'Retired':
        stability += 5
    elif emp_status == 'Student':
        stability += 2
    elif emp_status == 'Unemployed':
        stability += 1
    elif emp_status in ('Employed', 'Self-employed'):
        if years_employed > 5:   stability += 8
        elif years_employed > 3: stability += 7
        elif years_employed > 1: stability += 5
        else:                    stability += 3

    if years_at > 2:   stability += 7
    elif years_at > 1: stability += 3
    else:              stability += 1

    stability = min(stability, 15)

    # ── Component 5: Platform Reputation ─────────────────
    reputation = 0

    key_fields = [
        'full_name', 'date_of_birth', 'phone', 'current_address',
        'years_at_address', 'id_type', 'id_number', 'employment_status',
        'salary_band', 'loan_purpose', 'loan_amount_needed',
        'preferred_duration_months', 'reference_name'
    ]
    filled = sum(1 for f in key_fields if assessment.get(f))
    profile_completeness = round((filled / len(key_fields)) * 5)
    reputation += profile_completeness

    if assessment.get('reference_name') and assessment.get('reference_phone'):
        reputation += 3
    elif assessment.get('reference_name'):
        reputation += 1

    db_cursor.execute("SELECT created_at FROM users WHERE user_id = (SELECT user_id FROM borrowers WHERE borrower_id = %s)", (borrower_id,))
    user_row = db_cursor.fetchone()
    if user_row:
        from datetime import date
        days_old = (date.today() - user_row[0].date()).days
        reputation += min(days_old // 30, 2)

    reputation = min(reputation, 10)

    # ── Total ─────────────────────────────────────────────
    total = identity + financial + credit_history + stability + reputation

    return {
        'total': total,
        'breakdown': {
            'identity': identity,
            'financial': financial,
            'credit_history': credit_history,
            'stability': stability,
            'reputation': reputation
        }
    }
```

---

## Score Display Labels (for UI)

```python
def score_label(score: int) -> dict:
    if score >= 85:   return {'label': 'Excellent', 'colour': '#057A55'}
    elif score >= 70: return {'label': 'Strong',    'colour': '#03543F'}
    elif score >= 55: return {'label': 'Good',      'colour': '#8D6708'}
    elif score >= 40: return {'label': 'Fair',      'colour': '#C27803'}
    else:             return {'label': 'Poor',      'colour': '#C81E1E'}
```

---

## Future Enhancements (Phase 2+)

- Pull verified credit score from Central Credit Register (Ireland)
- Bank statement analysis (transaction pattern scoring)
- DTI calculation from real income + debt data
- Behavioural signals (login frequency, responsiveness to messages)
- Machine learning model trained on LendLoop's own repayment history
