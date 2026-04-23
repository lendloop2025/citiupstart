# 121.ai by LendLoop — Master Sprint Plan
**Total Duration:** 4 Weeks (+ Buffer)
**Start:** April 23, 2026
**MLP Target:** Last week of May 2026
**Methodology:** Agile Scrum — weekly sprints, each with a clear theme and acceptance criteria

---

## Sprint Overview

| Sprint | Week | Dates | Theme | Goal |
|---|---|---|---|---|
| **S1** | Week 1 | Apr 23 – Apr 29 | Foundation | Working auth, DB, dashboards |
| **S2** | Week 2 | Apr 30 – May 6 | Core Features | Credibility scoring + loan posting live |
| **S3** | Week 3 | May 7 – May 13 | Matching & Loan Flow | End-to-end loan journey functional |
| **S4** | Week 4 | May 14 – May 20 | Polish & MLP | Product feels finished and delightful |
| **Buffer** | — | May 21 – May 30 | Finalize | Testing, demo prep, presentation |

---

## Sprint 1 — Foundation (Apr 23–29)

**Goal:** A clean, secure skeleton the whole team can build on.

| ID | Task | Owner Hint | Priority |
|---|---|---|---|
| S1-01 | Restructure project with Flask blueprints (auth, lender, borrower, core) | Umer | Critical |
| S1-02 | Design and create 12 MLP database tables in MySQL | Umer / Phuong Mai | Critical |
| S1-03 | User signup: role selection (lender/borrower), bcrypt hashed password, DB write | Umer | Critical |
| S1-04 | User login: credential check, Flask session, redirect by role | Umer | Critical |
| S1-05 | Logout + session protection (login_required decorator) | Umer | Critical |
| S1-06 | Base Jinja2 template: responsive, professional fintech aesthetic, nav bar | Smruti | Critical |
| S1-07 | Lender dashboard skeleton: balance, nav links, stat card placeholders | Smruti | High |
| S1-08 | Borrower dashboard skeleton: score placeholder, active loan summary, nav | Smruti | High |
| S1-09 | Community model: users belong to a community (community_id in users table) | Phuong Mai | High |
| S1-10 | Error pages: 404, 403, 500 with on-brand styling | Smruti | Medium |

**Sprint 1 Done When:**
- A user can register as lender or borrower, log in, and see their role-specific dashboard
- Passwords are hashed (never plain text)
- Sessions expire on logout
- App runs cleanly with blueprint structure

---

## Sprint 2 — Core Features (Apr 30 – May 6)

**Goal:** Both sides of the platform have their primary action available.

| ID | Task | Owner Hint | Priority |
|---|---|---|---|
| S2-01 | Borrower credibility assessment form — all sections (personal, employment, financial, loan details) | Smruti | Critical |
| S2-02 | Credibility scoring algorithm — weighted 100-point system, salary bands | Phuong Mai | Critical |
| S2-03 | Store assessment + score in DB; link to logged-in borrower | Phuong Mai | Critical |
| S2-04 | Borrower assessment view page — display score with breakdown | Smruti | High |
| S2-05 | Borrower: post loan request (amount, purpose, salary band, duration) | Umer | Critical |
| S2-06 | Lender: deposit funds form — store to lender balance in DB | Umer | Critical |
| S2-07 | Borrowers listing page for lenders — real data, community-filtered, with credibility score badges | Smruti | Critical |
| S2-08 | Lenders listing page for borrowers — real data, community-filtered, with available balance | Smruti | High |
| S2-09 | Borrower profile page for lenders — full credibility breakdown, loan history | Smruti | High |
| S2-10 | Lender account page — balance, total deposited, total lent (real DB figures) | Smruti | Medium |

**Sprint 2 Done When:**
- A borrower can complete their credibility assessment and see their score
- A borrower can post a loan request
- A lender can deposit funds and browse scored borrowers within their community
- All displayed data comes from the database (no hardcoded sample data)

---

## Sprint 3 — Matching & Loan Flow (May 7–13)

