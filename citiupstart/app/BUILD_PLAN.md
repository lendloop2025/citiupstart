# 121.ai — New Project Build Plan
**Working Directory:** `Project_claude/app/`
**Old Project:** `Project/` — scanned for context only, not touched
**Approach:** One session per task. No code written until session begins.

---

## Planned Folder Structure

```
Project_claude/app/
├── app.py                          ← Flask factory (create_app), run entry point
├── config.py                       ← Config class (SECRET_KEY, DB settings, etc.)
├── requirements.txt                ← Flask, Flask-Login, bcrypt, mysql-connector-python
│
├── sql/
│   └── schema.sql                  ← All 13 MLP tables (DDL — run once to set up DB)
│
├── utils/
│   ├── __init__.py
│   ├── db.py                       ← get_db() / teardown — per-request MySQL connection via Flask g
│   └── decorators.py               ← @login_required, @lender_required, @borrower_required
│
├── blueprints/
│   ├── __init__.py
│   │
│   ├── core/                       ← Public pages: landing, about
│   │   ├── __init__.py
│   │   └── routes.py               ← GET /   → landing.html
│   │
│   ├── auth/                       ← Signup, login, logout
│   │   ├── __init__.py
│   │   └── routes.py               ← GET/POST /auth/signup, /auth/login, GET /auth/logout
│   │
│   ├── lender/                     ← All lender-facing routes
│   │   ├── __init__.py
│   │   └── routes.py               ← GET /lender/dashboard (skeleton — Sprint 1)
│   │                                  (more routes added in Sprint 2, 3, 4)
│   │
│   └── borrower/                   ← All borrower-facing routes
│       ├── __init__.py
│       ├── routes.py               ← GET /borrower/dashboard (skeleton — Sprint 1)
│       │                              (more routes added in Sprint 2, 3, 4)
│       └── scoring.py              ← calculate_credibility_score() — Sprint 2
│
├── templates/
│   ├── base.html                   ← Master layout: navbar, flash messages, footer
│   │
│   ├── core/
│   │   └── landing.html            ← Public homepage with hero, CTA, product pitch
│   │
│   ├── auth/
│   │   ├── login.html
│   │   └── signup.html             ← Includes role selector (Lender / Borrower)
│   │                                  and community dropdown
│   │
│   ├── lender/
│   │   └── dashboard.html          ← Sidebar layout, skeleton stats (Sprint 1)
│   │
│   ├── borrower/
│   │   └── dashboard.html          ← Sidebar layout, skeleton stats (Sprint 1)
│   │
│   └── errors/
│       ├── 403.html
│       └── 404.html
│
└── static/
    ├── style.css                   ← Full rewrite: professional dark-navy fintech aesthetic
    └── (images, icons as needed)
```

---

## Session Map — What Gets Built Per Session

### SESSION 1 — Project Scaffold + DB Schema
**Files:** `requirements.txt`, `config.py`, `sql/schema.sql`, `utils/__init__.py`, `utils/db.py`

- `requirements.txt`: Flask, Flask-Login, bcrypt, mysql-connector-python, python-dotenv
- `config.py`: Config class with SECRET_KEY, MYSQL host/user/pass/db, SESSION_COOKIE settings
- `sql/schema.sql`: Complete DDL for all 13 MLP tables:
  communities, users, user_profile, lenders, borrowers, borrower_assessments,
  loan_requests, loan_offers, loans, repayments, transactions, messages, notifications
  + INSERT for default community "121.ai Demo Community"
- `utils/db.py`: get_db() using Flask g, teardown_appcontext, execute helper

---

### SESSION 2 — Flask Factory + Blueprints Shell + Decorators
**Files:** `app.py`, `blueprints/__init__.py`, all 4 blueprint `__init__.py` + empty `routes.py` stubs, `utils/decorators.py`

- `app.py`: create_app() factory, register all 4 blueprints, register error handlers
- All blueprints registered with correct url_prefix
- `utils/decorators.py`: @login_required (redirect to /auth/login), @lender_required, @borrower_required
- Verify `flask run` starts without errors

---

### SESSION 3 — Auth Routes (Signup + Login + Logout)
**Files:** `blueprints/auth/routes.py`

- `POST /auth/signup`: validate form → bcrypt hash password → insert users + user_profile + (lenders or borrowers) record → set session → redirect to role dashboard
- `POST /auth/login`: fetch user by email → bcrypt check → set session (user_id, role, community_id, name) → redirect by role
- `GET /auth/logout`: clear session → redirect to /

---

### SESSION 4 — Base Template + Auth Templates + CSS
**Files:** `templates/base.html`, `templates/auth/login.html`, `templates/auth/signup.html`, `static/style.css`

