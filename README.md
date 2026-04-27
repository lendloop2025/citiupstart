# 121.ai by LendLoop | Project Workspace

**Product:** 121.ai — Closed-Environment Peer-to-Peer Lending Platform
**Company:** LendLoop
**Competition:** NCI Citi UpStart Hackathon
**Target:** Most Lovable Product (MLP) by last week of May 2026
**Development Start:** April 23, 2026

---

## The Core Idea

**121.ai** is a **closed-environment P2P lending platform** built by LendLoop, deployed at the enterprise or community level. Unlike public P2P marketplaces, 121.ai connects peers *within a defined community* — such as a company, university, cooperative, or any organisation — enabling members to lend to and borrow from each other inside that trusted group.

The enterprise (school, company, etc.) deploys 121.ai for their community. LendLoop does not charge the enterprise in the early stage. Revenue comes solely from a percentage of interest paid by borrowers during repayment.

Full definition of "community" is formally documented in the IDF (Invention Disclosure Form).

---

## Team

| Name | Role |
|---|---|
| Umer Salim Khan | Team Lead + Web Developer/ Full Stack Developer |
| Giovanni | Business Executive |
| Jorge | Risk Assesser |
| Phuong Mai | FinTech Developer |
| Smruti | Web Developer + Cloud Developer|
| Ojas | Security & Vulnerability Assesser |

---

## Business Model (Early Stage)

- **Who pays:** LendLoop earns from borrower repayments only
- **How:** 15% of interest paid by the borrower goes to the platform; this can reduce to 10% depending on the number of third-party integrations active at a given point
- **Enterprise clients:** Not charged in early stage — the goal is adoption first
- **Fee structures** (platform fees, late payment charges, etc.) are **not decided** — to be determined in a later phase

---

## Verification Approach

Identity and credibility verification is multi-layered and not locked to a single provider. May include, but is not limited to:
- Platform's own credibility scoring system
- Central Credit Registration
- Bank verification (case-by-case basis)
- Stripe Identity

---

## Tech Stack

- **Backend:** Python Flask
- **Database:** MySQL
- **Frontend:** Jinja2 + CSS
- **Auth:** Session-based with bcrypt password hashing
- **KYC:** Multi-provider approach (score-based + 3rd party as applicable)

---

## Workspace Structure

```
Project_claude/
├── README.md                             
├── project_context/
│   └── lendloop_project_context.md        ← Full shareable project context
├── sprints/
│   ├── sprint_plan.md                     ← Master 4-week sprint plan
│   ├── sprint_1.md
│   ├── sprint_2.md
│   ├── sprint_3.md
│   └── sprint_4.md
├── design/
│   ├── architecture.md
│   ├── db_schema_mlp.md
│   ├── user_flows.md
│   └── scoring_algorithm.md
└── developer_iteration_log/
    ├── 20260423_project_inception.md
    └── [YYYYMMDD_description.md / folders for debug & updates]
......
......
......
```

---

## A Bigger Picture — Bridging the Credit Invisibility Gap

> *Millions of people are financially capable but financially invisible.*

One of the most overlooked challenges facing governments, banks, and financial institutions today is the **absence of credit history** for a growing segment of the population — international students, immigrants, refugees, and first-time borrowers. These individuals are not high-risk; they are simply *unknown* to the system. Without a credit trail, they cannot access mortgages, personal loans, or even basic financial services — no matter how responsible they are.

**121.ai changes that.**

By operating within closed communities — universities, workplaces, cooperatives — 121.ai gives credit-invisible individuals a structured, safe environment to begin building a **verifiable financial identity**. Every loan requested, every repayment made on time, every credibility score earned is a data point that did not exist before. Our assessment framework is strict enough to be meaningful, yet flexible enough to accommodate those starting from zero.

This creates a powerful secondary value:

- **For governments** — access to granular, real-world credit behaviour data for populations that are entirely absent from national credit registers. This supports better policy for financial inclusion, housing, and immigration integration.
- **For banks** — a trusted, structured onboarding pathway for "new to bank" customers. Instead of rejecting someone with no history, banks can reference a 121.ai credibility record as a first signal of reliability.
- **For the individual** — a dignified, community-backed route into the formal financial system. Day by day, loan by loan, they build a record that speaks for them.

121.ai is not just a lending platform. It is **financial infrastructure for the underserved** — and the data it generates is as valuable as the loans it enables.

---

## Core User Journeys (MLP)

**Borrower:**
Register → Credibility Assessment → Post Loan Request → Matched with Lenders → Accept Offer → Repay Loan

**Lender:**
Register → Deposit Funds → Browse Verified Borrowers in Community → Make Offer → Receive Repayments + Interest

---

## Timeline

| Week | Dates | Focus |
|---|---|---|
| 1 | Apr 23 – Apr 29 | Foundation: auth, DB, base UI, dashboards |
| 2 | Apr 30 – May 6 | Core Features: assessment, loan request, listings |
| 3 | May 7 – May 13 | Matching & Loan Flow: offers, acceptance, repayment |
| 4 | May 14 – May 20 | Polish & MLP: notifications, stats, security, UI delight |
| Buffer | May 21 – May 30 | Testing, demo prep, presentation |