**Goal:** The full loan lifecycle works end-to-end.

| ID | Task | Owner Hint | Priority |
|---|---|---|---|
| S3-01 | Matching algorithm: community-scoped, filters by amount compatibility + credibility threshold | Phuong Mai | Critical |
| S3-02 | Lender: make an offer on a borrower's loan request (amount, interest rate, duration) | Umer | Critical |
| S3-03 | Borrower: view received offers with lender profile and offer terms | Smruti | Critical |
| S3-04 | Borrower: accept or reject an offer — accepted offer creates a Loan record | Umer | Critical |
| S3-05 | Loan agreement view — summary page (borrower, lender, terms, amounts) | Smruti | High |
| S3-06 | Simulated disbursement — deduct from lender balance, mark loan as active | Phuong Mai | High |
| S3-07 | Repayment schedule generation — monthly instalments calculated on loan creation | Phuong Mai | High |
| S3-08 | Make a repayment — borrower submits repayment, DB updated, lender balance credited | Umer | High |
| S3-09 | Transaction history page — real data for both lender and borrower | Smruti | High |
| S3-10 | Loan status tracking — pending / active / completed / delinquent states | Phuong Mai | Medium |
| S3-11 | Lender returns page — how much lent, how much earned (interest), platform cut visible | Smruti | Medium |

**Sprint 3 Done When:**
- A lender can browse, pick a borrower, and make an offer
- A borrower can accept that offer and see their loan terms
- A repayment can be made and both balances update correctly
- Transaction history shows real data

---

## Sprint 4 — Polish & MLP (May 14–20)

**Goal:** The product feels trustworthy, complete, and genuinely delightful to use.

| ID | Task | Owner Hint | Priority |
|---|---|---|---|
| S4-01 | In-app notification system — loan offer received, offer accepted, repayment due, repayment received | Phuong Mai | High |
| S4-02 | Lender–borrower messaging — basic threaded chat per loan request | Smruti / Umer | High |
| S4-03 | Real dashboard statistics — balance, active loans, total lent/borrowed, score (all from DB) | Umer | Critical |
| S4-04 | Credit history tracking — log each repayment event, display borrower payment track record | Phuong Mai | High |
| S4-05 | Security: parameterized queries audit (no raw SQL string concat), CSRF tokens | Ojas | Critical |
| S4-06 | Security: input validation and sanitization across all forms | Ojas | Critical |
| S4-07 | Security: session hardening (timeout, secure cookies) | Ojas | High |
| S4-08 | UI polish — consistent colour palette, typography, spacing, button states | Smruti | High |
| S4-09 | Mobile responsiveness — all key pages work on phone screen | Smruti | High |
| S4-10 | Lender taxation summary — total lent, total earned, platform cut breakdown | Smruti | Medium |
| S4-11 | Empty states — no loans yet, no offers yet — with clear calls to action | Smruti | Medium |
| S4-12 | End-to-end demo flow rehearsal and any blocking bug fixes | All | Critical |

**Sprint 4 Done When:**
- The full borrower and lender journeys work without breakage
- The product looks polished and professional
- No SQL injection or XSS vulnerabilities
- A 5-minute demo can be run smoothly from signup to repayment

---

## Buffer — May 21–30

| Task | Notes |
|---|---|
| Full regression testing | All flows: signup, assessment, loan request, offer, acceptance, repayment |
| Performance check | No slow DB queries; pages load in under 2 seconds |
| Presentation prep | Slides, demo script, pitch talking points |
| Deployment | Confirm app runs cleanly for demo environment |
| Documentation | Any missing README or setup instructions |

---

## Backlog (Out of MLP Scope — Future Phases)

- Real payment gateway (Stripe / PayPal)
- Two-factor authentication (2FA)
- Encryption at rest for sensitive fields
- Fraud detection system
- Admin panel for enterprise community management
- Blockchain smart contracts for loan agreements
- Stripe Identity integration (live KYC)
- Central Credit Register API integration
- Enterprise licensing model
- Multi-community support (one platform, many orgs)