- `base.html`: dark-navy navbar (logo "121.ai", login/signup links or user name + logout), flash message block, main block, footer
- `login.html`: clean card-style login form
- `signup.html`: card-style form with role toggle (Lender/Borrower) and community dropdown
- `style.css`: complete professional fintech stylesheet
  - Colour palette: #0A1628 (dark navy), #1E3A5F (medium navy), #2563EB (accent blue), #10B981 (green), #F59E0B (amber), #EF4444 (red)
  - Cards, sidebar layout, form inputs, buttons, badge/pill components, score bars

---

### SESSION 5 — Landing Page
**Files:** `templates/core/landing.html`, `blueprints/core/routes.py`

- Hero section: headline + sub + two CTAs (Get Started as Borrower / Start Lending)
- How it works: 3-step visual
- Mission section: credit invisibility impact text
- Why closed community: trust differentiation
- Footer

---

### SESSION 6 — Lender Dashboard Skeleton
**Files:** `templates/lender/dashboard.html`, `blueprints/lender/routes.py`

- Sidebar: Dashboard, Deposit Funds, Browse Borrowers, My Loans, Account
- Stats cards: Available Balance (€0), Total Lent (€0), Active Loans (0), Interest Earned (€0)
- "No active loans" empty state
- All data queried from DB (real, not hardcoded)

---

### SESSION 7 — Borrower Dashboard Skeleton
**Files:** `templates/borrower/dashboard.html`, `blueprints/borrower/routes.py`

- Sidebar: Dashboard, My Assessment, Post Loan Request, My Offers, Repayments, Credit History
- Banner: "Complete your assessment to post a loan request" (if no assessment yet)
- Stats cards: Credibility Score (–), Active Loans (0), Next Payment (–), Total Borrowed (€0)
- "Get started" empty state CTA
- All data queried from DB

---

### SESSION 8 — Error Pages
**Files:** `templates/errors/403.html`, `templates/errors/404.html`

- Consistent with base.html style
- 403: "Access Denied" — clear message + back link
- 404: "Page Not Found" — friendly message + home link

---

## Sprint 2 Sessions (Core Features — Apr 30–May 6)

| Session | Task |
|---|---|
| S9  | Borrower assessment form (6 sections, conditional fields) |
| S10 | Credibility scoring algorithm (`scoring.py`) + DB storage |
| S11 | Assessment view page (score breakdown, progress bars) |
| S12 | Loan request posting form + DB write |
| S13 | Lender: Deposit funds (simulated, updates balance) |
| S14 | Borrower listings page (lender sees community borrowers + scores) |
| S15 | Lender listings page (borrower sees community lenders) |
| S16 | Borrower profile page (lender view: score breakdown + loan request) |

---

## Sprint 3 Sessions (Matching & Loan Flow — May 7–13)

| Session | Task |
|---|---|
| S17 | Lender makes offer (form: amount, rate, duration → loan_offers table) |
| S18 | Borrower views & accepts/rejects offers |
| S19 | Loan creation on acceptance (loan record, repayment schedule generated) |
| S20 | Loan agreement view |
| S21 | Simulated disbursement (balance updates, transaction records) |
| S22 | Borrower: Make repayment (marks repayment, updates balances, platform cut) |
| S23 | Transaction history (lender + borrower views) |
| S24 | Loan status tracking (active → delinquent_30/60 → default/completed) |

---

## Sprint 4 Sessions (Polish & MLP — May 14–20)

| Session | Task |
|---|---|
| S25 | In-app notifications (6 event types, bell icon) |
| S26 | Lender–borrower messaging |
| S27 | Real dashboard stats (live data from DB, not placeholders) |
| S28 | Credit history page (timeline, score journey) |
| S29 | Security audit (SQL injection, input validation, session hardening) |
| S30 | UI polish (mobile responsiveness, empty states, transitions) |
| S31 | Lender taxation summary page |
| S32 | End-to-end demo flow + `demo_data.sql` seed script |

---

## Key Technical Rules (Do Not Forget)

- **Never store raw salary** — always use salary_band ENUM ranges
- **All listing queries filter by community_id** — community isolation at DB level
- **Passwords: bcrypt only** — never plaintext
- **Session keys:** `user_id`, `role`, `community_id`, `full_name`
- **Platform cut:** 15% of interest_part, stored in `repayments.platform_cut`
- **New borrower credit history baseline:** 10 pts (not 0) — unknown ≠ bad
- **Payments: simulated** — balance arithmetic in DB, no real gateway
- **DB connection:** per-request via Flask `g`, not a global persistent connection
- **Blueprint url_prefix:** /auth, /lender, /borrower, / (core)

