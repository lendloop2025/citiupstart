# 121.ai by LendLoop — Complete Platform Flow

**Purpose:** Structured specification for the full lending lifecycle. Give this to an LLM to implement each flow end-to-end.

---

## 1. Authentication & Session

### 1.1 Login Flow
- User visits `/login` → enters NCI email + password → server action calls Supabase `signInWithPassword`
- On success → session cookie is set → client redirects to `/dashboard`
- On failure → error message displayed inline ("Invalid login credentials")
- Session is managed via Supabase SSR cookies; proxy (middleware) validates session on every protected route
- Profile lookup uses service role client (bypasses RLS) after auth verification

### 1.2 Registration Flow
- User visits `/register` → enters NCI email (@student.ncirl.ie or @ncirl.ie), password (min 10 chars), accepts Terms/Privacy/Risk
- Supabase creates auth user → app inserts row into `public.users` with matching UUID
- User completes onboarding: personal details → 2FA setup → identity document upload → admin approves KYC
- Status transitions: `pending_email_verification` → `pending_kyc` → `verified`

---

## 2. Borrower Credit Scoring

### 2.1 Score Components (100 points total)

| Component   | Max Points | Based On                                                                 |
|-------------|-----------|--------------------------------------------------------------------------|
| Identity    | 20        | KYC verified, address confirmed, 2FA enabled                            |
| Income      | 25        | Employment status (full-time/part-time/student), verified salary from payslip, income stability |
| Stability   | 15        | NCI semesters completed, IRP status (for international students), employment tenure in months |
| Financial   | 20        | Savings ratio, existing debt-to-income ratio, emergency fund presence   |
| Reputation  | 20        | Loan repayment history — on-time rate, completed loans, any defaults    |

### 2.2 Score Computation Triggers
- After `users.status = 'verified'` (initial score)
- After any document approval/rejection by admin
- After borrower updates their financial assessment
- **After every loan repayment** (on-time → reputation UP; late → reputation DOWN)
- **After loan completion** (successfully closed loan → reputation score increases)
- After loan default (reputation drops to 0, score capped)

### 2.3 Score-Based Loan Limits

| Score Range | Max Loan Amount | Risk Tier |
|-------------|----------------|-----------|
| 0–29        | Not eligible   | High risk — cannot borrow |
| 30–49       | €200           | Elevated risk |
| 50–64       | €500           | Moderate risk |
| 65–79       | €1,000         | Standard risk |
| 80–89       | €1,500         | Low risk |
| 90–100      | €2,000         | Excellent |

### 2.4 Active Loan Limit
- **Maximum 2 active loans per borrower at any time**
- If borrower already has 2 active (non-closed) loans, the "Request a loan" button is disabled
- Display message: "You have reached the maximum of 2 active loans. Close an existing loan to request a new one."

---

## 3. Lender Dashboard — Discovering Loan Requests

### 3.1 Lender logs in → Dashboard (`/dashboard`)
- Shows wallet balance (€), currently lent amount, currently borrowed amount
- Section: **"Open loan requests in your community"** — lists recent open requests from other verified borrowers
- Each card shows: amount requested, term (months), max APR borrower will accept, borrower's credit score at time of request, loan purpose

