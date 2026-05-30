# 121.ai by LendLoop — Production System Design

**Version:** 1.0
**Date:** April 27, 2026
**Status:** Forward-looking architecture for post-MLP production deployment
**Author:** System Design (assisted)

---

## 0. Executive Summary

This document defines the **production-ready architecture** for 121.ai — the closed-community P2P lending platform built by LendLoop. It builds on the MLP architecture already documented (`architecture.md`, `db_schema_mlp.md`, `scoring_algorithm.md`) and adds everything needed to operate the platform safely, legally, and at scale in a real organisational deployment.

The design is optimised for three constraints that matter most for a startup at your stage:

1. **Regulatory safety** — fintech is unforgiving; one compliance mistake can end the company
2. **Limited capital** — every architectural decision factors in monthly cost and ops burden
3. **Scalability runway** — what you build today must hold up at 100x users without a rewrite

The headline architectural choices:

| Concern | Choice | Why |
|---|---|---|
| Money custody | **Stripe Connect (platform model)** — Stripe holds funds, you orchestrate | Avoids needing your own e-money/lending licence in v1 |
| Cloud hosting | **Render or Fly.io for app, Supabase for Postgres** | ~$200/mo at launch, no DevOps team needed |
| Database | **PostgreSQL** (not MySQL) | Better RLS, JSONB, financial-grade ACID, ecosystem |
| Identity / KYC | Stripe Identity | EU-ready, document + selfie + database checks |
| Auth | **WorkOS** (enterprise SSO + work-email verification) | B2B2C requires SAML/SCIM from day 1 |
| AML | **ComplyAdvantage** | Sanctions/PEP/adverse media screening |
| Risk scoring | **Deterministic 100-pt model + LLM as advisor** | Regulatory: decisions must be explainable |
| Contracts | **Dropbox Sign API** (formerly HelloSign) | Legally binding e-signature, fair pricing |
| Email/SMS | **Postmark + Twilio** | Postmark for deliverability, Twilio for SMS/2FA |
| Edge / WAF | **Cloudflare** (free tier → Pro at $20/mo) | DDoS, WAF, bot protection, CDN in one |
| Observability | **Sentry + Better Stack** (or Datadog at scale) | Errors + logs + uptime for ~$50/mo at start |
| Compliance | **Vanta** for SOC 2 prep, **GDPR** built into schema | Necessary for enterprise sales |

**Estimated v1 production cost:** $250–600/month
**Estimated cost at 5,000 active users:** $2,000–5,000/month

---

## 1. The Regulatory Reality (Read This First)

Everything below depends on getting this right. There is no architecture that can compensate for a regulatory misstep.

### 1.1 What you are doing, in legal terms

You are operating a platform that:
- Brings together lenders and borrowers (matchmaking)
- Holds and moves their money (or arranges for it to move)
- Earns a fee from the loan transaction
- Issues binding loan agreements

In the EU, that maps to **crowdfunding lending services** under **Regulation (EU) 2020/1503 (ECSPR)**, supervised in Ireland by the **Central Bank of Ireland**. The capital requirement is €25K–€150K depending on services offered, plus governance, conduct-of-business, prudential, and disclosure obligations. The application process is 6–12 months.

### 1.2 The two viable paths to launch

**Path A — Become the licensed entity (long, expensive, defensible moat)**

- Apply for ECSPR authorisation
- ~€120–250K total readiness cost (legal, capital, governance, audit)
- 6–12 months to authorisation
- Best long-term position; needed for marketplace at scale

**Path B — Don't be the licensed entity (recommended for v1)**

You do **not** custody funds, you do **not** issue loans, you do **not** make credit decisions on behalf of a regulated lender. Instead, you operate as one of:

1. **Software-as-a-service to enterprises** — the *enterprise* (the closed community) is the lender, and the platform is internal-use software for them. Inter-employee lending facilitated by an HR/benefits framework can sit *outside* ECSPR if structured as a benefit programme rather than a credit market. Your IDF's "closed community" framing actively supports this.
2. **Tech provider to a licensed partner** — partner with a regulated firm (e.g., a FinTech bank or an authorised crowdfunding service provider) who issues the loans on-platform. You provide the tech; they take the regulated risk.
3. **Stripe Connect "platform" model** — Stripe is the regulated money-mover. You never touch funds; Stripe holds them in segregated accounts and moves them per your platform's instructions. This is how Uber, Lyft, Shopify, DoorDash all work.

> **The recommended v1 stance:** combine option 1 (closed-community framing, employer-mediated) with option 3 (Stripe Connect for money movement). You launch as **enterprise software** — not a public lending marketplace — and Stripe handles every euro.

### 1.3 What this means for the product

- Every closed community is contracted to LendLoop as an enterprise client (even if free in early stage)
- The contract includes a clause that the community sponsors the lending environment
- Inter-member loans are framed as **community-facilitated peer support**, not public crowdfunded credit
- LendLoop's revenue is a **technology service fee** (15% of interest), not a credit intermediation fee
- The product never holds money; Stripe Connect Standard or Custom accounts do

This is the same legal posture used by employer salary-advance platforms (Wagestream, DailyPay, Hastee). Get a fintech-specialist law firm in Dublin to confirm structure before launch — budget €5–15K for the opinion letter. **This is not optional.**

### 1.4 Other compliance pillars

| Regime | What you must do | How |
|---|---|---|
| **GDPR** | Lawful basis, DSR (Data Subject Rights) flows, DPA with every vendor, EU data residency, breach notification, DPIA | Built into schema (audit log, deletion API), DPO designation, vendor DPAs |
| **AML 5/6** | KYC, ongoing monitoring, sanctions screening, suspicious activity reporting | stripe identity + ComplyAdvantage; SAR workflow in admin panel |
| **PSD2 / SCA** | Strong Customer Authentication for any payment | Stripe handles SCA automatically |
| **DAC7** | Reporting earnings of platform users to tax authorities | Stripe 1099/DAC7 reporting features |
| **eIDAS** | Qualified e-signatures for legally binding contracts | Dropbox Sign supports eIDAS Advanced |
| **Consumer Credit (CCD II)** | If lending to consumers: pre-contractual info, APR disclosure, withdrawal right | Generated as part of contract flow |

