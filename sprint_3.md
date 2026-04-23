# Sprint 3 — Matching & Loan Flow
**Dates:** May 7 – May 13, 2026
**Theme:** The full loan lifecycle works end-to-end
**Status:** PLANNED
**Depends On:** Sprint 2 complete (assessment, loan requests, lender deposits live)

---

## Sprint Goal

By end of Sprint 3, the complete loan journey works:
- A lender finds a matched borrower and makes an offer
- The borrower reviews and accepts the offer
- A loan is created, funds move, a repayment schedule is generated
- A repayment can be made and balances update on both sides
- Transaction history shows real events

This sprint delivers the **core financial engine** of 121.ai.

---

## User Stories

- As a lender, I want to make an offer on a borrower's loan request with my proposed terms
- As a borrower, I want to review offers I've received and accept or reject them
- As a borrower, I want to see my loan agreement clearly before confirming
- As a borrower, I want to make a repayment and see my remaining balance reduce
- As a lender, I want to see repayments coming in and my balance credited
- As both, I want a complete transaction history showing every financial event

---

## Tasks

### S3-01 — Matching Algorithm
**Priority:** Critical

Module: `blueprints/core/matching.py`

```python
def get_matched_lenders(borrower_id: int) -> list[dict]:
    """
    Returns lenders in the same community who:
    - Have available_balance >= loan_request.amount
    - Have not already made an offer on this request
    Sorted by: available_balance DESC (most willing at top)
    """

def get_matched_borrowers(lender_id: int) -> list[dict]:
    """
    Returns active loan_requests in the same community
    Optionally filtered by credibility threshold (configurable, default: score >= 30)
    Sorted by: credibility_score DESC
    """
```

Community-scoping enforced at query level — a lender in community A never sees borrowers from community B.

**Acceptance:** Lender only sees borrowers from their community; lender with €500 balance does not appear for a borrower requesting €1000.

---

### S3-02 — Lender Makes an Offer
**Priority:** Critical

Route: `GET/POST /lender/offer/new/<request_id>`

Pre-filled from the loan request: amount, purpose, duration

Lender inputs:
- Offered amount (can be less than requested — partial funding)
- Interest rate (input or range selector)
- Duration in months
- Optional message to borrower

Logic:
- Validate lender has sufficient available balance
- Write to `loan_offers`: status = 'pending'
- Create notification for borrower: "You have a new offer"
- Redirect to lender dashboard with success flash

**Acceptance:** Offer in DB linked to correct request and lender; borrower notified; lender cannot offer more than their balance.

---

### S3-03 — Borrower Views Received Offers
**Priority:** Critical

Route: `GET /borrower/offers`

Query: all `loan_offers` WHERE `request_id` IN (borrower's active requests) AND status = 'pending'

Display per offer card:
- Lender name + score/rating
- Offered amount
- Proposed interest rate
- Duration
- Calculated monthly payment (shown clearly)
- Lender's message (if any)
- "Accept" and "Reject" buttons

---

### S3-04 — Borrower Accepts or Rejects an Offer
**Priority:** Critical

Route: `POST /borrower/offer/<offer_id>/accept`
Route: `POST /borrower/offer/<offer_id>/reject`

**On Accept:**
1. Update `loan_offers` status → 'accepted'
2. Update all other pending offers on same request → 'expired'
3. Update `loan_requests` status → 'accepted'
4. Create `loans` record with full terms
5. Trigger simulated disbursement (S3-06)
6. Notify lender: "Your offer was accepted"

**On Reject:**
1. Update `loan_offers` status → 'rejected'
2. Notify lender: "Your offer was not accepted"

**Acceptance:** Only one offer can be accepted per request; all others close; loan record appears in `loans` table.

---

### S3-05 — Loan Agreement View
**Priority:** High

Route: `GET /loan/<loan_id>/agreement`

Accessible to both lender and borrower of that loan (verify ownership).

Display:
- Borrower details (name, community)
- Lender details (name, community)
- Principal amount
- Interest rate (% per annum)
- Duration (months)
- Monthly payment amount
- Total repayable amount
- Start date / End date
- Repayment schedule table (month 1 through N)
- Loan status badge

---

### S3-06 — Simulated Disbursement
**Priority:** High

Triggered automatically on offer acceptance:
1. Deduct `principal_amount` from `lenders.available_balance`, add to `lenders.total_lent`
2. Update `loans.disbursement_status` → 'completed', set `disbursed_at`
3. Update `loans.status` → 'active'
4. Write a `transactions` record: type = 'loan_disbursement', from lender to borrower
5. Update `borrowers.total_borrowed`, `borrowers.active_loans`

**Acceptance:** Lender balance decreases by principal; loan status is active; transaction record exists.

---

### S3-07 — Repayment Schedule Generation
**Priority:** High

Called on loan creation. Module: `blueprints/core/finance.py`

```python
def generate_repayment_schedule(principal, annual_rate, duration_months, start_date):
    """
    Returns list of {due_date, amount, principal_part, interest_part}
    Uses flat-rate interest for simplicity in MLP
    """
```

Writes each instalment to `repayments` table with status = 'pending' and correct `due_date`.

**Acceptance:** `repayments` table has N rows for an N-month loan; amounts sum to total_repayable.

---

### S3-08 — Make a Repayment
**Priority:** High

Route: `POST /borrower/repayment/<loan_id>`

Logic:
1. Find next pending repayment for this loan
2. Mark it as 'completed', set `payment_date = now()`
3. Update `loans.amount_paid`, `loans.amount_remaining`
4. Credit lender: add repayment amount to `lenders.available_balance`, add interest_part to `lenders.total_earned_interest`
5. Write `transactions` record for the repayment
6. Calculate platform cut (15% of interest_part) — record it (display only for MLP, no actual transfer)
7. Check if all repayments complete → update `loans.status` = 'completed'
8. Update `borrowers.on_time_payments` or `borrowers.late_payments` based on timing vs due_date
9. Notify lender: "Repayment received"

**Acceptance:** Both balances update; payment marked complete; next due date shown to borrower; late flag set if past due.

---

### S3-09 — Transaction History Pages
**Priority:** High

Route: `GET /lender/transactions` and `GET /borrower/transactions`

Query `transactions` table filtered by user_id, ordered by created_at DESC.

Display: date, type (deposit / disbursement / repayment / interest), amount, counterparty, running balance.

---

### S3-10 — Loan Status Tracking
**Priority:** Medium

Background logic (called on each page load for active loans):

```python
def update_loan_status(loan_id: int):
    """
    Check overdue repayments and update loan status:
    - 0 days overdue: 'active'
    - 1–30 days: 'delinquent_30'
    - 31–60 days: 'delinquent_60'
    - > 60 days: 'default'
    """
```

Borrower dashboard shows warning banner if loan is delinquent.

---

### S3-11 — Lender Returns Page
**Priority:** Medium

Route: `GET /lender/returns`

Display:
- Total interest earned (from `lenders.total_earned_interest`)
- Per-loan breakdown: principal lent, interest received, platform cut, net return
- Running total of what has gone to platform (15% of interest) — shown transparently

---

## Definition of Done — Sprint 3

- [ ] Lender can make an offer; borrower sees it
- [ ] Borrower can accept one offer; all others close
- [ ] Loan record created with full terms
- [ ] Lender balance deducted on disbursement
- [ ] Repayment schedule exists in DB on loan creation
- [ ] Borrower can make a repayment; lender balance credited
- [ ] Transaction history shows real events for both users
- [ ] Overdue loans show correct delinquency status
