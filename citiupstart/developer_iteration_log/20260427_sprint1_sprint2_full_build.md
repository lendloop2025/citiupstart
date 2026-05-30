# Developer Iteration Log — Sprint 1 & 2 Full Build
**Date:** 2026-04-27
**Session Type:** Full-stack Development (Sprints 1 and 2)
**Lead:** Claude Sonnet 4.6 (AI) + Umer Salim Khan
**Commit:** `f549c78` → branch `umer_dev`

---

## Overview

Two complete sprint deliverables built from scratch across two sessions, covering the entire foundation and core feature set of the 121.ai platform. All code lives under `app/`.

---

## Sprint 1 — Foundation

**Theme:** Get the skeleton standing. Auth, DB, blueprints, base UI.

### What Was Built

#### 1. Flask Application Factory (`app/app.py`)
- `create_app()` factory pattern — no global `app` object
- Registers four blueprints: `core` (`/`), `auth` (`/auth`), `lender` (`/lender`), `borrower` (`/borrower`)
- Registers `teardown_appcontext` to close DB on every request end
- Registers custom error handlers for 403, 404, 500

#### 2. Configuration (`app/config.py` + `app/.env.example`)
- All secrets read from environment variables via `python-dotenv`
- `Config` class with: `SECRET_KEY`, `MYSQL_HOST/USER/PASSWORD/DB/PORT`, session cookie flags
- `.env.example` committed as a template; actual `.env` is gitignored

#### 3. Database Layer (`app/utils/db.py`)
- `get_db()` — opens a per-request MySQL connection stored on Flask `g` object; reuses if already open
- `close_db(e=None)` — teardown hook that closes `g.db` if present
- `query(sql, params, one)` — executes SELECT, returns list of row dicts (or one dict with `one=True`)
- `execute(sql, params)` — executes INSERT/UPDATE/DELETE, auto-commits, returns `lastrowid`
- All queries use `%s` parameterized placeholders — no string interpolation, no SQL injection risk

#### 4. Auth Decorators (`app/utils/decorators.py`)
Three decorators, all checking Flask `session`:
- `@login_required` — redirects to `/auth/login` if no `session['user_id']`
- `@lender_required` — login check + role check; `abort(403)` if role ≠ `lender`
- `@borrower_required` — login check + role check; `abort(403)` if role ≠ `borrower`

#### 5. MySQL Schema (`app/sql/schema.sql`)
13 tables, all with `DROP TABLE IF EXISTS` and `SET FOREIGN_KEY_CHECKS = 0` for safe re-runs:

| Table | Purpose |
|---|---|
| `communities` | Tenant isolation — each deployment is a community |
| `users` | Core auth: email, bcrypt password hash, role, community_id |
| `user_profile` | Full name, phone, date of birth |
| `lenders` | Balance tracking: available_balance, total_deposited, total_lent, interest_earned |
| `borrowers` | Score components (5 columns), aggregate loan stats |
| `borrower_assessments` | Raw assessment form data (employment, salary band, ID, reference, etc.) |
| `loan_requests` | Borrower loan postings with status lifecycle |
| `loan_offers` | Lender offers against a loan request |
| `loans` | Active/completed loan records linking borrower + lender |
| `repayments` | Monthly instalment records with platform_cut column |
| `transactions` | Full double-entry ledger for lender balance movements |
| `messages` | In-platform messaging (Sprint 4 feature) |
| `notifications` | In-app notification queue |