---

## 2. High-Level Production Architecture

```
                                 ┌──────────────────────────────┐
                                 │   Cloudflare (Edge)          │
                                 │   WAF · DDoS · CDN · Bot Mgmt│
                                 └─────────────┬────────────────┘
                                               │ TLS 1.3
                ┌──────────────────────────────┼─────────────────────────────┐
                │                              │                             │
                ▼                              ▼                             ▼
    ┌─────────────────────┐       ┌────────────────────┐         ┌──────────────────┐
    │  Marketing Site     │       │   App Frontend     │         │   Admin Panel    │
    │  Webflow / Astro    │       │ React Next.js 
                                          (or Flask    │         │   (Internal Only)│
    │                     │       │ + Jinja for MLP)   │         │   IP-allowlisted │
    └─────────────────────┘       └─────────┬──────────┘         └────────┬─────────┘
                                            │                             │
                                            │ HTTPS / JSON-API            │
                                            ▼                             ▼
                            ┌───────────────────────────────────────────────┐
                            │         API Gateway / App Server              │
                            │     FastAPI + Gunicorn  (on Render/Fly.io)      │
                            │     Stateless · Horizontally scalable         │
                            └───────────────────┬───────────────────────────┘
                                                │
        ┌───────────────────────────────────────┼─────────────────────────────────┐
        │                       │               │              │                  │
        ▼                       ▼               ▼              ▼                  ▼
  ┌──────────┐          ┌───────────┐    ┌───────────┐  ┌───────────┐    ┌────────────────┐
  │PostgreSQL│          │   Redis   │    │  Object   │  │ Job Queue │    │  Search        │
  │(Supabase │          │ (Upstash) │    │  Storage  │  │ Celery +  │    │  pgvector for  │
  │ or RDS)  │          │ Cache·    │    │  Supabase │  │   Redis   │    │  LLM context   │
  │          │          │ Sessions  │    │   or S3   │  │           │    │                │
  └──────────┘          └───────────┘    └───────────┘  └───────────┘    └────────────────┘
        │
        │ Encrypted-at-rest (AES-256)
        │ Row-Level Security per community
        │ Daily backups, PITR
        ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                       External Service Integrations                    │
  ├──────────────┬──────────────┬──────────────┬──────────────┬────────────┤
  │   Stripe     │   WorkOS     │  Stripe 
                                  Identity     │ ComplyAdvtg  │ Postmark   │
  │   Connect    │  (SSO/Auth)  │   (KYC)      │   (AML)      │ (Email)    │
  ├──────────────┼──────────────┼──────────────┼──────────────┼────────────┤
  │   Twilio     │  Dropbox     │   OpenAI/    │   Sentry     │  Vanta     │
  │   (SMS/2FA)  │  Sign        │   Anthropic  │ (Errors)     │ (Compliance)│
  └──────────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

---

## 3. Tech Stack Decisions Explained

### 3.1 Backend: keep FastAPI, but professionalize it


- **FastAPI 3.x + Gunicorn** behind an Nginx reverse proxy (managed by Render/Fly platforms)
- **Marshmallow** for request/response schema validation (or **Pydantic v2** if you want best-in-class)
- **FastAPI-Login** + **Authlib** for OIDC/SSO
- **FastAPI-Limiter** for per-user/per-IP rate limiting
- **SQLAlchemy 2.x** ORM (drop raw `mysql.connector` — type safety, migrations, query composition)
- **Alembic** for schema migrations (never run raw SQL against prod)
- **Celery** for background jobs (KYC checks, score recomputation, payment reconciliation, email sending)

### 3.2 Why PostgreSQL instead of MySQL

- **Row-Level Security (RLS)**: enforce community isolation at the database level, not the query level. Even a buggy query cannot leak across tenants.
- **JSONB**: store flexible fields (assessment versions, audit metadata) natively
- **pgvector**: store and search embeddings for LLM-based document analysis without a separate vector DB
- **Better transactional guarantees** for financial workloads (true SERIALIZABLE isolation)
- **Generated columns, partial indexes, advanced constraints**
- Supabase ecosystem — managed Postgres + auth + storage + edge functions in one platform

### 3.3 Frontend: phased approach

|  | Frontend | Why |
|---|---|---|
| Production | Next.js 15 (React) + Tailwind + shadcn/ui | Required for mobile feel, real-time UX, code reuse with native apps later |


### 3.4 Storage layout

| Data type | Where | Why |
|---|---|---|
| Structured business data | PostgreSQL | Relational, transactional, queryable |
| Sessions | Redis | Fast, expirable, server-side validated |
| Cached query results | Redis | TTL-based invalidation |
| Uploaded documents (ID, payslips) | Supabase Storage / S3 | Encrypted-at-rest, signed URLs only |
| Documents during KYC | **Stripe Identity storage** — never touch them | Reduces your PCI/PII scope drastically |
| Generated PDFs (loan agreements) | S3 with KMS encryption | Long retention, signed access |
| LLM embeddings | pgvector in Postgres | One database to back up |
| Logs | Better Stack / Datadog | Structured JSON, searchable |
| Audit log | Postgres `audit_log` table (append-only) | Regulatory: must survive even in admin compromise scenario |

### 3.5 Background jobs

Anything that takes more than ~200ms or can fail and retry should be a background job:

- KYC submission and result polling
- AML re-screening (daily cron)
- Score recalculation when external data arrives
- Repayment due-date notifications (24h, 3d, 0d before)
- Payment reconciliation against Stripe webhooks
- PDF generation for contracts and tax summaries
- Email/SMS sending
- Report generation (admin dashboards)
- Data deletion (GDPR DSR)

Use **Celery** with **Redis as broker**. For scheduled jobs, **Celery Beat** is fine at start; move to **Temporal** if/when workflows get complex (multi-step KYC with branching, for example).

---

## 4. Authentication, Identity & Verification

This is the most security-sensitive part of the platform. Spend disproportionate effort here.

### 4.1 The full identity stack, end-to-end

```
1. Sign-up
   ├── Work email submitted
   ├── Email domain verified against community's allowed domains
   └── Verification email with one-time link (Postmark)
        │
        ▼
