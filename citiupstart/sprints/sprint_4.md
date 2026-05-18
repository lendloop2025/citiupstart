# Sprint 4 — Polish & MLP
**Dates:** May 14 – May 20, 2026
**Theme:** The product feels trustworthy, complete, and genuinely delightful
**Status:** PLANNED
**Depends On:** Sprint 3 complete (full loan lifecycle functional)

---

## Sprint Goal

By end of Sprint 4, 121.ai is the **Most Lovable Product**:
- Every user journey works without a single breakage
- The UI looks and feels like a real, professional fintech product
- Security fundamentals are in place
- A 5-minute demo can run flawlessly from registration to repayment
- The product tells its own story — the data and design do the persuading

---

## User Stories

- As a user, I want to receive in-app notifications when something important happens
- As a lender and borrower, I want to message each other about a loan
- As a user, I want my dashboard to show real, meaningful statistics
- As a borrower, I want to see my credit history and how my score is growing
- As a lender, I want a clear breakdown of my returns and the platform's cut
- As a user, I trust that my data and session are handled securely
- As a first-time visitor, I want the product to look credible and professional

---

## Tasks

### S4-01 — In-App Notification System
**Priority:** High

Model: `notifications` table (already in schema)

Notification triggers and their messages:
| Event | Recipient | Message |
|---|---|---|
| New offer received | Borrower | "You have a new offer from [Lender Name]" |
| Offer accepted | Lender | "Your offer was accepted by [Borrower Name]" |
| Offer rejected | Lender | "Your offer was not accepted" |
| Repayment received | Lender | "Repayment of €[amount] received from [Borrower]" |
| Repayment due in 3 days | Borrower | "Your next repayment of €[amount] is due on [date]" |
| Repayment overdue | Borrower | "Your repayment is overdue. Please make payment." |

UI: notification bell icon in nav with unread count badge. Notification dropdown on click. Mark as read on view.

Route: `GET /notifications` — full notification list
Route: `POST /notifications/<id>/read` — mark individual as read

---

### S4-02 — Lender–Borrower Messaging
**Priority:** High

Route: `GET/POST /messages/<conversation_partner_id>`

Model: `messages` table, grouped by (sender_id, receiver_id) pair scoped to a loan request.

UI: chat-style layout — messages on left/right by sender. Input box at bottom. Auto-scroll to latest.

Logic:
- One conversation thread per lender-borrower pair per loan request
- Both parties can initiate
- Messages stored with sender_id, receiver_id, message_text, created_at
- Unread messages shown with indicator

---

### S4-03 — Real Dashboard Statistics
**Priority:** Critical

All stat cards on both dashboards must pull from the database — no placeholder or hardcoded values.

**Lender Dashboard:**
- Available balance (from `lenders.available_balance`)
- Total lent (from `lenders.total_lent`)
- Active loans count (from `loans` WHERE lender_id = X AND status = 'active')
- Interest earned (from `lenders.total_earned_interest`)
- Completed loans count

**Borrower Dashboard:**
- Credibility score (from `borrowers.credibility_score`) with colour coding
- Active loan summary (principal, amount remaining, next payment date)
- Total borrowed
- On-time payments count
- "No assessment yet" state with clear CTA if not assessed

---

### S4-04 — Credit History Tracking
**Priority:** High

Route: `GET /borrower/credit-history`

Every repayment event writes to a credit history log (can be a view over `repayments` + metadata):
- Date of payment
- Amount paid
- On time / Late / Missed
- Score impact (e.g., "+2 pts — on-time payment")
- Running score over time (if multiple loans)

Display as a timeline with colour-coded events (green = on-time, amber = late, red = missed).

This is the foundation of the **government/bank data value proposition** — demonstrating that 121.ai builds a real, verifiable credit record.

---

### S4-05 — Security: SQL Injection Audit
**Priority:** Critical
**Owner:** Ojas

Review every database query across all blueprints:
- All queries must use parameterized statements (never string concatenation with user input)
- Example of what to catch and fix:
  ```python
  # WRONG — vulnerable
  cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

  # CORRECT — safe
  cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
  ```
- Document every query reviewed in a checklist

**Acceptance:** No raw string interpolation in any query touching user input.

---

### S4-06 — Security: Input Validation & Sanitization
**Priority:** Critical
**Owner:** Ojas