Key schema decisions:
- `credit_history_score` defaults to `10` on borrower row creation (unknown ≠ bad baseline)
- `Driver's Licence` stored as `'Driver''s Licence'` (MySQL ENUM double-apostrophe escape)
- All FK columns have `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate
- `communities` gets one seed row: `"121.ai Demo Community"` for development

#### 6. Auth Blueprint (`app/blueprints/auth/routes.py`)
- **Signup** (`POST /auth/signup`): validates all fields, bcrypt-hashes password, inserts `users` + `user_profile` + role table (`lenders` or `borrowers`) in a single transaction using manual cursor + `db.commit()`. Sets session keys: `user_id`, `role`, `community_id`, `full_name`.
- **Login** (`POST /auth/login`): fetches user by email, `bcrypt.checkpw()`, updates `last_login`, sets session.
- **Logout** (`GET /auth/logout`): `session.clear()`, redirect to landing.

#### 7. Role Dashboards (Skeleton)
- `borrower/dashboard.html` — stat cards (credibility score, active loans, total borrowed, on-time payments), assessment banner if score = 0, quick actions
- `lender/dashboard.html` — stat cards (available balance, total deposited, total lent, interest earned), quick actions, active loans section

#### 8. Base Template & Design System (`app/templates/base.html` + `app/static/style.css`)
- 936-line CSS with full custom design token system (no Bootstrap)
- Dark navy palette: `#0A1628` (bg), `#111F38` (surface), `#2563EB` (accent), `#10B981` (green), `#F59E0B` (amber), `#EF4444` (red)
- Components built: navbar, sidebar layout, stat cards grid, buttons (primary/outline/sm), flash messages, badges, score pills, empty states, error pages, responsive breakpoints

---

## Sprint 2 — Core Features

**Theme:** The platform becomes usable end-to-end for borrowers and lenders.

### What Was Built

#### 1. Borrower Assessment Form (`app/templates/borrower/assessment_form.html`)
Six-section form covering:
- **Personal** — phone, DOB, years at address, residential status
- **Employment** — status selector with dynamic JS field toggling
- **Employed fields** — company, job title, years with employer
- **Self-employed fields** — business name, years in business
- **Financial** — salary band (ENUM ranges, never raw amounts), monthly debt obligations, credit score band
- **Identity** — government ID type + number
- **Reference** — name, phone, relationship

Dynamic field visibility: inline JavaScript listens to the employment status `<select>` and shows/hides employer vs. self-employed field blocks on change and on page load. Form pre-populates from existing assessment data if the borrower is returning to update.

#### 2. Credibility Scoring Algorithm (`app/blueprints/borrower/scoring.py`)
Single public function `calculate_credibility_score(assessment, borrower_id)` — called only within a Flask request context (so it can use `query()`).

**5-component 100-point system:**

| Component | Max | How Points Are Awarded |
|---|---|---|
| Identity Verification | 20 | +2 email (always), +3 phone, +10 gov ID, +3/+5 years at address |
| Financial Strength | 30 | Salary band lookup table (2–15 pts), +5 low monthly debt, +2–10 credit score band |
| Credit History | 25 | Live DB query on `repayments` + `loans`; new users get 10 baseline; +2/on-time payment (cap 20), +5 no defaults |
| Stability | 15 | Employment status (+2–8), years with employer/in business (+0–5), residential years (+0–2) |
| Platform Reputation | 10 | Profile completeness (+2), reference provided (+3), account age in days (+0–5) |

`score_label(score)` maps score to `{'label': 'Excellent/Strong/Good/Fair/Poor', 'css': 'green/amber/red'}`.

Salary band points table:
```
Under €10,000 → 2 | €10,001–€20,000 → 5 | €20,001–€30,000 → 8
€30,001–€40,000 → 11 | €40,001–€60,000 → 13 | €60,001–€80,000 → 14 | Over €80,000 → 15
```

#### 3. Borrower Routes — Full Rewrite (`app/blueprints/borrower/routes.py`)

| Route | Method | Description |
|---|---|---|
| `GET /borrower/` | GET | Dashboard — fetches `borrowers` row, active `loan_requests` row |
| `GET/POST /borrower/assessment` | GET+POST | Assessment form — UPDATE vs INSERT logic, calls scoring, updates both `borrower_assessments` and `borrowers` in one transaction |
| `GET /borrower/assessment/view` | GET | Score view with breakdown bars |
| `GET/POST /borrower/request/new` | GET+POST | Post a loan request (guards: score > 0, no existing active request) |
| `GET /borrower/lenders` | GET | Browse community lenders (filtered by `community_id`) |

