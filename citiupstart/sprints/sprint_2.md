# Sprint 2 — Core Features
**Dates:** April 30 – May 6, 2026
**Theme:** Both sides of the marketplace have their primary action
**Status:** PLANNED
**Depends On:** Sprint 1 complete (auth, DB, dashboards working)

---

## Sprint Goal

By end of Sprint 2:
- A borrower can complete their credibility assessment and receive a real score
- A borrower can post a loan request visible to lenders in their community
- A lender can deposit funds and browse real, scored borrowers
- Zero hardcoded/sample data anywhere in the app

---

## User Stories

- As a borrower, I want to fill in my credibility assessment so the platform can evaluate my eligibility
- As a borrower, I want to see my credibility score with a clear breakdown of how it was calculated
- As a borrower, I want to post a loan request with my purpose, amount, and preferred duration
- As a lender, I want to deposit funds into my account so I have capital ready to lend
- As a lender, I want to browse verified borrowers in my community with their credibility scores visible
- As a lender, I want to view a borrower's full profile and loan request before making an offer

---

## Tasks

### S2-01 — Borrower Credibility Assessment Form
**Priority:** Critical

Route: `GET/POST /borrower/assessment`

Form sections:
1. **Personal Information** — full name, DOB, email, phone, current address, years at address
2. **Government ID** — ID type (dropdown: Passport / Driver's Licence / National ID), ID number, ID expiry
3. **Employment & Income** — employment status (dropdown), conditional fields:
   - If Employed: company name, job title, years with employer
   - If Self-Employed: business name, years in business
   - Salary band (dropdown: ranges, not raw numbers — e.g., "€20,000–€30,000", "€30,001–€40,000")
4. **Financial Information** — monthly debt obligations, credit score (optional self-reported)
5. **Loan Intent** — loan purpose, loan amount needed, preferred repayment duration (months)
6. **References** — one personal reference (name, relationship, phone)

JS: show/hide employment-specific fields based on status selection.

**Acceptance:** Form submits, all data stored in `borrower_assessments` linked to the logged-in borrower.

---

### S2-02 — Credibility Scoring Algorithm
**Priority:** Critical

Implemented in a dedicated module: `blueprints/borrower/scoring.py`

**Scoring formula (100 points total):**

```python
def calculate_credibility_score(assessment: dict) -> dict:
    """
    Returns: {
        'total': int,
        'breakdown': {
            'identity': int,        # max 20
            'financial': int,       # max 30
            'credit_history': int,  # max 25
            'stability': int,       # max 15
            'reputation': int       # max 10
        }
    }
    """
```

**Identity (20 pts):**
- Gov ID provided: +10
- Address verified (years_at_address > 0): +5
- Phone provided: +3
- Email on record: +2

**Financial Strength (30 pts):**
- Salary band mapping:
  - < €20k: 4 pts | €20–30k: 7 pts | €30–40k: 10 pts | €40–60k: 13 pts | > €60k: 15 pts
- Monthly debt provided: +5 (existence only; DTI calc in Phase 2)
- Credit score provided (self-reported): +10 (scaled: <500=2, 500–600=5, 600–700=8, >700=10)

**Credit History (25 pts):**
- Platform repayment history (from `repayments` table): on_time_count × 2, capped at 20
- Zero defaults: +5 | Any default: 0
- New users with no history start at 10 (not 0 — give everyone a fair start)

**Stability (15 pts):**
- Employment years: <1yr=2, 1–3yr=5, 3–5yr=8, >5yr=10
- Residential years: <1yr=1, 1–2yr=3, >2yr=5

**Platform Reputation (10 pts):**
- Profile completeness (fields filled / total fields × 10), capped at 6
- References provided: +2
- Account age (days / 30), capped at 2

**Acceptance:** Algorithm produces a deterministic score; breakdown is stored alongside total in DB.

---

### S2-03 — Store Assessment + Score in DB
**Priority:** Critical

On form submission:
1. Write full assessment to `borrower_assessments`
2. Call `calculate_credibility_score()` with assessment data
3. Update `borrowers` table: `credibility_score`, `identity_verification_score`, `financial_strength_score`, `credit_history_score`, `stability_score`, `platform_reputation_score`
4. If borrower already has an assessment, UPDATE (not INSERT duplicate)

**Acceptance:** Score in `borrowers` table matches breakdown sum; re-submitting updates, not duplicates.

---

### S2-04 — Borrower Assessment View Page
**Priority:** High

Route: `GET /borrower/assessment/view`

Display:
- Large score badge (0–100, colour-coded: red < 40, amber 40–69, green ≥ 70)
- Score breakdown: 5 component bars with labels and points earned/max
- Key assessment data (employment status, salary band, loan purpose)
- "Update Assessment" button → back to form
- "Post a Loan Request" CTA if score ≥ minimum threshold

---

### S2-05 — Borrower: Post Loan Request
**Priority:** Critical

Route: `GET/POST /borrower/request/new`

Fields:
- Amount (numeric input with min/max)
- Purpose (dropdown: Business, Education, Medical, Home Improvement, Other)
- Preferred duration in months (dropdown: 3, 6, 12, 18, 24)
- Receive method (bank transfer / platform wallet)
- Additional notes (optional, 500 char max)

Logic:
- Only allow if borrower has a credibility score on record
- Write to `loan_requests` with status = 'active', linked to borrower and community
- Redirect to borrower dashboard with success flash

**Acceptance:** Request visible in DB; borrower dashboard shows it as active; lender listing reflects it.

---

### S2-06 — Lender: Deposit Funds
**Priority:** Critical

Route: `GET/POST /lender/deposit`

Fields:
- Amount
- Payment method (bank transfer / card) — simulated for MLP, no real gateway

Logic:
- Write to `transactions` (type = 'deposit')
- Update `lenders.available_balance` and `lenders.total_deposited`
- Flash success with updated balance shown

**Acceptance:** Balance in `lenders` table increases; transaction record created; dashboard reflects new balance.

---

### S2-07 — Borrowers Listing for Lenders
**Priority:** Critical

Route: `GET /lender/borrowers`

Query: all active `loan_requests` WHERE `community_id` = lender's community AND status = 'active'

Display per card:
- Borrower name + avatar initial
- Credibility score badge (colour-coded)
- Loan amount requested
- Loan purpose
- Preferred duration
- "View Profile" button

Filtering (basic): by loan amount range, by score range, by purpose.

**Acceptance:** Only borrowers from same community appear; all data from DB; no sample data.

---

### S2-08 — Lenders Listing for Borrowers
**Priority:** High

Route: `GET /borrower/lenders`

Query: all lenders WHERE `community_id` = borrower's community AND `available_balance` > 0

Display per card:
- Lender name + avatar initial
- Available balance (rounded to nearest €100 for privacy)
- Total loans given
- "View" button

---

### S2-09 — Borrower Profile Page (for Lender)
**Priority:** High

Route: `GET /lender/borrower/<borrower_id>`

Display:
- Credibility score (large, colour-coded)
- Score breakdown (5 components)
- Employment info (status, salary band, years)
- Loan request details (amount, purpose, duration)
- Loan history (on-time payments, any defaults)
- "Make an Offer" button → Sprint 3

---

### S2-10 — Lender Account Page
**Priority:** Medium

Route: `GET /lender/account`

Display real DB values:
- Available balance
- Total deposited
- Total lent
- Interest earned (calculated from repayments)
- Active loans count
- Completed loans count

---

## Definition of Done — Sprint 2

- [ ] Borrower can complete assessment and see their score with breakdown
- [ ] Score is stored in DB and updates on re-submission
- [ ] Borrower can post a loan request
- [ ] Lender can deposit funds (simulated)
- [ ] Lender sees community-filtered borrowers with real scores
- [ ] Borrower sees community-filtered lenders with real balances
- [ ] Zero hardcoded data on any listing or dashboard page
