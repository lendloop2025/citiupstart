# 121.ai by LendLoop — Full Project Context
**Last Updated:** 2026-04-23
**Purpose:** Single shareable file for any session to get complete project context without scanning the full repository.

> **Naming Convention:** The **product** is called **121.ai**. The **company** is called **LendLoop**. Example: "121.ai is built by LendLoop."

---

## 1. What Is 121.ai?

**121.ai** is a **closed-environment, peer-to-peer lending platform** built by the company **LendLoop**. It is NOT a public marketplace like Bondora or LendingClub. Instead, it is deployed at the **enterprise or community level** — connecting lenders and borrowers who are already members of the same defined community (e.g., employees of a company, students of a university, members of a cooperative).

The key differentiator: **trust is bounded by the community**. Everyone on the platform knows they are transacting with peers from within their own group, which lowers risk, increases accountability, and makes the product fundamentally different from open P2P platforms.

The formal definition of "community" is documented in the IDF (Invention Disclosure Form) — a legal/IP document filed by the LendLoop team.

---

## 2. The Problem It Solves

Within any closed community (company, school, co-op), members often face short-term liquidity needs. Traditional banks are slow and impersonal. Informal borrowing between colleagues is unstructured and creates social friction. 121.ai provides:
- A structured, transparent, trust-enabled lending environment
- Fair credibility assessment within the community context
- A clear repayment framework that protects both parties
- All within the community's own digital environment

---

## 3. Team

| Name | Role |
|---|---|
| Umer Salim Khan | Team Lead + Web Developer/ Full-stack Developer|
| Giovanni | Business Executive |
| Jorge | Risk Assesser |
| Phuong Mai | FinTech Developer |
| Smruti | Web Developer + Cloud Developer|
| Ojas | Security & Vulnerability Assesser |

---

## 4. Business Model

### Revenue (Early Stage)
- LendLoop earns **15% of the interest** paid by the borrower during repayment
- This can drop to **10%** depending on the number of active third-party integrations at a given point
- Enterprise/community clients are **not charged** in the early stage — adoption comes first

### What Is NOT Decided Yet
- Platform fees (e.g., origination fee %)
- Late payment penalty amounts
- Enterprise licensing fees (future phase)

### B2B2C Model
- LendLoop (company) → deploys 121.ai (product) → Enterprise/Community (client) → Members (end users)
- Enterprise deploys 121.ai for their community
- Members are the actual lenders and borrowers

---

## 5. Verification & Credibility

Verification is **multi-layered** and not locked to any single provider. Approach includes (but is not limited to):

1. **Platform's own credibility scoring system** (primary, always active)
2. **Central Credit Registration** (Ireland) — for credit history
3. **Bank verification** — case-by-case basis
4. **Stripe Identity** — for government document and selfie verification

### Credibility Score (0–100 points)

| Component | Max Points | Key Factors |
|---|---|---|
| Identity Verification | 20 | Gov ID=10, Address=5, Phone=3, Email=2 |
| Financial Strength | 30 | Income verification=10, Bank statement=10, Debt-to-Income=10 |
| Credit History | 25 | Credit score=15, Repayment history=10 |
| Stability | 15 | Employment duration=8, Residential stability=7 |
| Platform Reputation | 10 | Successful repayments=5, Profile completeness=3, Responsiveness=2 |

**Important:** Use **salary bands (ranges)** — not raw salary numbers — per mentor guidance.
- Phase 1: Score based on salary grade + years with employer
- Phase 2: Integrate data from Central Bank or 3rd party APIs

---

## 6. Core User Journeys

### Borrower Journey
```
Register → Email/Phone Verification → Credibility Assessment (KYC form)
→ Score Generated → Post Loan Request (amount, purpose, duration)
→ Listed to Lenders in Community → Receive Offer(s) → Accept Offer
→ Funds Disbursed → Repayment Active → Paid in Full
                                     ↘ Delinquent_30 / Delinquent_60 / Default_90
```