Assessment save logic: checks for existing assessment row first. If found → `UPDATE`, if not → `INSERT`. Both paths share the same `vals` tuple structure. After DB write, calls `calculate_credibility_score()` and writes all 5 component scores + total back to the `borrowers` table.

#### 4. Lender Routes — Full Rewrite (`app/blueprints/lender/routes.py`)

| Route | Method | Description |
|---|---|---|
| `GET /lender/` | GET | Dashboard — fetches `lenders` row, active loans count |
| `GET/POST /lender/deposit` | GET+POST | Simulated deposit — updates `available_balance` + `total_deposited` on `lenders`, writes `transactions` record |
| `GET /lender/borrowers` | GET | Browse community loan requests — optional `?min_score=N&purpose=X` filter params |
| `GET /lender/borrowers/<id>` | GET | Borrower profile — validates `community_id` match (404 if cross-community) |
| `GET /lender/account` | GET | Account page — profile, stats, full transaction history |

Deposit route balance arithmetic:
```sql
UPDATE lenders
SET available_balance = available_balance + %s,
    total_deposited   = total_deposited   + %s
WHERE user_id = %s
```

Lender balance shown to borrowers: `FLOOR(available_balance / 100) * 100` — rounds to nearest €100 to protect exact balance privacy.

#### 5. Lender Templates

- **`borrowers.html`** — Filter bar with `onchange="this.form.submit()"` for instant filtering without a submit button. Score-colour-coded borrower cards (green/amber/red based on credibility score). Shows amount, purpose, duration, on-time payments, defaults.
- **`borrower_profile.html`** — Two-column layout: left sidebar has score circle, 5-component score breakdown bars, loan history stats table. Right main area has active loan request card and employment/financial profile table.
- **`deposit.html`** — Simple deposit form with balance display.
- **`account.html`** — Full account page: 6 stat cards, account details table, quick actions, full transaction history table with `tx-type` badges.

#### 6. Borrower Templates

- **`assessment_form.html`** — 6-section form, dynamic JS field toggling, full pre-population from existing data
- **`assessment_view.html`** — Score circle, 5-component breakdown with percentage bars (green/amber/red), score interpretation text
- **`request_form.html`** — Loan request form (amount, purpose, duration, notes)
- **`lenders.html`** — Community lenders listing for borrowers
- **`dashboard.html`** — Updated with real `url_for()` links (replaced all `href="#"` placeholders)

#### 7. CSS Additions (Sprint 2 appended to `style.css`)
New component classes added:
- `.score-circle`, `.score-circle-wrap`, `.score-circle-num`, `.score-circle-label`
- `.score-breakdown`, `.score-row`, `.score-bar-track`, `.score-bar-fill.green/amber/red`
- `.form-section`, `.form-section-title`
- `.cards-grid`, `.borrower-card`, `.card-top`, `.card-stats`, `.card-stat`
- `.avatar.green/amber/red`, `.score-pill.green/amber/red`, `.filter-bar`, `.filter-select`
- `.profile-layout`, `.profile-sidebar`, `.profile-main-content`, `.profile-score-card`
- `.info-table`, `.tx-table`, `.tx-type`
- `.deposit-page`, `.request-page`

---

## Key Engineering Decisions

