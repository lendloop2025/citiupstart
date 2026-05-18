# 121.ai by LendLoop — 2-Day MVP Implementation Guide

**Demo target:** NCI Citi UpStart judges
**Test users:** Smruti (lender) + Umer (borrower), both NCI students
**Budget:** €0 (free tiers only)
**Build window:** 48 hours
**UX reference:** PeerBerry (peerberry.com) — linear stepped onboarding, Veriff-style KYC, SEPA wallet, Auto Invest
**Architecture parent:** `system_design.md` (production target) → this doc compresses it for demo

---

## Table of Contents

0. [How to Read This Document](#0-how-to-read-this-document)
1. [What We're Actually Building](#1-what-were-actually-building)
2. [Real vs Simulated — The Honest Split](#2-real-vs-simulated--the-honest-split)
3. [Tech Stack — Free Tier Map](#3-tech-stack--free-tier-map)
4. [Repository Layout](#4-repository-layout)
5. [Environment & Secrets](#5-environment--secrets)
6. [Database Schema (Full SQL)](#6-database-schema-full-sql)
7. [Row-Level Security Policies](#7-row-level-security-policies)
8. [Authentication & Registration Flow](#8-authentication--registration-flow)
9. [KYC / Identity Verification Flow](#9-kyc--identity-verification-flow)
10. [Two-Factor Authentication](#10-two-factor-authentication)
11. [Wallet, Deposits, Withdrawals](#11-wallet-deposits-withdrawals)
12. [Scoring Algorithm (100-pt Model)](#12-scoring-algorithm-100-pt-model)
13. [Borrower: Loan Request Flow](#13-borrower-loan-request-flow)
14. [Lender: Browse & Invest Flow](#14-lender-browse--invest-flow)
15. [Auto-Invest Strategy](#15-auto-invest-strategy)
16. [Loan Agreement & E-Signature](#16-loan-agreement--e-signature)
17. [Disbursement → Repayment Lifecycle](#17-disbursement--repayment-lifecycle)
18. [Loyalty / Welcome Bonus](#18-loyalty--welcome-bonus)
19. [Notifications (Email Templates)](#19-notifications-email-templates)
20. [Admin Panel](#20-admin-panel)
21. [Audit Log](#21-audit-log)
22. [API Routes — Complete Map](#22-api-routes--complete-map)
23. [Frontend Routes & Screens](#23-frontend-routes--screens)
24. [Risk Warnings & Legal Footers](#24-risk-warnings--legal-footers)
25. [Hour-by-Hour 2-Day Schedule](#25-hour-by-hour-2-day-schedule)
26. [Demo Script: Smruti & Umer (15-Min Walkthrough)](#26-demo-script-smruti--umer-15-min-walkthrough)
27. [Deployment Checklist](#27-deployment-checklist)
28. [Pre-Demo Test Pass](#28-pre-demo-test-pass)
29. [Known Limitations & Talking Points](#29-known-limitations--talking-points)
30. [Post-Demo: Path to Phase 1](#30-post-demo-path-to-phase-1)

---

## 0. How to Read This Document

This document is the **single source of truth** for building the 121.ai MVP demo. It was written to be followed top-to-bottom over. It contains:

- Every page you need to build, with its purpose, fields, and validation rules
- Every API route, with HTTP method and behaviour
- Complete SQL schema (copy-paste into Supabase migration)
- Code snippets for the genuinely tricky parts (Stripe Connect onboarding, contract PDF generation, RLS, scoring)
- The demo script you'll perform on stage

**Where you see "SIMULATE":** that means the real production system would call a paid third-party (Veriff, ComplyAdvantage, Dropbox Sign), but for the demo we render the same UI and store an internal status. The judges cannot see the difference, and the architecture is identical to the production swap.

**Where you see "REAL":** that integration must work for the demo. Don't shortcut these.

---

## 1. What We're Actually Building

A peer-to-peer lending platform for the NCI closed community where students with disposable income (lenders) can fund short-term loans for fellow students who need them (borrowers). The platform handles onboarding, KYC, scoring, matching, contracts, money movement, and repayment.

### 1.1 The two personas for the demo

**Smruti (Lender)**
- NCI MSc student, has part-time income, wants to earn interest by funding peer loans
- Will deposit €500 of "investable funds" into her platform wallet
- Will manually invest €500 into Umer's loan request at 8% APR for 6 months
- Earns €17.40 in interest over the loan term (illustrative)

**Umer (Borrower)**
- NCI MSc student, needs €500 for a laptop replacement before final project deadline
- Has part-time job + IRP, can demonstrate ability to repay from monthly income
- Receives €500 disbursement to his wallet → withdraws to his bank
- Repays €86.20/month for 6 months

### 1.2 The PeerBerry UX patterns we adopt

From peerberry.com the patterns worth copying verbatim:

1. **Linear stepped onboarding with progress indicator** — Register → Verify Email → Personal Details → 2FA → Identity → Deposit → Invest. Each step blocks the next. User sees a numbered progress bar.
2. **"According to European laws and regulations…" framing** on the KYC screen — sets the tone that this is serious financial infrastructure.
3. **"Process takes up to 10 minutes"** copy — manages expectations.
4. **Document constraints explicitly listed**: passport or national ID only; no driver's licence, residence permit, military ID; no tampering, stickers; readable; real-time photo not scanned/electronic.
5. **"Funds can only be deposited after verification is successfully passed"** — gates spending behind KYC.
6. **"Bank account details visible in profile section 'Deposit/Withdraw'"** — not hidden behind a checkout flow; shown as IBAN to wire to.
7. **Email confirmation when deposit reaches account** + email reminders generally.
8. **Filter sidebar for available loans** — country, interest, term, type, originator. We adapt this for our community-internal loan pool.
9. **Manual invest + Auto Invest combined** — both available simultaneously.
10. **Buyback guarantee badge** on listings — borrows credibility from PeerBerry's model.
11. **Risk disclaimer in footer** — "With all investments your capital is at risk…"
12. **+0.5% welcome bonus for 90 days** — copied directly as a loyalty hook.

### 1.3 What we adapt for the closed-community angle

PeerBerry is a public investment marketplace. We are an enterprise tool for a specific community (NCI). So:

- "Investor" → "Lender (Community Member)"
- "Loan Originator" → "Borrower (Community Member)" (no third-party originator; peer direct)
- Email = `@student.ncirl.ie` (or NCI staff domain) is the gating identity check, not just any email
- Country filter becomes "Cohort" filter (MSc Data Analytics, BBus, etc.) — judges will love this
- Loan types adapted: "Tuition top-up", "Laptop / equipment", "Emergency", "Living expenses"
- Interest rates capped at 12% APR (not the 18%+ PeerBerry shows) for community framing
- Loan terms 1–12 months only
- Min loan €50, max loan €2,000 in v1 (vs PeerBerry's €10 min investment)

---

## 2. Real vs Simulated — The Honest Split

This is the most important table in the document. Print it.

| Component | Decision | Why |
|---|---|---|
| **Domain-locked email signup (NCI domain)** | REAL | Trivial, and it's the centerpiece of the closed-community story |
| **Email verification (6-digit OTP)** | REAL | Resend free tier handles this |
| **Password + strength meter** | REAL | Standard, free |
| **Personal details form (DOB, address, mobile, gender)** | REAL | Plain form; DOB validation enforces ≥18 |
| **TOTP 2FA (Google Authenticator compatible)** | REAL | `otplib` npm package, free |
| **Identity verification (passport/ID + selfie)** | SIMULATE | Real Veriff/Stripe Identity costs ~€1.50/check; we collect uploads + admin approves manually. UX is identical. |
| **Liveness check on selfie** | SIMULATE | Show the "centre your face in the oval" UI but accept any uploaded selfie |
| **Document tampering detection** | SIMULATE | Mark "scan complete: 97% confidence" after 3-second spinner |
| **AML/PEP/sanctions screening** | SIMULATE | Hardcoded "passed" badge on profile (TODO: integrate ComplyAdvantage in Phase 1) |
| **IRP (Irish Residence Permit) verification** | SIMULATE | Upload + admin approve |
| **Student ID verification** | SIMULATE | Upload + admin approve |
| **Payslip verification + parsing** | SIMULATE (with optional Gemini layer) | Upload + admin approves; if time on day 2, send to Gemini API for structured extraction |
| **Wallet balance** | REAL (internal) | Postgres column updated transactionally; this is exactly how PeerBerry works internally |
| **Deposit (lender funding wallet)** | REAL via Stripe Checkout test mode | Test card 4242 4242 4242 4242 → wallet credited via webhook. Identical UX to live mode. |
| **Real-money deposit demo (optional)** | REAL | Show your demo Revolut Business IBAN as the platform's "SEPA deposit address"; have Smruti send €1 from her Revolut as proof-of-flow before demo. Not required for live walkthrough. |
| **Loan disbursement (lender wallet → borrower wallet)** | REAL (internal) | Atomic Postgres transaction; both wallets update; ledger entries written |
| **Loan agreement PDF generation** | REAL | `pdfkit` or `react-pdf` — generated server-side, stored in Supabase Storage |
| **E-signature (eIDAS-grade)** | SIMULATE | Click-to-sign with audit log row + IP + timestamp. Production swap = Dropbox Sign API. |
| **Repayment schedule generation** | REAL | Pure math, deterministic |
| **Repayment trigger (monthly)** | REAL via pg_cron | Postgres scheduled job; debits borrower wallet, credits lender wallet, writes ledger |
| **Late payment penalty** | REAL | Logic runs nightly via pg_cron |
| **Email notifications (all events)** | REAL via Resend | 100/day free tier — way more than we need |
| **SMS for 2FA / overdue** | SKIP for v1 | Email-only 2FA (TOTP). Twilio costs money. |
| **Withdrawal (borrower wallet → bank)** | SIMULATE | Show "Withdrawal initiated. Funds will arrive in 1–2 business days." Update wallet. (Real Stripe Connect payout in Phase 1.) |
| **Audit log** | REAL | Every state-changing action writes a row |
| **RLS (community isolation)** | REAL | Even one community now; the policy must be live |
| **Admin panel** | REAL | `/admin` route in Next.js, role-gated |
| **100-pt scoring algorithm** | REAL | Pure function; deterministic |
| **LLM-augmented score advisory** | OPTIONAL (day 2 evening) | Gemini free tier extracts payslip data + writes a paragraph next to score |
| **GDPR consent record on signup** | REAL | One row in `consent_records` per user |
| **Right-to-export (GDPR DSR)** | REAL | Single endpoint that returns user JSON dump |
| **Right-to-erasure** | SIMULATE | Show a "Request deletion" button; admin processes manually |

---

## 3. Tech Stack — Free Tier Map

| Layer | Choice | Free Tier Limit | Production Swap |
|---|---|---|---|
| Frontend + Backend | **Next.js 16
** (App Router) on **Vercel Hobby** | 100GB bandwidth/mo, unlimited deploys | Vercel Pro / Render |
| Database | **Supabase Free** | 500MB DB, 1GB Storage, 50K MAU, daily backups | Supabase Pro |
| Auth | **Supabase Auth** | unlimited within free MAU | WorkOS for SSO |
| File Storage | **Supabase Storage** | 1GB free | Same, paid tier |
| Background Jobs | **Supabase pg_cron + Edge Functions** | unlimited cron, 500K Edge Function invocations/mo | Same |
| Realtime (chat, status) | **Supabase Realtime** | 200 concurrent connections | Same |
| Money Movement | **Stripe (test mode)** | unlimited test transactions, free | Stripe live mode (1.4% + €0.25) |
| Email | **Resend** | 3,000/mo, 100/day | Resend paid / Postmark |
| Edge / DDoS / SSL | **Vercel built-in** + Cloudflare DNS (free) | covered | Cloudflare Pro |
| Observability | **Sentry Developer** | 5K errors/mo | Sentry Team |
| Logs | **Vercel built-in** | 1 day retention free | Better Stack / Datadog |
| LLM (optional) | **Google Gemini API** free tier OR **Groq** (Llama 3) | generous free quotas | Anthropic Claude |
| Domain | `your-app.vercel.app` | free | Real domain (€10/yr) |
| Code hosting | **GitHub** (public or private) | unlimited | Same |
| CI/CD | **GitHub Actions** | 2,000 min/mo private; unlimited public | Same |
| Secrets | **Vercel Env Vars** | covered | Doppler / AWS Secrets Manager |

**Total monthly cost: €0.00**

### 3.1 Why Next.js full-stack instead of FastAPI + React

The system_design.md specifies FastAPI backend + Next.js frontend. For a 2-day demo this split costs you ~6 hours in glue work (CORS, deploy two services, sync schemas). Collapsing to **Next.js App Router with API routes and Server Actions** gets you:

- One deployment (Vercel)
- One language (TypeScript end-to-end)
- Server Actions = type-safe RPC without writing API contracts
- Same database calls, same business logic, half the wiring
- Production migration to FastAPI is straightforward when you need it (the business logic lives in `/lib`, easily ported)

### 3.2 Why Stripe test mode instead of real money

You asked about connecting Revolut to Stripe test for real payments — this is structurally not possible. Stripe test mode and live mode are isolated environments:

- Test mode rejects real cards (returns `card_declined`)
- Test mode webhooks fire from `events.test.*` and never trigger live operations
- A Revolut card swiped through test-mode Checkout will not move euros

The clean answer: **demo entirely in test mode** (looks and feels identical), AND optionally do **one off-platform real Revolut→Revolut transfer of €1** before the judging window to prove "real money capability exists." Show the receipt in your slide deck; don't try to wire it into the live demo. The Stripe live integration is a Phase 1 task that requires a real business entity, business verification, and the legal opinion letter.

---

## 4. Repository Layout

```
121ai/
├── README.md
├── implementation.md            ← this file
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── .env.local                   ← secrets (gitignored)
├── .env.example                 ← template, committed
├── middleware.ts                ← auth guard, RLS context, rate limiting
│
├── /supabase
│   ├── config.toml
│   └── /migrations
│       ├── 20260427_001_init.sql
│       ├── 20260427_002_rls.sql
│       ├── 20260427_003_seed_demo.sql
│       └── 20260427_004_pg_cron.sql
│
├── /app                         ← Next.js App Router
│   ├── layout.tsx               ← root layout, theme provider
│   ├── page.tsx                 ← marketing landing
│   ├── /(auth)
│   │   ├── /register            ← multi-step registration
│   │   ├── /login
│   │   ├── /verify-email
│   │   └── /forgot-password
│   ├── /(onboarding)
│   │   ├── /personal-details
│   │   ├── /two-factor
│   │   ├── /identity            ← KYC simulation
│   │   ├── /address-proof
│   │   └── /complete
│   ├── /(app)
│   │   ├── layout.tsx           ← authed shell with sidebar
│   │   ├── /dashboard           ← portfolio overview
│   │   ├── /deposit             ← Deposit/Withdraw screen
│   │   ├── /invest              ← lender browse loans
│   │   ├── /borrow              ← borrower request loan
│   │   ├── /loans
│   │   │   └── /[id]            ← loan detail
│   │   ├── /agreements
│   │   │   └── /[id]            ← signed PDF view
│   │   ├── /auto-invest
│   │   ├── /transactions
│   │   ├── /profile
│   │   ├── /settings
│   │   └── /help                ← FAQ, copied from PeerBerry structure
│   └── /admin
│       ├── /pending-kyc
│       ├── /users
│       ├── /loans
│       ├── /audit-log
│       └── /metrics
│
├── /api                         ← Next.js Route Handlers (when Server Actions don't fit)
│   ├── /webhooks
│   │   └── /stripe              ← Stripe webhook signature verification + handling
│   ├── /export                  ← GDPR data export
│   ├── /score/recompute
│   └── /llm
│       └── /parse-payslip
│
├── /lib
│   ├── /db
│   │   ├── client.ts            ← Supabase client (browser + server)
│   │   ├── queries.ts
│   │   └── types.ts
│   ├── /auth
│   │   ├── domain-allowlist.ts  ← NCI domain check
│   │   ├── totp.ts
│   │   └── session.ts
│   ├── /scoring
│   │   ├── score.ts             ← 100-pt algorithm
│   │   └── narrative.ts         ← Gemini wrapper (optional)
│   ├── /finance
│   │   ├── amortization.ts      ← repayment schedule math
│   │   ├── wallet.ts            ← atomic wallet operations
│   │   └── interest.ts
│   ├── /stripe
│   │   ├── checkout.ts          ← deposit checkout session
│   │   └── webhook.ts
│   ├── /email
│   │   ├── client.ts            ← Resend client
│   │   └── /templates           ← React Email templates
│   ├── /pdf
│   │   ├── agreement.tsx        ← React-PDF loan agreement
│   │   └── audit-trail.tsx
│   └── /audit
│       └── log.ts               ← writes audit_log rows
│
├── /components
│   ├── /ui                      ← shadcn primitives
│   ├── /onboarding
│   │   ├── ProgressBar.tsx
│   │   ├── DocumentUploader.tsx
│   │   └── SelfieCapture.tsx
│   ├── /lender
│   │   ├── LoanCard.tsx
│   │   ├── FilterSidebar.tsx
│   │   └── InvestModal.tsx
│   ├── /borrower
│   │   ├── LoanRequestForm.tsx
│   │   └── ScoreBreakdown.tsx
│   ├── /shared
│   │   ├── WalletBalance.tsx
│   │   ├── TransactionRow.tsx
│   │   └── RiskBanner.tsx
│   └── /admin
│       └── KycReviewCard.tsx
│
├── /emails                      ← React Email templates
│   ├── verify-email.tsx
│   ├── deposit-received.tsx
│   ├── offer-received.tsx
│   ├── offer-accepted.tsx
│   ├── disbursement-confirmed.tsx
│   ├── repayment-due.tsx
│   ├── repayment-late.tsx
│   └── kyc-approved.tsx
│
└── /tests
    ├── /e2e                     ← Playwright (optional, day 2 if time)
    └── /unit                    ← scoring, amortization
```

---

## 5. Environment & Secrets

### 5.1 `.env.example`

```bash
# Public (browser-safe)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://121ai.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Server-only
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # bypass RLS for admin ops
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=onboarding@send.121ai.app
GEMINI_API_KEY=AIza...                  # optional
SENTRY_DSN=https://xxx.ingest.sentry.io/xxx
SESSION_SECRET=<openssl rand -hex 32>
ADMIN_EMAIL_ALLOWLIST=you@example.com   # comma-separated
NCI_EMAIL_DOMAINS=student.ncirl.ie,ncirl.ie
```

### 5.2 What goes where

| Secret | Vercel | Supabase | GitHub Actions |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | yes | n/a | no — never |
| `STRIPE_SECRET_KEY` | yes | yes (for Edge Functions) | no |
| `STRIPE_WEBHOOK_SECRET` | yes | n/a | no |
| `RESEND_API_KEY` | yes | yes | no |
| `GEMINI_API_KEY` | yes | yes | no |
| `SENTRY_DSN` | yes | yes | yes (for source maps upload) |

Never commit `.env.local`. The `.env.example` template is committed and tells future you which keys exist.

---

## 6. Database Schema (Full SQL)

This is the production-target schema, simplified for the demo. It maps directly to `db_schema_mlp.md` with PeerBerry-inspired additions (wallet, ledger, auto_invest_strategies, loyalty).

### 6.1 `migrations/20260427_001_init.sql`

```sql
-- ===========================================================================
-- 121.ai by LendLoop — Initial Schema
-- ===========================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ---------------------------------------------------------------------------
-- Communities (multi-tenancy from day 1)
-- ---------------------------------------------------------------------------
CREATE TABLE communities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    email_domains   TEXT[] NOT NULL,           -- ['student.ncirl.ie', 'ncirl.ie']
    sponsor_org     TEXT,                      -- 'National College of Ireland'
    welcome_bonus_bps INTEGER DEFAULT 50,      -- 0.5% = 50 basis points
    welcome_bonus_days INTEGER DEFAULT 90,
    max_loan_amount NUMERIC(12,2) DEFAULT 2000,
    min_loan_amount NUMERIC(12,2) DEFAULT 100,
    max_apr_bps     INTEGER DEFAULT 1200,      -- 12.00%
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Users (linked to Supabase auth.users)
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('member', 'admin', 'support');
CREATE TYPE user_status AS ENUM (
    'pending_email_verification',
    'pending_personal_details',
    'pending_2fa',
    'pending_identity',
    'pending_address_proof',
    'pending_admin_approval',
    'verified',
    'suspended',
    'deleted'
);
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TABLE users (
    id              UUID PRIMARY KEY,                    -- matches auth.users.id
    community_id    UUID NOT NULL REFERENCES communities(id),
    email           TEXT UNIQUE NOT NULL,
    role            user_role NOT NULL DEFAULT 'member',
    status          user_status NOT NULL DEFAULT 'pending_email_verification',

    -- Personal details (collected step 3)
    first_name      TEXT,
    last_name       TEXT,
    date_of_birth   DATE,
    gender          gender_type,
    mobile_e164     TEXT,                                -- '+353871234567'
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    postal_code     TEXT,
    country         TEXT DEFAULT 'IE',

    -- 2FA
    totp_secret_encrypted TEXT,                          -- never plain
    totp_enabled    BOOLEAN DEFAULT FALSE,
    backup_codes_hashed JSONB,                           -- array of bcrypt hashes

    -- Identity (set after admin approval)
    identity_doc_type TEXT,                              -- 'passport' | 'national_id'
    identity_verified_at TIMESTAMPTZ,
    identity_verification_method TEXT DEFAULT 'manual_admin', -- 'veriff' in prod

    -- Cohort metadata (NCI-specific)
    nci_program     TEXT,                                -- 'MSc Data Analytics'
    nci_year        INTEGER,                             -- 1, 2
    is_part_time_employed BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    last_login_at   TIMESTAMPTZ,

    CONSTRAINT age_18_check CHECK (
        date_of_birth IS NULL OR date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')
    )
);

CREATE INDEX idx_users_community ON users(community_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- ---------------------------------------------------------------------------
-- Documents (KYC uploads + supporting docs)
-- ---------------------------------------------------------------------------
CREATE TYPE document_kind AS ENUM (
    'identity_front',     -- passport page or national ID front
    'identity_back',      -- national ID back (passports skip)
    'selfie',             -- live photo
    'address_proof',      -- IRP or utility bill
    'student_id',         -- NCI student ID card
    'payslip',            -- part-time job payslip
    'bank_statement'      -- optional supporting
);
CREATE TYPE document_status AS ENUM ('uploaded', 'under_review', 'approved', 'rejected');

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id    UUID NOT NULL REFERENCES communities(id),
    kind            document_kind NOT NULL,
    status          document_status DEFAULT 'uploaded',
    storage_path    TEXT NOT NULL,                       -- 'kyc/{user_id}/identity_front.jpg'
    original_filename TEXT,
    mime_type       TEXT,
    file_size_bytes INTEGER,
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    -- LLM-extracted fields (when applicable)
    extracted_data  JSONB,                               -- {employer, gross_monthly, ...}
    extraction_confidence NUMERIC(3,2),                  -- 0.00–1.00
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_status_kind ON documents(status, kind);

-- ---------------------------------------------------------------------------
-- AML/PEP screening (simulated for demo; ComplyAdvantage in prod)
-- ---------------------------------------------------------------------------
CREATE TABLE aml_screenings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    provider        TEXT DEFAULT 'simulated',            -- 'complyadvantage' in prod
    result          TEXT NOT NULL,                       -- 'clear' | 'review' | 'flagged'
    pep_match       BOOLEAN DEFAULT FALSE,
    sanctions_match BOOLEAN DEFAULT FALSE,
    adverse_media_match BOOLEAN DEFAULT FALSE,
    raw_response    JSONB,
    screened_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_aml_user ON aml_screenings(user_id);

-- ---------------------------------------------------------------------------
-- Wallet (PeerBerry-style internal balance)
-- ---------------------------------------------------------------------------
CREATE TABLE wallets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id),
    community_id    UUID NOT NULL REFERENCES communities(id),
    available_balance_cents BIGINT NOT NULL DEFAULT 0,   -- spendable
    invested_balance_cents BIGINT NOT NULL DEFAULT 0,    -- committed to active loans
    pending_balance_cents BIGINT NOT NULL DEFAULT 0,     -- deposit clearing
    currency        TEXT DEFAULT 'EUR',
    iban_for_deposit TEXT,                               -- platform IBAN with reference code
    deposit_reference TEXT UNIQUE,                       -- 'LL-{user_id_short}-{rand}'
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT non_negative_available CHECK (available_balance_cents >= 0),
    CONSTRAINT non_negative_invested CHECK (invested_balance_cents >= 0)
);

CREATE INDEX idx_wallets_user ON wallets(user_id);

-- ---------------------------------------------------------------------------
-- Ledger (every cent that moves writes a row — double-entry)
-- ---------------------------------------------------------------------------
CREATE TYPE ledger_entry_type AS ENUM (
    'deposit_pending',
    'deposit_cleared',
    'investment_committed',     -- lender commits to loan
    'investment_disbursed',     -- funds leave lender, go to borrower
    'repayment_principal',
    'repayment_interest',
    'repayment_late_fee',
    'platform_fee',             -- LendLoop's 15% interest cut
    'welcome_bonus',
    'withdrawal_initiated',
    'withdrawal_completed',
    'manual_adjustment'         -- admin override
);

CREATE TABLE ledger (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id       UUID NOT NULL REFERENCES wallets(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    entry_type      ledger_entry_type NOT NULL,
    amount_cents    BIGINT NOT NULL,                     -- can be negative
    balance_after_cents BIGINT NOT NULL,                 -- snapshot for audit
    related_loan_id UUID,                                -- nullable; FK below after loans created
    related_repayment_id UUID,
    related_stripe_id TEXT,                              -- pi_xxx or ch_xxx
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    created_by      UUID REFERENCES users(id)            -- nullable for system entries
);

CREATE INDEX idx_ledger_wallet ON ledger(wallet_id, created_at DESC);
CREATE INDEX idx_ledger_user ON ledger(user_id, created_at DESC);
CREATE INDEX idx_ledger_loan ON ledger(related_loan_id);

-- ---------------------------------------------------------------------------
-- Borrower assessment (the inputs to the score)
-- ---------------------------------------------------------------------------
CREATE TABLE borrower_assessments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    community_id    UUID NOT NULL REFERENCES communities(id),

    -- Self-declared
    monthly_income_cents BIGINT,
    monthly_expenses_cents BIGINT,
    existing_debt_cents BIGINT DEFAULT 0,
    employment_status TEXT,                              -- 'part_time' | 'full_time' | 'student_only'
    employment_months INTEGER,
    has_emergency_fund BOOLEAN,

    -- Verified (from documents)
    verified_income_cents BIGINT,
    income_verification_method TEXT,                     -- 'payslip_admin' | 'open_banking' | 'employer_api'

    -- Stability signals
    nci_semesters_completed INTEGER,
    has_irp BOOLEAN DEFAULT FALSE,
    irp_expiry_date DATE,

    submitted_at    TIMESTAMPTZ DEFAULT now(),
    last_updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assessments_user ON borrower_assessments(user_id);

-- ---------------------------------------------------------------------------
-- Credit Scores (computed, versioned)
-- ---------------------------------------------------------------------------
CREATE TABLE credit_scores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    community_id    UUID NOT NULL REFERENCES communities(id),
    total_score     INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
    identity_score  INTEGER NOT NULL,                    -- 0-20
    income_score    INTEGER NOT NULL,                    -- 0-25
    stability_score INTEGER NOT NULL,                    -- 0-15
    financial_score INTEGER NOT NULL,                    -- 0-20
    reputation_score INTEGER NOT NULL,                   -- 0-20
    breakdown       JSONB NOT NULL,                      -- detailed component scores
    llm_narrative   TEXT,                                -- optional Gemini-generated explanation
    algorithm_version TEXT NOT NULL DEFAULT 'v1.0',
    computed_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scores_user_recent ON credit_scores(user_id, computed_at DESC);

-- ---------------------------------------------------------------------------
-- Loan Requests (borrower's posted need)
-- ---------------------------------------------------------------------------
CREATE TYPE loan_purpose AS ENUM (
    'tuition_topup',
    'laptop_equipment',
    'emergency',
    'living_expenses',
    'travel_home',
    'other'
);
CREATE TYPE loan_request_status AS ENUM (
    'draft',
    'open',           -- visible to lenders
    'partially_funded',
    'fully_funded',
    'expired',        -- 14 days no funding
    'cancelled',
    'converted'       -- became an active loan
);

CREATE TABLE loan_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrower_id     UUID NOT NULL REFERENCES users(id),
    community_id    UUID NOT NULL REFERENCES communities(id),
    amount_cents    BIGINT NOT NULL,
    purpose         loan_purpose NOT NULL,
    purpose_description TEXT,
    requested_term_months INTEGER NOT NULL CHECK (requested_term_months BETWEEN 1 AND 12),
    max_apr_bps     INTEGER NOT NULL,                    -- borrower's ceiling
    status          loan_request_status DEFAULT 'draft',
    funded_amount_cents BIGINT DEFAULT 0,
    score_at_request INTEGER,                            -- snapshot
    score_breakdown_at_request JSONB,
    posted_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,                         -- posted_at + 14 days
    created_at      TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT amount_in_range CHECK (amount_cents BETWEEN 10000 AND 200000) -- €100–€2000
);

CREATE INDEX idx_requests_status_open ON loan_requests(community_id, status) WHERE status = 'open';
CREATE INDEX idx_requests_borrower ON loan_requests(borrower_id);

-- ---------------------------------------------------------------------------
-- Loan Offers (lender's bid)
-- ---------------------------------------------------------------------------
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn', 'expired');

CREATE TABLE loan_offers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id      UUID NOT NULL REFERENCES loan_requests(id),
    lender_id       UUID NOT NULL REFERENCES users(id),
    community_id    UUID NOT NULL REFERENCES communities(id),
    amount_cents    BIGINT NOT NULL,
    apr_bps         INTEGER NOT NULL,                    -- 800 = 8.00%
    term_months     INTEGER NOT NULL,
    status          offer_status DEFAULT 'pending',
    message_to_borrower TEXT,
    expires_at      TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
    created_at      TIMESTAMPTZ DEFAULT now(),
    decided_at      TIMESTAMPTZ
);

CREATE INDEX idx_offers_request ON loan_offers(request_id);
CREATE INDEX idx_offers_lender ON loan_offers(lender_id);

-- ---------------------------------------------------------------------------
-- Loans (active contracts)
-- ---------------------------------------------------------------------------
CREATE TYPE loan_status AS ENUM (
    'pending_signature',
    'pending_disbursement',
    'active',
    'in_grace',
    'in_default',
    'paid_off',
    'written_off'
);

CREATE TABLE loans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id      UUID NOT NULL REFERENCES loan_requests(id),
    offer_id        UUID NOT NULL REFERENCES loan_offers(id),
    borrower_id     UUID NOT NULL REFERENCES users(id),
    lender_id       UUID NOT NULL REFERENCES users(id),
    community_id    UUID NOT NULL REFERENCES communities(id),

    principal_cents BIGINT NOT NULL,
    apr_bps         INTEGER NOT NULL,
    term_months     INTEGER NOT NULL,
    monthly_payment_cents BIGINT NOT NULL,
    total_interest_cents BIGINT NOT NULL,
    platform_fee_bps INTEGER DEFAULT 1500,               -- 15% of interest

    status          loan_status DEFAULT 'pending_signature',
    disbursed_at    TIMESTAMPTZ,
    first_payment_due_at DATE,
    paid_off_at     TIMESTAMPTZ,

    agreement_pdf_path TEXT,                             -- supabase storage path
    audit_trail_pdf_path TEXT,
    borrower_signed_at TIMESTAMPTZ,
    lender_signed_at TIMESTAMPTZ,
    borrower_signature_ip TEXT,
    lender_signature_ip TEXT,

    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loans_borrower ON loans(borrower_id);
CREATE INDEX idx_loans_lender ON loans(lender_id);
CREATE INDEX idx_loans_status ON loans(community_id, status);

-- ---------------------------------------------------------------------------
-- Repayments (scheduled + actual)
-- ---------------------------------------------------------------------------
CREATE TYPE repayment_status AS ENUM ('scheduled', 'paid', 'late', 'missed', 'partial');

CREATE TABLE repayments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id         UUID NOT NULL REFERENCES loans(id),
    sequence_number INTEGER NOT NULL,                    -- 1, 2, 3...
    due_date        DATE NOT NULL,
    principal_cents BIGINT NOT NULL,
    interest_cents  BIGINT NOT NULL,
    platform_fee_cents BIGINT NOT NULL,                  -- 15% of interest
    total_due_cents BIGINT NOT NULL,
    paid_amount_cents BIGINT DEFAULT 0,
    paid_at         TIMESTAMPTZ,
    status          repayment_status DEFAULT 'scheduled',
    late_fee_cents  BIGINT DEFAULT 0,
    days_late       INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),

    UNIQUE (loan_id, sequence_number)
);

CREATE INDEX idx_repayments_loan ON repayments(loan_id, sequence_number);
CREATE INDEX idx_repayments_due ON repayments(due_date) WHERE status IN ('scheduled', 'late');

-- ---------------------------------------------------------------------------
-- Auto-Invest Strategies (PeerBerry feature)
-- ---------------------------------------------------------------------------
CREATE TABLE auto_invest_strategies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lender_id       UUID NOT NULL REFERENCES users(id),
    community_id    UUID NOT NULL REFERENCES communities(id),
    name            TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,

    -- Filters
    min_score       INTEGER DEFAULT 60,                  -- only fund borrowers ≥ X
    min_apr_bps     INTEGER,
    max_apr_bps     INTEGER,
    min_term_months INTEGER,
    max_term_months INTEGER,
    allowed_purposes loan_purpose[],

    -- Behaviour
    investment_per_loan_cents BIGINT NOT NULL,           -- spend exactly €X per loan
    max_total_invested_cents BIGINT,                     -- cap on this strategy
    diversification_max_per_borrower INTEGER DEFAULT 1,  -- only 1 active loan per borrower
    portfolio_size_target_cents BIGINT,

    last_run_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_strategies_active ON auto_invest_strategies(community_id, is_active) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- Notifications (in-app inbox)
-- ---------------------------------------------------------------------------
CREATE TYPE notification_type AS ENUM (
    'kyc_approved', 'kyc_rejected',
    'deposit_received',
    'offer_received', 'offer_accepted', 'offer_rejected',
    'loan_disbursed',
    'repayment_due_3d', 'repayment_due_today', 'repayment_late',
    'repayment_received',
    'loan_paid_off',
    'login_new_device',
    'system_announcement'
);

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    community_id    UUID NOT NULL REFERENCES communities(id),
    type            notification_type NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    link_url        TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    sent_via_email  BOOLEAN DEFAULT FALSE,
    email_sent_at   TIMESTAMPTZ,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- Consent records (GDPR)
-- ---------------------------------------------------------------------------
CREATE TABLE consent_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    consent_type    TEXT NOT NULL,                       -- 'tos', 'privacy', 'marketing', 'data_processing'
    version         TEXT NOT NULL,                       -- 'tos_v1.0_2026-04-27'
    granted         BOOLEAN NOT NULL,
    granted_at      TIMESTAMPTZ DEFAULT now(),
    ip_address      TEXT,
    user_agent      TEXT
);

CREATE INDEX idx_consent_user ON consent_records(user_id, consent_type);

-- ---------------------------------------------------------------------------
-- Audit Log (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id   UUID REFERENCES users(id),           -- nullable for system actions
    actor_ip        TEXT,
    actor_user_agent TEXT,
    action_type     TEXT NOT NULL,                       -- 'user.signup', 'loan.disburse', etc.
    resource_type   TEXT,                                -- 'user', 'loan', 'document'
    resource_id     UUID,
    before_state    JSONB,
    after_state     JSONB,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_audit_actor ON audit_log(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action_type, created_at DESC);

-- Make audit_log effectively append-only (revoke UPDATE/DELETE)
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON audit_log FROM authenticated;

-- ---------------------------------------------------------------------------
-- Webhooks Inbound (Stripe replays)
-- ---------------------------------------------------------------------------
CREATE TABLE webhooks_inbound (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider        TEXT NOT NULL,                       -- 'stripe'
    event_id        TEXT UNIQUE NOT NULL,                -- stripe event id
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,
    signature_valid BOOLEAN NOT NULL,
    processed       BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    received_at     TIMESTAMPTZ DEFAULT now(),
    processed_at    TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Idempotency (prevent double-disbursement)
-- ---------------------------------------------------------------------------
CREATE TABLE idempotency_keys (
    key             TEXT PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    response        JSONB NOT NULL,
    status_code     INTEGER NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- ---------------------------------------------------------------------------
-- Seed: NCI community + sample admin
-- ---------------------------------------------------------------------------
INSERT INTO communities (slug, name, email_domains, sponsor_org)
VALUES (
    'nci',
    'National College of Ireland',
    ARRAY['student.ncirl.ie', 'ncirl.ie'],
    'NCI'
);
```

### 6.2 Triggers (auto-update `updated_at`, ledger consistency)

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_strategies_updated BEFORE UPDATE ON auto_invest_strategies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create wallet when user is created
CREATE OR REPLACE FUNCTION create_wallet_for_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, community_id, deposit_reference)
    VALUES (
        NEW.id,
        NEW.community_id,
        'LL-' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', '') FOR 8) || '-' || SUBSTRING(MD5(random()::TEXT) FOR 4)
    );
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_wallet AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_wallet_for_user();
```

---

## 7. Row-Level Security Policies

### 7.1 `migrations/20260427_002_rls.sql`

The principle: every multi-tenant table enforces `community_id = current_user's community`. Even if your application code has a SQL bug, Postgres returns an empty set across communities.

```sql
-- Enable RLS on every tenant table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_invest_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_screenings ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's community_id from JWT
CREATE OR REPLACE FUNCTION auth.community_id() RETURNS UUID AS $$
    SELECT community_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
    SELECT role = 'admin' FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- ---------------------------------------------------------------------------
-- Users: see yourself + community members; admin sees all
-- ---------------------------------------------------------------------------
CREATE POLICY users_select ON users FOR SELECT
    USING (
        id = auth.uid()
        OR community_id = auth.community_id()
        OR auth.is_admin()
    );

CREATE POLICY users_update_self ON users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = 'member'); -- can't elevate yourself

-- ---------------------------------------------------------------------------
-- Wallets: only your own (admin sees community)
-- ---------------------------------------------------------------------------
CREATE POLICY wallets_select ON wallets FOR SELECT
    USING (
        user_id = auth.uid()
        OR (auth.is_admin() AND community_id = auth.community_id())
    );

-- Wallet writes go through service role only (server-side, atomic)
-- No client-side INSERT/UPDATE policy = effectively read-only for users

-- ---------------------------------------------------------------------------
-- Ledger: see only your own entries
-- ---------------------------------------------------------------------------
CREATE POLICY ledger_select ON ledger FOR SELECT
    USING (
        user_id = auth.uid()
        OR (auth.is_admin() AND EXISTS (
            SELECT 1 FROM users u WHERE u.id = ledger.user_id AND u.community_id = auth.community_id()
        ))
    );

-- ---------------------------------------------------------------------------
-- Loan Requests: open ones visible to all in community; full visibility to involved parties
-- ---------------------------------------------------------------------------
CREATE POLICY requests_select ON loan_requests FOR SELECT
    USING (
        community_id = auth.community_id()
        AND (status = 'open' OR borrower_id = auth.uid() OR auth.is_admin())
    );

CREATE POLICY requests_insert ON loan_requests FOR INSERT
    WITH CHECK (
        borrower_id = auth.uid()
        AND community_id = auth.community_id()
    );

CREATE POLICY requests_update_own ON loan_requests FOR UPDATE
    USING (borrower_id = auth.uid() AND status IN ('draft', 'open'));

-- ---------------------------------------------------------------------------
-- Loan Offers: visible to lender + borrower of the request
-- ---------------------------------------------------------------------------
CREATE POLICY offers_select ON loan_offers FOR SELECT
    USING (
        lender_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM loan_requests r
            WHERE r.id = loan_offers.request_id AND r.borrower_id = auth.uid()
        )
        OR auth.is_admin()
    );

CREATE POLICY offers_insert ON loan_offers FOR INSERT
    WITH CHECK (
        lender_id = auth.uid()
        AND community_id = auth.community_id()
    );

-- ---------------------------------------------------------------------------
-- Loans: visible to borrower + lender + admin
-- ---------------------------------------------------------------------------
CREATE POLICY loans_select ON loans FOR SELECT
    USING (
        borrower_id = auth.uid()
        OR lender_id = auth.uid()
        OR auth.is_admin()
    );

-- Loans created server-side only (service role bypasses RLS)

-- ---------------------------------------------------------------------------
-- Documents: only owner + admin
-- ---------------------------------------------------------------------------
CREATE POLICY documents_select ON documents FOR SELECT
    USING (user_id = auth.uid() OR auth.is_admin());

CREATE POLICY documents_insert ON documents FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Notifications: only your own
-- ---------------------------------------------------------------------------
CREATE POLICY notifications_select ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Audit log: only admins read; everyone via service role writes
-- ---------------------------------------------------------------------------
CREATE POLICY audit_select_admin ON audit_log FOR SELECT
    USING (auth.is_admin());

-- ---------------------------------------------------------------------------
-- Storage policies (Supabase Storage buckets)
-- ---------------------------------------------------------------------------
-- Bucket: 'documents' (created in dashboard, set to private)
-- Path convention: {user_id}/{kind}/{filename}
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

CREATE POLICY documents_storage_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY documents_storage_select ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'documents'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR (
                SELECT role = 'admin' FROM users WHERE id = auth.uid()
            )
        )
    );

-- Bucket: 'agreements' (signed PDFs)
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements', 'agreements', false)
ON CONFLICT DO NOTHING;

CREATE POLICY agreements_storage_select ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'agreements'
        AND (
            -- Filename format: {loan_id}/agreement.pdf
            EXISTS (
                SELECT 1 FROM loans
                WHERE loans.id::text = (storage.foldername(name))[1]
                AND (loans.borrower_id = auth.uid() OR loans.lender_id = auth.uid())
            )
            OR (SELECT role = 'admin' FROM users WHERE id = auth.uid())
        )
    );
```

### 7.2 The cross-tenant test (write this on day 1)

```sql
-- After seeding two communities and two users in different ones:
-- Test from psql or Supabase SQL Editor as User A:
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '<user_a_uuid>';
SELECT COUNT(*) FROM loan_requests; -- should ONLY see Community A's requests
SELECT COUNT(*) FROM loan_requests WHERE community_id = '<community_b_uuid>'; -- must be 0
```

If this test returns anything other than 0 for the cross-tenant query, your RLS is broken. Fix it before day 2.

---

## 8. Authentication & Registration Flow

This is the PeerBerry pattern, adapted for NCI students. The user goes through 5 distinct gates before they can do anything financial.

### 8.1 The full onboarding state machine

```
[NEW] ──register──▶ [pending_email_verification]
                     │ verify 6-digit OTP
                     ▼
                    [pending_personal_details]
                     │ DOB ≥ 18, address, mobile, gender
                     ▼
                    [pending_2fa]
                     │ scan QR, enter TOTP code
                     ▼
                    [pending_identity]
                     │ upload passport/ID + selfie
                     ▼
                    [pending_address_proof]
                     │ upload IRP / utility / NCI student ID
                     ▼
                    [pending_admin_approval]
                     │ admin reviews documents
                     ▼
                    [verified]  ◀── can deposit, lend, borrow
```

### 8.2 Screen 1: `/register` — Account Creation

**Fields:**
- Email (must end with one of `NCI_EMAIL_DOMAINS`)
- Password (min 12 chars, must contain upper + lower + digit + symbol)
- Confirm Password
- Account Type: radio with `Individual (Default)` and `Company` (disabled with tooltip "Coming in 2026")
- Checkbox: "I am at least 18 years old"
- Checkbox: "I have read and agree to the **Terms of Service** and **Privacy Policy**" (links open modals)
- Checkbox: "I consent to processing of my personal data per GDPR" (separate, GDPR requires distinct consent)
- reCAPTCHA: skip for demo (use Cloudflare Turnstile in Phase 1)

**Validation:**
```typescript
// /lib/auth/domain-allowlist.ts
const NCI_DOMAINS = process.env.NCI_EMAIL_DOMAINS!.split(',');
export function isNciEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return NCI_DOMAINS.includes(domain);
}

// Password strength
export function passwordScore(pw: string): { score: 0|1|2|3|4, message: string } {
  // Use zxcvbn — see https://github.com/dropbox/zxcvbn
  // Reject score < 3
}
```

**Server Action:**
```typescript
'use server';
import { createClient } from '@/lib/db/client';
import { writeAuditLog } from '@/lib/audit/log';

export async function registerAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const ageConfirmed = formData.get('age_confirmed') === 'on';
  const tosAgreed = formData.get('tos_agreed') === 'on';
  const gdprConsent = formData.get('gdpr_consent') === 'on';

  if (!isNciEmail(email)) {
    return { error: 'Only NCI student/staff emails are accepted.' };
  }
  if (!ageConfirmed || !tosAgreed || !gdprConsent) {
    return { error: 'You must agree to all required terms.' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/verify-email/callback`,
    }
  });
  if (error) return { error: error.message };

  // Create users row + consent records (server-side via service role)
  const adminClient = createServiceRoleClient();
  const community = await adminClient
    .from('communities')
    .select('id')
    .eq('slug', 'nci')
    .single();

  await adminClient.from('users').insert({
    id: data.user!.id,
    email,
    community_id: community.data!.id,
    status: 'pending_email_verification',
  });

  // Record consents
  await adminClient.from('consent_records').insert([
    { user_id: data.user!.id, consent_type: 'tos', version: 'tos_v1.0_2026-04-27', granted: true, ip_address: clientIp() },
    { user_id: data.user!.id, consent_type: 'privacy', version: 'privacy_v1.0_2026-04-27', granted: true, ip_address: clientIp() },
    { user_id: data.user!.id, consent_type: 'data_processing', version: 'gdpr_v1.0_2026-04-27', granted: true, ip_address: clientIp() },
  ]);

  await writeAuditLog({ actor_user_id: data.user!.id, action_type: 'user.signup', resource_type: 'user', resource_id: data.user!.id });

  return { success: true };
}
```

**Why use Supabase's built-in confirmation email + an additional 6-digit OTP screen?** PeerBerry's UX uses an explicit "enter the 6-digit code from your email" pattern. Supabase Auth defaults to a magic link. We override by sending a code via Resend manually and validating ourselves. This matches the PeerBerry flow the user spec'd.

### 8.3 Screen 2: `/verify-email` — OTP

**UI:**
- Big text: "Check your email"
- Subtext: "We sent a 6-digit code to `smruti@student.ncirl.ie`"
- 6 input boxes for the digits (auto-advance on type)
- "Resend code" link (60s cooldown)
- "Wrong email? Go back"

**Server logic:**
- On register, generate `email_verification_codes (user_id, code_hash, expires_at, attempts)` row
- Code is 6 digits, expires in 15 minutes, max 5 attempts
- Send via Resend with template `verify-email.tsx`
- On submit, hash submitted code, compare. If match → set `users.status = 'pending_personal_details'`, advance.

```sql
CREATE TABLE email_verification_codes (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 8.4 Screen 3: `/onboarding/personal-details`

**Fields (PeerBerry parity):**
- First name *
- Last name *
- Date of Birth * (calendar picker; rejects DOB < 18 years ago client-side AND server-side)
- Gender (Male / Female / Other / Prefer not to say)
- Mobile number * (with country code dropdown, defaulted to IE +353)
- Address Line 1 *
- Address Line 2
- City *
- Postal Code *
- Country (locked to IE for v1, but show as dropdown so judges see EU readiness)
- NCI program (dropdown: MSc Data Analytics, MSc Cloud Computing, BBus, etc.)
- NCI year (1, 2, 3, 4)
- Part-time employed? (yes/no toggle)

**Validation rules:**
- DOB: reject if `(current_date - dob) < 18 years` — show explicit message: "You must be at least 18 years old to register"
- Mobile: E.164 format check
- Postal code: Eircode validation (IE-specific regex)

**Server action:** updates `users` row with all fields, sets `status = 'pending_2fa'`.

### 8.5 Screen 4: `/onboarding/two-factor`

**UI flow:**
1. "Secure your account with two-factor authentication" heading
2. Big QR code (scan with Google Authenticator / Authy / 1Password)
3. Below QR: monospace text of the secret (for manual entry)
4. Input box: "Enter the 6-digit code from your authenticator app"
5. After successful verification: show 8 backup codes with "Download / Print" button

**Implementation:**
```typescript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// Generate
const secret = authenticator.generateSecret();
const otpauth = authenticator.keyuri(user.email, '121.ai by LendLoop', secret);
const qrDataUrl = await QRCode.toDataURL(otpauth);

// Store encrypted (use Supabase Vault, or pgcrypto)
await db.from('users').update({
  totp_secret_encrypted: encrypt(secret),
  totp_enabled: false  // becomes true after they verify
}).eq('id', userId);

// Verify on submit
const valid = authenticator.verify({ token: code, secret: decrypt(user.totp_secret_encrypted) });
if (valid) {
  await db.from('users').update({
    totp_enabled: true,
    status: 'pending_identity',
    backup_codes_hashed: backupCodes.map(c => bcrypt.hashSync(c, 10))
  }).eq('id', userId);
}
```

### 8.6 Screen 5: `/onboarding/identity` — KYC (THE PEERBERRY MOMENT)

This screen is a near-verbatim copy of PeerBerry's KYC intro. The copy itself is doing a lot of work — it conveys "this is real, regulated infrastructure."

**Header copy (verbatim adaptation):**
> ### Verify your identity
>
> According to European laws and regulations, we must verify the identity of our members. The verification process is very simple and takes up to 10 minutes.
>
> Before starting, please prepare your **valid passport or national ID card**. You will be asked to take a real-time photo of your face and of the document. Electronic or scanned versions will not be accepted.
>
> The document cannot be tampered with or covered with any stickers. Your picture, name, surname, and other relevant information must be readable.
>
> Please note that other types of documents such as **driver's licence, residence permit, military ID, etc., are not accepted** and will be declined.

**[Start Verification] button**

Below, in smaller text:
> Identity verification is provided by our trusted and secure verification partner.
> ✓ Website meets SSL requirements
> ✓ Compliant with data protection laws (GDPR)

> *Why do I need to verify my identity?*
> *Which documents are accepted as proof of identity?*
> *Which data will be stored during verification?*
> *Which browsers are supported for verification?*

(These are accordion expand items — copy answers from PeerBerry's verification-process page nearly verbatim.)

### 8.7 The KYC capture flow (simulated Veriff)

**Step 1: Document type selection**
- Two big cards: "Passport" / "National ID Card"
- After selecting "National ID Card", show "You'll need to photograph BOTH sides"

**Step 2: Document photo capture**
- Browser webcam preview with overlaid frame
- "Position your document inside the frame" guidance
- "Make sure the entire document is visible and the text is sharp" hint
- Big circular [Capture] button
- After capture: preview with "Looks good?" → [Retry] / [Continue]

**Implementation:**
```typescript
// Use the browser MediaDevices API
const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
videoEl.srcObject = stream;

// Capture
canvas.getContext('2d')!.drawImage(videoEl, 0, 0);
const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
```

**Step 3: Selfie with "liveness check" (simulated)**
- Front-facing webcam, oval mask overlay
- Instructions sequence (animate one at a time):
  1. "Centre your face in the oval"
  2. "Slowly turn your head to the left"
  3. "Slowly turn your head to the right"
  4. "Look directly at the camera and blink"
- Capture 3-second video clip + final frame as selfie
- Show progress: "Analysing... 30% → 60% → 100%"
- Display "Liveness check: ✓ passed (97% confidence)" — fake but consistent

**Step 4: Upload + status**
- Upload all captures to Supabase Storage at `documents/{user_id}/identity/`
- Insert rows into `documents` table with `status = 'uploaded'`
- Insert into `aml_screenings` with `result = 'clear'` (simulated)
- Set `users.status = 'pending_address_proof'`
- Show: "Identity documents submitted. Continue to next step."

### 8.8 Screen 6: `/onboarding/address-proof`

For NCI student community, you collect TWO supporting documents:

**Document 1: NCI Student ID** (front + back, OR a screenshot of the digital ID app)
- Use case: confirms active student status
- Upload widget identical to identity capture

**Document 2: Address Proof — one of:**
- IRP (Irish Residence Permit) — for non-EU students
- Recent utility bill (under 3 months)
- Bank statement (under 3 months)
- A letter from NCI confirming address

**Optional Document 3: Payslip** (only required if borrowing — skip if lender)
- Upload 1–3 most recent payslips
- "This helps us verify your repayment capacity"

After uploads → `users.status = 'pending_admin_approval'`.

### 8.9 Screen 7: `/onboarding/complete`

**Heading:** "We're reviewing your documents"

**Body:**
> Thanks for completing registration, {first_name}!
>
> Our team is reviewing your submitted documents. This usually takes **less than 1 business day**.
>
> You'll receive an email at `smruti@student.ncirl.ie` once your account is fully verified.
>
> Meanwhile, you can:
> - Browse our [Help Center](/help)
> - Read about [How 121.ai Works](/how-it-works)
> - Update your [Profile](/profile)

(For demo: admin pre-approves before walkthrough, so this screen is shown briefly then auto-redirects to dashboard once `users.status = 'verified'`.)

### 8.10 Login flow

**`/login`:**
- Email + password form
- "Remember this device" checkbox
- After submit: if 2FA enabled (it always is post-onboarding), redirect to `/login/2fa`

**`/login/2fa`:**
- "Enter the 6-digit code from your authenticator app"
- Or: "Use a backup code instead" (link)

**Lockout policy:**
- 5 failed password attempts in 15 min → account temporarily locked, email sent
- 5 failed 2FA attempts → invalidate session, force re-login

**Login event audit:**
- Insert `audit_log` row with `action_type = 'auth.login_success'` or `'auth.login_failure'`
- If new device fingerprint → notification + email "New login from {device} at {ip}"

---

## 9. KYC / Identity Verification Flow

(Covered in section 8.6–8.8; here we add the admin review side and the production swap.)

### 9.1 Admin review queue: `/admin/pending-kyc`

**UI:**
- Sidebar list of users with `status = 'pending_admin_approval'`
- Click a user → split-screen view:
  - Left: rendered images of identity_front, identity_back, selfie, address_proof, student_id, payslip
  - Right: the user's submitted personal details (name, DOB, address)
- Compare panel: "Does the name on the document match the registered name?" — admin manually checks
- Action buttons: [Approve All] / [Reject — reason required]

**Approve flow:**
```typescript
// /app/admin/pending-kyc/[user_id]/approve
'use server';

export async function approveKyc(userId: string) {
  await assertAdmin();

  await db.transaction(async (tx) => {
    await tx.from('documents')
      .update({ status: 'approved', reviewed_by: getAdminId(), reviewed_at: new Date() })
      .eq('user_id', userId);

    await tx.from('users').update({
      status: 'verified',
      identity_verified_at: new Date(),
      identity_verification_method: 'manual_admin'
    }).eq('id', userId);

    // Apply welcome bonus: +0.5% boost on lending APR for 90 days
    // (handled by scoring layer at offer-creation time)

    await writeAuditLog({
      actor_user_id: getAdminId(),
      action_type: 'kyc.approved',
      resource_type: 'user',
      resource_id: userId,
    });

    await sendNotification(userId, 'kyc_approved', {
      title: 'Your account is verified! 🎉',
      body: 'Welcome to 121.ai. You can now deposit funds and start lending or borrowing.',
      link_url: '/dashboard',
    });
  });
}
```

### 9.2 Production swap (Phase 1 — Veriff or Stripe Identity)

When you're ready to swap simulated → real, the change is:
1. Replace the document capture screens with Veriff/Stripe Identity hosted SDK
2. Add `/api/webhooks/veriff` or `/api/webhooks/stripe-identity` route
3. On webhook, update `users.identity_verified_at` and `users.identity_verification_method = 'veriff'`
4. Delete the `/admin/pending-kyc` queue (or keep as fallback for review/appeal cases)

The schema and downstream code stay identical. This is the value of architectural symmetry.

---

## 10. Two-Factor Authentication

(Covered in 8.5 for setup; here for ongoing auth.)

### 10.1 Step-up authentication

Certain actions require re-entering the TOTP even within an active session. Define a list:

```typescript
// /lib/auth/step-up.ts
export const STEP_UP_ACTIONS = [
  'deposit.initiate',
  'withdrawal.initiate',
  'offer.create',
  'offer.accept',
  'agreement.sign',
  'profile.change_bank',
  'security.disable_2fa',
] as const;

export async function requireStepUp(userId: string, action: typeof STEP_UP_ACTIONS[number]) {
  const recent = await db.from('step_up_verifications')
    .select('verified_at')
    .eq('user_id', userId)
    .gte('verified_at', new Date(Date.now() - 5 * 60 * 1000)) // 5 minutes
    .single();

  if (!recent.data) {
    throw new StepUpRequired(action);
  }
}
```

When `StepUpRequired` is thrown, the frontend modal pops open: "Confirm with your authenticator code" → on success, write a `step_up_verifications` row → retry the action.

### 10.2 Backup codes

Generated at 2FA setup, shown once. Stored as bcrypt hashes. When user uses one, that hash is deleted. Show count remaining in settings. Allow regeneration (invalidates all old codes).

---

## 11. Wallet, Deposits, Withdrawals

This is the PeerBerry-style internal balance system. It has three balance buckets visible to the user:

- **Available balance** — spendable now (lend, withdraw)
- **Invested balance** — committed to active loans, returns gradually as repayments come in
- **Pending balance** — deposit clearing (rare; Stripe usually instant in test mode)

### 11.1 Screen: `/dashboard` (lender view)

```
┌──────────────────────────────────────────────────────────────┐
│  Welcome back, Smruti                                        │
│                                                              │
│  ╔══════════════════════╗  ╔══════════════════════╗         │
│  ║ Available Balance    ║  ║ Invested Balance     ║         │
│  ║ €0.00                ║  ║ €0.00                ║         │
│  ║ [Deposit] [Withdraw] ║  ║ [View Portfolio]     ║         │
│  ╚══════════════════════╝  ╚══════════════════════╝         │
│                                                              │
│  Earnings (last 30 days)              €0.00                  │
│  Total earned to date                 €0.00                  │
│  Active loans funded                  0                      │
│                                                              │
│  [Browse Loans →]   [Set up Auto-Invest →]                   │
│                                                              │
│  Welcome bonus active: +0.5% APR boost on loans funded       │
│  in the next 89 days. ✨                                     │
└──────────────────────────────────────────────────────────────┘
```

### 11.2 Screen: `/deposit` — Deposit / Withdraw

PeerBerry shows a profile section with bank details. We do the same.

**Tab 1: Deposit**

**Option A (recommended for demo): "Deposit by card"**
- Big amount input (€)
- Quick-select buttons: €100, €250, €500, €1,000
- [Continue to Payment] button → Stripe Checkout

```typescript
// /app/deposit/actions.ts
'use server';
import Stripe from 'stripe';

export async function createDepositSession(amountCents: number) {
  const userId = await requireAuth();
  await requireStepUp(userId, 'deposit.initiate');

  if (amountCents < 1000 || amountCents > 100000) {
    throw new Error('Deposit must be between €10 and €1,000');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    currency: 'eur',
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: '121.ai Wallet Deposit' },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/deposit?cancelled=1`,
    client_reference_id: userId,
    metadata: { user_id: userId, intent: 'wallet_deposit' },
  });

  await writeAuditLog({
    actor_user_id: userId,
    action_type: 'deposit.initiated',
    metadata: { amount_cents: amountCents, stripe_session_id: session.id },
  });

  return { url: session.url };
}
```

**The Stripe webhook handler** (this is the critical piece):

```typescript
// /app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { creditWallet } from '@/lib/finance/wallet';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = headers().get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency — store the event_id
  const stored = await serviceClient
    .from('webhooks_inbound')
    .insert({
      provider: 'stripe',
      event_id: event.id,
      event_type: event.type,
      payload: event,
      signature_valid: true,
    })
    .select()
    .single();

  if (stored.error?.code === '23505') {
    // Already processed; return 200 to ack
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const amountCents = session.amount_total!;

    if (session.metadata?.intent === 'wallet_deposit' && userId) {
      await creditWallet({
        userId,
        amountCents,
        entryType: 'deposit_cleared',
        relatedStripeId: session.id,
        description: `Card deposit via Stripe`,
      });

      await sendNotification(userId, 'deposit_received', {
        title: `€${(amountCents / 100).toFixed(2)} deposited`,
        body: `Your deposit has been added to your available balance. You can now invest in loans.`,
        link_url: '/invest',
      });
    }
  }

  await serviceClient
    .from('webhooks_inbound')
    .update({ processed: true, processed_at: new Date() })
    .eq('event_id', event.id);

  return NextResponse.json({ received: true });
}
```

**The atomic wallet credit function** (this is the function that must be airtight):

```typescript
// /lib/finance/wallet.ts
import { serviceClient } from '@/lib/db/client';

export async function creditWallet(params: {
  userId: string;
  amountCents: number;
  entryType: LedgerEntryType;
  relatedLoanId?: string;
  relatedStripeId?: string;
  description?: string;
}) {
  // Postgres transaction via RPC for atomicity
  const { data, error } = await serviceClient.rpc('credit_wallet_atomic', params);
  if (error) throw error;
  return data;
}

export async function debitWallet(params: {
  userId: string;
  amountCents: number;
  entryType: LedgerEntryType;
  relatedLoanId?: string;
  description?: string;
}) {
  const { data, error } = await serviceClient.rpc('debit_wallet_atomic', params);
  if (error) {
    if (error.message.includes('insufficient_balance')) {
      throw new InsufficientBalanceError();
    }
    throw error;
  }
  return data;
}

export async function transferWallet(params: {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  entryTypeFrom: LedgerEntryType;
  entryTypeTo: LedgerEntryType;
  relatedLoanId?: string;
  description?: string;
}) {
  const { data, error } = await serviceClient.rpc('transfer_wallet_atomic', params);
  if (error) throw error;
  return data;
}
```

**The Postgres RPC function** (this is where atomicity lives):

```sql
CREATE OR REPLACE FUNCTION credit_wallet_atomic(
    p_user_id UUID,
    p_amount_cents BIGINT,
    p_entry_type ledger_entry_type,
    p_related_loan_id UUID DEFAULT NULL,
    p_related_stripe_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance BIGINT;
BEGIN
    -- Lock the wallet row
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;

    UPDATE wallets
    SET available_balance_cents = available_balance_cents + p_amount_cents,
        updated_at = now()
    WHERE id = v_wallet_id
    RETURNING available_balance_cents INTO v_new_balance;

    INSERT INTO ledger (
        wallet_id, user_id, entry_type, amount_cents, balance_after_cents,
        related_loan_id, related_stripe_id, description
    ) VALUES (
        v_wallet_id, p_user_id, p_entry_type, p_amount_cents, v_new_balance,
        p_related_loan_id, p_related_stripe_id, p_description
    );

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION debit_wallet_atomic(
    p_user_id UUID,
    p_amount_cents BIGINT,
    p_entry_type ledger_entry_type,
    p_related_loan_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_wallet_id UUID;
    v_current BIGINT;
    v_new_balance BIGINT;
BEGIN
    SELECT id, available_balance_cents INTO v_wallet_id, v_current
        FROM wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_current < p_amount_cents THEN
        RAISE EXCEPTION 'insufficient_balance: have %, need %', v_current, p_amount_cents;
    END IF;

    UPDATE wallets
    SET available_balance_cents = available_balance_cents - p_amount_cents,
        updated_at = now()
    WHERE id = v_wallet_id
    RETURNING available_balance_cents INTO v_new_balance;

    INSERT INTO ledger (
        wallet_id, user_id, entry_type, amount_cents, balance_after_cents,
        related_loan_id, description
    ) VALUES (
        v_wallet_id, p_user_id, p_entry_type, -p_amount_cents, v_new_balance,
        p_related_loan_id, p_description
    );

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION transfer_wallet_atomic(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_amount_cents BIGINT,
    p_entry_type_from ledger_entry_type,
    p_entry_type_to ledger_entry_type,
    p_related_loan_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    PERFORM debit_wallet_atomic(p_from_user_id, p_amount_cents, p_entry_type_from, p_related_loan_id, p_description);
    PERFORM credit_wallet_atomic(p_to_user_id, p_amount_cents, p_entry_type_to, p_related_loan_id, p_description);
END;
$$ LANGUAGE plpgsql;
```

**Option B (PeerBerry-style SEPA): "Deposit by bank transfer"**
- Show the platform IBAN with the user's unique deposit reference
- "Transfer any amount to this IBAN, including reference `LL-A1B2C3-D4` in the description"
- "Funds typically arrive within 1–2 business days"
- "You will receive an email confirmation when funds arrive"
- For demo: simulate this with an admin "Mark deposit received" button

**For real Revolut→Revolut demo (off-platform proof):**
- Before the demo, send €1.00 from your personal Revolut to your Revolut Business / Vivid / N26 account that you label as "121.ai Operations"
- Take a screenshot of both sides
- In the deposit screen, show this IBAN
- During pitch: "We've already validated real SEPA flow. Here's the receipt. The demo today uses Stripe test mode for reproducibility."

**Tab 2: Withdraw**

For lender to take available balance back to bank:
- Amount input (capped at available_balance_cents)
- Bank account selector (ask once at first withdrawal: full IBAN + account holder name; verify identity match)
- [Withdraw] button
- After click: SIMULATE — show "Withdrawal initiated. Funds will arrive in 1–2 business days." and decrement wallet immediately
- Real production: use Stripe Connect payouts

### 11.3 Deposit reference — how to make it bank-recognisable

When the wallet row is created, we generate `deposit_reference = 'LL-' || abbreviated_user_id || '-' || random4`. Example: `LL-A8E72F45-K9P2`.

In the deposit-by-SEPA screen:
```
┌─────────────────────────────────────────────────────┐
│ Bank Transfer Details                               │
├─────────────────────────────────────────────────────┤
│ Beneficiary:  LendLoop Operations Ltd               │
│ IBAN:         IE12REVO99036012345678                │
│ BIC/SWIFT:    REVOIE23                              │
│ Reference:    LL-A8E72F45-K9P2  [📋 Copy]          │
│                                                     │
│ ⚠️ Always include the reference. Otherwise we       │
│ cannot match your transfer to your account.         │
└─────────────────────────────────────────────────────┘
```

(For demo: this is your personal Revolut Business IBAN. The reference is matched in the admin panel manually for demo. In production: Open Banking webhook from a bank like Modulr or Currencycloud parses inbound SEPA.)

---

## 12. Scoring Algorithm (100-pt Model)

This is the regulator-defensible score. PURE function. No randomness. Same inputs → same output, ever.

### 12.1 Components

```typescript
// /lib/scoring/score.ts

export interface ScoreInputs {
  // Identity (max 20)
  identity_verified: boolean;
  has_irp_or_eu_passport: boolean;
  email_verified: boolean;
  has_2fa: boolean;
  has_student_id: boolean;

  // Income (max 25)
  declared_monthly_income_cents: number;
  income_verified: boolean;
  income_verification_age_days: number;  // freshness
  employment_status: 'part_time' | 'full_time' | 'student_only';

  // Stability (max 15)
  nci_semesters_completed: number;
  account_age_days: number;
  has_emergency_fund: boolean;

  // Financial (max 20)
  declared_monthly_expenses_cents: number;
  declared_monthly_income_cents_dup: number; // for ratio
  existing_debt_cents: number;

  // Reputation (max 20)
  total_loans_completed: number;
  total_loans_active: number;
  on_time_payment_count: number;
  late_payment_count: number;
  defaulted_loan_count: number;
}

export interface ScoreOutput {
  total: number;
  components: {
    identity: number;
    income: number;
    stability: number;
    financial: number;
    reputation: number;
  };
  breakdown: Record<string, { points: number; max: number; reason: string }>;
  algorithm_version: 'v1.0';
}

export function computeScore(i: ScoreInputs): ScoreOutput {
  const breakdown: Record<string, { points: number; max: number; reason: string }> = {};

  // --- Identity (20 max) ---
  let id = 0;
  if (i.identity_verified)             { id += 8; breakdown['identity_verified'] = { points: 8, max: 8, reason: 'Identity documents approved' }; }
  else                                  { breakdown['identity_verified'] = { points: 0, max: 8, reason: 'Identity not yet verified' }; }
  if (i.has_irp_or_eu_passport)        { id += 4; breakdown['legal_status'] = { points: 4, max: 4, reason: 'Valid IRP or EU passport' }; }
  else                                  { breakdown['legal_status'] = { points: 0, max: 4, reason: 'Legal residency not confirmed' }; }
  if (i.email_verified)                { id += 2; breakdown['email'] = { points: 2, max: 2, reason: 'NCI email verified' }; }
  if (i.has_2fa)                       { id += 2; breakdown['2fa'] = { points: 2, max: 2, reason: '2FA enabled' }; }
  if (i.has_student_id)                { id += 4; breakdown['student_id'] = { points: 4, max: 4, reason: 'Active NCI student ID' }; }

  // --- Income (25 max) ---
  let inc = 0;
  const monthlyIncomeEur = i.declared_monthly_income_cents / 100;
  if (monthlyIncomeEur >= 1500)        { inc += 10; breakdown['income_amount'] = { points: 10, max: 10, reason: `Monthly income €${monthlyIncomeEur} ≥ €1500` }; }
  else if (monthlyIncomeEur >= 800)    { inc += 7;  breakdown['income_amount'] = { points: 7, max: 10, reason: `Monthly income €${monthlyIncomeEur} (€800–1500)` }; }
  else if (monthlyIncomeEur >= 400)    { inc += 4;  breakdown['income_amount'] = { points: 4, max: 10, reason: `Monthly income €${monthlyIncomeEur} (€400–800)` }; }
  else                                  { inc += 0;  breakdown['income_amount'] = { points: 0, max: 10, reason: `Monthly income below €400` }; }

  if (i.income_verified) {
    if (i.income_verification_age_days <= 60)  { inc += 10; breakdown['income_verified'] = { points: 10, max: 10, reason: 'Income verified, payslip < 60 days old' }; }
    else if (i.income_verification_age_days <= 180) { inc += 5; breakdown['income_verified'] = { points: 5, max: 10, reason: 'Income verified but payslip 60–180 days old' }; }
    else                                       { inc += 2; breakdown['income_verified'] = { points: 2, max: 10, reason: 'Income verification stale (>180 days)' }; }
  } else {
    breakdown['income_verified'] = { points: 0, max: 10, reason: 'Income not yet verified' };
  }

  if (i.employment_status === 'full_time')      { inc += 5; breakdown['employment'] = { points: 5, max: 5, reason: 'Full-time employed' }; }
  else if (i.employment_status === 'part_time') { inc += 3; breakdown['employment'] = { points: 3, max: 5, reason: 'Part-time employed' }; }
  else                                           { inc += 0; breakdown['employment'] = { points: 0, max: 5, reason: 'Student-only (no employment)' }; }

  // --- Stability (15 max) ---
  let stab = 0;
  if (i.nci_semesters_completed >= 3)  { stab += 6; breakdown['nci_tenure'] = { points: 6, max: 6, reason: `${i.nci_semesters_completed} semesters at NCI` }; }
  else if (i.nci_semesters_completed >= 1) { stab += 3; breakdown['nci_tenure'] = { points: 3, max: 6, reason: `${i.nci_semesters_completed} semester(s)` }; }
  else                                  { breakdown['nci_tenure'] = { points: 0, max: 6, reason: 'No semesters completed' }; }

  if (i.account_age_days >= 90)        { stab += 4; breakdown['account_age'] = { points: 4, max: 4, reason: `Account ${i.account_age_days} days old` }; }
  else if (i.account_age_days >= 30)   { stab += 2; breakdown['account_age'] = { points: 2, max: 4, reason: `Account ${i.account_age_days} days old` }; }
  else                                  { stab += 0; breakdown['account_age'] = { points: 0, max: 4, reason: `New account (<30 days)` }; }

  if (i.has_emergency_fund)            { stab += 5; breakdown['emergency_fund'] = { points: 5, max: 5, reason: 'Emergency fund declared' }; }
  else                                  { breakdown['emergency_fund'] = { points: 0, max: 5, reason: 'No emergency fund declared' }; }

  // --- Financial (20 max) ---
  let fin = 0;
  const surplus = i.declared_monthly_income_cents_dup - i.declared_monthly_expenses_cents;
  const surplusRatio = i.declared_monthly_income_cents_dup > 0 ? surplus / i.declared_monthly_income_cents_dup : 0;
  if (surplusRatio >= 0.30)            { fin += 12; breakdown['surplus'] = { points: 12, max: 12, reason: `Surplus ratio ${(surplusRatio*100).toFixed(0)}% (excellent)` }; }
  else if (surplusRatio >= 0.15)       { fin += 8;  breakdown['surplus'] = { points: 8, max: 12, reason: `Surplus ratio ${(surplusRatio*100).toFixed(0)}%` }; }
  else if (surplusRatio >= 0.05)       { fin += 4;  breakdown['surplus'] = { points: 4, max: 12, reason: `Surplus ratio ${(surplusRatio*100).toFixed(0)}% (low)` }; }
  else                                  { breakdown['surplus'] = { points: 0, max: 12, reason: `No / negative surplus` }; }

  const debtToIncomeMonths = i.declared_monthly_income_cents_dup > 0
    ? i.existing_debt_cents / i.declared_monthly_income_cents_dup
    : 99;
  if (debtToIncomeMonths === 0)        { fin += 8; breakdown['debt'] = { points: 8, max: 8, reason: 'No existing debt' }; }
  else if (debtToIncomeMonths <= 3)    { fin += 6; breakdown['debt'] = { points: 6, max: 8, reason: `Debt ${debtToIncomeMonths.toFixed(1)} months income` }; }
  else if (debtToIncomeMonths <= 6)    { fin += 3; breakdown['debt'] = { points: 3, max: 8, reason: `Debt ${debtToIncomeMonths.toFixed(1)} months income (high)` }; }
  else                                  { breakdown['debt'] = { points: 0, max: 8, reason: 'Excessive existing debt' }; }

  // --- Reputation (20 max) ---
  let rep = 0;
  if (i.defaulted_loan_count > 0) {
    rep = 0;
    breakdown['reputation'] = { points: 0, max: 20, reason: `${i.defaulted_loan_count} defaulted loan(s) — score capped` };
  } else if (i.total_loans_completed === 0) {
    rep = 10; // neutral starting point
    breakdown['reputation'] = { points: 10, max: 20, reason: 'No prior loans (neutral)' };
  } else {
    const onTimeRate = i.on_time_payment_count / (i.on_time_payment_count + i.late_payment_count);
    if (onTimeRate >= 0.95)             { rep = 20; breakdown['reputation'] = { points: 20, max: 20, reason: `${i.total_loans_completed} loans, ${(onTimeRate*100).toFixed(0)}% on-time` }; }
    else if (onTimeRate >= 0.80)        { rep = 14; breakdown['reputation'] = { points: 14, max: 20, reason: `${i.total_loans_completed} loans, ${(onTimeRate*100).toFixed(0)}% on-time` }; }
    else                                 { rep = 6; breakdown['reputation'] = { points: 6, max: 20, reason: `${i.total_loans_completed} loans, ${(onTimeRate*100).toFixed(0)}% on-time` }; }
  }

  return {
    total: id + inc + stab + fin + rep,
    components: { identity: id, income: inc, stability: stab, financial: fin, reputation: rep },
    breakdown,
    algorithm_version: 'v1.0',
  };
}
```

### 12.2 When the score is recomputed

- After `users.status = 'verified'` (initial score)
- After any document approval/rejection
- After borrower submits/updates `borrower_assessments`
- After every loan repayment (success → reputation up; late → reputation down)
- After loan completion or default

Triggered as a Postgres function called by the application after the relevant write, OR by pg_cron nightly for stragglers.

### 12.3 Score display: `/profile` (for borrower) or `/borrowers/[id]` (for lender viewing)

```
┌──────────────────────────────────────────────┐
│  Umer's Credit Score                         │
│                                              │
│       ┌────────┐                             │
│       │   72   │ / 100                       │
│       └────────┘                             │
│   Good — eligible for community lending      │
│                                              │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░  Identity     16/20       │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░  Income       18/25       │
│  ▓▓▓▓▓▓▓▓░░░░░░░  Stability    11/15       │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░  Financial    17/20       │
│  ▓▓▓▓▓▓░░░░░░░░░  Reputation   10/20       │
│                                              │
│  [▼ See detailed breakdown]                  │
└──────────────────────────────────────────────┘
```

Below, expandable breakdown shows every line item from `breakdown` with reasoning.

### 12.4 Optional: LLM narrative (Day 2, only if time)

```typescript
// /lib/scoring/narrative.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateScoreNarrative(score: ScoreOutput, userMeta: { first_name: string; nci_program: string }) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Write a 2-sentence neutral, professional summary of this borrower's credit profile for a peer lender.
The borrower is a student at NCI in ${userMeta.nci_program}. Their score is ${score.total}/100.
Strongest component: ${getStrongestComponent(score)}. Weakest: ${getWeakestComponent(score)}.
Do not give a recommendation. Just describe the profile factually.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

This is OPTIONAL. If the demo is on track, add it. If you're behind, skip — the deterministic breakdown is enough on its own.

---

## 13. Borrower: Loan Request Flow

### 13.1 Screen: `/borrow` — Create loan request

**Pre-condition:** `users.status = 'verified'` AND has active payslip document approved.

If payslip not yet uploaded: show a banner "To request a loan, please upload a recent payslip first → [Upload]".

**Form fields:**
- Amount needed: slider €100–€2,000, default €500
- Purpose: dropdown (Tuition top-up / Laptop & equipment / Emergency / Living expenses / Travel home / Other)
- Description: textarea (1–500 chars; "Briefly explain how you'll use the funds")
- Term: slider 1–12 months
- Maximum APR you'll accept: slider 0%–12%, default 10%
- Monthly affordability check (read-only computed): "Estimated monthly payment €{computed} — this is {pct}% of your declared monthly income. Comfortable threshold is <30%."
- Borrower's commitment box: "I commit to repaying this loan according to the agreed schedule. I understand that missed payments incur late fees and damage my community reputation score."
- [Submit Loan Request]

**Server action:**
```typescript
'use server';
export async function createLoanRequest(input: {
  amount_cents: number;
  purpose: LoanPurpose;
  description: string;
  term_months: number;
  max_apr_bps: number;
}) {
  const userId = await requireAuth();
  await requireVerified(userId);
  await requireStepUp(userId, 'offer.create'); // reuse step-up

  // Pull latest score
  const score = await getLatestScore(userId);
  if (score.total < 50) {
    throw new Error('Score too low to create a request. Please complete your profile.');
  }

  // Snapshot the score onto the request
  const request = await db.from('loan_requests').insert({
    borrower_id: userId,
    community_id: await getCommunityId(userId),
    amount_cents: input.amount_cents,
    purpose: input.purpose,
    purpose_description: input.description,
    requested_term_months: input.term_months,
    max_apr_bps: input.max_apr_bps,
    status: 'open',
    score_at_request: score.total,
    score_breakdown_at_request: score.breakdown,
    posted_at: new Date(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  }).select().single();

  await writeAuditLog({
    actor_user_id: userId,
    action_type: 'loan_request.created',
    resource_type: 'loan_request',
    resource_id: request.data!.id,
    after_state: request.data,
  });

  // Notify all eligible auto-invest strategies (handled by pg_cron sweep, not inline)
  return { id: request.data!.id };
}
```

### 13.2 Screen: `/loans/[id]` (own request as borrower)

Shows:
- Status: Open / Partially Funded / Fully Funded
- Funding progress bar: `€350 / €500 funded — 70%`
- List of received offers, each with:
  - Lender name (or "Anonymous Lender #1234" for privacy)
  - Their score (lender reputation, mostly from completed loan history)
  - Amount offered
  - APR
  - Term
  - Optional message
  - [Accept] / [Reject] buttons

**Accept flow:**
1. User clicks Accept on an offer
2. Step-up 2FA modal → verify
3. Confirmation modal:
   > You're about to accept a loan offer from {lender_name}:
   > **€500.00 at 8.0% APR for 6 months**
   > Monthly payment: **€85.30**
   > Total to repay: **€511.80**
   > Total interest: **€11.80**
   > Platform fee (15% of interest): €1.77 (deducted from interest, paid by you)
   >
   > [Cancel] [Confirm and Sign Agreement]
4. → `/agreements/[loan_id]/sign` (next section)

---

## 14. Lender: Browse & Invest Flow

This is the PeerBerry "Invest" page. Filter sidebar + list of available loans.

### 14.1 Screen: `/invest`

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Sidebar Filters     │  Available Loans (12 open)                │
│                      │                                            │
│  Available amount    │  ┌──────────────────────────────────────┐ │
│  €[100] – €[2000]    │  │ Loan #LR-A8E72                       │ │
│                      │  │ €500 · 6 months · up to 9.5% APR     │ │
│  Interest rate       │  │ Purpose: Laptop & equipment          │ │
│  [3]% – [12]%        │  │ Score: 72/100                        │ │
│                      │  │ Cohort: MSc Data Analytics, Year 1   │ │
│  Remaining term      │  │ Funded: €0 / €500 (0%)               │ │
│  [1] – [12] months   │  │ Posted 2 hours ago                    │ │
│                      │  │ Expires in 13 days                    │ │
│  Loan purpose        │  │ Buyback Guarantee ✓                   │ │
│  ☑ Tuition top-up    │  │                       [Make Offer →]  │ │
│  ☑ Laptop/equipment  │  └──────────────────────────────────────┘ │
│  ☐ Emergency         │                                            │
│  ☐ Living expenses   │  ┌──────────────────────────────────────┐ │
│                      │  │ ... next loan ...                    │ │
│  Min. score          │  │                                       │ │
│  [60]+               │  └──────────────────────────────────────┘ │
│                      │                                            │
│  Cohort              │  [Pagination]                              │
│  ☐ MSc Data Analytics│                                            │
│  ☐ MSc Cloud         │                                            │
│  ☐ BBus              │                                            │
│  ☐ Other             │                                            │
│                      │                                            │
│  [My saved filters]  │                                            │
│  Save current ▼      │                                            │
│                      │                                            │
│  ☑ Exclude loans I've│                                            │
│    already offered on│                                            │
└──────────────────────┴───────────────────────────────────────────┘
```

(Filters and saved filters are direct PeerBerry parity. The "buyback guarantee" badge is shown on every loan in v1 — explained in section 18.3 below.)

### 14.2 Screen: `/loans/[id]` (lender viewing someone else's request)

Shows:
- Borrower's anonymised name (first name + last initial: "Umer K.") — judges should see real name in demo
- Full score breakdown (section 12.3 widget)
- Cohort, NCI program, semester
- Loan purpose + description
- Requested amount, term, max APR
- Funding progress
- "Make an Offer" CTA → modal

### 14.3 Make Offer modal

**Fields:**
- Amount (cents): default = full request amount; user can offer partial
- APR (%): default = max APR; user can offer below
- Term (months): default = requested; user can counter
- Optional message to borrower

**Constraints:**
- Cannot offer more than your `available_balance_cents`
- APR ≤ requested max
- Amount ≤ remaining unfunded amount
- Term ≤ requested

**Server action:**
```typescript
'use server';
export async function createOffer(input: {
  request_id: string;
  amount_cents: number;
  apr_bps: number;
  term_months: number;
  message?: string;
}) {
  const userId = await requireAuth();
  await requireVerified(userId);
  await requireStepUp(userId, 'offer.create');

  // Verify funds available
  const wallet = await getWallet(userId);
  if (wallet.available_balance_cents < input.amount_cents) {
    throw new Error('Insufficient available balance');
  }

  // Verify request is open and not over-funded
  const request = await db.from('loan_requests').select('*').eq('id', input.request_id).single();
  if (request.data!.status !== 'open' && request.data!.status !== 'partially_funded') {
    throw new Error('This loan request is no longer accepting offers');
  }
  const remaining = request.data!.amount_cents - request.data!.funded_amount_cents;
  if (input.amount_cents > remaining) {
    throw new Error(`Maximum remaining amount: €${(remaining / 100).toFixed(2)}`);
  }
  if (input.apr_bps > request.data!.max_apr_bps) {
    throw new Error('APR exceeds borrower\'s maximum');
  }

  const offer = await db.from('loan_offers').insert({
    request_id: input.request_id,
    lender_id: userId,
    community_id: request.data!.community_id,
    amount_cents: input.amount_cents,
    apr_bps: input.apr_bps,
    term_months: input.term_months,
    message_to_borrower: input.message,
  }).select().single();

  await writeAuditLog({
    actor_user_id: userId,
    action_type: 'offer.created',
    resource_type: 'loan_offer',
    resource_id: offer.data!.id,
    after_state: offer.data,
  });

  await sendNotification(request.data!.borrower_id, 'offer_received', {
    title: 'New offer received',
    body: `You received a new offer of €${(input.amount_cents/100).toFixed(2)} at ${(input.apr_bps/100).toFixed(2)}% APR.`,
    link_url: `/loans/${input.request_id}`,
  });

  return { id: offer.data!.id };
}
```

---

## 15. Auto-Invest Strategy

PeerBerry's flagship feature. Same UX, simpler engine for v1.

### 15.1 Screen: `/auto-invest`

**Two strategies presets:**
- **Conservative** — min score 75, max APR 9%, max €100/loan
- **Balanced** — min score 65, max APR 12%, max €200/loan
- **Custom**

**Custom builder fields:**
- Strategy name
- Active toggle (on/off)
- Min borrower score (slider 50–100)
- APR range (slider, 0%–12%)
- Term range (1–12 months)
- Allowed purposes (multi-checkbox)
- Investment per loan (€10–€500)
- Max total invested by this strategy (cap)
- Max one active loan per borrower (boolean, default true)
- Diversification target (e.g., spread across at least 5 borrowers)
- Save

### 15.2 The auto-invest sweeper (pg_cron job)

Every 10 minutes, scan open loan_requests against active strategies, and create offers automatically.

```sql
-- /migrations/20260427_004_pg_cron.sql

-- Auto-invest sweep
SELECT cron.schedule(
    'auto_invest_sweep',
    '*/10 * * * *',
    $$
    SELECT auto_invest_run();
    $$
);

-- Daily late-payment check
SELECT cron.schedule(
    'late_payment_check',
    '0 3 * * *',  -- 03:00 UTC daily
    $$
    SELECT mark_late_repayments();
    $$
);

-- Repayment due reminders (3 days, 1 day before)
SELECT cron.schedule(
    'repayment_reminders',
    '0 9 * * *',  -- 09:00 UTC daily
    $$
    SELECT send_repayment_reminders();
    $$
);

-- Trigger scheduled repayments
SELECT cron.schedule(
    'process_due_repayments',
    '0 6 * * *',  -- 06:00 UTC daily
    $$
    SELECT process_due_repayments();
    $$
);

-- Score recomputation (catch stragglers)
SELECT cron.schedule(
    'score_recompute',
    '0 4 * * *',
    $$
    SELECT recompute_stale_scores();
    $$
);
```

### 15.3 The auto_invest_run function

```sql
CREATE OR REPLACE FUNCTION auto_invest_run() RETURNS INTEGER AS $$
DECLARE
    v_strategy RECORD;
    v_request RECORD;
    v_lender_balance BIGINT;
    v_offer_count INTEGER := 0;
BEGIN
    FOR v_strategy IN
        SELECT * FROM auto_invest_strategies WHERE is_active = TRUE
    LOOP
        SELECT available_balance_cents INTO v_lender_balance
            FROM wallets WHERE user_id = v_strategy.lender_id;

        IF v_lender_balance < v_strategy.investment_per_loan_cents THEN
            CONTINUE; -- skip; not enough funds
        END IF;

        FOR v_request IN
            SELECT lr.*, cs.total_score
            FROM loan_requests lr
            JOIN credit_scores cs ON cs.user_id = lr.borrower_id
            WHERE lr.status IN ('open', 'partially_funded')
              AND lr.community_id = v_strategy.community_id
              AND cs.total_score >= v_strategy.min_score
              AND lr.max_apr_bps >= COALESCE(v_strategy.min_apr_bps, 0)
              AND lr.max_apr_bps <= COALESCE(v_strategy.max_apr_bps, 9999)
              AND lr.requested_term_months BETWEEN
                  COALESCE(v_strategy.min_term_months, 1)
                  AND COALESCE(v_strategy.max_term_months, 12)
              AND (
                  v_strategy.allowed_purposes IS NULL
                  OR lr.purpose = ANY(v_strategy.allowed_purposes)
              )
              AND NOT EXISTS (
                  SELECT 1 FROM loan_offers lo
                  WHERE lo.request_id = lr.id AND lo.lender_id = v_strategy.lender_id
              )
              AND cs.computed_at = (
                  SELECT MAX(computed_at) FROM credit_scores WHERE user_id = lr.borrower_id
              )
            LIMIT 5
        LOOP
            -- Create the offer
            INSERT INTO loan_offers (
                request_id, lender_id, community_id, amount_cents, apr_bps, term_months, status,
                message_to_borrower
            ) VALUES (
                v_request.id, v_strategy.lender_id, v_strategy.community_id,
                LEAST(v_strategy.investment_per_loan_cents, v_request.amount_cents - v_request.funded_amount_cents),
                v_request.max_apr_bps,
                v_request.requested_term_months,
                'pending',
                'Auto-Invest offer based on strategy: ' || v_strategy.name
            );
            v_offer_count := v_offer_count + 1;

            v_lender_balance := v_lender_balance - v_strategy.investment_per_loan_cents;
            EXIT WHEN v_lender_balance < v_strategy.investment_per_loan_cents;
        END LOOP;

        UPDATE auto_invest_strategies SET last_run_at = now() WHERE id = v_strategy.id;
    END LOOP;

    RETURN v_offer_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 16. Loan Agreement & E-Signature

### 16.1 Generate the agreement PDF (server-side)

```typescript
// /lib/pdf/agreement.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';

export async function generateLoanAgreementPdf(loan: LoanWithParties): Promise<Buffer> {
  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.5 },
    header: { fontSize: 18, marginBottom: 8, fontWeight: 'bold' },
    subheader: { fontSize: 12, color: '#666', marginBottom: 24 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 13, marginBottom: 8, fontWeight: 'bold' },
    party: { marginBottom: 8 },
    table: { display: 'flex', flexDirection: 'column', borderWidth: 1, borderColor: '#ccc', marginVertical: 8 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
    cell: { padding: 6, flex: 1 },
    cellLabel: { padding: 6, flex: 1, backgroundColor: '#f7f7f7', fontWeight: 'bold' },
    signatureBlock: { marginTop: 32, padding: 12, borderWidth: 1, borderColor: '#333' },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 9, color: '#888' },
  });

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Peer-to-Peer Loan Agreement</Text>
        <Text style={styles.subheader}>
          Agreement ID: {loan.id} · Community: National College of Ireland · Generated {new Date().toLocaleString('en-IE')}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. The Parties</Text>
          <View style={styles.party}>
            <Text><Text style={{ fontWeight: 'bold' }}>Lender:</Text> {loan.lender.first_name} {loan.lender.last_name}</Text>
            <Text>Email: {loan.lender.email}</Text>
            <Text>Address: {loan.lender.address_line1}, {loan.lender.city}, {loan.lender.postal_code}, {loan.lender.country}</Text>
            <Text>Identity verified: ✓ ({loan.lender.identity_verified_at})</Text>
          </View>
          <View style={styles.party}>
            <Text><Text style={{ fontWeight: 'bold' }}>Borrower:</Text> {loan.borrower.first_name} {loan.borrower.last_name}</Text>
            <Text>Email: {loan.borrower.email}</Text>
            <Text>Address: {loan.borrower.address_line1}, {loan.borrower.city}, {loan.borrower.postal_code}, {loan.borrower.country}</Text>
            <Text>Identity verified: ✓ ({loan.borrower.identity_verified_at})</Text>
          </View>
          <View style={styles.party}>
            <Text><Text style={{ fontWeight: 'bold' }}>Platform:</Text> LendLoop Operations Limited (the "Platform")</Text>
            <Text>Acting as a technology service provider only. The Platform does not custody funds and does not issue or underwrite this loan. All funds movement is facilitated through Stripe Payments Europe Ltd.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Loan Terms</Text>
          <View style={styles.table}>
            <View style={styles.row}><Text style={styles.cellLabel}>Principal</Text><Text style={styles.cell}>€{(loan.principal_cents/100).toFixed(2)}</Text></View>
            <View style={styles.row}><Text style={styles.cellLabel}>Annual Percentage Rate (APR)</Text><Text style={styles.cell}>{(loan.apr_bps/100).toFixed(2)}%</Text></View>
            <View style={styles.row}><Text style={styles.cellLabel}>Term</Text><Text style={styles.cell}>{loan.term_months} months</Text></View>
            <View style={styles.row}><Text style={styles.cellLabel}>Monthly Payment</Text><Text style={styles.cell}>€{(loan.monthly_payment_cents/100).toFixed(2)}</Text></View>
            <View style={styles.row}><Text style={styles.cellLabel}>Total Interest Payable</Text><Text style={styles.cell}>€{(loan.total_interest_cents/100).toFixed(2)}</Text></View>
            <View style={styles.row}><Text style={styles.cellLabel}>Total Amount Repayable</Text><Text style={styles.cell}>€{((loan.principal_cents + loan.total_interest_cents)/100).toFixed(2)}</Text></View>
            <View style={styles.row}><Text style={styles.cellLabel}>First Payment Due</Text><Text style={styles.cell}>{loan.first_payment_due_at}</Text></View>
            <View style={styles.row}><Text style={styles.cellLabel}>Platform Fee</Text><Text style={styles.cell}>15% of interest paid (€{(loan.total_interest_cents * 0.15 / 100).toFixed(2)} total over the term)</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Repayment</Text>
          <Text>The Borrower agrees to repay the Loan in equal monthly instalments of €{(loan.monthly_payment_cents/100).toFixed(2)} on the same calendar day each month, beginning on {loan.first_payment_due_at}. Repayments are deducted from the Borrower's Platform wallet on the due date. The Borrower is responsible for ensuring sufficient balance.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Default & Late Payment</Text>
          <Text>A repayment is "late" if not received by the due date. A late fee of €5 applies after a 3-day grace period. After 14 consecutive days of non-payment, the loan enters default status. Defaulted loans may be reported to NCI's community administration and the borrower's credibility score is reduced. The lender retains all rights to pursue recovery through normal legal channels.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Right of Withdrawal (Consumer Credit Directive 2008/48/EC)</Text>
          <Text>The Borrower has the right to withdraw from this agreement within 14 calendar days of signing, without giving any reason, by sending written notice to the Platform. If exercised, the Borrower must repay the principal plus interest accrued up to the date of repayment within 30 days.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Processing (GDPR)</Text>
          <Text>Both parties consent to the processing of their personal data by the Platform under EU Regulation 2016/679, solely for the purposes of administering this loan and complying with applicable laws. Both parties may exercise their rights of access, rectification, and erasure as set out in the Platform's Privacy Policy.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Governing Law</Text>
          <Text>This Agreement is governed by Irish law. Disputes shall be submitted to the exclusive jurisdiction of the courts of Ireland.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Risk Disclosure</Text>
          <Text>The Lender acknowledges that lending to peers carries risk of partial or total loss of capital. Past performance is no guarantee of future returns. The Platform does not provide investment advice and cannot guarantee repayment.</Text>
        </View>

        <View style={styles.signatureBlock}>
          <Text style={styles.sectionTitle}>9. Electronic Signatures</Text>
          <Text>By clicking "I agree and sign" on the Platform, both parties consent to the electronic execution of this Agreement and acknowledge that such consent has the same legal effect as a handwritten signature pursuant to eIDAS Regulation (EU) 910/2014.</Text>
          {loan.lender_signed_at && (
            <Text style={{ marginTop: 12 }}>
              Signed by Lender: {loan.lender.first_name} {loan.lender.last_name} on {loan.lender_signed_at} from IP {loan.lender_signature_ip}
            </Text>
          )}
          {loan.borrower_signed_at && (
            <Text style={{ marginTop: 6 }}>
              Signed by Borrower: {loan.borrower.first_name} {loan.borrower.last_name} on {loan.borrower_signed_at} from IP {loan.borrower_signature_ip}
            </Text>
          )}
        </View>

        <Text style={styles.footer} fixed>
          Page <Text render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`} /> · Agreement {loan.id}
        </Text>
      </Page>
    </Document>
  );

  return await renderToBuffer(doc);
}
```

### 16.2 Sign flow: `/agreements/[loan_id]/sign`

After offer accepted, both parties land here in sequence.

**Borrower signs first (since they accepted the offer):**

```
┌────────────────────────────────────────────────────────┐
│ Loan Agreement — Pending Signature                     │
│                                                        │
│ ┌────────────────────────────────────────────────┐    │
│ │ [Embedded PDF preview, scrollable]             │    │
│ │  ...full agreement text...                     │    │
│ └────────────────────────────────────────────────┘    │
│                                                        │
│ [✓] I have read and understood the agreement above.   │
│ [✓] I confirm my electronic signature has the same    │
│     legal effect as a handwritten signature.           │
│                                                        │
│ [I agree and sign]                                     │
│                                                        │
│ Your signature will be recorded with timestamp,        │
│ IP address, and user agent for audit purposes.         │
└────────────────────────────────────────────────────────┘
```

After click → step-up 2FA → record signature:

```typescript
'use server';
export async function signAgreement(loanId: string) {
  const userId = await requireAuth();
  await requireStepUp(userId, 'agreement.sign');

  const loan = await db.from('loans').select('*').eq('id', loanId).single();
  const isBorrower = loan.data!.borrower_id === userId;
  const isLender = loan.data!.lender_id === userId;
  if (!isBorrower && !isLender) throw new Error('Forbidden');

  const ip = headers().get('x-forwarded-for') ?? 'unknown';
  const ua = headers().get('user-agent') ?? 'unknown';
  const update: any = {};
  if (isBorrower) {
    update.borrower_signed_at = new Date();
    update.borrower_signature_ip = ip;
  } else {
    update.lender_signed_at = new Date();
    update.lender_signature_ip = ip;
  }

  await db.from('loans').update(update).eq('id', loanId);

  await writeAuditLog({
    actor_user_id: userId,
    action_type: 'agreement.signed',
    resource_type: 'loan',
    resource_id: loanId,
    metadata: { role: isBorrower ? 'borrower' : 'lender', ip, user_agent: ua },
  });

  // If both signed → trigger disbursement
  const fresh = await db.from('loans').select('*').eq('id', loanId).single();
  if (fresh.data!.borrower_signed_at && fresh.data!.lender_signed_at) {
    await triggerDisbursement(loanId);
  }
}
```

### 16.3 The disbursement trigger

```typescript
// /lib/finance/disbursement.ts
export async function triggerDisbursement(loanId: string) {
  const loan = await db.from('loans').select('*, borrower:users!borrower_id(*), lender:users!lender_id(*)').eq('id', loanId).single();
  const l = loan.data!;

  // 1. Generate the final signed PDF
  const pdf = await generateLoanAgreementPdf(l);
  const pdfPath = `${loanId}/agreement.pdf`;
  await serviceClient.storage.from('agreements').upload(pdfPath, pdf, { contentType: 'application/pdf' });

  // 2. Generate audit trail PDF
  const auditPdf = await generateAuditTrailPdf(loanId);
  const auditPath = `${loanId}/audit_trail.pdf`;
  await serviceClient.storage.from('agreements').upload(auditPath, auditPdf, { contentType: 'application/pdf' });

  // 3. Atomic wallet transfer + ledger entries
  await transferWallet({
    fromUserId: l.lender_id,
    toUserId: l.borrower_id,
    amountCents: l.principal_cents,
    entryTypeFrom: 'investment_disbursed',
    entryTypeTo: 'investment_disbursed',
    relatedLoanId: loanId,
    description: `Loan disbursement to ${l.borrower.first_name}`,
  });

  // 4. Update loan + request status
  await db.from('loans').update({
    status: 'active',
    disbursed_at: new Date(),
    first_payment_due_at: addMonths(new Date(), 1),
    agreement_pdf_path: pdfPath,
    audit_trail_pdf_path: auditPath,
  }).eq('id', loanId);

  await db.from('loan_requests').update({ status: 'converted' }).eq('id', l.request_id);

  // 5. Generate the repayment schedule (insert N rows into repayments)
  await generateRepaymentSchedule(loanId);

  // 6. Notifications
  await sendNotification(l.borrower_id, 'loan_disbursed', {
    title: `€${(l.principal_cents/100).toFixed(2)} disbursed to your wallet`,
    body: `Your loan from ${l.lender.first_name} is active. First payment is due ${addMonths(new Date(), 1).toLocaleDateString('en-IE')}.`,
    link_url: `/loans/${loanId}`,
  });

  await writeAuditLog({
    action_type: 'loan.disbursed',
    resource_type: 'loan',
    resource_id: loanId,
  });
}
```

---

## 17. Disbursement → Repayment Lifecycle

### 17.1 Repayment schedule generation

Equal-instalment amortisation:

```typescript
// /lib/finance/amortization.ts

export function buildSchedule(params: {
  principal_cents: number;
  apr_bps: number;
  term_months: number;
  start_date: Date;
}) {
  const monthlyRate = (params.apr_bps / 10000) / 12;
  const n = params.term_months;
  const P = params.principal_cents;
  // standard formula
  const monthlyPayment = monthlyRate === 0
    ? Math.round(P / n)
    : Math.round((P * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n)));

  const rows = [];
  let outstanding = P;
  for (let i = 1; i <= n; i++) {
    const interest = Math.round(outstanding * monthlyRate);
    let principal = monthlyPayment - interest;
    if (i === n) principal = outstanding; // last payment clears any rounding
    const platformFee = Math.round(interest * 0.15);
    rows.push({
      sequence_number: i,
      due_date: addMonths(params.start_date, i),
      principal_cents: principal,
      interest_cents: interest,
      platform_fee_cents: platformFee,
      total_due_cents: principal + interest,
    });
    outstanding -= principal;
  }
  return rows;
}

export async function generateRepaymentSchedule(loanId: string) {
  const loan = await db.from('loans').select('*').eq('id', loanId).single();
  const l = loan.data!;
  const rows = buildSchedule({
    principal_cents: l.principal_cents,
    apr_bps: l.apr_bps,
    term_months: l.term_months,
    start_date: new Date(),
  });
  await db.from('repayments').insert(
    rows.map(r => ({ ...r, loan_id: loanId, status: 'scheduled' }))
  );
}
```

### 17.2 Process due repayments (daily pg_cron)

```sql
CREATE OR REPLACE FUNCTION process_due_repayments() RETURNS INTEGER AS $$
DECLARE
    v_repayment RECORD;
    v_processed INTEGER := 0;
BEGIN
    FOR v_repayment IN
        SELECT r.*, l.borrower_id, l.lender_id, l.community_id
        FROM repayments r
        JOIN loans l ON l.id = r.loan_id
        WHERE r.status = 'scheduled'
          AND r.due_date <= CURRENT_DATE
          AND l.status = 'active'
    LOOP
        BEGIN
            -- Try to debit borrower's wallet
            PERFORM debit_wallet_atomic(
                v_repayment.borrower_id,
                v_repayment.total_due_cents,
                'repayment_principal',
                v_repayment.loan_id,
                'Loan repayment instalment ' || v_repayment.sequence_number
            );

            -- Credit lender (principal + interest minus platform fee)
            PERFORM credit_wallet_atomic(
                v_repayment.lender_id,
                v_repayment.total_due_cents - v_repayment.platform_fee_cents,
                'repayment_interest',
                v_repayment.loan_id,
                'Repayment instalment ' || v_repayment.sequence_number
            );

            -- Platform fee booked (in production, transferred to LendLoop's wallet)
            INSERT INTO ledger (wallet_id, user_id, entry_type, amount_cents, balance_after_cents, related_loan_id, description)
            VALUES (
                NULL, NULL, 'platform_fee', v_repayment.platform_fee_cents, 0,
                v_repayment.loan_id,
                '15% of interest on instalment ' || v_repayment.sequence_number
            );

            UPDATE repayments SET
                status = 'paid',
                paid_amount_cents = total_due_cents,
                paid_at = now()
            WHERE id = v_repayment.id;

            v_processed := v_processed + 1;

            -- If this was the last repayment, mark loan paid_off
            IF NOT EXISTS (
                SELECT 1 FROM repayments
                WHERE loan_id = v_repayment.loan_id AND status = 'scheduled'
            ) THEN
                UPDATE loans SET status = 'paid_off', paid_off_at = now()
                WHERE id = v_repayment.loan_id;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Insufficient balance or other failure → mark late
            UPDATE repayments SET
                status = 'late',
                days_late = (CURRENT_DATE - due_date)
            WHERE id = v_repayment.id;
        END;
    END LOOP;

    RETURN v_processed;
END;
$$ LANGUAGE plpgsql;
```

### 17.3 Late payment handling

```sql
CREATE OR REPLACE FUNCTION mark_late_repayments() RETURNS VOID AS $$
BEGIN
    -- Apply late fee after 3-day grace
    UPDATE repayments SET
        late_fee_cents = 500,  -- €5
        days_late = (CURRENT_DATE - due_date),
        status = 'late'
    WHERE status IN ('scheduled', 'late')
      AND due_date < CURRENT_DATE - INTERVAL '3 days'
      AND late_fee_cents = 0;

    -- After 14 days late, escalate loan to default
    UPDATE loans SET status = 'in_default'
    WHERE id IN (
        SELECT DISTINCT loan_id FROM repayments
        WHERE status = 'late' AND days_late >= 14
    );
END;
$$ LANGUAGE plpgsql;
```

For the demo, you can manually fast-forward time — see section 26 for the demo-specific time-warp helper.

---

## 18. Loyalty / Welcome Bonus

PeerBerry's signature growth lever: +0.5% APR boost for the first 90 days, then loyalty tiers.

### 18.1 Welcome bonus mechanic

When KYC is approved, set `users.welcome_bonus_active_until = now() + 90 days`. When this user makes a lender offer, the platform adds a 0.5% APR boost ON TOP of what they'd otherwise earn — i.e., the bonus comes from a platform-funded reserve, not from the borrower paying more.

For demo simplicity, render the bonus visually:
- On lender's dashboard: "Welcome bonus active: +0.5% APR boost on loans funded in the next 89 days. ✨"
- On the offer modal: "Effective return: 8.5% (your offer 8.0% + 0.5% welcome bonus)"
- Don't actually move the money for v1 — just record the entitlement and display it. Real bonus payout in Phase 1.

### 18.2 Loyalty tiers (display-only for v1)

```
Bronze    €0–€500 invested      Standard rate
Silver    €500–€2,500           +0.1% boost
Gold      €2,500–€10,000        +0.3% boost
Platinum  €10,000+              +0.5% boost
```

Show on `/profile` as a vertical bar with the user's current tier highlighted. Aspirational UX without complex backend.

### 18.3 Buyback Guarantee badge (display only for v1)

PeerBerry shows a "Buyback Guarantee" on every loan. They mean a third-party loan originator buys back any loan that goes 60+ days late. We don't have that mechanism in the closed community — but we can show the badge with truthful copy:

> **Community Buyback Guarantee**
> If a borrower defaults, the LendLoop Community Reserve (a 1% allocation from each loan's interest) covers up to 50% of the lender's principal loss.

For v1, this reserve doesn't exist as actual capital, but the architectural intent is documented. In Phase 1 you actually accumulate that 1% in a platform reserve account. **Don't claim a guarantee that doesn't exist** — phrase it as "Community Reserve protection (up to 50% on first €500)" so a judge asking sees that you've thought about it without overclaiming.

---

## 19. Notifications (Email Templates)

### 19.1 Resend setup

```typescript
// /lib/email/client.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail(opts: {
  to: string;
  subject: string;
  template: React.ReactElement;
}) {
  const html = await render(opts.template);
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: opts.to,
    subject: opts.subject,
    html,
  });
}
```

### 19.2 Templates (React Email)

**`/emails/verify-email.tsx`** — 6-digit OTP:

```tsx
import { Body, Container, Head, Heading, Html, Section, Text } from '@react-email/components';

export function VerifyEmailEmail({ firstName, code }: { firstName: string; code: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f5f5f5', padding: 40 }}>
        <Container style={{ backgroundColor: 'white', padding: 32, borderRadius: 8, maxWidth: 480 }}>
          <Heading>Verify your email</Heading>
          <Text>Hi {firstName || 'there'},</Text>
          <Text>Welcome to 121.ai by LendLoop. Use the code below to verify your email address:</Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Text style={{ fontSize: 32, letterSpacing: 8, fontWeight: 'bold', fontFamily: 'monospace' }}>{code}</Text>
          </Section>
          <Text style={{ fontSize: 12, color: '#888' }}>This code expires in 15 minutes. If you didn't request this, ignore the email.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**`/emails/kyc-approved.tsx`:**

```tsx
export function KycApprovedEmail({ firstName }: { firstName: string }) {
  return (
    <Html>
      <Head />
      <Body style={emailStyle}>
        <Container>
          <Heading>You're verified! 🎉</Heading>
          <Text>Hi {firstName}, your identity has been verified successfully. You can now:</Text>
          <ul>
            <li>Deposit funds into your wallet</li>
            <li>Browse and invest in loan requests</li>
            <li>Submit your own loan request</li>
          </ul>
          <Text>Your <strong>+0.5% welcome bonus</strong> is active for the next 90 days.</Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <a href="https://121ai.vercel.app/dashboard" style={ctaStyle}>Go to dashboard →</a>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

**Other templates to build (1-line summaries):**
- `deposit-received.tsx` — "Your €X deposit has cleared"
- `offer-received.tsx` — for borrower, "{Lender} offered you €X at Y%"
- `offer-accepted.tsx` — for lender, "Your offer has been accepted; please sign the agreement"
- `disbursement-confirmed.tsx` — "€X has been disbursed to your wallet"
- `repayment-due.tsx` — "Your next payment of €X is due in 3 days"
- `repayment-late.tsx` — "Your payment is late. A €5 fee was applied."
- `loan-paid-off.tsx` — "Loan complete. Total interest earned/paid: €X"

### 19.3 The unified `sendNotification` helper

```typescript
// /lib/notifications/send.ts
export async function sendNotification(
  userId: string,
  type: NotificationType,
  payload: { title: string; body: string; link_url?: string; metadata?: any }
) {
  // 1. Insert in-app row
  await db.from('notifications').insert({
    user_id: userId,
    community_id: await getCommunityId(userId),
    type,
    title: payload.title,
    body: payload.body,
    link_url: payload.link_url,
    metadata: payload.metadata,
  });

  // 2. Lookup preferences (default: email = on for everything except marketing)
  const prefs = await getNotificationPrefs(userId, type);
  if (prefs.email) {
    const user = await db.from('users').select('email,first_name').eq('id', userId).single();
    const template = matchTemplate(type, payload, user.data!);
    await sendEmail({ to: user.data!.email, subject: payload.title, template });
  }
}
```

---

## 20. Admin Panel

Available at `/admin/*`, gated by `users.role = 'admin'`. For the demo, set yourself (the developer/founder) as admin manually via SQL.

### 20.1 Pages

- `/admin` — overview cards: pending KYC count, active loans, total deposited, total disbursed, defaulted loans
- `/admin/pending-kyc` — review queue (section 9.1)
- `/admin/users` — searchable user table; click to see profile, wallet, ledger, audit trail
- `/admin/users/[id]` — single user detail; can: suspend, recompute score, manually adjust wallet (with reason), trigger GDPR export
- `/admin/loans` — all loans, filter by status
- `/admin/loans/[id]` — loan detail with full ledger
- `/admin/audit-log` — searchable audit log (filter by action_type, actor, resource_id, date)
- `/admin/metrics` — counts and charts: signups by day, loan volume, default rate

### 20.2 Manual operations needed during demo

- "Approve KYC" — for both Smruti and Umer pre-demo
- "Time-warp loan {id} forward by N months" — fast-forwards repayments for the demo to show paid-off state (see section 26)
- "Mark deposit received" — for SEPA test if you go that route

### 20.3 Force admin layer

```typescript
// /middleware.ts (excerpt)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const session = await getSession(req);
    if (!session) return NextResponse.redirect(new URL('/login', req.url));

    const user = await getUserById(session.user_id);
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  return NextResponse.next();
}
```

---

## 21. Audit Log

### 21.1 The helper

```typescript
// /lib/audit/log.ts
import { headers } from 'next/headers';
import { serviceClient } from '@/lib/db/client';

export async function writeAuditLog(input: {
  actor_user_id?: string;
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  before_state?: any;
  after_state?: any;
  metadata?: any;
}) {
  const h = headers();
  await serviceClient.from('audit_log').insert({
    ...input,
    actor_ip: h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? null,
    actor_user_agent: h.get('user-agent') ?? null,
  });
}
```

### 21.2 Action taxonomy (write all of these)

```
auth.signup
auth.email_verified
auth.login_success
auth.login_failure
auth.2fa_enabled
auth.2fa_used
auth.password_reset
auth.session_revoked

kyc.documents_uploaded
kyc.approved
kyc.rejected

deposit.initiated
deposit.completed
deposit.failed

withdrawal.initiated
withdrawal.completed

loan_request.created
loan_request.cancelled
loan_request.expired

offer.created
offer.accepted
offer.rejected
offer.withdrawn

agreement.viewed
agreement.signed_borrower
agreement.signed_lender

loan.disbursed
loan.paid_off
loan.in_default

repayment.scheduled
repayment.paid
repayment.late
repayment.late_fee_applied

admin.score_adjusted
admin.user_suspended
admin.deposit_marked_received
admin.kyc_overridden

gdpr.export_requested
gdpr.export_delivered
gdpr.deletion_requested

system.score_recomputed
system.auto_invest_offer_created
system.cron_run
```

---

## 22. API Routes — Complete Map

### 22.1 Server Actions (most of the app)

These are not REST endpoints but typed server functions called from React components. They're enumerated here because they're effectively the API contract.

```
/lib/actions/
├── auth.ts
│   ├── registerAction(formData)
│   ├── verifyEmailAction(code)
│   ├── completePersonalDetailsAction(data)
│   ├── setupTwoFactorAction(code)
│   ├── loginAction(email, password)
│   ├── verifyTwoFactorAction(code)
│   └── logoutAction()
│
├── onboarding.ts
│   ├── uploadIdentityDocumentAction(file, kind)
│   ├── uploadAddressProofAction(file, kind)
│   └── uploadPayslipAction(file)
│
├── wallet.ts
│   ├── createDepositSessionAction(amountCents)
│   ├── initiateWithdrawalAction(amountCents, iban)
│   └── getWalletBalanceAction()
│
├── borrow.ts
│   ├── submitAssessmentAction(data)
│   ├── createLoanRequestAction(data)
│   ├── cancelLoanRequestAction(id)
│   └── acceptOfferAction(offerId)
│   └── rejectOfferAction(offerId)
│
├── lend.ts
│   ├── browseLoansAction(filters)
│   ├── createOfferAction(data)
│   ├── withdrawOfferAction(id)
│   └── createAutoInvestStrategyAction(data)
│
├── agreement.ts
│   ├── viewAgreementAction(loanId)
│   └── signAgreementAction(loanId)
│
├── notifications.ts
│   ├── markReadAction(notificationId)
│   └── markAllReadAction()
│
├── profile.ts
│   ├── updateProfileAction(data)
│   └── exportMyDataAction()      // GDPR
│
└── admin.ts
    ├── approveKycAction(userId)
    ├── rejectKycAction(userId, reason)
    ├── adjustWalletAction(userId, delta, reason)
    ├── suspendUserAction(userId)
    └── timeWarpLoanAction(loanId, months)   // demo helper only
```

### 22.2 Route Handlers (REST — only for webhooks + GDPR export download)

```
POST  /api/webhooks/stripe          → verify signature, handle events
GET   /api/agreements/[id]/pdf      → stream the PDF (with auth + audit)
GET   /api/export/my-data.json      → GDPR export
POST  /api/llm/parse-payslip        → optional, day 2
```

---

## 23. Frontend Routes & Screens

Complete sitemap. Use this as a checklist to ensure no screen is missed.

```
/                                    Public landing page
/how-it-works                        PeerBerry-style 6-step explainer
/help                                FAQ index (categories like PeerBerry)
/help/registration                   FAQ category page
/help/verification                   FAQ category page
/help/deposits                       FAQ category page
/help/investments                    FAQ category page
/help/auto-invest                    FAQ category page
/help/loyalty                        FAQ category page
/help/guarantees                     FAQ category page
/privacy-policy                      Static page (template)
/terms                               Static page (template)
/risk-warning                        Static page

/login                               Email + password
/login/2fa                           TOTP code entry
/forgot-password
/reset-password/[token]

/register                            Step 1: account creation
/verify-email                        Step 2: 6-digit OTP
/onboarding/personal-details         Step 3: form
/onboarding/two-factor               Step 4: QR + verify
/onboarding/identity                 Step 5: doc + selfie capture
/onboarding/address-proof            Step 6: IRP + student ID
/onboarding/complete                 "We're reviewing"

/dashboard                           Main authed home
/profile                             Self profile + scores
/profile/edit
/settings                            Account, security, notifications, data, deletion request
/settings/security                   Sessions, 2FA, password
/settings/notifications              Channel preferences
/settings/data                       Export, deletion
/notifications                       In-app inbox

/deposit                             Deposit/withdraw screen with two tabs
/deposit/success
/transactions                        Ledger view (filterable)

/invest                              Browse loans (lender)
/invest/[id]                         Loan detail (lender view)
/auto-invest                         Strategies list
/auto-invest/new                     Create strategy
/auto-invest/[id]/edit

/borrow                              Submit loan request
/borrow/assessment                   Borrower self-assessment form
/borrow/[id]                         Own request detail (offers received)

/loans                               My loans list
/loans/[id]                          Loan detail (full ledger, schedule)
/agreements/[id]                     View signed agreement
/agreements/[id]/sign                Sign flow

/admin                               Admin home (counts)
/admin/pending-kyc                   Queue
/admin/pending-kyc/[user_id]         Single review
/admin/users                         List
/admin/users/[id]                    Detail
/admin/loans
/admin/loans/[id]
/admin/audit-log
/admin/metrics
```

---

## 24. Risk Warnings & Legal Footers

PeerBerry's footer includes: "With all investments your capital is at risk and the value of your investments and the income deriving from it can rise as well as fall. Past performance is not a guide to future performance."

We adapt:

**Footer (every page):**
> ⚠️ **Risk Warning**: Lending to peers carries risk of partial or total loss of capital. Your invested funds are not protected by the Deposit Guarantee Scheme. Past repayment performance does not guarantee future returns. Only invest money you can afford to lose.
>
> 121.ai is operated by LendLoop Operations Limited as enterprise software for the National College of Ireland community. Money movement is processed by Stripe Payments Europe Limited (regulated by the Central Bank of Ireland). LendLoop does not custody member funds and is not a regulated financial institution.

**On every loan card / offer modal (compact):**
> ⚠️ Capital at risk. See [risk warning](/risk-warning).

**On the deposit screen:**
> Funds in your wallet are held by Stripe Payments Europe (in test mode, no real funds are held). Wallet balances are not bank deposits and are not covered by the Deposit Guarantee Scheme.

---

## 25. Hour-by-Hour 2-Day Schedule

This is the actual build plan. Adjust on the fly — but the dependencies (shown by indentation) cannot be skipped. You'll be working alone or with one collaborator; if two of you, split frontend (auth + onboarding screens) and backend (schema + RLS + scoring + Stripe) on day 1, then converge on day 2.

### Day 1 — Foundations

**Hour 0 (the night before): Prep**
- [ ] Create accounts: Vercel, Supabase (new project), Stripe (test keys), Resend, GitHub, Sentry, Cloudflare (optional)
- [ ] Install Node 20+, pnpm, Supabase CLI, Stripe CLI
- [ ] Create the GitHub repo, push empty Next.js scaffold: `pnpm create next-app@latest 121ai --typescript --tailwind --app`
- [ ] Set up Vercel project pointed at the repo, link Supabase integration (auto-injects env vars)
- [ ] Reserve `121ai.vercel.app` (free subdomain)

**Hour 1–2: Schema**
- [ ] Run migration `001_init.sql` (section 6.1) in Supabase SQL editor
- [ ] Run migration `002_rls.sql` (section 7.1)
- [ ] Run the Postgres functions: `credit_wallet_atomic`, `debit_wallet_atomic`, `transfer_wallet_atomic` (section 11.2)
- [ ] Manually test: insert a community, insert a user, confirm the wallet trigger created a wallet row, confirm `deposit_reference` was generated
- [ ] Verify RLS: cross-tenant test (section 7.2)
- [ ] Set yourself as admin: `UPDATE users SET role = 'admin' WHERE email = 'you@…';`

**Hour 3: Auth scaffolding**
- [ ] Install: `@supabase/supabase-js @supabase/ssr resend @react-email/components @react-email/render otplib qrcode zxcvbn @react-pdf/renderer stripe react-hook-form zod date-fns`
- [ ] Set up Supabase client helpers in `/lib/db/client.ts` — three clients: browser, server (cookie-aware), service role (bypass RLS)
- [ ] Configure `middleware.ts` for session refresh + route protection (auth-required vs public vs admin)
- [ ] Build `/login` page (form + Server Action, no 2FA yet)
- [ ] Confirm: signing up via `supabase.auth.signUp()` creates the `auth.users` row but NOT the `users` row (you have to insert that yourself with the correct `community_id`)

**Hour 4–6: Registration + email verification**
- [ ] Build `/register` page with all PeerBerry-style fields (section 8.2)
- [ ] Implement `registerAction` (section 8.2)
- [ ] Build `email_verification_codes` flow — generate 6-digit code, hash with bcrypt, store, send via Resend
- [ ] Build `/verify-email` page with the 6-box OTP UI
- [ ] Implement `verifyEmailAction` — checks hash, increments attempts, on success advances `users.status = 'pending_personal_details'`
- [ ] Test end-to-end: register → check inbox → enter code → status advanced

**Hour 7: Personal details**
- [ ] Build `/onboarding/personal-details` page (section 8.4)
- [ ] DOB ≥ 18 validation: client-side (with proper UX) AND server-side (in the action)
- [ ] On submit: update `users` row, advance status to `pending_2fa`

**Hour 8: 2FA setup**
- [ ] Build `/onboarding/two-factor` page (section 8.5)
- [ ] QR code generation with `otplib` + `qrcode`
- [ ] Encrypt the secret before storing — use Supabase Vault if available, or a simple AES-GCM with `SESSION_SECRET` as key
- [ ] Generate 8 backup codes, hash each with bcrypt, store in `users.backup_codes_hashed`
- [ ] On verify: advance to `pending_identity`
- [ ] Add the 2FA prompt to login flow (`/login/2fa` page after password)

**Hour 9–11: KYC capture screens**
- [ ] Build `/onboarding/identity` intro page with the verbatim PeerBerry copy (section 8.6)
- [ ] Build the document capture component with `getUserMedia` (section 8.7)
- [ ] Build the selfie capture component with the oval mask + simulated liveness check sequence
- [ ] Upload to Supabase Storage at `documents/{user_id}/identity_front.jpg`, `identity_back.jpg`, `selfie.jpg`
- [ ] Insert `documents` rows
- [ ] Insert simulated `aml_screenings` row with `result = 'clear'`
- [ ] Build `/onboarding/address-proof` for IRP / utility + student ID + (optional) payslip
- [ ] On final upload: advance status to `pending_admin_approval`

**Hour 12: Admin queue**
- [ ] Build `/admin/pending-kyc` queue + `/admin/pending-kyc/[user_id]` review screen
- [ ] Implement `approveKycAction` (section 9.1) — sets `users.status = 'verified'`, fires `kyc_approved` notification
- [ ] Build `/onboarding/complete` waiting screen with auto-redirect when status flips

**End of Day 1 milestone:** A user can register with NCI email, verify email with code, fill personal details, set up 2FA, upload ID + selfie + IRP + student ID, see "we're reviewing", you approve from admin panel, they land on dashboard.

---

### Day 2 — Money, Loans, Demo

**Hour 13–14: Wallet + Stripe deposit**
- [ ] Build `/dashboard` shell (the lender view — wallet balance, two CTA cards)
- [ ] Build `/deposit` page with both tabs (Card + SEPA)
- [ ] Implement `createDepositSessionAction` (section 11.2)
- [ ] Implement Stripe webhook handler at `/api/webhooks/stripe/route.ts`
- [ ] Set up `stripe listen --forward-to localhost:3000/api/webhooks/stripe` while developing
- [ ] Set webhook endpoint in Stripe Dashboard for production: `https://121ai.vercel.app/api/webhooks/stripe`
- [ ] Test: deposit €500 with test card 4242, confirm webhook fires, confirm wallet balance is €500.00 and ledger has one row

**Hour 15: Borrower assessment + loan request**
- [ ] Build `/borrow/assessment` form (declared income, expenses, debt, employment status)
- [ ] On submit: insert into `borrower_assessments`, then call `recomputeScoreFor(userId)` (calls the function in section 12.1)
- [ ] Build `/borrow` form for loan request (section 13.1)
- [ ] Implement `createLoanRequestAction` (section 13.1)
- [ ] Build `/borrow/[id]` to view your own request

**Hour 16: Lender browse + offer**
- [ ] Build `/invest` page with filter sidebar + loan cards (section 14.1)
- [ ] Build `/invest/[id]` loan detail page with score breakdown widget
- [ ] Build the Make Offer modal
- [ ] Implement `createOfferAction` (section 14.3)
- [ ] Build the offer notification path (in-app row + email via `offer-received.tsx`)

**Hour 17–18: Agreement + signing + disbursement**
- [ ] Build `/agreements/[id]/sign` page with embedded PDF viewer
- [ ] Implement `generateLoanAgreementPdf` using `@react-pdf/renderer` (section 16.1) — render to buffer, save to `agreements` bucket
- [ ] Implement `signAgreementAction` (section 16.2)
- [ ] Implement `triggerDisbursement` (section 16.3) — generates final PDF, transfers wallet, schedules repayments
- [ ] Implement `buildSchedule` and `generateRepaymentSchedule` (section 17.1)
- [ ] Test the full path: borrower accepts offer → both sign → disbursement happens → schedule is in DB

**Hour 19: pg_cron + repayment processing**
- [ ] Run migration `004_pg_cron.sql` to register all scheduled functions (section 15.2)
- [ ] Write `process_due_repayments()` Postgres function (section 17.2)
- [ ] Write `mark_late_repayments()` (section 17.3)
- [ ] Write `send_repayment_reminders()` (calls `pg_notify` or directly INSERTs into a queue table that an Edge Function picks up to send the email)
- [ ] Critical for demo: add a manual-trigger admin button "Time-warp loan {id} forward 6 months" (next section)

**Hour 20: Loan list + transactions + notifications inbox**
- [ ] Build `/loans` (own loans, both lender and borrower view)
- [ ] Build `/loans/[id]` showing schedule, paid/upcoming, ledger movements
- [ ] Build `/transactions` (wallet ledger view, filterable)
- [ ] Build `/notifications` inbox using Supabase Realtime subscription (`supabase.channel(...).on('postgres_changes', { event: 'INSERT', table: 'notifications', filter: \`user_id=eq.${userId}\` })`)
- [ ] Build the notification bell in the navbar with the unread count

**Hour 21: Auto-Invest + loyalty + remaining UI polish**
- [ ] Build `/auto-invest` strategies list + `/auto-invest/new` form
- [ ] Implement `auto_invest_run()` PL/pgSQL (section 15.3) and confirm pg_cron fires every 10 min
- [ ] Add the welcome bonus banner to `/dashboard`
- [ ] Add the loyalty tier widget to `/profile`
- [ ] Add the buyback guarantee badge to loan cards
- [ ] Add risk warnings everywhere they belong

**Hour 22: Help / FAQ / How It Works / Static**
- [ ] Build `/how-it-works` mirroring the PeerBerry 6-step structure
- [ ] Build `/help` index + at least 4 category pages (`/help/registration`, `/help/verification`, `/help/deposits`, `/help/investments`)
- [ ] FAQ content: copy the structure verbatim from PeerBerry, rewrite copy for student community
- [ ] Build `/risk-warning`, `/privacy-policy`, `/terms` static pages
- [ ] Build the public landing page `/` with CTAs

**Hour 23: The demo seed + dry run**
- [ ] Write `migrations/003_seed_demo.sql` — pre-creates Smruti and Umer (post-KYC, verified, with documents marked approved, with score already computed)
- [ ] Pre-fund Smruti with a deposit history of one €500 deposit
- [ ] Optionally pre-create Umer's loan request in `draft` status (you'll post it live during demo)
- [ ] Do a full dry-run of the demo script (section 26) end-to-end — time yourself
- [ ] Fix anything that takes more than 30 seconds to load
- [ ] Take screenshots for fallback slides in case something fails on stage

**Hour 24: Polish, deploy, prep**
- [ ] Push final code, deploy to Vercel production
- [ ] Verify all environment variables are set in Vercel (especially `STRIPE_WEBHOOK_SECRET` — get this from Stripe Dashboard, NOT the CLI value)
- [ ] Set Stripe webhook endpoint to the production URL
- [ ] Send a real test deposit on production to confirm the webhook fires there too
- [ ] Send yourself a test email via Resend on production — make sure SPF/DKIM are set up (Resend's defaults work for `send.121ai.app` if you add the DNS records they provide)
- [ ] Sleep before the demo. The fix-it-on-stage version of yourself is worse than the version that slept.

---

## 26. Demo Script: Smruti & Umer (15-Min Walkthrough)

This is what you'll perform on stage. Memorise the beats. The script assumes two browser windows (or two laptops) — Smruti on the left, Umer on the right.

### 26.1 Pre-demo state (set up the night before)

In the database, both users exist with:
- Status: `verified`
- Documents: all approved
- 2FA: enabled (you have the secrets)
- Smruti's wallet: €500.00 available, no investments yet
- Umer's wallet: €0.00, no loans
- One existing seeded loan from "Aisha M." (lender) to "Tanvi P." (borrower) showing as paid_off — proves the system has history

```sql
-- /migrations/20260427_003_seed_demo.sql

-- Smruti (lender)
INSERT INTO users (id, community_id, email, role, status, first_name, last_name, date_of_birth,
                   gender, mobile_e164, address_line1, city, postal_code, country,
                   totp_enabled, identity_verified_at, identity_verification_method,
                   nci_program, nci_year, is_part_time_employed)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM communities WHERE slug = 'nci'),
    'smruti.demo@student.ncirl.ie',
    'member', 'verified',
    'Smruti', 'Patil', '2000-03-15',
    'female', '+353871234001',
    '14 Mayor Street Lower', 'Dublin', 'D01 F5P2', 'IE',
    TRUE, now(), 'manual_admin',
    'MSc Data Analytics', 1, TRUE
);

-- Umer (borrower)
INSERT INTO users (id, community_id, email, role, status, first_name, last_name, date_of_birth,
                   gender, mobile_e164, address_line1, city, postal_code, country,
                   totp_enabled, identity_verified_at, identity_verification_method,
                   nci_program, nci_year, is_part_time_employed)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM communities WHERE slug = 'nci'),
    'umer.demo@student.ncirl.ie',
    'member', 'verified',
    'Umer', 'Khan', '1999-08-22',
    'male', '+353871234002',
    '7 Pearse Street', 'Dublin', 'D02 RX01', 'IE',
    TRUE, now(), 'manual_admin',
    'MSc Cloud Computing', 1, TRUE
);

-- Pre-seed Smruti's wallet with €500 deposit
SELECT credit_wallet_atomic(
    '11111111-1111-1111-1111-111111111111'::uuid,
    50000,
    'deposit_cleared',
    NULL, NULL,
    'Pre-demo deposit (test mode)'
);

-- Borrower assessment for Umer
INSERT INTO borrower_assessments (
    user_id, community_id,
    monthly_income_cents, monthly_expenses_cents, existing_debt_cents,
    employment_status, employment_months, has_emergency_fund,
    verified_income_cents, income_verification_method,
    nci_semesters_completed, has_irp, irp_expiry_date
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM communities WHERE slug = 'nci'),
    120000, 75000, 0,
    'part_time', 4, FALSE,
    120000, 'payslip_admin',
    1, TRUE, '2027-09-30'
);

-- Compute and insert credit score for Umer (you'll do this from the app, but seed for safety)
INSERT INTO credit_scores (
    user_id, community_id,
    total_score, identity_score, income_score, stability_score, financial_score, reputation_score,
    breakdown, algorithm_version
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM communities WHERE slug = 'nci'),
    72, 18, 17, 8, 19, 10,
    '{"identity_verified": {"points": 8, "max": 8, "reason": "Identity documents approved"}}',
    'v1.0'
);

-- Historical paid-off loan (for "we have history" credibility)
-- Aisha lender + Tanvi borrower (also seeded above ideally) — keep simple: just insert the row
-- with all timestamps in the past
```

### 26.2 The time-warp helper (CRITICAL)

To show the loan paying off during a 15-minute demo, you cannot wait 6 months. You also cannot fake the UI — judges will inspect. Solution: a real admin endpoint that fast-forwards `process_due_repayments` for one specific loan.

```typescript
// /app/admin/loans/[id]/timewarp/action.ts
'use server';
import { serviceClient } from '@/lib/db/client';

export async function timeWarpLoan(loanId: string, monthsForward: number) {
  await assertAdmin();

  // 1. Move all scheduled repayments' due_dates backward by N months
  await serviceClient.rpc('time_warp_loan', {
    p_loan_id: loanId,
    p_months: monthsForward,
  });

  // 2. Run the processor for any now-overdue payments
  await serviceClient.rpc('process_due_repayments');

  await writeAuditLog({
    action_type: 'demo.time_warp',
    resource_type: 'loan',
    resource_id: loanId,
    metadata: { months: monthsForward, reason: 'demo' },
  });
}
```

```sql
CREATE OR REPLACE FUNCTION time_warp_loan(p_loan_id UUID, p_months INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE repayments
    SET due_date = due_date - (p_months || ' months')::INTERVAL
    WHERE loan_id = p_loan_id AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql;
```

This function exists ONLY for the demo. Put a comment on it: `-- DEMO ONLY — remove before production.` In Phase 1, drop the function and the `/admin/loans/[id]/timewarp` route.

### 26.3 The 15-minute walkthrough — beat by beat

**[00:00 – 00:30] Opening** *(slide deck, before opening the app)*

> "121.ai by LendLoop is peer-to-peer lending for closed communities. Today we're showing it for the National College of Ireland — but the architecture works for any community: alumni networks, professional associations, employee groups.
>
> The pitch is simple: you trust your peers more than a bank trusts you. So why not lend to them, and earn the interest a bank would have kept?
>
> Two students. Smruti has €500 saved from her teaching assistant role. Umer needs €500 for a laptop because his died last week and his thesis is due in May. The bank says no — he doesn't have credit history. PayPal lets Smruti send €500 but she gets nothing back. We let Smruti lend to Umer at 8% APR, recover her capital plus €11.80 in interest over 6 months, and we take 15% of that interest as our cut."

**[00:30 – 02:00] The closed-community angle (open `/` landing + register screen)**

> "Why does this work where Lending Club and Zopa struggled? Because we use the trust that already exists. Every member here has an `@student.ncirl.ie` email. They're in the same buildings, same Slack, same Linkedin alumni group. They know each other or they know someone who does."

*Open `/register` in front of judges. Try to register with `random@gmail.com`.*

> "Watch what happens with a Gmail address."

*Submit. Show the error: "Only NCI student/staff emails are accepted."*

> "Domain-locked signup. The closed community isn't marketing language — it's enforced at the auth layer."

**[02:00 – 04:00] Smruti's flow: login + dashboard + deposit (Smruti window)**

*Skip onboarding by logging into pre-seeded Smruti account.*

> "Smruti is already onboarded. KYC done — passport + selfie + Irish Residence Permit + her TU Dublin payslip from her TA job. All verified. She has €500 in her wallet."

*Show `/dashboard`.*

> "She can see the loan marketplace, her wallet, and the welcome bonus — +0.5% APR boost on any loan she funds in the next 90 days. Same hook PeerBerry uses."

*Click `/invest`.*

> "Here's the open loan marketplace for the NCI community. Right now there are 3 loans open. She can filter by purpose, term, score, cohort. PeerBerry has the same interface for their lenders — we just adapted it for student loans inside one community."

**[04:00 – 06:00] Umer creates a loan request (Umer window)**

*Switch to Umer's window. He's logged in but has no loan.*

> "Umer needs €500. Let's create the loan request live."

*Navigate to `/borrow`. Show the form.*

> "He picks a purpose — Laptop & Equipment. Term — 6 months. Maximum APR he'd accept — 10%. Description — 'Replacing my MacBook for thesis project; current device failed.'"

*Show the affordability box live: "Estimated monthly payment €85.30 — that's 7% of your declared monthly income. Comfortable threshold is <30%."*

> "We're showing him in real-time whether this is sustainable. If his payment was 40% of income, we'd block submission and tell him to lower the amount or extend the term."

*Submit the request.*

*Click through to `/borrow/[id]`.*

> "His request is live. The marketplace just got it. Smruti's auto-invest sweeper will check this in the next 10 minutes — but we don't have time to wait, so let's have her fund it manually."

**[06:00 – 09:00] Smruti funds the loan (Smruti window)**

*Switch to Smruti's window.*

> "She refreshes the marketplace. New loan from Umer. Score 72 out of 100."

*Click into Umer's loan.*

> "Here's the score breakdown. PeerBerry shows similar but ours is more granular because we have direct access to the data. Identity 18/20 — passport plus IRP plus 2FA. Income 17/25 — €1,200/month part-time, verified payslip, but it's a part-time role so it's capped. Stability 8/15 — only one semester at NCI completed. Financial 19/20 — no debt, healthy surplus ratio. Reputation 10/20 — neutral starting point because no prior loans on the platform.
>
> The number isn't a black box. It's a deterministic function of inputs. If Umer takes another loan and pays it off on time, his Reputation jumps. We can show every line of how it got computed. That's regulator-defensible scoring — Article 22 of GDPR requires explainability for automated decisions."

*Click "Make an Offer".*

> "She offers €500 at 8% — below his 10% ceiling. Term 6 months."

*Enter the amounts. Submit. (Note: 2FA prompt appears.) Enter the TOTP from her authenticator.*

> "Step-up authentication. Even though she's logged in, financial actions need fresh 2FA."

*The offer goes through. Switch to Umer's window.*

> "Real-time notification on Umer's side. Email also sent — let me show you the inbox."

*Open Resend dashboard or email client briefly to show the offer-received email.*

**[09:00 – 11:00] Contract signing + disbursement**

*Umer accepts the offer.*

> "He sees the offer terms. €500 at 8% for 6 months. Monthly payment €85.30. Total interest €11.80. Platform fee €1.77. He clicks Accept."

*Step-up 2FA on Umer's window. Then the contract page loads.*

> "Now they both sign the loan agreement. This PDF is generated server-side from a real Irish-law-compliant template — Consumer Credit Directive 2008/48/EC, eIDAS Article 25 for electronic signatures, GDPR consent recording. Every signature captures IP, timestamp, and user agent. The audit trail goes into a permanent append-only log."

*Umer scrolls the embedded PDF. Clicks "I agree and sign". 2FA. Done.*

*Switch to Smruti's window — show the in-app notification: "Umer has signed. Your turn."*

*Smruti opens the agreement. Signs. 2FA.*

> "The moment both signatures are recorded, the disbursement function runs. Watch this."

*Show the brief loading state, then both wallets update.*

> "Smruti's wallet: €500 → €0 available, €500 invested. Umer's wallet: €0 → €500 available. The repayment schedule is generated — six instalments of €85.30, first one due in one month. Audit log has 14 new entries from the last 90 seconds. The signed PDF is in the agreements bucket — both parties can download it."

*Click into `/loans/[id]` from Umer's side. Show the schedule.*

**[11:00 – 13:00] Time-warp + repayment**

*Switch to your admin window.*

> "Now I'd love to wait six months for the repayments to come in, but we have 15 minutes. So I'm going to use a function that exists only in our demo build — it fast-forwards this loan's repayment schedule. In production this function doesn't exist."

*Navigate to `/admin/loans/[loan_id]`. Click "Time-warp 6 months".*

*Show the brief processing.*

*Switch back to Smruti's window. Refresh `/dashboard`.*

> "Smruti's dashboard: Available balance €511.80 — that's her €500 principal back, plus €11.80 of interest, minus €0 because the platform fee gets deducted from interest before it credits her. She can withdraw it back to her bank. The loan status: paid off. Reputation score for Umer: jumped from 10 to 20 because he just completed a loan with 100% on-time payments."

*Switch to Umer's window. Refresh.*

> "Umer's dashboard: he repaid €511.80 over 6 months. His reputation score went up. The next time he applies for a loan, he'll get better rates because of his track record. This is community credit-building — and unlike a bank credit score, this score is portable to any community on our platform."

**[13:00 – 14:30] Money, audit, admin**

*Open `/transactions` for Smruti. Show the ledger.*

> "Every cent that moved is recorded. Disbursement out, then six repayment instalments in. We keep a balance snapshot on every row so the auditors don't have to recompute history."

*Open `/admin/audit-log`.*

> "Every action — every login, every document upload, every signature — is logged here. IP, user agent, timestamp, before-state, after-state. This is what makes us boring to a financial regulator, which is the right kind of boring."

*Briefly show `/admin/metrics` if you have time.*

> "Right now this is one community of two test users. The architecture is multi-tenant from day one — every table has a `community_id`, RLS policies enforce isolation at the database level. Adding NCI alumni or another university tomorrow is a single insert into the communities table."

**[14:30 – 15:00] Close**

> "What we showed: a real-time peer loan from request to repayment. The infrastructure pieces — KYC, scoring, contracts, money movement, repayments, audit — are all built and demonstrable. What's simulated: the identity verification ran through our admin queue instead of Veriff because Veriff costs €1.50/check and we're a pre-seed demo. The Stripe layer is in test mode because going live with peer-to-peer lending in Ireland needs Central Bank registration as an account information service — that's our Phase 1, after we close pre-seed.
>
> One last thing — to prove our money flow isn't smoke and mirrors, here's a real €1 SEPA transfer between two Revolut accounts that ran through our deposit endpoint last night."

*Show screenshot of real Revolut→Revolut SEPA transfer with the deposit reference.*

> "Test mode for repeatability today. Live mode after we close. The code path is identical. Thank you — questions?"

### 26.4 Q&A prep — likely judge questions

**Q: Are you regulated?**
A: Not yet. We operate as enterprise software for a closed community. Money movement is processed by Stripe Payments Europe Limited which is regulated by the Central Bank of Ireland. In Phase 1 we'll register as a Crowdfunding Service Provider under the EU ECSPR or operate as an account information service under PSD2 — we have a legal opinion letter scheduled with [law firm] for [month]. Today's demo is enterprise software, not retail finance.

**Q: What if a borrower defaults?**
A: Three layers. First, we have a deterministic underwriting score and a 30% income surplus rule that filters out unsustainable loans before they list. Second, the buyback guarantee — we accumulate 1% of every loan's interest into a community reserve, which covers up to 50% of a defaulted lender's principal. Third, defaulted borrowers cannot get further loans on the platform across any community. Hard stop.

**Q: How is this different from Splitwise + Revolut?**
A: Splitwise tracks IOUs — it doesn't enforce, doesn't underwrite, doesn't generate contracts, doesn't process repayments, doesn't create a credit history. We do all of that. Splitwise is for friends settling brunch. We're for a community building an internal credit market.

**Q: Why students?**
A: They're a high-trust closed community with a real underbanked credit need (international students with no Irish credit history). NCI is our pilot. The same model works for company employee networks (the new "credit unions"), professional associations, and university alumni — that's the wedge.

**Q: How do you make money?**
A: 15% of interest paid. On Umer's loan that's €1.77 over six months. Not much from one loan, but at scale — 1,000 loans/month at average €1,500 principal at 9% APR for 6 months = ~€100K monthly interest = €15K/month platform revenue. That's the unit-economic case. We also charge late fees (€5 each), and we'll add a paid tier for premium analytics for high-volume lenders in Phase 2.

**Q: How do you scale to other communities?**
A: Multi-tenant from day one — every table has `community_id`, RLS policies enforce isolation. Adding a community is one row in the `communities` table plus configuring the email allowlist. The expensive part is each community's compliance review and admin handover, not the engineering.

**Q: What happens if Stripe blocks you?**
A: We're pre-revenue, in test mode, with no live transactions. When we go live in Phase 1, our setup is Stripe Connect Custom accounts — both lender and borrower are Stripe-verified, money flows from one's account to the other's, with us as the technology platform that doesn't touch funds. That's a supported Stripe Connect pattern. If they decline us anyway, we have Modulr and Currencycloud as backup processors that explicitly serve P2P lending platforms.

---

## 27. Deployment Checklist

### 27.1 Vercel project setup

```bash
# In the repo
vercel link
vercel env pull .env.local         # pull whatever's in Vercel locally

# Add environment variables (do this in the Vercel dashboard, NOT via CLI for secrets)
# Each one needs to be set for: Production, Preview, Development

# Production deploy
vercel --prod
```

**Required env vars on Vercel (verify each is set):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (set to `https://121ai.vercel.app`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (the production one, from the Stripe Dashboard webhook config — NOT the CLI value)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `GEMINI_API_KEY` (optional)
- `SENTRY_DSN`
- `SESSION_SECRET`
- `ADMIN_EMAIL_ALLOWLIST`
- `NCI_EMAIL_DOMAINS`

### 27.2 Stripe configuration

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://121ai.vercel.app/api/webhooks/stripe`
3. Events to listen for: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the signing secret (starts with `whsec_`) → set as `STRIPE_WEBHOOK_SECRET` in Vercel

### 27.3 Resend configuration

1. Resend Dashboard → Domains → Add `send.121ai.app` (or your subdomain of choice)
2. Add the SPF, DKIM, and Return-Path DNS records they show you
3. Wait for verification (usually <5 min)
4. Set `RESEND_FROM_EMAIL=onboarding@send.121ai.app`
5. Send a test email through the dashboard to confirm deliverability

(For demo: if you don't have a domain, Resend allows sending from `onboarding@resend.dev` for testing. Emails go through but show "via resend.dev" — fine for a demo, not for real users.)

### 27.4 Supabase configuration

1. Database → Replication → Enable for `notifications` table (for Realtime in the inbox)
2. Authentication → URL Configuration → Redirect URLs → add `https://121ai.vercel.app/**`
3. Authentication → Email Templates → customise (or disable Supabase's default emails since we send our own via Resend)
4. Storage → Create buckets `documents` (private) and `agreements` (private) — already done in migration if you ran 002_rls.sql
5. Database → Extensions → enable `pg_cron` (might be on by default; verify)

### 27.5 DNS / domain (optional)

If you have a real domain like `121ai.app`:
- Vercel → Project → Settings → Domains → add `121ai.app`
- Update DNS at your registrar to point at Vercel's IPs
- Re-run Resend domain verification on `send.121ai.app`
- Update `NEXT_PUBLIC_APP_URL` env var

For the demo, `121ai.vercel.app` works fine. Judges don't care.

---

## 28. Pre-Demo Test Pass

Run this exact checklist 2 hours before the demo. If anything fails, fix it; don't try to remember to "do it differently on stage."

```
[ ] /register works with NCI email; rejects gmail.com
[ ] /verify-email accepts the 6-digit code (use a real test inbox)
[ ] /onboarding/personal-details rejects DOB < 18
[ ] /onboarding/two-factor: QR code scans, code verifies
[ ] /onboarding/identity: webcam access works on the demo machine
[ ] Selfie capture saves to Supabase Storage
[ ] /admin/pending-kyc shows the new user; approve works
[ ] User receives kyc-approved email
[ ] /dashboard renders after login
[ ] /deposit: Stripe Checkout loads with correct amount
[ ] Test card 4242 4242 4242 4242 completes payment
[ ] Stripe webhook fires and credits wallet (check Vercel logs)
[ ] Wallet shows correct balance
[ ] /borrow: assessment + request submit succeeds
[ ] /invest: filters work; loan card renders
[ ] Make Offer: 2FA modal appears; offer submits
[ ] Borrower sees offer-received notification (in-app and email)
[ ] Accept offer: 2FA, modal advances
[ ] Sign agreement: PDF renders inline; signature captures IP
[ ] Both signed: disbursement transfers wallet balances
[ ] Repayment schedule has correct number of rows with correct amounts
[ ] Time-warp button on admin works; subsequent process_due_repayments updates wallets
[ ] Smruti's wallet shows interest received
[ ] Umer's loan shows status = paid_off
[ ] /admin/audit-log shows entries for every action
[ ] Footer risk warning is visible on every page
[ ] /transactions shows correct ledger
[ ] Cross-tenant test: query loan_requests as a different community user; expect 0 rows
[ ] Mobile responsive: dashboard renders OK on phone (Apple sometimes asks judges to view on iPad)
[ ] Loading states: each Server Action shows a spinner / skeleton, not a blank screen
[ ] Error states: network throttle to 3G; nothing breaks catastrophically
```

If 5+ items fail, postpone or cut features rather than ship a broken demo. A 10-minute demo of working flows beats a 15-minute demo with three crashes.

---

## 29. Known Limitations & Talking Points

Use these honestly when judges probe. The credibility move is to volunteer the limitation before they find it.

| Limitation | Why it's OK for now | What we'll do |
|---|---|---|
| KYC done via admin manual review, not Veriff | Veriff is €1.50/check; pre-seed budget | Phase 1: integrate Veriff or Stripe Identity. Architecture-symmetric swap. |
| AML screening is hardcoded "clear" | ComplyAdvantage subscription €100s/mo | Phase 1: ComplyAdvantage on signup + ongoing monitoring |
| Stripe is in test mode | Going live needs the legal cover (next bullet) | Phase 1, after legal opinion + Stripe Connect Live |
| No live regulated entity, operating as enterprise software | Closed-community framing is a defensible interim posture | Apply for ECSPR or AISP licence in Phase 1 |
| The 1% reserve fund for buyback guarantee doesn't actually accumulate | We have no live volume | Phase 1, accumulate from real interest as soon as live |
| E-signatures are click-to-sign with audit log, not eIDAS QES | Reasonable for unsecured peer loans <€2K with both parties identity-verified | Phase 2: Dropbox Sign or Evrotrust integration for QES grade |
| No SMS notifications, only email | Twilio costs money | Phase 1 once we have revenue |
| Time-warp button exists in admin | Demo necessity | Removed before Phase 1 launch (already commented in code) |
| No secondary market (loan resale) | Out of scope for v1 | Phase 2 — PeerBerry has it; we will too |
| Only EUR currency | Single market focus | Phase 2 — multi-currency once outside EU |
| Rate limiting is basic (Vercel default) | Not under attack at pre-seed | Phase 1: Cloudflare WAF + custom rate limits per endpoint |
| No bug bounty / pen test yet | Pre-launch | Pre-Phase 1: pen test by [security firm] before going live |
| Single Postgres database, no read replicas | Free tier limit | Phase 1: paid Supabase tier with read replicas |
| Default GDPR retention not yet configured | Manual handling for v1 | Phase 1: automated retention + deletion jobs |

If a judge asks about a limitation NOT on this list, the right answer is "great catch — that's a Phase 1/2 item we haven't documented yet" rather than dancing around it.

---

## 30. Post-Demo: Path to Phase 1

A 90-day plan after the demo, assuming pre-seed closes.

### 30.1 Weeks 1–2: Legal foundation

- [ ] Engage Irish fintech lawyer (Mason Hayes Curran, Matheson, or A&L Goodbody) for the regulatory opinion: ECSPR vs PSD2 AISP vs hosting under a licensed partner
- [ ] Incorporate LendLoop Operations Limited if not already done
- [ ] Open business banking + Stripe live account application (Connect Custom)
- [ ] Privacy policy, terms of service, risk disclosures reviewed by counsel

### 30.2 Weeks 3–4: Production swap

- [ ] Veriff or Stripe Identity integration replacing manual KYC
- [ ] ComplyAdvantage integration for AML/PEP screening (initial + ongoing monthly)
- [ ] Dropbox Sign or Evrotrust for eIDAS QES e-signatures
- [ ] Postmark or upgraded Resend tier for transactional email
- [ ] Sentry paid tier with proper alerting
- [ ] Supabase Pro tier (point-in-time recovery, dedicated compute)
- [ ] Real domain + custom email + DKIM/SPF/DMARC

### 30.3 Weeks 5–6: Payments live

- [ ] Stripe Connect Custom: lender + borrower both onboarded with full identity verification
- [ ] Webhook hardening (replay protection, idempotency keys at app level not just DB)
- [ ] Real disbursement: transfer with `application_fee_amount` for the platform cut
- [ ] Real withdrawal: payout to verified bank account
- [ ] Fall-back processor (Modulr or Currencycloud) wired up but not switched on
- [ ] Daily reconciliation job: Stripe → ledger → Supabase wallet, alert on any mismatch

### 30.4 Weeks 7–8: NCI alpha pilot

- [ ] Soft launch with 20 invited NCI students (10 lenders, 10 borrowers)
- [ ] Cap: max €200/loan, max 6 active loans total
- [ ] Daily standups with the alpha cohort, weekly retros
- [ ] Iterate on UX based on real friction points
- [ ] Build the secondary market UI (loan resale at par or discount)

### 30.5 Weeks 9–12: Open NCI + second community

- [ ] Open registration to all NCI students/staff (~5,000 people)
- [ ] Marketing: posters in NCI buildings, Slack/Discord groups, NCI email newsletter
- [ ] Onboard a second community: choose between TUDublin, UCD, or an alumni network
- [ ] Implement loyalty tier payouts (the +0.1% to +0.5% boosts based on portfolio size)
- [ ] Build the buyback reserve: actually accumulate 1% of interest into a separate ledger

### 30.6 Phase 1 success metrics

- 200+ verified members across 2+ communities
- 50+ active loans
- €50K+ total disbursed
- < 5% default rate (early indicator; the 6-month-out number matters more)
- Stripe live mode with > €5K/month in legitimate volume
- Audit trail clean for legal / regulator inspection
- Zero critical security incidents

If those numbers hit, you've graduated from "demo with a story" to "early-stage fintech with traction" — that's the seed round narrative.

---

## Appendix A: Quick-Reference Money Math

For the demo loan (Smruti → Umer, €500 at 8% APR for 6 months):

| Field | Cents | Display |
|---|---|---|
| Principal | 50000 | €500.00 |
| APR (bps) | 800 | 8.00% |
| Monthly rate | — | 0.6667% |
| Term | — | 6 months |
| Monthly payment | 8530 | €85.30 |
| Total payments | 51180 | €511.80 |
| Total interest | 1180 | €11.80 |
| Platform fee (15% of interest) | 177 | €1.77 |
| Lender net interest | 1003 | €10.03 |
| Lender total return | 51003 | €510.03 |

Repayment schedule (rounded):

| # | Due | Principal | Interest | Total | Outstanding |
|---|---|---|---|---|---|
| 1 | +1mo | €82.00 | €3.30 | €85.30 | €418.00 |
| 2 | +2mo | €82.55 | €2.75 | €85.30 | €335.45 |
| 3 | +3mo | €83.10 | €2.20 | €85.30 | €252.35 |
| 4 | +4mo | €83.65 | €1.65 | €85.30 | €168.70 |
| 5 | +5mo | €84.20 | €1.10 | €85.30 | €84.50 |
| 6 | +6mo | €84.50 | €0.80 | €85.30 | €0.00 |

(Computed via standard amortisation formula. Verify with the function in section 17.1.)

---

## Appendix B: Reading Order for a New Engineer

If you bring on a teammate and they need to understand the codebase, point them at this doc in this order:

1. Section 1 (what we're building)
2. Section 2 (real vs simulated table) — gives the mental model fast
3. Section 6 (schema) — the data model is the design
4. Section 11 (wallet) — understand the money primitive
5. Section 22 + 23 (API + sitemap) — what code lives where
6. The directory structure in section 4
7. Then follow code from a Server Action (e.g., `createOffer` in `/lib/actions/lend.ts`) into the database

After that they should be able to add features.

---

## Appendix C: What this document deliberately leaves out

To stay buildable in 48 hours, we did not specify:

- **Internationalisation (i18n)**: hardcoded English. PeerBerry has 4 languages; we can add later.
- **Mobile native apps**: web responsive only; native iOS/Android is Phase 2.
- **Push notifications**: web push if time, native push later.
- **Open banking aggregation** (TrueLayer/Tink) for income verification — Phase 1.
- **Secondary market**: skip for v1, in Phase 2 specs.
- **Group guarantees** (PeerBerry has these) — out of scope for unsecured peer loans in v1.
- **Currency hedging** — we're EUR-only for the demo and pilot.
- **Tax reporting** — Form 11 / DIRT calculations for lenders' interest income — Phase 1, before pilot lenders file taxes.
- **Customer support tooling**: just an email address for v1. Helpdesk like Front or Intercom later.
- **A/B testing / analytics**: PostHog free tier in Phase 1. None in v1.

---

**End of implementation.md**

*Last updated: 2026-04-27*
*Total estimated build time: 48 hours*
*Total ongoing cost: €0.00/month (free tiers)*
*Production swap cost: ~€650–1,400/month at scale (see system_design.md section 14)*