### Lender Journey
```
Register → Email/Phone Verification → Identity Verified
→ Deposit Funds → Browse Community Borrowers (with credibility scores)
→ View Borrower Profile + History → Make Offer (amount, rate, duration)
→ Offer Accepted → Loan Note Issued → Receiving Repayments
→ Returns: [Reinvesting | Platform Cut | 3rd Party Cut] | Default Event
```

---

## 7. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | Python Flask | Blueprints for modular structure |
| Database | MySQL | Local for dev; cloud for prod |
| Frontend | Jinja2 + HTML/CSS | Professional fintech aesthetic |
| Auth | Flask-Login + bcrypt | Session-based, hashed passwords |
| KYC | Multi-provider | See Section 5 |

---

## 8. Database — MLP Scope (12 Core Tables)

| Table | Purpose |
|---|---|
| users | Auth credentials, role, account status |
| user_profile | Full name, DOB, address, phone, photo |
| lenders | Balance, total deposited/lent, preferences, stats |
| borrowers | Credit score, credibility score, loan stats, limits |
| borrower_assessments | Full KYC form data (22+ fields) |
| loan_requests | Borrower loan postings (amount, purpose, duration) |
| loan_offers | Lender offers on requests |
| loans | Active/completed loans (full lifecycle) |
| repayments | Individual repayment records |
| transactions | Universal financial ledger |
| messages | Chat between lender and borrower |
| notifications | In-app alerts and events |

Full 25-table schema (production) is documented in `schema/drafts/complete_db_schema_doc.md`.

---

## 9. Sprint Plan — 4 Weeks to MLP

**Constraint:** Starting from scratch. MLP by last week of May 2026. 4 development weeks.

| Week | Dates | Theme | Key Deliverables |
|---|---|---|---|
| **1** | Apr 23–29 | Foundation | Project structure, DB setup (12 tables), Auth (signup/login/sessions/bcrypt), Role-based routing, Base UI template, Lender + Borrower dashboard skeletons |
| **2** | Apr 30–May 6 | Core Features | Borrower credibility assessment + scoring, Loan request posting, Lender fund deposit, Real listings (borrowers for lenders, lenders for borrowers), Credibility score display |
| **3** | May 7–13 | Matching & Loan Flow | Matching algorithm (community-scoped), Lender makes offer, Borrower accepts/rejects, Loan created on acceptance, Repayment simulation, Transaction history |
| **4** | May 14–20 | Polish & MLP | In-app notifications, Lender–borrower messaging, Real dashboard stats, Credit history tracking, Security (input validation, SQL safety, basic 2FA), UI polish & delight |
| Buffer | May 21–30 | Finalize | Testing, bug fixes, demo prep, presentation |

---

## 10. System Architecture (High Level)

```
Community Members (Borrowers + Lenders)
          │
          ▼
┌─────────────────────────────────┐
│          121.ai Platform         │
│  ┌─────────────────────────┐    │
│  │   Matching Engine       │    │
│  │   (community-scoped)    │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │   Compliance Layer      │    │
│  │   (KYC, scoring, AML)   │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│   Loan Lifecycle Engine         │
│   Offer → Agreement → Disburse  │
│   → Repayment → Completion      │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│   3rd Party Integrations        │
│   (Stripe Identity, CCR, Bank)  │
└─────────────────────────────────┘
```

---

## 11. Regulatory Context (Direction Only — Not Dev Bible)

- Irish market: ECSPR (European Crowdfunding Service Providers Regulation) via Central Bank of Ireland
- GDPR compliance required for data handling
- KYC/AML requirements apply
- Capital requirement estimates: €120k minimum, €250k recommended for sustainable launch
- These are informational — regulatory implementation is a later-phase concern

---

## 12. Key Product Decisions & Mentor Guidance

