# 121.ai Platform Manual
**Product:** 121.ai by LendLoop
**Current Build:** Sprint 2 — Foundation + Core Features
**Last Updated:** 2026-04-27
**Maintained by:** Updated after every sprint commit — see `developer_iteration_log/` for change history

---

## Table of Contents

1. [How to Run the App](#1-how-to-run-the-app)
2. [Project Structure](#2-project-structure)
3. [How the App Looks and Navigates](#3-how-the-app-looks-and-navigates)
4. [Feature Reference by Role](#4-feature-reference-by-role)
5. [Route and API Reference](#5-route-and-api-reference)
6. [Data Storage — Tables and What They Hold](#6-data-storage--tables-and-what-they-hold)
7. [Route-to-Table Map](#7-route-to-table-map)
8. [Session and Auth Model](#8-session-and-auth-model)
9. [Scoring Algorithm Summary](#9-scoring-algorithm-summary)
10. [What Is Not Yet Built](#10-what-is-not-yet-built)

---

## 1. How to Run the App

### Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.10+ |
| MySQL | 8.0+ |
| pip | Any recent |

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/lendloop2025/citiupstart.git
cd citiupstart
git checkout umer_dev
```

---

### Step 2 — Create and activate a virtual environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

---

### Step 3 — Install dependencies

```bash
cd app
pip install -r requirements.txt
```

**What gets installed:**
- `Flask>=3.0.0` — web framework
- `bcrypt>=4.0.0` — password hashing
- `mysql-connector-python>=8.3.0` — MySQL driver
- `python-dotenv>=1.0.0` — loads `.env` file

---

### Step 4 — Set up MySQL

Open MySQL and run the schema:

```bash
mysql -u root -p < app/sql/schema.sql
```

This creates the `lendloop` database, all 13 tables, and seeds the `121.ai Demo Community` row. **Safe to re-run** — it drops and recreates all tables.

---

### Step 5 — Create your `.env` file

```bash
# from the app/ directory
cp .env.example .env
```

Edit `.env` with your local values:

```env
SECRET_KEY=any-long-random-string-you-choose
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_DB=lendloop
MYSQL_PORT=3306
```

The `.env` file is gitignored — never committed. `.env.example` is the safe committed template.

---

### Step 6 — Run the app

```bash
# from the app/ directory
python app.py
```

The app starts at: **http://127.0.0.1:5000**

You should see the 121.ai landing page. Flask debug mode is on by default in development.

---

### Startup Checklist

- [ ] MySQL running and `lendloop` database created
- [ ] `.env` filled in with correct credentials
- [ ] Virtual environment activated
- [ ] `pip install -r requirements.txt` done
- [ ] Running from inside the `app/` directory

---

## 2. Project Structure

```
citiupstart/
├── .gitignore
├── README.md
│
├── app/                            ← All runnable code lives here
│   ├── app.py                      ← Flask factory, blueprint registration
│   ├── config.py                   ← Reads environment variables
│   ├── requirements.txt
│   ├── .env.example                ← Safe template (committed)
│   ├── .env                        ← Your local secrets (NOT committed)
│   │
│   ├── blueprints/
│   │   ├── auth/routes.py          ← Signup, login, logout
│   │   ├── core/routes.py          ← Landing page
│   │   ├── lender/routes.py        ← All lender pages
│   │   └── borrower/
│   │       ├── routes.py           ← All borrower pages
│   │       └── scoring.py          ← Credibility scoring algorithm
│   │
│   ├── utils/
│   │   ├── db.py                   ← MySQL connection + query/execute helpers
│   │   └── decorators.py           ← @login_required, @lender_required, @borrower_required
│   │
│   ├── sql/
│   │   └── schema.sql              ← 13-table MySQL schema, seed data
│   │
│   ├── static/
│   │   └── style.css               ← Full custom CSS (dark navy design system)
│   │
│   └── templates/
│       ├── base.html               ← Navbar, flash messages, shared layout
│       ├── core/landing.html       ← Public landing page
│       ├── auth/
│       │   ├── signup.html
│       │   └── login.html
│       ├── borrower/
│       │   ├── dashboard.html
│       │   ├── assessment_form.html
│       │   ├── assessment_view.html
│       │   ├── request_form.html
│       │   └── lenders.html
│       ├── lender/
│       │   ├── dashboard.html
│       │   ├── deposit.html
│       │   ├── borrowers.html
│       │   ├── borrower_profile.html
│       │   └── account.html
│       └── errors/
│           ├── 403.html
│           ├── 404.html
│           └── 500.html
│
├── design/                         ← Architecture docs, DB schema, user flows, scoring algorithm
├── sprints/                        ← Sprint plan and per-sprint task breakdowns
├── project_context/                ← Full product context for the platform
├── developer_iteration_log/        ← Build logs per session
└── docs/
    └── platform_manual.md          ← This file
```

---

## 3. How the App Looks and Navigates

### Design System

The entire UI uses a hand-crafted CSS design system (no Bootstrap, no Tailwind). Key visual tokens:

| Token | Value | Used For |
|---|---|---|
| Background | `#0A1628` | Page background |
| Surface | `#111F38` | Cards, sidebar |
| Surface-2 | `#162240` | Nested surfaces, hover states |
| Accent Blue | `#2563EB` | Primary buttons, links, active states |
| Green | `#10B981` | Positive values, good scores |
| Amber | `#F59E0B` | Warnings, mid-range scores |
| Red | `#EF4444` | Errors, poor scores, defaults |
| Text | `#E2E8F0` | Body text |
| Text-muted | `#94A3B8` | Secondary labels, metadata |

---

### Page-by-Page Navigation

#### Public Pages (no login required)

**`/` — Landing Page**
- Marketing page for 121.ai
- Two call-to-action buttons: "Sign Up" and "Log In"
- Visible to anyone

**`/auth/signup` — Sign Up**
- Fields: Full Name, Email, Password, Confirm Password, Role (Lender / Borrower), Community (dropdown)
- On success: account created, logged in, redirected to role dashboard
- Validation: email format, password ≥ 8 chars, passwords match, role selected

**`/auth/login` — Log In**
- Fields: Email, Password
- On success: session set, redirected to role dashboard
- On failure: flash error, stays on login page

---

#### Borrower Pages (login + borrower role required)

**`/borrower/dashboard` — Borrower Dashboard**

Sidebar navigation:
- Dashboard (active)
- My Assessment
- Post Loan Request
- My Offers (placeholder — Sprint 3)
- Repayments (placeholder — Sprint 3)
- Credit History (placeholder — Sprint 3)
- Browse Lenders
- Log Out

Main content:
- Welcome banner with first name
- Assessment-needed banner (shown if score = 0)
- 4 stat cards: Credibility Score (colour-coded), Active Loans, Total Borrowed, On-time Payments
- Quick Actions: Post Loan Request or Start Assessment (conditional on score)
- Active Loan Request card (if one exists) OR empty state

**`/borrower/assessment` — Credibility Assessment Form**

6-section form:
1. Personal details (name, DOB, phone, address, years at address)
2. Employment status (Employed / Self-employed / Unemployed / Student / Retired)
3. Employed fields (company, job title, years with employer) — shown dynamically
4. Self-employed fields (business name, years in business) — shown dynamically
5. Financial (salary band dropdown, monthly debt, self-reported credit score)
6. Identity verification (ID type, ID number, expiry)
7. Reference (name, relationship, phone)

On submit: score calculated immediately, assessment saved, redirected to score view.
Returns to same form pre-populated if updating an existing assessment.

**`/borrower/assessment/view` — My Score**

- Large score circle (colour-coded: green ≥ 70, amber ≥ 40, red < 40)
- Score label: Excellent / Strong / Good / Fair / Poor
- 5 horizontal progress bars with points breakdown:
  - Identity Verification (x/20)
  - Financial Strength (x/30)
  - Credit History (x/25)
  - Stability (x/15)
  - Platform Reputation (x/10)
- Employment and financial profile summary below

**`/borrower/request/new` — Post Loan Request**

- Fields: Amount (€), Purpose (Business / Education / Medical / Home Improvement / Other), Duration (months), Additional notes, Receive method
- Guard: requires credibility score > 0
- On success: loan request goes live, visible to all lenders in same community

**`/borrower/lenders` — Browse Lenders**

- Lists all lenders in the same community who have available balance > 0
- Shows: name, balance (rounded to nearest €100), total loans given, active loans, completed loans
- Balance displayed as rounded figure (e.g., €1,200 not €1,247.83) to protect exact privacy

---

#### Lender Pages (login + lender role required)

**`/lender/dashboard` — Lender Dashboard**

Sidebar navigation:
- Dashboard (active)
- Deposit Funds
- Browse Borrowers
- My Loans (placeholder — Sprint 3)
- Transactions (placeholder — Sprint 3)
- Returns (placeholder — Sprint 3)
- My Account
- Log Out

Main content:
- Welcome banner with first name
- 4 stat cards: Available Balance, Total Deposited, Total Lent Out, Interest Earned
- Quick Actions: Deposit Funds, Browse Borrowers, My Account
- Active Loans section (empty state in Sprint 2)

**`/lender/deposit` — Deposit Funds**

- Input: amount (€), payment method (Bank Transfer / Platform Wallet)
- Updates `lenders.available_balance` and `lenders.total_deposited`
- Writes a `transactions` record with `transaction_type = 'deposit'`
- Flash confirmation with new balance shown

**`/lender/borrowers` — Browse Community Borrowers**

- Shows all active loan requests in the same community
- Filter bar (instant, no submit button needed):
  - Min Score: Any / 40+ / 55+ / 70+ / 85+
  - Purpose: All / Business / Education / Medical / Home Improvement / Other
- Each borrower card shows: avatar (initial, colour-coded), name, score pill, on-time payments, defaults, amount requested, purpose, duration, date posted
- "View Profile" button on each card

**`/lender/borrower/<id>` — Borrower Profile**

Two-column layout:
- Left sidebar: Score circle, 5-component score breakdown bars, loan history table (on-time / late / defaults / completed)
- Right main: Active loan request card (with amount, purpose, duration, notes), Employment & Financial profile table (employer, salary band, ID verified tick, reference)
- "Make an Offer" button present but inactive (Sprint 3 feature)

**`/lender/account` — My Account**

- 6 stat cards: Available Balance, Total Deposited, Total Lent Out, Interest Earned, Active Loans, Completed Loans
- Account details table: Name, Email, Member Since, Role, Total Loans Given
- Quick actions panel with platform cut disclosure (LendLoop earns 15% of borrower interest)
- Recent Transactions table (last 10): type badge, amount, description, balance after, date

---

#### Error Pages

| URL trigger | Page |
|---|---|
| Access denied (wrong role) | `403.html` — "Forbidden" with back link |
| Page not found | `404.html` — "Page not found" |
| Server error | `500.html` — "Something went wrong" |

---

## 4. Feature Reference by Role

### Borrower — What They Can Do (Sprint 2)

| Feature | Status | Location |
|---|---|---|
| Sign up as borrower | Live | `/auth/signup` |
| Log in / log out | Live | `/auth/login`, `/auth/logout` |
| View dashboard with stats | Live | `/borrower/dashboard` |
| Complete credibility assessment | Live | `/borrower/assessment` |
| Re-take / update assessment | Live | `/borrower/assessment` (pre-populated) |
| View credibility score with breakdown | Live | `/borrower/assessment/view` |
| Post a loan request | Live | `/borrower/request/new` |
| Browse lenders in community | Live | `/borrower/lenders` |
| View loan offers received | Sprint 3 | — |
| Accept / reject an offer | Sprint 3 | — |
| Make repayments | Sprint 3 | — |
| View repayment history | Sprint 3 | — |

### Lender — What They Can Do (Sprint 2)

| Feature | Status | Location |
|---|---|---|
| Sign up as lender | Live | `/auth/signup` |
| Log in / log out | Live | `/auth/login`, `/auth/logout` |
| View dashboard with balance stats | Live | `/lender/dashboard` |
| Deposit funds (simulated) | Live | `/lender/deposit` |
| Browse community borrowers + filter | Live | `/lender/borrowers` |
| View a borrower's full profile | Live | `/lender/borrower/<id>` |
| View own account and transactions | Live | `/lender/account` |
| Make a loan offer to a borrower | Sprint 3 | — |
| Track active loans | Sprint 3 | — |
| Receive repayments | Sprint 3 | — |

---

## 5. Route and API Reference

All routes are server-rendered HTML (no JSON API yet). Every state change is a POST form submission.

### Auth Blueprint — prefix: `/auth`

| Method | URL | Handler | Auth Guard | Description |
|---|---|---|---|---|
| GET | `/auth/signup` | `auth.signup` | None (redirects if logged in) | Show signup form |
| POST | `/auth/signup` | `auth.signup` | None | Create account, set session, redirect |
| GET | `/auth/login` | `auth.login` | None (redirects if logged in) | Show login form |
| POST | `/auth/login` | `auth.login` | None | Verify credentials, set session, redirect |
| GET | `/auth/logout` | `auth.logout` | None | Clear session, redirect to login |

### Core Blueprint — prefix: `/`

| Method | URL | Handler | Auth Guard | Description |
|---|---|---|---|---|
| GET | `/` | `core.landing` | None | Public landing page |

### Borrower Blueprint — prefix: `/borrower`

| Method | URL | Handler | Auth Guard | Description |
|---|---|---|---|---|
| GET | `/borrower/dashboard` | `borrower.dashboard` | `@borrower_required` | Dashboard with stats + active request |
| GET | `/borrower/assessment` | `borrower.assessment` | `@borrower_required` | Show assessment form (pre-populated if returning) |
| POST | `/borrower/assessment` | `borrower.assessment` | `@borrower_required` | Save assessment, calculate score, redirect to view |
| GET | `/borrower/assessment/view` | `borrower.assessment_view` | `@borrower_required` | Show score + breakdown (redirects if score = 0) |
| GET | `/borrower/request/new` | `borrower.new_request` | `@borrower_required` | Show loan request form (guards: score > 0) |
| POST | `/borrower/request/new` | `borrower.new_request` | `@borrower_required` | Submit loan request, go live |
| GET | `/borrower/lenders` | `borrower.lenders` | `@borrower_required` | List community lenders with balance > 0 |

### Lender Blueprint — prefix: `/lender`

| Method | URL | Handler | Auth Guard | Description |
|---|---|---|---|---|
| GET | `/lender/dashboard` | `lender.dashboard` | `@lender_required` | Dashboard with balance stats |
| GET | `/lender/deposit` | `lender.deposit` | `@lender_required` | Show deposit form |
| POST | `/lender/deposit` | `lender.deposit` | `@lender_required` | Process deposit, update balance, write transaction |
| GET | `/lender/borrowers` | `lender.borrowers` | `@lender_required` | Browse community borrowers (optional `?min_score=N&purpose=X`) |
| GET | `/lender/borrower/<id>` | `lender.borrower_profile` | `@lender_required` | Full borrower profile (community-isolated, 404 if wrong community) |
| GET | `/lender/account` | `lender.account` | `@lender_required` | Account details + transaction history |

### URL Query Parameters

| Route | Parameter | Type | Example | Effect |
|---|---|---|---|---|
| `/lender/borrowers` | `min_score` | int | `?min_score=70` | Filter borrowers with score ≥ N |
| `/lender/borrowers` | `purpose` | string | `?purpose=Education` | Filter by loan purpose |

---

## 6. Data Storage — Tables and What They Hold

All data is stored in a MySQL database named `lendloop`. Schema file: `app/sql/schema.sql`.

---

### `communities`
The top-level tenant. Every user belongs to exactly one community. All listings are scoped to community to ensure closed-environment isolation.

| Column | Type | Notes |
|---|---|---|
| `community_id` | INT PK | Auto-increment |
| `community_name` | VARCHAR(255) | e.g. "121.ai Demo Community" |
| `community_type` | ENUM | company / university / cooperative / other |
| `is_active` | BOOLEAN | Inactive communities block login |

Seed row: `community_id = 1`, `"121.ai Demo Community"` — inserted automatically by schema.sql.

---

### `users`
Core auth table. One row per registered user.

| Column | Type | Notes |
|---|---|---|
| `user_id` | INT PK | |
| `community_id` | INT FK → communities | All listings filtered by this |
| `email` | VARCHAR(255) UNIQUE | Lowercased on save |
| `password_hash` | VARCHAR(255) | bcrypt hash (never plain text) |
| `role` | ENUM | `lender` or `borrower` |
| `is_active` | BOOLEAN | Inactive users cannot log in |
| `last_login` | TIMESTAMP | Updated on each successful login |

---

### `user_profile`
Extended profile data, separate from auth.

| Column | Type | Notes |
|---|---|---|
| `user_id` | INT FK → users (UNIQUE) | One profile per user |
| `full_name` | VARCHAR(255) | Set at signup; updated in assessment |
| `phone` | VARCHAR(20) | Set in assessment form |
| `date_of_birth` | DATE | Set in assessment form |
| `current_address` | TEXT | Set in assessment form |
| `years_at_address` | INT | Used in stability scoring |

---

### `lenders`
Financial state for each lender user. One row per lender, created at signup.

| Column | Type | Notes |
|---|---|---|
| `user_id` | INT FK → users (UNIQUE) | |
| `available_balance` | DECIMAL(12,2) | Cash available to lend; updated on deposit and loan disbursement |
| `total_deposited` | DECIMAL(12,2) | Cumulative deposits |
| `total_lent` | DECIMAL(12,2) | Cumulative amount lent out |
| `total_earned_interest` | DECIMAL(12,2) | Cumulative interest received |
| `active_loans` | INT | Count of current active loans |
| `completed_loans` | INT | Count of fully repaid loans |
| `total_loans_given` | INT | Lifetime loans made |

---

### `borrowers`
Scoring state and loan history for each borrower. One row per borrower, created at signup with `credit_history_score = 10` baseline.

| Column | Type | Notes |
|---|---|---|
| `user_id` | INT FK → users (UNIQUE) | |
| `credibility_score` | INT (0–100) | Composite score, recalculated on each assessment save |
| `identity_verification_score` | INT (0–20) | Component 1 |
| `financial_strength_score` | INT (0–30) | Component 2 |
| `credit_history_score` | INT (0–25) | Component 3 — baseline 10 at signup |
| `stability_score` | INT (0–15) | Component 4 |
| `platform_reputation_score` | INT (0–10) | Component 5 |
| `total_borrowed` | DECIMAL | Cumulative |
| `active_loans` | INT | Current active loans |
| `on_time_payments` | INT | Used in listing cards and scoring |
| `late_payments` | INT | |
| `defaulted_loans` | INT | |

---

### `borrower_assessments`
Raw form data submitted during assessment. One row per borrower (updated in place).

| Column | Type | Notes |
|---|---|---|
| `borrower_id` | INT FK → borrowers | |
| `full_name`, `date_of_birth`, `phone`, `email` | Various | Personal section |
| `current_address`, `years_at_address` | Various | Address section |
| `id_type` | ENUM | Passport / Driver's Licence / National ID |
| `id_number`, `id_expiry` | VARCHAR / DATE | Identity section |
| `employment_status` | ENUM | Employed / Self-employed / Unemployed / Student / Retired |
| `company_name`, `job_title`, `years_with_employer` | Various | Employed section |
| `business_name`, `years_in_business` | Various | Self-employed section |
| `salary_band` | ENUM | 7 bands (€ ranges, never raw salary) |
| `monthly_debt` | DECIMAL | Financial section |
| `self_reported_credit_score` | INT | 300–850 range expected |
| `loan_purpose` | ENUM | Business / Education / Medical / Home Improvement / Other |
| `reference_name`, `reference_relationship`, `reference_phone` | VARCHAR | Reference section |
| `score_total`, `score_identity`, `score_financial`, `score_credit_history`, `score_stability`, `score_reputation` | INT | Score snapshot at time of assessment |

---

### `loan_requests`
A borrower's posted loan request. Goes live immediately on submission.

| Column | Type | Notes |
|---|---|---|
| `request_id` | INT PK | |
| `borrower_id` | INT FK → borrowers | |
| `community_id` | INT FK → communities | Set from session; used for all lender listing queries |
| `amount` | DECIMAL | Requested loan amount in € |
| `purpose` | ENUM | Business / Education / Medical / Home Improvement / Other |
| `additional_notes` | TEXT | Optional, capped at 500 chars |
| `duration_months` | INT | Loan term |
| `receive_method` | ENUM | bank_transfer / platform_wallet |
| `status` | ENUM | active → offers_received → accepted / cancelled / expired |
| `offers_count` | INT | Incremented when a lender makes an offer (Sprint 3) |

---

### `loan_offers` *(Sprint 3)*
A lender's offer in response to a loan request.

| Column | Type | Notes |
|---|---|---|
| `offer_id` | INT PK | |
| `request_id` | INT FK → loan_requests | |
| `lender_id` | INT FK → lenders | |
| `offered_amount` | DECIMAL | May differ from requested amount |
| `interest_rate` | DECIMAL(5,2) | Annual % rate proposed by lender |
| `duration_months` | INT | |
| `monthly_payment` | DECIMAL | Calculated at offer creation |
| `total_repayable` | DECIMAL | |
| `status` | ENUM | pending → accepted / rejected / expired |

---

### `loans` *(Sprint 3)*
An active or completed loan — created when a borrower accepts an offer.

| Column | Type | Notes |
|---|---|---|
| `loan_id` | INT PK | |
| `borrower_id` | INT FK | |
| `lender_id` | INT FK | |
| `request_id`, `offer_id` | INT FK | Parent records |
| `principal_amount` | DECIMAL | |
| `interest_rate` | DECIMAL | |
| `monthly_payment` | DECIMAL | Fixed instalment |
| `total_repayable` | DECIMAL | |
| `start_date`, `end_date` | DATE | |
| `next_payment_date` | DATE | Used for repayment scheduling |
| `status` | ENUM | active / delinquent_30 / delinquent_60 / default / completed |

---

### `repayments` *(Sprint 3)*
Individual monthly instalment records, one per scheduled payment.

| Column | Type | Notes |
|---|---|---|
| `loan_id` | INT FK | |
| `amount` | DECIMAL | Total monthly payment |
| `principal_part` | DECIMAL | Portion reducing principal |
| `interest_part` | DECIMAL | Portion that is interest |
| `platform_cut` | DECIMAL | 15% of `interest_part` goes to LendLoop |
| `due_date` | DATE | |
| `payment_date` | TIMESTAMP | Null until paid |
| `is_late`, `days_late` | Boolean / INT | |
| `status` | ENUM | pending / completed / missed |

---

### `transactions`
Universal financial ledger. Every balance movement writes a row here.

| Column | Type | Notes |
|---|---|---|
| `user_id` | INT FK | The user whose balance changed |
| `transaction_type` | ENUM | deposit / loan_disbursement / repayment / interest_earned / platform_cut |
| `amount` | DECIMAL | |
| `balance_after` | DECIMAL | Balance snapshot after the transaction |
| `description` | VARCHAR(500) | Human-readable e.g. "Deposit via Bank Transfer" |
| `reference_type` | ENUM | loan / repayment / deposit / other |
| `reference_id` | INT | FK to the related record (optional) |

Currently written by: deposit route. Sprint 3 will add loan disbursement and repayment records.

---

### `messages` *(Sprint 4)*
In-platform messaging between lenders and borrowers.

| Column | Type | Notes |
|---|---|---|
| `sender_id`, `receiver_id` | INT FK → users | |
| `request_id` | INT FK | Optional — message tied to a loan request |
| `message_text` | TEXT | |
| `is_read`, `read_at` | Boolean / TIMESTAMP | |

---

### `notifications` *(Sprint 3+)*
In-app notification queue.

| Column | Type | Notes |
|---|---|---|
| `user_id` | INT FK | Recipient |
| `title` | VARCHAR(255) | Short notification header |
| `notification_type` | ENUM | loan_offer_received / offer_accepted / repayment_due / etc. |
| `is_read`, `read_at` | Boolean / TIMESTAMP | |

---

## 7. Route-to-Table Map

Which routes read from and write to which tables:

| Route | Reads | Writes |
|---|---|---|
| `POST /auth/signup` | `communities`, `users` | `users`, `user_profile`, `lenders` OR `borrowers` |
| `POST /auth/login` | `users`, `user_profile` | `users` (last_login) |
| `GET /borrower/dashboard` | `borrowers`, `loan_requests` | — |
| `GET /borrower/assessment` | `borrowers`, `users`, `user_profile`, `borrower_assessments` | — |
| `POST /borrower/assessment` | `borrowers`, `users`, `borrower_assessments`, `repayments`, `loans` (for score calc) | `borrower_assessments`, `borrowers` |
| `GET /borrower/assessment/view` | `borrowers`, `borrower_assessments` | — |
| `POST /borrower/request/new` | `borrowers` | `loan_requests` |
| `GET /borrower/lenders` | `lenders`, `users`, `user_profile` | — |
| `GET /lender/dashboard` | `lenders` | — |
| `POST /lender/deposit` | `lenders` | `lenders`, `transactions` |
| `GET /lender/borrowers` | `loan_requests`, `borrowers`, `users`, `user_profile` | — |
| `GET /lender/borrower/<id>` | `borrowers`, `users`, `user_profile`, `borrower_assessments`, `loan_requests` | — |
| `GET /lender/account` | `lenders`, `users`, `user_profile`, `transactions` | — |

---

## 8. Session and Auth Model

The app uses Flask's built-in server-side session (cookie stores a signed session ID, not raw data).

### Session Keys Set at Login / Signup

| Key | Value | Example |
|---|---|---|
| `session['user_id']` | INT | `42` |
| `session['role']` | String | `'lender'` or `'borrower'` |
| `session['community_id']` | INT | `1` |
| `session['full_name']` | String | `'Jane Murphy'` |

### Auth Decorators

**`@login_required`** — Used on any route that needs a logged-in user. Checks `session['user_id']`. Redirects to `/auth/login` if not set.

**`@lender_required`** — Extends `@login_required`. Also checks `session['role'] == 'lender'`. Returns `403 Forbidden` if role is wrong.

**`@borrower_required`** — Extends `@login_required`. Also checks `session['role'] == 'borrower'`. Returns `403 Forbidden` if role is wrong.

### Community Isolation

Every listing query includes `WHERE community_id = %s` using `session['community_id']`. This is enforced in SQL, not Python, so it cannot be bypassed by URL manipulation. A lender visiting `/lender/borrower/99` for a borrower in a different community gets a `404` — not a `403` — to avoid confirming the user exists.

### Password Security

Passwords are hashed with bcrypt (cost factor from bcrypt.gensalt() default = 12). Plain-text passwords are never stored, logged, or returned. The hash is stored in `users.password_hash`.

### Session Lifetime

Sessions expire after 1 hour of inactivity (`PERMANENT_SESSION_LIFETIME = 3600`). The session cookie is `HttpOnly` and `SameSite=Lax`.

---

## 9. Scoring Algorithm Summary

File: `app/blueprints/borrower/scoring.py`
Function: `calculate_credibility_score(assessment: dict, borrower_id: int) -> dict`

The score is recalculated fresh every time the borrower saves their assessment.

### Component Breakdown

| Component | Max Points | Key Inputs |
|---|---|---|
| Identity Verification | 20 | Email (+2 always), phone (+3), gov ID type+number (+10), years at address (+3 or +5) |
| Financial Strength | 30 | Salary band (2–15 pts from lookup table), low monthly debt (+5), self-reported credit score band (+2–10) |
| Credit History | 25 | Live DB query on `repayments` + `loans`; new users start at 10 baseline; +2 per on-time payment (capped at 20); +5 for zero defaults |
| Stability | 15 | Employment status (Employed +8, Self-employed +6, Retired +5, Student +3, Unemployed +2), years with employer/in business, residential years |
| Platform Reputation | 10 | Profile completeness (+2), reference provided (+3), account age in days (+0–5) |

### Score Labels

| Score | Label | Colour |
|---|---|---|
| 80–100 | Excellent | Green |
| 65–79 | Strong | Green |
| 50–64 | Good | Amber |
| 35–49 | Fair | Amber |
| 0–34 | Poor | Red |

### Salary Band Points Table

| Band | Points |
|---|---|
| Under €10,000 | 2 |
| €10,001–€20,000 | 5 |
| €20,001–€30,000 | 8 |
| €30,001–€40,000 | 11 |
| €40,001–€60,000 | 13 |
| €60,001–€80,000 | 14 |
| Over €80,000 | 15 |

---

## 10. What Is Not Yet Built

The following features appear in the UI as placeholders or are entirely absent. They are scheduled for Sprint 3 and Sprint 4.

| Feature | Sprint | Notes |
|---|---|---|
| Lender makes a loan offer | Sprint 3 | "Make an Offer" button exists on borrower profile but is inactive |
| Borrower views received offers | Sprint 3 | Sidebar link placeholder |
| Borrower accepts / rejects an offer | Sprint 3 | — |
| Loan activation (balance deducted from lender) | Sprint 3 | `loan_disbursement` transaction type ready in schema |
| Monthly repayment scheduling | Sprint 3 | `repayments` table ready, no routes yet |
| Repayment submission by borrower | Sprint 3 | — |
| Platform cut calculation (15% of interest) | Sprint 3 | `repayments.platform_cut` column ready |
| Notifications on offer / repayment events | Sprint 3 | `notifications` table ready, no routes yet |
| In-platform messaging | Sprint 4 | `messages` table ready, no routes yet |
| Credit History sidebar link | Sprint 3 | Placeholder in borrower sidebar |
| My Loans / Transactions / Returns (lender) | Sprint 3 | Placeholder sidebar links |
| Admin panel | Sprint 4+ | Community admin management |
| Email verification | Sprint 4+ | `is_email_verified` column exists, not enforced |

---

*This manual is maintained alongside the codebase. After each sprint commit, update the following:*
- *"Current Build" line at the top*
- *"Last Updated" date*
- *Feature reference tables (move items from "Not Yet Built" to active)*
- *Route reference table (add new routes)*
- *Route-to-table map (add new data flows)*
- *"What Is Not Yet Built" section (remove completed items)*