For every form across the app:
- Server-side validation (never trust client-side only)
- String fields: strip whitespace, check max length
- Numeric fields: validate type, check min/max bounds
- Dates: validate format and logical range (e.g., DOB must be > 18 years ago)
- Email: validate format
- Amounts: must be positive; reject negative or zero
- Return user-friendly error messages without leaking system info

---

### S4-07 — Security: Session Hardening
**Priority:** High
**Owner:** Ojas

- Set `SESSION_COOKIE_SECURE = True` (HTTPS only in prod)
- Set `SESSION_COOKIE_HTTPONLY = True` (no JS access to cookie)
- Set `SESSION_COOKIE_SAMESITE = 'Lax'`
- Set `PERMANENT_SESSION_LIFETIME` to a reasonable timeout (e.g., 2 hours)
- Implement CSRF protection on all POST forms (Flask-WTF or manual token)

---

### S4-08 — UI Polish
**Priority:** High
**Owner:** Smruti

Design system to apply consistently:
- Colour palette: Primary blue (#1A56DB), success green (#057A55), warning amber (#C27803), error red (#C81E1E), neutral grays
- Typography: clean sans-serif, clear hierarchy (h1 → h2 → body → caption)
- Cards: subtle shadow, rounded corners (8px), consistent padding
- Buttons: primary (filled blue), secondary (outline), danger (red) — all with hover/active states
- Score badges: large, colour-coded circle with number
- Loading states: subtle animation on any async action
- Success/error flash messages: styled, dismissible, positioned at top

Key pages to polish priority order:
1. Login / Signup
2. Lender Dashboard
3. Borrower Dashboard
4. Borrowers Listing (lender view)
5. Borrower Profile
6. Offers page
7. Loan Agreement
8. Credit History

---

### S4-09 — Mobile Responsiveness
**Priority:** High
**Owner:** Smruti

Test and fix all key pages on 375px (iPhone SE) and 768px (tablet) widths:
- Nav collapses to hamburger on mobile
- Cards stack vertically
- Tables scroll horizontally
- Tap targets ≥ 44px
- No horizontal scroll on any page

---

### S4-10 — Lender Taxation Summary
**Priority:** Medium

Route: `GET /lender/tax-summary`

Display:
- Total amount lent (this year)
- Total interest income received (this year)
- Platform cut deducted (15% of interest)
- Net earnings (interest minus platform cut)
- Downloadable summary (HTML print-friendly view for MLP; PDF in future)

This supports the mentor requirement and adds enterprise value (lenders need this for tax returns).

---

### S4-11 — Empty States
**Priority:** Medium
**Owner:** Smruti

Every list/table page must have a well-designed empty state when no data exists:
- Lender: no borrowers available → "No active loan requests in your community yet. Check back soon."
- Borrower: no offers received → "No offers yet. Your request has been posted — lenders will find you."
- Borrower: no assessment → "Complete your credibility assessment to start borrowing."
- Transaction history: empty → "No transactions yet."

Each empty state should include a clear action button.

---

### S4-12 — End-to-End Demo Flow
**Priority:** Critical

Build and rehearse a 5-minute demo script:
1. Register as borrower (Demo Community)
2. Complete credibility assessment → show score
3. Post loan request
4. Register as lender (Demo Community)
5. Deposit funds
6. Browse borrowers → view borrower profile
7. Make an offer
8. Switch to borrower: accept offer → view loan agreement
9. Make a repayment → show lender balance credited
10. Show credit history, transaction history, notifications
11. Show lender returns + taxation summary

Seed a `demo_data.sql` script that pre-populates the 121.ai Demo Community with realistic data so the demo has history from minute one.

---

## Definition of Done — Sprint 4

- [ ] In-app notifications fire for all key events
- [ ] Lender and borrower can message each other
- [ ] All dashboard stats are real DB values
- [ ] Credit history shows borrower's payment track record
- [ ] SQL injection audit passed (Ojas sign-off)
- [ ] Input validation on all forms
- [ ] Session cookies are hardened
- [ ] UI is visually consistent across all pages
- [ ] All key pages work on mobile
- [ ] End-to-end demo runs in 5 minutes without a single error
- [ ] `demo_data.sql` seed script ready