- Use **salary bands** not raw salary numbers
- **No enterprise charge in early stage** — revenue from interest split only
- **Closed community** is the product's identity — not a public marketplace
- Blockchain smart contracts: **future phase only**
- Lender **taxation summary** (how much lent, how much earned) to be included in the product
- Matching should be **community-scoped** — only match within the same deployed community

---

## 13. Competitor Research

- Bondora (public P2P) — studied via Kaggle dataset for loan data patterns
- 121.ai differentiates by being closed-environment, not competing with Bondora directly

---

## 14. Broader Impact — Bridging the Credit Invisibility Gap

> *Millions of people are financially capable but financially invisible.*

One of the most overlooked challenges facing governments, banks, and financial institutions today is the **absence of credit history** for a growing segment of the population — international students, immigrants, refugees, and first-time borrowers. These individuals are not high-risk; they are simply *unknown* to the system. Without a credit trail, they cannot access mortgages, personal loans, or even basic financial products — regardless of how responsible or capable they are.

**121.ai, built by LendLoop, is uniquely positioned to solve this.**

By operating within closed communities — universities, workplaces, cooperatives — 121.ai gives credit-invisible individuals a structured, safe, and community-backed environment to begin building a **verifiable financial identity**. Every loan requested, every repayment honoured, every credibility point earned is a data point that simply did not exist before. Our assessment framework is strict enough to be meaningful, yet flexible enough to accommodate those starting from zero.

### Value Created — Layer by Layer

| Beneficiary | What 121.ai Provides |
|---|---|
| **Governments** | Real-world credit behaviour data for populations entirely absent from national credit registers — supports evidence-based policy for financial inclusion, housing, and immigration integration |
| **Banks & Financial Institutions** | A trusted, structured onboarding pathway for "new to bank" customers — 121.ai credibility records serve as a first-signal of reliability before a formal bank relationship begins |
| **Individuals** | A dignified, community-backed route into the formal financial system — a portable, growing financial identity built day by day, loan by loan |

### Why This Matters at Scale

The populations most affected — international students, economic migrants, first-time earners — represent tens of millions of people globally who are locked out of financial opportunity not by their character, but by the absence of a record. 121.ai does not just facilitate peer lending. It **generates the credit infrastructure that governments and banks need but cannot build themselves**, because it requires the exact kind of trusted, closed-community context that 121.ai is built for.

This is 121.ai's long-term strategic value — and LendLoop's core mission: not just the loan, but the **verified financial history** that every repayment creates — and the doors that history can open.

---

## 15. File Locations (Repository)

| What | Path |
|---|---|
| Working project code | `Project/app.py` + `Project/templates/` |
| Project workspace | `Project_claude/` |
| Original DB schema (25 tables) | `schema/drafts/complete_db_schema_doc.md` |
| SQL scripts (current tables) | `sql_scripts/citi_upstart.sql` |
| KYC requirements draft | `company_building_resources/Drafts/kyc_rough_draft_jan_2026.txt` |
| Credibility assessment spec | `company_building_resources/Drafts/BORROWER CREDIBILITY ASSESSMENT jan 2026.txt` |
| Capital requirements | `company_building_resources/Drafts/capital_requirement_draft_deepseek_assisted.md` |
| 3rd party notes | `company_building_resources/detail_on_3rd_party_march03_2026.txt` |
| Architecture diagram | `Diagrams/high_level_system_architecture_deepseek_mermaid_20260314_f8510c.png` |
| Borrower lifecycle diagram | `Diagrams/borrower_lifecycle_state_updated.png` |
| Lender lifecycle diagram | `Diagrams/Lender_Lifecycle_state_simplified_updated.png` |
| Sprint board screenshots | `sprints/sprint 1 and 2.jpeg`, `sprint 3 and 4.jpeg`, `sprint 5 and 6.jpeg` |
| IDF (community definition) | `IDF/Invention_Disclosure_Form_Team_LendLoop_Product_121.ai_dated_till_08_April_2026.pdf` |
| Developer iteration logs | `Project_claude/developer_iteration_log/` |