| Decision | Rationale |
|---|---|
| `query()` / `execute()` helper split | Keeps SELECT vs write paths explicit; prevents accidental commits on reads |
| Manual cursor for multi-table auth inserts | `execute()` auto-commits; signup needs all-or-nothing — manual `db.commit()` with `try/except/rollback` |
| `dict(existing) if existing else {}` for form pre-population | mysql-connector rows are read-only mappings; must copy to dict before passing to Jinja2 for safe key access |
| `COALESCE()` in credit history SQL | Handles NULL → 0 for borrowers with no repayment history without Python-side logic |
| `one=True` variant on `query()` | Avoids index errors on single-row fetches; returns `None` cleanly if not found |
| Score written to both `borrower_assessments` and `borrowers` | Assessment stores raw inputs; borrowers table stores computed scores for fast JOIN-free listing queries |
| Community isolation on every listing query | Core product constraint — lenders and borrowers must never see cross-community data. Enforced in SQL `WHERE community_id = %s`, not Python filtering |
| Borrower profile cross-community guard | Route joins `borrowers` + `users` and checks `community_id` before returning; returns 404 (not 403) to avoid confirming a user exists |

---

## Files Created / Modified

### New files (Sprint 1)
```
app/app.py
app/config.py
app/.env.example
app/requirements.txt
app/sql/schema.sql
app/utils/__init__.py
app/utils/db.py
app/utils/decorators.py
app/blueprints/__init__.py
app/blueprints/auth/__init__.py
app/blueprints/auth/routes.py
app/blueprints/core/__init__.py
app/blueprints/core/routes.py
app/blueprints/lender/__init__.py
app/blueprints/lender/routes.py   (skeleton)
app/blueprints/borrower/__init__.py
app/blueprints/borrower/routes.py (skeleton)
app/static/style.css
app/templates/base.html
app/templates/core/landing.html
app/templates/auth/signup.html
app/templates/auth/login.html
app/templates/lender/dashboard.html
app/templates/borrower/dashboard.html
app/templates/errors/403.html
app/templates/errors/404.html
app/templates/errors/500.html
```

### New files (Sprint 2)
```
app/blueprints/borrower/scoring.py
app/templates/borrower/assessment_form.html
app/templates/borrower/assessment_view.html
app/templates/borrower/request_form.html
app/templates/borrower/lenders.html
app/templates/lender/borrowers.html
app/templates/lender/borrower_profile.html
app/templates/lender/deposit.html
app/templates/lender/account.html
```

### Fully rewritten (Sprint 2)
```
app/blueprints/borrower/routes.py
app/blueprints/lender/routes.py
app/static/style.css              (Sprint 2 classes appended)
app/templates/borrower/dashboard.html  (placeholder links replaced)
app/templates/lender/dashboard.html    (placeholder links replaced)
```

---

## Sprint 1 Completion Checklist

- [x] Blueprint structure (core, auth, lender, borrower)
- [x] 13 MLP tables in schema.sql
- [x] Signup → login → dashboard → logout flow
- [x] bcrypt password hashing
- [x] `@login_required`, `@lender_required`, `@borrower_required`
- [x] `base.html` responsive template with dark-navy fintech design
- [x] Lender dashboard skeleton
- [x] Borrower dashboard skeleton with assessment banner
- [x] Community model (communities table + community_id FK on users)
- [x] Error pages (403, 404, 500)
- [x] Zero hardcoded secrets (all via config/env)

## Sprint 2 Completion Checklist

- [x] Borrower assessment form (6 sections, dynamic JS)
- [x] 5-component credibility scoring algorithm (100-pt system)
- [x] Assessment view with score breakdown bars
- [x] Loan request posting (with guards)
- [x] Lender deposit (simulated balance arithmetic + transaction record)
- [x] Community borrowers listing for lenders (with score + purpose filters)
- [x] Borrower profile page for lenders (community-isolated)
- [x] Lender account page (stats + transaction history)
- [x] Community lenders listing for borrowers
- [x] All dashboard sidebar placeholder links replaced with real `url_for()` calls

---

## Open Items for Sprint 3

- [ ] Lender makes an offer on a borrower's loan request
- [ ] Borrower reviews offers and accepts one
- [ ] Loan activation — `loans` row created, `loan_requests` status → `funded`
- [ ] Repayment scheduling (monthly instalment generation)
- [ ] Lender balance deducted on offer acceptance
- [ ] Notifications on offer sent / offer accepted
