# 121.ai by LendLoop — System Architecture
**Scope:** MLP (Most Lovable Product)
**Last Updated:** 2026-04-23

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      CLOSED COMMUNITY                        │
│  (Company / University / Cooperative / Any Org)              │
│                                                              │
│   ┌──────────────┐              ┌──────────────────┐         │
│   │   Borrower   │              │      Lender      │         │
│   │ (needs funds)│              │ (has funds)      │         │
│   └──────┬───────┘              └────────┬─────────┘         │
│          │                               │                   │
└──────────┼───────────────────────────────┼───────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────────────────────────────────────────────┐
│                      121.ai Platform                         │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │  Auth Layer  │   │  Compliance  │   │ Matching Engine │  │
│  │  (Sessions,  │   │  (KYC,       │   │ (community-     │  │
│  │   bcrypt)    │   │   Scoring)   │   │  scoped)        │  │
│  └──────────────┘   └──────────────┘   └─────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Loan Lifecycle Engine                │   │
│  │  Request → Offer → Acceptance → Disbursement         │   │
│  │  → Repayment Schedule → Repayments → Completion      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ Notification │   │  Messaging   │   │   Transaction   │  │
│  │   System     │   │  (Chat)      │   │     Ledger      │  │
│  └──────────────┘   └──────────────┘   └─────────────────┘  │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│                     MySQL Database                           │
│            (13 tables, community-isolated)                   │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              3rd Party Integrations (Future)                 │
│  Stripe Identity │ Central Credit Register │ Bank Verify     │
└──────────────────────────────────────────────────────────────┘
```

---

## Application Structure (Flask)

```
Project/
├── app.py                      ← App factory (create_app())
├── config.py                   ← Configuration classes (dev/prod)
├── extensions.py               ← db (mysql connector), bcrypt
├── blueprints/
│   ├── auth/
│   │   ├── __init__.py         ← Blueprint registration
│   │   └── routes.py           ← /auth/signup, /auth/login, /auth/logout
│   ├── lender/
│   │   ├── __init__.py
│   │   └── routes.py           ← /lender/*, all lender routes
│   ├── borrower/
│   │   ├── __init__.py
│   │   ├── routes.py           ← /borrower/*, all borrower routes
│   │   └── scoring.py          ← Credibility scoring algorithm
│   └── core/
│       ├── __init__.py
│       ├── routes.py           ← /, /about, /contact
│       ├── matching.py         ← Matching algorithm
│       └── finance.py          ← Repayment schedule, interest calc
├── templates/
│   ├── base.html               ← Master layout
│   ├── auth/
│   │   ├── login.html
│   │   └── signup.html
│   ├── lender/
│   │   ├── dashboard.html
│   │   ├── deposit.html
│   │   ├── borrowers.html      ← Borrower listing
│   │   ├── borrower_profile.html
│   │   ├── offer_form.html
│   │   ├── history.html
│   │   ├── returns.html
│   │   └── tax_summary.html
│   ├── borrower/
│   │   ├── dashboard.html
│   │   ├── assessment_form.html
│   │   ├── assessment_view.html
│   │   ├── request_form.html
│   │   ├── offers.html
│   │   ├── loan_agreement.html
│   │   ├── repayment.html
│   │   ├── lenders.html        ← Lender listing
│   │   ├── history.html
│   │   └── credit_history.html
│   └── core/
│       ├── home.html
│       ├── about.html
│       └── contact.html
├── static/
│   ├── css/
│   │   └── main.css
│   └── js/
│       └── main.js
└── sql/
    ├── schema.sql              ← All CREATE TABLE statements
    └── demo_data.sql           ← Seed data for demo
```

---

## Request Flow

```
Browser Request
      │
      ▼
Flask Router (app.py)
      │
      ├── Route match → Blueprint
      │
      ▼
Blueprint Route Function
      │
      ├── Session check (@login_required)
      ├── Role check (@lender_required / @borrower_required)
      │
      ▼
Business Logic
      │
      ├── DB queries (parameterized, via mysql.connector)
      ├── Scoring / Matching / Finance modules
      │
      ▼
Template Render (Jinja2)
      │
      ▼
HTTP Response → Browser
```

---

## Data Isolation Strategy

**Community scoping is enforced at the query layer, not the application layer.**

Every listing query that shows users to other users includes a community filter:

```sql
-- Borrowers visible to a lender
SELECT lr.*, b.credibility_score, up.full_name
FROM loan_requests lr
JOIN borrowers b ON lr.borrower_id = b.borrower_id
JOIN users u ON b.user_id = u.user_id
JOIN user_profile up ON u.user_id = up.user_id
WHERE u.community_id = %s          -- ← enforced: lender's community_id
  AND lr.status = 'active'
ORDER BY b.credibility_score DESC
```

A lender in community A **cannot see** any borrower from community B — not through the UI, and not through any route parameter manipulation.

---

## Security Model

| Layer | Mechanism |
|---|---|
| Passwords | bcrypt hash (never stored plain) |
| Sessions | Flask session, HTTPONLY + SAMESITE cookies |
| SQL | Parameterized queries only (no string interpolation) |
| Input | Server-side validation on all POST routes |
| CSRF | Token on all state-changing forms |
| Route auth | `@login_required` decorator on all non-public routes |
| Role isolation | `@lender_required` / `@borrower_required` decorators |
| Community isolation | community_id filter in all cross-user queries |

---

## Key Modules

### `blueprints/borrower/scoring.py`
Core credibility scoring engine. Takes assessment data dict, returns score dict with total and 5 component breakdown. Pure function — no DB calls. DB writes handled by the route.

### `blueprints/core/matching.py`
`get_matched_borrowers(lender_id)` — returns community-scoped, active loan requests ranked by credibility score.
`get_matched_lenders(borrower_id)` — returns community lenders with sufficient balance.

### `blueprints/core/finance.py`
`generate_repayment_schedule(principal, rate, months, start_date)` — returns list of instalment dicts.
`calculate_platform_cut(interest_amount, third_party_count)` — returns 15% or 10% based on third-party integrations active.

---

## MLP vs Production Differences

| Concern | MLP | Production |
|---|---|---|
| Payments | Simulated (balance updates in DB) | Real gateway (Stripe/PayPal) |
| KYC | Score-based self-declaration | Stripe Identity + CCR API |
| 2FA | Not implemented | TOTP or SMS OTP |
| Encryption at rest | Not implemented | AES-256 for PII fields |
| Notifications | In-app only | Email + Push + SMS |
| Admin panel | Not implemented | Full enterprise admin |
| Multi-community | Single community (demo) | Multi-tenant |
| Deployment | Local Flask dev server | Cloud (Docker + Nginx + Gunicorn) |
