# Sprint 1 — Foundation
**Dates:** April 23 – April 29, 2026
**Theme:** Build the skeleton everything else will live on
**Status:** IN PROGRESS

---

## Sprint Goal

By end of Sprint 1, any team member can:
1. Run the app locally
2. Register as a lender or borrower
3. Log in securely and land on their role-specific dashboard
4. Log out and have their session cleared

The codebase is clean, modular (Flask blueprints), and the database schema for all 12 MLP tables is live.

---

## User Stories

- As a new user, I want to sign up with my name, email, password, and role so I can access the platform
- As a returning user, I want to log in securely and go directly to my dashboard
- As a lender, I want to see my dashboard with my balance and navigation options
- As a borrower, I want to see my dashboard with my credibility score status and loan overview

---

## Tasks

### S1-01 — Project Restructure with Flask Blueprints
**Priority:** Critical

Refactor from single `app.py` to modular blueprint structure:

```
Project/
├── app.py               ← App factory, blueprint registration
├── config.py            ← DB config, secret key, settings
├── extensions.py        ← db connection, bcrypt, login_manager
├── blueprints/
│   ├── auth/
│   │   ├── __init__.py
│   │   └── routes.py    ← signup, login, logout
│   ├── lender/
│   │   ├── __init__.py
│   │   └── routes.py    ← lender dashboard, deposit, history, listings
│   ├── borrower/
│   │   ├── __init__.py
│   │   └── routes.py    ← borrower dashboard, assessment, request, history
│   └── core/
│       ├── __init__.py
│       └── routes.py    ← home, about, contact
├── templates/
│   ├── base.html
│   ├── auth/
│   ├── lender/
│   ├── borrower/
│   └── core/
└── static/
    ├── css/
    └── js/
```

**Acceptance:** `flask run` starts without errors; all blueprint URLs resolve.

---

### S1-02 — Database Schema: 12 MLP Tables
**Priority:** Critical

Create all tables in MySQL `lendloop` database. See `design/db_schema_mlp.md` for full DDL.

Tables to create:
1. `users`
2. `user_profile`
3. `communities`
4. `lenders`
5. `borrowers`
6. `borrower_assessments`
7. `loan_requests`
8. `loan_offers`
9. `loans`
10. `repayments`
11. `messages`
12. `notifications`

**Acceptance:** All tables exist; `DESCRIBE <table>` returns correct columns with correct types and constraints.

---

### S1-03 — User Signup
**Priority:** Critical

Route: `POST /auth/signup`

Fields: full_name, email, password, confirm_password, role (lender/borrower), community_id

Logic:
- Validate email uniqueness
- Validate password match + minimum 8 characters
- Hash password with bcrypt before storing
- Create `users` record → create `user_profile` record → create `lenders` or `borrowers` record
- Set Flask session, redirect to role dashboard

**Acceptance:** User can register; password in DB is a bcrypt hash (never plain text); duplicate email shows error.

---

### S1-04 — User Login
**Priority:** Critical

Route: `POST /auth/login`

Logic:
- Look up user by email
- Compare submitted password against bcrypt hash
- On success: set session, redirect by role
- On failure: return to login with generic error (do not reveal which field is wrong)

**Acceptance:** Correct credentials → dashboard. Wrong credentials → error. No plain text comparison.

---

### S1-05 — Logout + Route Protection
**Priority:** Critical

Route: `GET /auth/logout`
- Clear session, redirect to login

`@login_required` decorator (or equivalent):
- Any protected route redirects to login if no active session
- Lender routes reject borrower sessions and vice versa

**Acceptance:** Accessing `/lender/dashboard` without session → redirect to login. Borrower session cannot access lender routes.

---

### S1-06 — Base Template
**Priority:** Critical

`templates/base.html` — the visual foundation:

Design requirements:
- Clean, professional fintech aesthetic (trust signals: blue/white/dark palette)
- Responsive (mobile-first)
- Nav bar: logo + role-aware links + logout button
- Flash message block (success / error / info)
- Footer with LendLoop branding
- No Bootstrap dependency — custom CSS for control and distinctiveness

---

### S1-07 — Lender Dashboard Skeleton
**Priority:** High

Route: `GET /lender/dashboard`

Display (placeholders for now, wired to real data in Sprint 2):
- Available balance card
- Total deposited card
- Total lent card
- Active loans count
- Quick action buttons: Deposit Funds, Browse Borrowers, View History
- Empty state for recent activity

---

### S1-08 — Borrower Dashboard Skeleton
**Priority:** High

Route: `GET /borrower/dashboard`

Display:
- Credibility score card (shows "Not assessed yet" if no assessment)
- Active loan card (shows "No active loan" if none)
- Quick action buttons: Start Assessment, Post Loan Request, Browse Lenders
- Empty state for loan history

---

### S1-09 — Community Model in DB
**Priority:** High

Add `communities` table:
- `community_id`, `community_name`, `community_type` (company/university/cooperative/other), `created_at`

Add `community_id` to `users` table as a foreign key.

For MLP: create one default community called "121.ai Demo Community" so all users land in it during testing.

**Acceptance:** Every user record has a community_id; a user in community A cannot see users from community B (enforced in listing queries).

---

### S1-10 — Error Pages
**Priority:** Medium

Custom error templates:
- `404.html` — Page not found, with nav back to home
- `403.html` — Access denied
- `500.html` — Something went wrong

All use `base.html`, match platform styling.

---

## Definition of Done — Sprint 1

- [ ] Blueprint structure in place, app runs cleanly
- [ ] All 12 tables (+ communities) exist in MySQL
- [ ] User can register → login → see dashboard → logout
- [ ] Passwords stored as bcrypt hashes
- [ ] Route protection works (unauthenticated and wrong-role access blocked)
- [ ] Base template renders correctly on desktop and mobile
- [ ] Zero hardcoded passwords or secret keys in code (use config/env)