### 3.2 Invest page (`/invest`)
- Full list of all open/partially-funded loan requests in the lender's community
- Filter/sort by: amount, term, score, APR, purpose
- Lender clicks a request → goes to `/invest/[request-id]` → sees full details including:
  - Borrower's credit score breakdown (identity, income, stability, financial, reputation)
  - Purpose description
  - Requested amount, term, max APR
  - Affordability indicator (monthly payment as % of borrower's declared income)

---

## 4. Making an Offer (Lender → Borrower)

### 4.1 Offer Form (`/invest/[request-id]`)
- **Amount you'll lend (EUR):** must be ≤ requested amount and ≤ lender's available wallet balance
- **Your APR (%):** must be ≤ borrower's max APR ceiling
- **Term (months):** must match or be ≤ borrower's requested term
- **Message to borrower (optional):** free text encouragement/note
- Submit → creates an `offer` row in the database linked to the loan request

### 4.2 Borrower Notification
- **In-app notification:** row inserted into `notifications` table with type `offer_received`
  - Borrower sees notification badge/count on dashboard
  - Notification links to the loan request detail page
- **Email notification:** sent via Resend to borrower's NCI email
  - Subject: "New offer on your loan request"
  - Body: amount offered, APR, term, link to view/accept
  - Template: `/emails/offer-received.tsx`

### 4.3 Borrower Dashboard Visibility
- On borrower's dashboard, the loan request card shows: "1 offer received" (or N offers)
- Borrower clicks → navigates to `/borrow/[request-id]` → sees all offers with details
- Each offer card shows: lender name (first name only), amount, APR, term, message

---

## 5. Accepting an Offer (Borrower)

### 5.1 Accept Flow
- Borrower reviews offers on `/borrow/[request-id]`
- Clicks **"Accept offer"** on the chosen offer
- Server action:
  1. Validates borrower still has < 2 active loans
  2. Validates loan request is still open
  3. Validates offer is still valid (not withdrawn)
  4. Creates a `loan` record with status `pending_signatures`
  5. Links offer → loan, updates loan request status to `converted`
  6. Generates the loan agreement (see §6)
  7. Notifies lender (in-app + email): "Your offer has been accepted"

### 5.2 Rejection / Expiry
- Borrower can ignore offers — loan request expires after 14 days with no accepted offer
- On expiry: status → `expired`, all pending offers are cancelled, both parties notified

---

## 6. Agreement & Digital Signatures

### 6.1 Agreement Generation
- When an offer is accepted, the system creates a loan agreement containing:
  - Loan ID, date, parties (borrower name/email/address + lender name/email/address)
  - Principal amount, APR, term in months
  - Monthly payment amount (computed via amortization formula)
  - Total interest over loan lifetime
  - Total repayment amount (principal + interest)
  - Full amortization schedule: for each month → payment number, due date, principal portion, interest portion, total due
  - Late fee terms (e.g., 2% of missed payment per week late)
  - Platform fee disclosure (LendLoop takes 15% of interest as platform fee)
  - Governing law (Ireland)

### 6.2 Signing Flow (`/agreements/[loan-id]/sign`)
- Both parties must sign digitally
- Each party sees the agreement with a **"Sign Agreement"** button
- On click: server records `signed_at` timestamp + signer's IP address
- **First signature** (either party): loan status stays `pending_signatures`
- **Second signature** (the other party): loan status → `active`, triggers disbursement
- Both parties notified on each signature event

### 6.3 PDF Generation (LLM-Enhanced)
- After both signatures, system generates a PDF of the agreement using `@react-pdf/renderer`
- The PDF includes:
  - All agreement terms from §6.1
  - Digital signature records (name, email, timestamp, IP) for both parties
  - Full amortization schedule table
  - LLM-generated summary paragraph (optional): a neutral 2–3 sentence summary of the loan terms using Claude/Gemini
- PDF is stored in Supabase Storage (`agreements` bucket)
- Both parties can download from `/agreements/[loan-id]` at any time
- API endpoint: `GET /api/agreements/[id]/pdf` → returns the PDF

---

## 7. Loan Disbursement

### 7.1 Auto-Disbursement on Second Signature
- When the second party signs, the system immediately:
  1. Debits lender's wallet: `available_balance -= principal`
  2. Credits borrower's wallet: `available_balance += principal`
  3. Creates ledger entries for both (type: `loan_disbursement`)
  4. Sets `loan.disbursed_at = now()`
  5. Generates the repayment schedule (N monthly installments)
  6. Creates `repayment` rows for each scheduled payment (status: `scheduled`)
  7. Sends disbursement confirmation emails to both parties

---

## 8. Repayment Flow

### 8.1 Scheduled Repayments
- Monthly installments auto-computed via standard amortization formula
- Each repayment has: `due_date`, `principal_cents`, `interest_cents`, `total_due_cents`, `status` (scheduled/paid/late/defaulted)
- System processes repayments on due date:
  1. Check borrower wallet has sufficient balance
  2. Debit borrower wallet by total_due_cents
  3. Calculate platform fee (15% of interest portion)
  4. Credit lender wallet by (total_due - platform_fee)
  5. Credit platform wallet by platform_fee
  6. Update repayment status → `paid`
  7. Recompute borrower's credit score (reputation component improves)
  8. Notify both parties

### 8.2 Late Payments
- If borrower wallet has insufficient funds on due date:
  - Repayment status → `late`
  - Late fee accrues (2% per week)
  - Borrower notified via email: "Payment overdue"
  - Borrower's reputation score decreases
- After 90 days late → status → `defaulted`, loan marked as defaulted

### 8.3 Early Repayment / Early Closure
- Borrower can pay off remaining balance at any time from `/loans/[id]`
- **"Pay off loan early"** button → shows remaining principal + accrued interest to date (no future interest charged)
- On early payoff:
  1. Calculate outstanding: remaining principal + interest accrued to today
  2. Debit borrower wallet for full outstanding amount
  3. Credit lender wallet (minus platform fee on interest portion)
  4. Mark all remaining scheduled repayments as `paid` (with note: "early closure")
  5. Update loan status → `paid_off`
  6. Update loan `paid_off_at` timestamp
  7. **Recompute borrower credit score** — reputation increases for successful early closure
  8. Close the agreement (update agreement status)
  9. Notify both parties: "Loan closed early"
  10. Generate updated PDF with closure record

---

## 9. Loan Closure & Score Update

### 9.1 Normal Closure (All Payments Complete)
- When the final scheduled repayment is processed:
  1. Loan status → `paid_off`
  2. Set `paid_off_at = now()`
  3. **Recompute borrower credit score:**
     - Increment `total_loans_completed` counter
     - Recalculate on-time payment rate across all historical loans
     - Reputation score increases (see §2.1)
  4. Insert closure record in `audit_log`
  5. Notify both parties: "Loan fully repaid"

### 9.2 Early Closure
- Same as §8.3 — score recomputation happens immediately
- Bonus: early closure may give a slightly higher reputation boost than on-time completion

### 9.3 Score Increase After Successful Closure
- The reputation component (max 20 points) recalculates based on:
  - `total_loans_completed`: more completed loans → higher base
  - `on_time_payment_rate`: % of all lifetime payments made on/before due date
    - ≥95% on-time → 20/20
    - ≥80% on-time → 14/20
    - <80% on-time → 6/20
  - Early closure counts all remaining payments as "on-time"
- New total score is stored as a new `credit_scores` row (versioned history preserved)
- Higher score → higher max loan limit on next request (see §2.3)

### 9.4 Database Updates on Closure
- `loans` table: `status = 'paid_off'`, `paid_off_at = now()`
- `repayments` table: all rows for this loan have `status = 'paid'`
- `credit_scores` table: new row inserted with updated score + breakdown
- `ledger` table: final repayment entry + any early-closure adjustment entries
- `audit_log` table: closure event with actor, timestamp, loan details
- `notifications` table: closure notifications for both parties

---

## 10. Constraints & Business Rules Summary

| Rule | Enforcement |
|------|-------------|
| Max 2 active loans per borrower | Check `loans` table count where `borrower_id = user AND status IN ('active', 'pending_signatures')` before creating new request |
| Max loan amount based on score | Score-tier lookup (§2.3) enforced on loan request creation |
| Loan amount range | €100–€2,000 (database CHECK constraint) |
| Term range | 1–12 months (database CHECK constraint) |
| APR range | 0%–12% |
| Borrower must be verified | `users.status = 'verified'` required to access `/borrow` |
| Lender must have sufficient balance | `wallets.available_balance_cents >= offer_amount_cents` checked on offer submission |
| Loan request expiry | 14 days from posting if no offer accepted |
| Late fee | 2% of missed payment per week |
| Platform fee | 15% of interest portion on each repayment |
| Email notifications | Sent on: offer received, offer accepted, agreement signed, loan disbursed, repayment due, repayment late, loan closed |

---

## 11. Complete User Journey (Happy Path)

```
LENDER (Smruti)                          BORROWER (Umer)
─────────────────                        ─────────────────
                                         1. Login → Dashboard
                                         2. Click "Request a loan"
                                         3. Fill: €500, 6 months, max 10% APR,
                                            purpose: laptop_equipment
                                         4. Submit → loan request created (status: open)
                                         
5. Login → Dashboard                    
6. See "Open loan requests" section      ← Umer's request appears
7. Click request → /invest/[id]          
8. Review Umer's score (72/100)          
9. Submit offer: €500, 8% APR, 6 months 
                                         10. Gets notification (in-app + email)
                                         11. Views offer on /borrow/[id]
                                         12. Clicks "Accept offer"
                                             → Loan created (pending_signatures)
                                         
13. Gets notification: "Offer accepted"  
14. Views agreement → Signs              
                                         15. Views agreement → Signs
                                             → Second signature triggers:
                                               - Loan status → active
                                               - €500 debited from Smruti's wallet
                                               - €500 credited to Umer's wallet
                                               - 6 monthly repayments scheduled
                                               - PDF agreement generated
                                               - Both parties notified
                                         
                                         16. (Monthly) Repayment auto-processed
                                             → Umer's wallet debited
                                             → Smruti's wallet credited
                                             → Score updated
                                         
                                         17. (Optional) Early payoff
                                             → Remaining balance paid in full
                                             → Loan status → paid_off
                                             → Score increases
                                             → Agreement closed
                                         
                                         18. Final repayment processed
                                             → Loan status → paid_off
                                             → Umer's score increases
                                             → New score unlocks higher loan limits
```

---

## 12. Technical Implementation Notes

### 12.1 Key Database Tables
- `users` — profile, role, status, community_id
- `wallets` — available_balance_cents per user
- `credit_scores` — versioned score history with component breakdown
- `loan_requests` — borrower's posted need
- `offers` — lender offers on a request
- `loans` — active/completed loans linking borrower + lender
- `repayments` — individual scheduled/paid payment rows
- `ledger` — every money movement (immutable audit trail)
- `notifications` — in-app notification queue
- `audit_log` — every system action logged
- `consent_records` — GDPR consent tracking

### 12.2 Key Server Actions
- `loginAction` — authenticate + set session
- `registerAction` — create auth user + public profile
- `createLoanRequestAction` — validate limits + create request
- `createOfferAction` — validate balance + create offer
- `acceptOfferAction` — create loan + notify lender
- `signAgreementAction` — record signature, trigger disbursement on second sign
- `processRepaymentAction` — debit/credit wallets, update score
- `earlyPayoffAction` — calculate outstanding, close loan, update score

### 12.3 Key Library Modules
- `lib/finance/amortization.ts` — monthly payment calculation, schedule builder
- `lib/scoring/score.ts` — deterministic 100-point credit algorithm
- `lib/pdf/render.ts` — React-PDF agreement generator
- `lib/email/client.ts` — Resend email sender with templates
- `lib/auth/session.ts` — requireUser, requireUserProfile, requireVerified, requireAdmin