2. Identity proof (KYC)
   ├── Government ID (passport / driving licence / national ID)
   ├── Selfie with liveness check
   ├── Document tampering detection
   └── Database checks (PEP, sanctions, adverse media via ComplyAdvantage)
        │  All handled by stripe Identity — you receive a pass/fail + risk signals
        ▼
3. Employment proof
   ├── Work email already verified (step 1)
   ├── Optional: payslip upload (parsed by Stripe Identity's document classifier)
   ├── Optional: HR API integration (BambooHR, Workday, Personio) for direct verification
   └── Optional: Open Banking salary verification (TrueLayer, Tink)
        │
        ▼
4. 2FA enrolment (mandatory)
   ├── TOTP (Authy / Google Authenticator) — primary
   ├── Backup codes — printed once, hashed in DB
   └── SMS as fallback only (Twilio Verify) — known weak; never the only factor
        │
        ▼
5. Bank account verification (lenders only, optional for borrowers in v1)
   └── Stripe Connect onboarding flow (Stripe handles this entirely)
        │
        ▼
        terms and conditions acceptance saying lendloop is not responsible for making lending decisions and losses etc as per regulations
6. User is "verified" — credibility scoring kicks in
```

### 4.2 Why each vendor

**WorkOS** — handles enterprise sign-on so the *organisation* (Amazon, NCI, etc.) can SSO their employees in via SAML or OIDC. This is non-negotiable for enterprise B2B sales. WorkOS also gives you Directory Sync (SCIM) so when an employee leaves the company, they're auto-deprovisioned on 121.ai. Free for up to 1M MAU on the basics; SAML/SCIM is paid (~$125/connection/mo or $500/mo flat for unlimited).

**Stripe Identity** — best-in-class identity verification. Document + selfie + liveness + database checks. EU-ready. Templates configurable per market (passport ok in some, national ID required in others). ~$1.50–$3 per verification.

**ComplyAdvantage** — sanctions, PEP (politically exposed persons), and adverse media screening. Required under AML rules. Persona has some of this built in but ComplyAdvantage is more thorough; use Persona for ID, ComplyAdvantage for ongoing AML monitoring (rescreen every user monthly).

**Twilio Verify** — handles SMS/voice OTP, with built-in fraud protection (Twilio Verify Fraud Guard). Don't roll your own SMS code.

**WorkOS alternative for lower price**: Auth0 (Okta) is the incumbent but has gotten expensive. **Clerk** is excellent for B2C with good B2B features. **Stytch** is good for passwordless. For pure B2B SaaS at your scale, WorkOS wins on price-to-feature.

### 4.3 The 2FA design

- **Mandatory at first login**, not optional
- **TOTP is the default**, SMS is a fallback (with warnings about SIM-swap risk)
- **Step-up authentication** for sensitive actions: making an offer ≥ €X, withdrawing funds, changing bank account, accepting a loan. Re-prompt 2FA even within an active session.
- **Hardware keys (WebAuthn / FIDO2)** for admin and high-value lender accounts
- **Backup codes** stored as bcrypt hashes; user shown once, never again
- **Lockout policy**: 5 failed attempts → 15-minute lockout with email notification

### 4.4 Session management

- Server-side sessions (don't put state in cookies)
- Session ID in `HttpOnly + Secure + SameSite=Strict` cookie
- Idle timeout: 30 minutes for users, 10 minutes for admin
- Absolute timeout: 8 hours regardless of activity
- All active sessions visible to user with "log out everywhere" button
- Log every authentication event to the audit trail

---

## 5. Money Movement: Stripe Connect, Explained

This is the architectural decision that determines whether you launch in 6 months or 18.

### 5.1 The model: Stripe is the bank, you are the platform

In Stripe Connect's "platform" model:

- **Each lender** has a Stripe Connected Account (Custom or Express type)
- **Each borrower** also has a Stripe Connected Account if they're receiving funds
- **Funds never touch your company bank account** for member-to-member flows
- **Stripe holds funds in segregated accounts** under their licence
- **You orchestrate transfers** between connected accounts via the Stripe API
- **Your fee** (15% of interest) is collected via `application_fee_amount` on each transfer — Stripe automatically routes it to *your* Stripe account

This is exactly how Patreon, Substack, OpenSea, and Lyft work. You earn revenue without ever holding member funds.

### 5.2 The flows

**Lender deposits funds:**

```
Lender → enters card / SEPA debit details on Stripe-hosted page
       → Stripe creates Charge against lender, funds settle into lender's
         Stripe-Connect "platform balance"
       → Your app records a transaction (status=pending, then succeeded on webhook)
       → Lender's "available balance" on 121.ai is now this Stripe balance
```

**Loan disbursement (after offer accepted):**

```
Your app calls stripe.transfers.create(
    amount=principal,
    source_currency='eur',
    destination=borrower_connected_account_id,
    application_fee_amount=0,   # platform fee taken on repayment, not disbursement
    metadata={'loan_id': ...}
)
       → Stripe moves €X from lender's connect balance to borrower's connect balance
       → Borrower can withdraw to their bank via Stripe Payout
       → Your app updates loan.status = 'active'
```

**Repayment:**

```
Borrower → triggers repayment (Stripe-hosted SEPA Direct Debit mandate, or card)
       → Stripe charges borrower, funds settle
       → Stripe transfers to lender, with application_fee_amount = 15% of interest_part
       → Stripe automatically routes that fee to LendLoop's main Stripe account
       → Your app records the repayment + platform_cut transaction
```

### 5.3 What this gives you for free

- **No e-money licence needed** — Stripe holds the licence
- **PSD2 SCA compliance** — Stripe handles 3D-Secure flows
- **PCI-DSS scope reduction** — you're SAQ-A (lowest) because card data never touches your servers
- **Refunds, disputes, chargebacks** — Stripe's tooling
- **Tax reporting** (DAC7, 1099) — Stripe Tax / Stripe Reporting
- **KYC for the *bank account* layer** — Stripe Identity Verification for Connected Accounts
- **Multi-currency** — built in if you expand outside €

### 5.4 What it doesn't solve

- **Borrower default**: if a SEPA Direct Debit fails because borrower has no funds, it fails — Stripe doesn't underwrite the loan. You need a default-handling workflow.
- **Payment scheduling**: you must trigger repayment charges yourself on the schedule (Celery cron job).
- **Wallet UX**: there's no "121.ai wallet" — there's a Stripe Connect balance the user sees on your UI; reconcile against Stripe nightly.


---

## 6. Risk Scoring: LLM, but Carefully

### 6.1 The two-tier scoring model

Your existing 100-point deterministic model is the **primary score**. Don't replace it. Augment it.

```
Primary Score (Regulatory-defensible)
    └── Deterministic 100-point algorithm (in scoring.py)
        Components: Identity, Financial, Credit History, Stability, Reputation
        Output: integer + breakdown
        Used for: lender display, eligibility gates, regulator audits

Augmented Signals (LLM + analytics, advisory)
    ├── Document analysis: parse uploaded payslips/bank statements with LLM
    │     Extract: employer, salary, deductions, anomalies
    │     Cross-check against self-declared data → flag mismatches
    ├── Application narrative analysis: read "loan purpose" + notes
    │     Detect: vague reasons, urgency markers, gambling references
    ├── Behavioural anomaly detection: usage patterns vs cohort
    │     Flag: rapid loan applications, login from unusual geo, etc.
    └── These feed into a "Review Required" queue for the admin team
        — never directly adjust the user's score without human review
```

### 6.2 LLM provider choice

| Use case | Provider | Why |
|---|---|---|
| Document parsing (structured) | **Anthropic Claude (Sonnet)** via API | Best at structured extraction with citations |
| Document parsing (high-volume) | **AWS Textract** or **Google Document AI** | Cheaper for OCR-heavy work; LLM for the reasoning layer on top |
| Narrative classification | **OpenAI gpt-4o-mini** or **Claude Haiku** | Cheap, fast, good enough |
| Embeddings (similarity) | **OpenAI text-embedding-3-small** | Cheap, broadly supported |
| On-prem option | **Llama 3.x via Ollama / Together.ai** | If enterprise customer demands no third-party LLM |

Cost at modest volume (1,000 borrowers/month, 5 docs each): under $100/month total LLM spend.

### 6.3 The non-negotiable rules

1. **Every LLM-derived signal is logged** with the prompt, response, model version, and timestamp — for explainability audits.
2. **No automated decision** on credit eligibility comes from the LLM alone. Either deterministic rules pass, or a human reviews.
3. **Bias testing**: regularly sample LLM outputs across demographics to detect drift.
4. **PII minimisation**: redact names/IDs before sending to LLM where possible; never send full payslips to the LLM — use a regex-based pre-extractor first.
5. **Output structure**: LLM must return JSON with explicit schema; reject and re-prompt if malformed.
6. **Human-in-the-loop** for any score adjustment ≥ 5 points based on LLM signals.

### 6.4 Document parsing pipeline

```
User uploads payslip PDF
    ↓
Stored in encrypted S3 bucket (signed URL only)
    ↓
Celery job: download → AWS Textract → structured text + bounding boxes
    ↓
Pre-extractor (regex): try to pull fields directly (employer, gross, net, date)
    ↓
If pre-extractor confident: use those values directly
Else: send extracted text (PII-redacted) to Claude with structured-output prompt
    ↓
Returned JSON: {employer, gross_monthly, net_monthly, date, confidence, anomalies[]}
    ↓
Cross-check against borrower_assessments declared values
    ↓
If mismatch > 10%: flag for admin review (do not auto-fail)
If clean: increment "verified income" boolean on assessment
    ↓
Trigger score recomputation
```

---

## 7. Contracts & E-Signature

When borrower accepts an offer, a binding loan agreement is generated and signed electronically.

### 7.1 The flow

```
Offer accepted
   ↓
Backend assembles contract data from:
   - lender + borrower verified profiles
   - loan_offers row (terms)
   - jurisdictional template (e.g., Irish Consumer Credit Agreement)
   ↓
Render contract to PDF using:
   - WeasyPrint (Python, HTML/CSS → PDF) for v1 — free, flexible
   - Or DocRaptor / PDFShift if you want a hosted service
   ↓
Send to Dropbox Sign API for signature collection
   - eIDAS Advanced Electronic Signature
   - Both parties sign in sequence
   - Audit trail PDF auto-generated
   ↓
On all signatures collected → webhook → mark loan as "executed" → trigger disbursement
   ↓
Final signed PDF + audit trail stored in S3 with KMS encryption, 7-year retention
```

### 7.2 Why Dropbox Sign over DocuSign

- ~30% cheaper at small volumes
- Cleaner API
- eIDAS support (DocuSign also has it but tucked behind enterprise tier)
- Pricing: ~$30/mo for a starter API plan, scales reasonably

**Alternatives:** PandaDoc (good if you want template management UI), BoldSign (cheapest), Documenso (open-source, self-host if you must).

### 7.3 What the contract must contain (Ireland/EU)

- Both parties' full legal names and verified IDs
- Principal amount, interest rate (APR clearly stated)
- Repayment schedule with each instalment
- Total amount payable
- Fees (LendLoop's 15% interest cut disclosed)
- Borrower's right of withdrawal (14 days for consumer credit)
- Default handling, late payment penalties
- Governing law (Irish law) and jurisdiction
- Data processing notice (GDPR)
- Mutual e-signature acceptance clause

Get this template drafted by a fintech-specialist solicitor. Don't AI-generate it.

---

## 8. Communications (Email, SMS, Push)

| Channel | Vendor | Purpose | Cost |
|---|---|---|---|
| Transactional email | **Postmark** | Account verification, OTP, repayment reminders, contract delivery | $15/mo for 10K emails |
| Marketing email | **Loops** or **Resend** | Newsletters, product updates (separate from transactional!) | Free tier, then $25–50/mo |
| SMS | **Twilio Verify** (2FA) + **Twilio Programmable SMS** (alerts) | OTPs, urgent overdue notices | Pay-per-use, ~€0.04/SMS in EU |
| In-app | **Knock** | Multi-channel notification orchestration | Free for <1K MAU |
| Push (mobile, future) | **OneSignal** or **Firebase** | When mobile app exists | Free at small scale |

### 8.1 Why split transactional and marketing email

- Domain reputation: marketing email is a different reputation profile from "your loan was disbursed" — sharing one IP poisons the other
- Compliance: marketing requires explicit consent + unsubscribe; transactional doesn't but must not contain marketing content
- Use **Postmark** for transactional (it's literally what they're optimised for — they refuse to send marketing email, which is why deliverability is unmatched)

### 8.2 Notification design

Every notification has three potential channels (email, SMS, in-app). The user sets preferences. Default policy:

| Event | Email | SMS | In-app |
|---|---|---|---|
| New offer received | ✓ | — | ✓ |
| Offer accepted | ✓ | — | ✓ |
| Repayment due in 3 days | ✓ | — | ✓ |
| Repayment overdue | ✓ | ✓ (only after 24h) | ✓ |
| Login from new device | ✓ | — | — |
| Password / 2FA changed | ✓ | ✓ | ✓ |
| Document required (KYC) | ✓ | — | ✓ |

---

## 9. Cloud Hosting & Infrastructure

### 9.1 The phased approach

| Stage | Stack | Monthly Cost | Why |
|---|---|---|---|
| **MLP (now)** | render Local FastAPI + supabase | €0 | You're in dev |
| **Beta v1** | Render + Supabase + Cloudflare + Upstash | €150–300 | Hands-off, fast iteration |
| **Production** | Render Pro / Fly.io clusters + Supabase Pro / RDS | €500–1500 | Multi-region, dedicated resources |
| **Scale (10K+ users)** | AWS (ECS Fargate + RDS Multi-AZ + ElastiCache + S3 + CloudFront + WAF) | €2K–5K+ | Real engineering team needed |

**Don't start on AWS.** AWS gives you 200 services to misconfigure on day one. Render/Fly.io give you Heroku-like simplicity with modern guts. You can always migrate later — the app is mostly the same Docker container.

### 9.2 Render configuration (recommended for beta)

- **Web service**: Python, autoscale 1–3 instances, 512 MB RAM each (~$25/mo)
- **Background workers**: 1× Celery worker, 1× Celery Beat scheduler (~$25/mo)
- **Cron jobs**: Render Cron (free)
- **Private network**: keeps DB traffic off the public internet
- **Preview environments**: every PR gets a deploy (huge for QA)

### 9.3 Supabase as the data plane

Supabase gives you, in one platform:

- Managed PostgreSQL (with Row-Level Security)
- Object storage (Supabase Storage = managed S3 with auth)
- Edge Functions (Deno-based, for webhooks if you want isolation)
- Realtime (Postgres LISTEN/NOTIFY exposed via WebSocket — useful for chat)
- Auth (you'll use WorkOS instead, but Supabase Auth is decent)

Supabase Pro tier (~$25/mo) gives you 8 GB database, 100 GB storage, daily backups, point-in-time recovery for last 7 days. That's plenty for the first year.

When you outgrow Supabase, migrate to AWS RDS PostgreSQL — same engine, vendor-neutral.

### 9.4 Cloudflare configuration

- DNS (free)
- Proxied (orange cloud) for the app domain → automatic DDoS, TLS termination, edge caching
- WAF rules:
  - OWASP Core Rule Set enabled
  - Rate limit `/auth/login`: 10/min per IP
  - Rate limit `/auth/signup`: 5/hour per IP
  - Block bad bots (Cloudflare's bot fight mode)
  - Country-block from sanctioned jurisdictions
- Cloudflare Turnstile on signup and login forms (CAPTCHA-free CAPTCHA)
- Page Rules to bypass cache for `/api/*`

Cloudflare free tier covers all of this. Pro ($20/mo) adds image optimisation, more page rules, advanced WAF — worth it once you have paying users.

### 9.5 Object storage layout

```
s3://lendloop-prod-eu-west-1/
├── kyc-documents/           ← 7-year retention, KMS encrypted, no public access
│   └── <user_id>/
│       ├── <doc_id>.pdf
│       └── meta.json
├── loan-contracts/          ← 7-year retention, signed-only access
│   └── <loan_id>/
│       └── agreement.pdf
├── audit-trails/            ← Immutable (S3 Object Lock)
│   └── <year>/<month>/
└── public-assets/           ← Logos, marketing images
```

Bucket policies: deny public access by default; signed URLs for any authorised access (24-hour expiry max).

---

## 10. Database Layer (Production)

### 10.1 Schema evolution from MLP

Beyond the 12 tables in `db_schema_mlp.md`, production needs:

| New Table | Purpose |
|---|---|
| `audit_log` | Append-only log of every state-changing action (who, what, when, before/after) |
| `kyc_submissions` | Track Persona/external KYC verification attempts and outcomes |
| `aml_screening_results` | ComplyAdvantage results, sanction/PEP/AdverseMedia flags |
| `documents` | Uploaded files metadata; actual files in S3 |
| `payment_attempts` | Stripe charge attempts, including failures and retries |
| `webhooks_inbound` | Every Stripe/Persona/etc webhook received (for replay debugging) |
| `notification_preferences` | Per-user channel preferences |
| `user_devices` | Trusted devices for 2FA, fingerprints |
| `consent_records` | GDPR consent (what they agreed to, when, version) |
| `data_export_requests` | GDPR DSR: right of access |
| `data_deletion_requests` | GDPR DSR: right to erasure (with hold periods for regulated data) |
| `feature_flags` | If using a self-hosted solution |
| `admin_users` | Separate from `users`; staff with roles |
| `admin_role_permissions` | RBAC for admin panel |

### 10.2 Row-Level Security (the killer feature)

In Postgres, you create policies like:

```sql
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_isolation ON loan_requests
    FOR ALL
    TO application_role
    USING (community_id = current_setting('app.current_community_id')::int);
```

Now even if you write `SELECT * FROM loan_requests` with no WHERE clause, Postgres returns only the calling user's community. This is a huge defence-in-depth win against SQL bugs leaking data across tenants.

The application sets `SET LOCAL app.current_community_id = X` at the start of every request based on the authenticated user.

### 10.3 Encryption at rest

- Database: managed providers (Supabase, RDS) handle this — AES-256, transparent
- **Field-level encryption** for the most sensitive PII: `id_number`, `bank_account_number`, `phone`, `date_of_birth`. Use **AWS KMS + envelope encryption**, or simpler: store these in **Persona's vault** and only keep the verification result in your DB (this is the recommended pattern — your DB has fewer secrets).
- Object storage: SSE-KMS with customer-managed keys

### 10.4 Backups & disaster recovery

- **Daily automated backups** (Supabase/RDS does this)
- **Point-in-time recovery** for last 7 days
- **Quarterly DR drill**: actually restore a backup to a fresh environment and verify the app comes up
- **Logical replication** to a read replica for analytics (so heavy queries don't hit prod)
- **Cross-region backup copy** for production (€20/mo extra, but critical)

### 10.5 Migrations

Always use **Alembic**:

- Every migration is reversible (write `downgrade()` even if you'll never run it)
- Migrations run as part of deploy (CI/CD checkpoint)
- Schema review on every migration PR
- Never edit migrations after they've been deployed
- Use **online migration** patterns for table-changing operations on big tables (e.g., add nullable column → backfill in batches → set NOT NULL)

---

## 11. Security Architecture

### 11.1 The threat model

Realistic threats to a fintech P2P platform:

1. **Account takeover** (stolen credentials, phishing, SIM-swap)
2. **Synthetic identity fraud** (fake KYC docs, AI-generated selfies)
3. **Insider fraud** (admin abuses access)
4. **API abuse** (scraping borrower lists, enumerating users)
5. **Webhook replay attacks** (replaying old Stripe webhooks)
6. **SQL injection** (mostly handled by ORM, but never zero risk)
7. **XSS / template injection** (Jinja autoescape, but easy to disable accidentally)
8. **CSRF** on state-changing actions
9. **Session hijacking**
10. **Data exfiltration** (compromised dev laptop, leaked AWS keys)
11. **Denial of service** (Cloudflare handles network-layer; app-layer needs rate limiting)
12. **Money-mule / loan-stacking abuse** (borrower takes loans across communities to default)

### 11.2 Defence layers

| Layer | Control |
|---|---|
| Network | Cloudflare WAF, DDoS, bot management |
| TLS | Strict TLS 1.3, HSTS preload, certificate transparency monitoring |
| App ingress | Rate limiting per IP and per user (Flask-Limiter + Redis) |
| Auth | MFA mandatory, step-up auth for sensitive actions, session binding to device fingerprint |
| Authz | RBAC for staff, ABAC + RLS for tenants |
| Input | Schema validation on every endpoint (Marshmallow / Pydantic) |
| Output | Jinja autoescape ON, CSP headers, sanitise user-supplied HTML |
| CSRF | Flask-WTF tokens on every form |
| Database | Parameterised queries only, RLS policies, separate read/write roles |
| Secrets | Doppler or AWS Secrets Manager, never in env files committed to git |
| Code | Snyk for deps, GitHub Advanced Security for code scanning, Dependabot |
| Runtime | Sentry for errors, anomaly alerts on auth failures, login geo |
| Audit | Immutable audit log; admin actions double-logged (in-DB + external SIEM) |
| Backup | Encrypted, off-site, restore-tested |
| People | Background-checked staff, hardware security keys, principle of least privilege |

### 11.3 Specific controls worth highlighting

**Webhook signature verification**: every inbound webhook (Stripe, etc.) has a signature header. Your handler MUST verify it before doing anything. Reject unsigned or invalid-signature requests as 401. Use the `stripe.Webhook.construct_event()` SDK — don't write your own HMAC verification.

**Idempotency**: every state-changing API call accepts an `Idempotency-Key` header. Store the key + response in Redis for 24 hours. If the same key arrives, return the cached response. This prevents double-disbursements when a network blip causes a retry.

**Distributed locks**: for operations like "accept offer + create loan + disburse", wrap in a Redis lock keyed on the offer ID. Prevents race conditions.

**Outbox pattern**: when a DB transaction needs to trigger an external action (Stripe transfer, email), don't call the external service from inside the DB transaction. Write a row to an `outbox` table inside the transaction; a background worker picks it up and calls the external service with retries. Guarantees the action happens iff the DB commit happened.

### 11.4 Penetration testing & bug bounty

- **Year 1**: one external pen test before public launch (~€8–15K through Cobalt or a local Dublin firm)
- **Year 2+**: continuous bug bounty via HackerOne or Intigriti (~€500–2000/mo in payouts at small scale)

### 11.5 Compliance certifications

| Certification | When | Why |
|---|---|---|
| GDPR DPIA + DPO | Before launch | Legal requirement |
| **SOC 2 Type II** | After 6 months of evidence collection | Required for enterprise customers |
| **ISO 27001** | Year 2+ | Required for larger enterprise customers |
| **PCI-DSS SAQ-A** | Self-attest at launch | Easy because Stripe handles cards |

**Vanta** ($500–1000/mo) automates evidence collection for SOC 2 / ISO 27001. Worth every euro.

---

## 12. Observability

You can't run production fintech without seeing what's happening.

### 12.1 The three pillars

**Errors → Sentry**
- All exceptions captured with stack traces, user context (anonymised), breadcrumbs
- Release tracking (which deploy introduced this error?)
- Alerts to Slack
- ~€26/mo for the team plan

**Logs → Better Stack** (formerly Logtail) or **Datadog Logs** at scale
- Structured JSON logs
- Searchable, retained 30+ days
- Sensitive fields auto-redacted (`password`, `id_number`, `card_number` regex)
- ~€25/mo at start

**Metrics → Better Stack Uptime + Grafana Cloud** or **Datadog**
- Endpoint uptime, response times, error rates
- Business metrics: signups/day, loans created, repayment success rate, disbursement latency
- Custom dashboards
- Free tier sufficient at start

### 12.2 What to alert on

| Metric | Threshold | Action |
|---|---|---|
| 5xx error rate | > 1% over 5 min | Page on-call |
| Login failure rate | > 30% over 5 min | Possible attack — page security |
| Disbursement failure | Any | Page finance lead immediately |
| KYC service errors | > 5% over 10 min | Email engineering lead |
| Stripe webhook lag | > 60s | Email engineering lead |
| Database CPU | > 80% sustained | Investigate slow queries |
| Disk usage | > 80% | Scale up |
| Failed background jobs | > 10/hour | Email engineering lead |

### 12.3 Audit log

Every action that changes financial state, user permissions, or sensitive data writes to an immutable `audit_log` table:

```
audit_id, actor_user_id, actor_ip, actor_user_agent,
action_type, resource_type, resource_id,
before_state (JSON), after_state (JSON),
created_at
```

Append-only (revoke UPDATE/DELETE on this table). Mirrored to S3 Object Lock for tamper-evidence. This is the single most important piece of infrastructure for surviving a regulatory audit.

---

## 13. Admin Panel

You will need an internal-only application for staff to:

- Review flagged KYC submissions
- Investigate suspicious activity
- Manually adjust scores (with reason logged)
- Process GDPR requests
- Reverse / refund transactions
- Onboard new enterprise communities
- View audit log
- Run reports

Two paths:

**A. Build it as a separate FastAPI blueprint**, IP-allowlisted, separate auth (admin users in a different table), hardware-key-only login. ~2–3 weeks of work.

**B. Use a low-code admin tool** like **Retool**, **Forest Admin**, or **Appsmith**. ~1 week to wire up. Saves engineering time significantly. The UI is plenty for internal staff.

**Recommendation**: Retool for v1. ~$10/user/mo. Connect it to your read-replica DB and to your API for write actions. Migrate to a custom admin panel only when workflow complexity demands it.

---

## 14. CI/CD & Engineering Workflow

### 14.1 The pipeline

```
Developer pushes to feature branch
   ↓
GitHub Actions runs:
   - Linting (ruff, black)
   - Type-checking (mypy)
   - Unit tests (pytest)
   - Integration tests (against ephemeral Postgres)
   - Security scan (Snyk, Bandit)
   - Build Docker image
   ↓
PR opened → Render preview environment auto-deployed
   ↓
PR review (code, security, design)
   ↓
Merge to main → CI runs again → deploy to staging
   ↓
Smoke tests on staging
   ↓
Manual promotion to production (one-click in Render)
   ↓
Sentry release marker, Slack notification
```

### 14.2 Key practices

- **Trunk-based development**: no long-lived feature branches
- **Feature flags** for risky changes (use **Flagsmith** or **Unleash** — both have free self-host options)
- **Database migrations as part of deploy**, never manual
- **Blue-green deploys** (Render handles this) — zero downtime
- **Secrets in Doppler** — synced to Render automatically
- **All infra as code** — Render's `render.yaml` for app config, Terraform if/when you move to AWS

### 14.3 Testing strategy

| Type | Tool | Coverage Target |
|---|---|---|
| Unit | pytest | 80%+ on `scoring.py`, `finance.py`, all business logic |
| Integration | pytest + testcontainers (real Postgres in Docker) | All API endpoints |
| End-to-end | Playwright | Critical paths: signup → KYC → loan → repayment |
| Load | Locust | Before launch and quarterly |
| Security | Bandit + Snyk + GitHub CodeQL | Every PR |

---

## 15. Performance & Scalability

### 15.1 Where bottlenecks will appear

In order of likelihood:

1. **N+1 queries on listing pages** (lender browsing borrowers) — use eager loading, paginate, cache
2. **Score recomputation** on assessment update — already O(1), should stay fast
3. **Stripe webhook bursts** during a flash sale or end-of-month repayment cycle — handle async via queue
4. **PDF generation** for contracts — already async via Celery, should be fine
5. **LLM document parsing** — async; no user-facing latency

### 15.2 Caching strategy

- **Redis cache** with explicit invalidation:
  - User profile (TTL: 5 min, invalidate on profile update)
  - Community member list (TTL: 1 min)
  - Score breakdown (TTL: 1 hour, invalidate on any score input change)
- **HTTP caching headers** for static assets (immutable, 1-year cache via Cloudflare)
- **Database query plan caching** (Postgres handles this)

### 15.3 The path to 100K users

You won't need to do most of this until you have funding and a real engineering team, but the plan exists:

| Bottleneck | Solution |
|---|---|
| Single Postgres instance | Read replicas → connection pooling via PgBouncer → eventually horizontal sharding by community_id |
| Single app instance | Already horizontally scalable behind Cloudflare; just add instances |
| Single Redis | Redis Cluster or migrate cache to Cloudflare Workers KV for global edge cache |
| Sync HTTP I/O blocking workers | Convert hot endpoints to async (FastAPI rewrite of those routes) |
| Background job scheduler | Celery → Temporal for complex workflows |
| Single region | Cloudflare in front already; deploy app to multiple regions; cross-region read replica |

---

## 16. Cost Breakdown

### 16.1 Pre-launch / Beta (months 1–6)

| Service | Tier | Monthly |
|---|---|---|
| Render (web + worker) | Starter+ | €50 |
| Supabase | Pro | €25 |
| Upstash Redis | Pay-as-go | €10 |
| Cloudflare | Pro | €20 |
| Postmark | 10K emails | €15 |
| Twilio | Pay-as-go | €30 |
| Stripe identity | 100 verifications | €200 |
| ComplyAdvantage | Starter | €150 |
| WorkOS | SSO Starter | €0 (free tier <1M MAU base; SSO add-on later) |
| Dropbox Sign | API | €30 |
| Stripe | No fixed fee | €0 (transactional) |
| Sentry | Team | €26 |
| Better Stack | Team | €25 |
| Vanta | Starter | €750 |
| LLM API (OpenAI/Anthropic) | Pay-as-go | €50 |
| Domain, misc | | €20 |
| **Total** | | **~€1,400/mo** |

**Without Vanta** (if you defer SOC 2): **~€650/mo**.

### 16.2 At ~5,000 active users

| Bucket | Monthly |
|---|---|
| Hosting (Render or AWS) | €600 |
| Database (Supabase/RDS at higher tier) | €200 |
| Identity/AML/KYC (volume scaling) | €1,500 |
| Email/SMS | €200 |
| LLM/AI | €300 |
| Observability | €300 |
| Compliance tooling | €1,000 |
| Misc | €200 |
| **Total** | **~€4,300/mo** |

### 16.3 One-time costs

| Item | Cost |
|---|---|
| Legal opinion (regulatory structure) | €5–15K |
| Loan agreement template (Irish solicitor) | €3–5K |
| Initial pen test | €8–15K |
| SOC 2 Type II audit (year 1) | €15–25K |
| Logo, brand, design system | €2–10K |
| Stripe Connect setup (engineering time, ~3 weeks) | sweat equity |

---

## 17. Phased Roadmap

### Phase 0 — MLP (now, ending late May 2026)
- Closed-loop demo to NCI Citi UpStart judges
- Local-only deployment, simulated payments
- Single demo community
- Already covered in `sprint_1.md` through `sprint_4.md`

### Phase 1 — Beta with one real community (June–August 2026)
- Migrate MySQL → PostgreSQL
- Deploy on Render + Supabase + Cloudflare
- Integrate WorkOS for SSO with the partner community
- Integrate Stripe Connect (sandbox first, then live)
- Integrate Persona for KYC
- Build admin panel (Retool)
- Stand up Sentry, Postmark, basic alerting
- Get the regulatory opinion letter
- Sign a paid pilot agreement with one community (e.g., NCI itself)

### Phase 2 — Multi-tenant production (Sept–Dec 2026)
- Onboard 2–3 more communities
- Add ComplyAdvantage AML
- Add Dropbox Sign for binding contracts
- Add LLM-augmented document parsing
- First external pen test
- Begin SOC 2 evidence collection (Vanta)
- Real-time messaging (Supabase Realtime)
- Mobile-responsive web (Next.js migration begins)

### Phase 3 — Enterprise-ready (Q1–Q2 2027)
- SOC 2 Type II audit complete
- Full SCIM provisioning
- Enterprise admin panel for community managers
- Custom reporting / data exports for community sponsors
- Multi-currency support
- Open Banking (TrueLayer) for payment cost reduction
- iOS + Android mobile apps (React Native)

### Phase 4 — Scale & expand (H2 2027 onwards)
- Multi-region deployment
- ISO 27001
- Decide on Path A: pursue ECSPR licence to remove Stripe-as-intermediary friction
- Or remain Path B and scale on the SaaS model
- API for partner integrations (open up the credit-history-as-a-service angle from your IDF)

---

```## 18. Critical Open Questions for the Team

These need decisions before any production work begins:

1. **Regulatory path**: Stripe Connect SaaS)
2. **Custody**: Does LendLoop hold any member fund: NO*
3. **Pricing model**: Is the 15% interest cut sustainable across the cost structure above? Run the unit economics. At €1,000 average loan, 10% rate, 12 months → €100 interest → €15 to LendLoop. To reach €100K ARR you need ~6,700 loans/year — feasible but tight.
4. **Geographic scope**: Ireland only at launch? Expanding to UK (post-Brexit, separate regs) and EU triggers different obligations.
5. **Consumer vs employee credit**: are users borrowing in personal capacity (consumer credit law applies) or via an employer-mediated benefit (different law)? This is the hinge for Path B viability.
6. **Default handling**: who eats the loss when a borrower defaults? Lender? Insurance fund? LendLoop? This must be in the loan agreement.
7. **Data residency**: EU-only data plane, or are US-based vendors (Persona, Stripe US ops) acceptable under SCCs?
8. **DPO**: who is the Data Protection Officer? Required under GDPR for systematic monitoring of data subjects.```

---
