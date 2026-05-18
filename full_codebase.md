# 121.ai by LendLoop — Full Codebase (Path B)

**Generated:** 2026-04-28  
**Stack:** Next.js 16 + React 19 + Supabase + Stripe (test) + Resend + Tailwind 4

This document contains every file you need. Follow Part 0 first, then create each file at its exact path inside `~/Desktop/121ai/`.

---

## Part 0 — How to use this file

You already have:
- `~/Desktop/121ai/` scaffolded by `create-next-app`
- All npm dependencies installed
- `.env.local` filled with rotated keys

You will:

1. **Replace some scaffolded files** (Part 1) — `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`. The default scaffold gives you placeholders; we replace them.
2. **Create new files** (Parts 2–10) — every file path is given. In VS Code or Cursor: File → New File → paste the path including folders, paste the contents.
3. **Run SQL migrations** (Part 2) into Supabase SQL Editor in order.
4. **Set up Stripe webhook** (final part).
5. **Run** — `npm run dev`.

**Next.js 16 quirks already handled in this code:**
- `cookies()`, `headers()`, route `params`, and `searchParams` are awaited (Promises in Next 15+, required in Next 16)
- Server Actions use the new error-handling shape

**Manual steps you do during demo prep, NOT in code:**
- Approve Smruti & Umer's KYC from `/admin/pending-kyc` (one click each — they're pre-seeded as already verified, but the flow is testable)
- Run the time-warp helper from `/admin/loans/[id]` to fast-forward repayments during the demo
- Test Stripe webhook with `stripe listen` before demo

**What this codebase deliberately omits (and why):**
- Custom shadcn/ui themes (vanilla Tailwind for speed)
- Optional Gemini LLM narrative (left as a TODO file you fill in if time)
- Pixel-perfect mobile responsive polish (works on mobile but not styled to perfection)
- i18n (English only)
- Secondary market

---

## Part 1 — Root config files

### File: `.gitignore`

Append these (Next.js scaffold adds most). Open existing `.gitignore`, ensure these lines exist:

```
.env*.local
.env
*.pem
.vscode/
.idea/
.sentryclirc
```

### File: `package.json`

Replace the scaffold version. Versions chosen for Next 16 + React 19 compatibility.

```json
{
  "name": "121ai",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "stripe:listen": "stripe listen --forward-to localhost:3000/api/webhooks/stripe"
  },
  "dependencies": {
    "next": "16.2.4",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@supabase/supabase-js": "2.46.2",
    "@supabase/ssr": "0.5.2",
    "stripe": "17.5.0",
    "resend": "4.0.1",
    "@react-email/components": "0.0.32",
    "@react-email/render": "1.0.3",
    "otplib": "12.0.1",
    "qrcode": "1.5.4",
    "zxcvbn": "4.4.2",
    "@react-pdf/renderer": "4.1.5",
    "react-hook-form": "7.54.2",
    "@hookform/resolvers": "3.9.1",
    "zod": "3.23.8",
    "date-fns": "4.1.0",
    "bcryptjs": "2.4.3",
    "lucide-react": "0.460.0",
    "clsx": "2.1.1",
    "tailwind-merge": "2.5.4",
    "class-variance-authority": "0.7.1",
    "@sentry/nextjs": "10.50.0",
    "@google/generative-ai": "0.21.0",
    "iban": "0.0.14"
  },
  "devDependencies": {
    "typescript": "5.6.3",
    "@types/node": "20.17.6",
    "@types/react": "19.0.0",
    "@types/react-dom": "19.0.0",
    "@types/qrcode": "1.5.5",
    "@types/zxcvbn": "4.4.5",
    "@types/bcryptjs": "2.4.6",
    "tailwindcss": "4.0.0",
    "@tailwindcss/postcss": "4.0.0",
    "postcss": "8.4.49",
    "eslint": "9.15.0",
    "eslint-config-next": "16.2.4"
  }
}
```

After replacing, run: `npm install` (picks up new versions).

### File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### File: `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "xcdoblwozizjjqyayqmd.supabase.co" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
```

### File: `postcss.config.mjs`

```js
const config = {
  plugins: { "@tailwindcss/postcss": {} },
};
export default config;
```

### File: `app/globals.css`

```css
@import "tailwindcss";

:root {
  --bg: #fafafa;
  --fg: #111827;
  --card: #ffffff;
  --border: #e5e7eb;
  --primary: #10b981;
  --primary-fg: #ffffff;
  --muted: #6b7280;
  --error: #ef4444;
  --warning: #f59e0b;
  --success: #22c55e;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #09090b;
    --fg: #fafafa;
    --card: #18181b;
    --border: #27272a;
    --muted: #a1a1aa;
  }
}

html, body {
  background: var(--bg);
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

body {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

input, textarea, select {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.95rem;
  width: 100%;
  outline: none;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
}

input[disabled], textarea[disabled] { opacity: 0.5; cursor: not-allowed; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: 0.5; }
```

### File: `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "121.ai by LendLoop",
  description: "Peer-to-peer lending for the National College of Ireland community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### File: `middleware.ts` (project root)

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## Part 2 — Database (Supabase migrations)

Open Supabase Dashboard → SQL Editor → New query. Paste each file below and click Run, in order.

### File: `supabase/migrations/001_init.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email_domains TEXT[] NOT NULL,
    sponsor_org TEXT,
    welcome_bonus_bps INTEGER DEFAULT 50,
    welcome_bonus_days INTEGER DEFAULT 90,
    max_loan_amount NUMERIC(12,2) DEFAULT 2000,
    min_loan_amount NUMERIC(12,2) DEFAULT 100,
    max_apr_bps INTEGER DEFAULT 1200,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE user_role AS ENUM ('member', 'admin', 'support');
CREATE TYPE user_status AS ENUM (
    'pending_email_verification', 'pending_personal_details', 'pending_2fa',
    'pending_identity', 'pending_address_proof', 'pending_admin_approval',
    'verified', 'suspended', 'deleted'
);
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TABLE users (
    id UUID PRIMARY KEY,
    community_id UUID NOT NULL REFERENCES communities(id),
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    status user_status NOT NULL DEFAULT 'pending_email_verification',
    first_name TEXT, last_name TEXT, date_of_birth DATE, gender gender_type,
    mobile_e164 TEXT, address_line1 TEXT, address_line2 TEXT, city TEXT,
    postal_code TEXT, country TEXT DEFAULT 'IE',
    totp_secret_encrypted TEXT, totp_enabled BOOLEAN DEFAULT FALSE,
    backup_codes_hashed JSONB,
    identity_doc_type TEXT, identity_verified_at TIMESTAMPTZ,
    identity_verification_method TEXT DEFAULT 'manual_admin',
    nci_program TEXT, nci_year INTEGER, is_part_time_employed BOOLEAN DEFAULT FALSE,
    welcome_bonus_active_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT age_18_check CHECK (date_of_birth IS NULL OR date_of_birth <= (CURRENT_DATE - INTERVAL '18 years'))
);
CREATE INDEX idx_users_community ON users(community_id);
CREATE INDEX idx_users_status ON users(status);

CREATE TYPE document_kind AS ENUM ('identity_front','identity_back','selfie','address_proof','student_id','payslip','bank_statement');
CREATE TYPE document_status AS ENUM ('uploaded','under_review','approved','rejected');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id),
    kind document_kind NOT NULL, status document_status DEFAULT 'uploaded',
    storage_path TEXT NOT NULL, original_filename TEXT, mime_type TEXT,
    file_size_bytes INTEGER, reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ, rejection_reason TEXT,
    extracted_data JSONB, extraction_confidence NUMERIC(3,2),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status, kind);

CREATE TABLE aml_screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider TEXT DEFAULT 'simulated', result TEXT NOT NULL,
    pep_match BOOLEAN DEFAULT FALSE, sanctions_match BOOLEAN DEFAULT FALSE,
    adverse_media_match BOOLEAN DEFAULT FALSE, raw_response JSONB,
    screened_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    available_balance_cents BIGINT NOT NULL DEFAULT 0,
    invested_balance_cents BIGINT NOT NULL DEFAULT 0,
    pending_balance_cents BIGINT NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    iban_for_deposit TEXT, deposit_reference TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT non_negative_available CHECK (available_balance_cents >= 0),
    CONSTRAINT non_negative_invested CHECK (invested_balance_cents >= 0)
);
CREATE INDEX idx_wallets_user ON wallets(user_id);

CREATE TYPE ledger_entry_type AS ENUM (
    'deposit_pending','deposit_cleared','investment_committed','investment_disbursed',
    'repayment_principal','repayment_interest','repayment_late_fee','platform_fee',
    'welcome_bonus','withdrawal_initiated','withdrawal_completed','manual_adjustment'
);

CREATE TABLE ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id), user_id UUID REFERENCES users(id),
    entry_type ledger_entry_type NOT NULL,
    amount_cents BIGINT NOT NULL, balance_after_cents BIGINT NOT NULL,
    related_loan_id UUID, related_repayment_id UUID, related_stripe_id TEXT,
    description TEXT, created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id)
);
CREATE INDEX idx_ledger_wallet ON ledger(wallet_id, created_at DESC);
CREATE INDEX idx_ledger_user ON ledger(user_id, created_at DESC);

CREATE TABLE borrower_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    monthly_income_cents BIGINT, monthly_expenses_cents BIGINT,
    existing_debt_cents BIGINT DEFAULT 0,
    employment_status TEXT, employment_months INTEGER,
    has_emergency_fund BOOLEAN, verified_income_cents BIGINT,
    income_verification_method TEXT, nci_semesters_completed INTEGER,
    has_irp BOOLEAN DEFAULT FALSE, irp_expiry_date DATE,
    submitted_at TIMESTAMPTZ DEFAULT now(), last_updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credit_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
    identity_score INTEGER NOT NULL, income_score INTEGER NOT NULL,
    stability_score INTEGER NOT NULL, financial_score INTEGER NOT NULL,
    reputation_score INTEGER NOT NULL, breakdown JSONB NOT NULL,
    llm_narrative TEXT, algorithm_version TEXT NOT NULL DEFAULT 'v1.0',
    computed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_scores_recent ON credit_scores(user_id, computed_at DESC);

CREATE TYPE loan_purpose AS ENUM ('tuition_topup','laptop_equipment','emergency','living_expenses','travel_home','other');
CREATE TYPE loan_request_status AS ENUM ('draft','open','partially_funded','fully_funded','expired','cancelled','converted');

CREATE TABLE loan_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrower_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    amount_cents BIGINT NOT NULL,
    purpose loan_purpose NOT NULL, purpose_description TEXT,
    requested_term_months INTEGER NOT NULL CHECK (requested_term_months BETWEEN 1 AND 12),
    max_apr_bps INTEGER NOT NULL,
    status loan_request_status DEFAULT 'draft',
    funded_amount_cents BIGINT DEFAULT 0,
    score_at_request INTEGER, score_breakdown_at_request JSONB,
    posted_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT amount_in_range CHECK (amount_cents BETWEEN 10000 AND 200000)
);
CREATE INDEX idx_requests_open ON loan_requests(community_id, status) WHERE status IN ('open','partially_funded');

CREATE TYPE offer_status AS ENUM ('pending','accepted','rejected','withdrawn','expired');

CREATE TABLE loan_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES loan_requests(id),
    lender_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    amount_cents BIGINT NOT NULL, apr_bps INTEGER NOT NULL,
    term_months INTEGER NOT NULL, status offer_status DEFAULT 'pending',
    message_to_borrower TEXT,
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT now(), decided_at TIMESTAMPTZ
);
CREATE INDEX idx_offers_request ON loan_offers(request_id);
CREATE INDEX idx_offers_lender ON loan_offers(lender_id);

CREATE TYPE loan_status AS ENUM ('pending_signature','pending_disbursement','active','in_grace','in_default','paid_off','written_off');

CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES loan_requests(id),
    offer_id UUID NOT NULL REFERENCES loan_offers(id),
    borrower_id UUID NOT NULL REFERENCES users(id),
    lender_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    principal_cents BIGINT NOT NULL, apr_bps INTEGER NOT NULL,
    term_months INTEGER NOT NULL, monthly_payment_cents BIGINT NOT NULL,
    total_interest_cents BIGINT NOT NULL, platform_fee_bps INTEGER DEFAULT 1500,
    status loan_status DEFAULT 'pending_signature',
    disbursed_at TIMESTAMPTZ, first_payment_due_at DATE, paid_off_at TIMESTAMPTZ,
    agreement_pdf_path TEXT, audit_trail_pdf_path TEXT,
    borrower_signed_at TIMESTAMPTZ, lender_signed_at TIMESTAMPTZ,
    borrower_signature_ip TEXT, lender_signature_ip TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_loans_borrower ON loans(borrower_id);
CREATE INDEX idx_loans_lender ON loans(lender_id);
CREATE INDEX idx_loans_status ON loans(community_id, status);

CREATE TYPE repayment_status AS ENUM ('scheduled','paid','late','missed','partial');

CREATE TABLE repayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id),
    sequence_number INTEGER NOT NULL,
    due_date DATE NOT NULL, principal_cents BIGINT NOT NULL,
    interest_cents BIGINT NOT NULL, platform_fee_cents BIGINT NOT NULL,
    total_due_cents BIGINT NOT NULL, paid_amount_cents BIGINT DEFAULT 0,
    paid_at TIMESTAMPTZ, status repayment_status DEFAULT 'scheduled',
    late_fee_cents BIGINT DEFAULT 0, days_late INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (loan_id, sequence_number)
);
CREATE INDEX idx_repayments_loan ON repayments(loan_id, sequence_number);
CREATE INDEX idx_repayments_due ON repayments(due_date) WHERE status IN ('scheduled','late');

CREATE TABLE auto_invest_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lender_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    name TEXT NOT NULL, is_active BOOLEAN DEFAULT TRUE,
    min_score INTEGER DEFAULT 60,
    min_apr_bps INTEGER, max_apr_bps INTEGER,
    min_term_months INTEGER, max_term_months INTEGER,
    allowed_purposes loan_purpose[],
    investment_per_loan_cents BIGINT NOT NULL,
    max_total_invested_cents BIGINT,
    diversification_max_per_borrower INTEGER DEFAULT 1,
    portfolio_size_target_cents BIGINT,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE notification_type AS ENUM (
    'kyc_approved','kyc_rejected','deposit_received',
    'offer_received','offer_accepted','offer_rejected','loan_disbursed',
    'repayment_due_3d','repayment_due_today','repayment_late','repayment_received',
    'loan_paid_off','login_new_device','system_announcement'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    type notification_type NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
    link_url TEXT, is_read BOOLEAN DEFAULT FALSE,
    sent_via_email BOOLEAN DEFAULT FALSE, email_sent_at TIMESTAMPTZ,
    metadata JSONB, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    consent_type TEXT NOT NULL, version TEXT NOT NULL,
    granted BOOLEAN NOT NULL, granted_at TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT, user_agent TEXT
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES users(id),
    actor_ip TEXT, actor_user_agent TEXT,
    action_type TEXT NOT NULL,
    resource_type TEXT, resource_id UUID,
    before_state JSONB, after_state JSONB, metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_audit_actor ON audit_log(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id, created_at DESC);

CREATE TABLE webhooks_inbound (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL, event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL, payload JSONB NOT NULL,
    signature_valid BOOLEAN NOT NULL, processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT, received_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE idempotency_keys (
    key TEXT PRIMARY KEY, user_id UUID REFERENCES users(id),
    response JSONB NOT NULL, status_code INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE TABLE email_verification_codes (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE step_up_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL, verified_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stepup_user ON step_up_verifications(user_id, verified_at DESC);

-- Triggers
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_strategies_updated BEFORE UPDATE ON auto_invest_strategies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION create_wallet_for_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, community_id, deposit_reference, iban_for_deposit)
    VALUES (
        NEW.id, NEW.community_id,
        'LL-' || SUBSTRING(REPLACE(NEW.id::TEXT,'-','') FOR 8) || '-' || SUBSTRING(MD5(random()::TEXT) FOR 4),
        'IE12REVO99036012345678'
    );
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_wallet AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION create_wallet_for_user();

INSERT INTO communities (slug, name, email_domains, sponsor_org)
VALUES ('nci', 'National College of Ireland', ARRAY['student.ncirl.ie','ncirl.ie'], 'NCI');
```

### File: `supabase/migrations/002_rls.sql`

```sql
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
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth.community_id() RETURNS UUID AS $$
    SELECT community_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
    SELECT COALESCE((SELECT role = 'admin' FROM users WHERE id = auth.uid()), FALSE)
$$ LANGUAGE SQL STABLE;

CREATE POLICY users_select ON users FOR SELECT
    USING (id = auth.uid() OR community_id = auth.community_id() OR auth.is_admin());

CREATE POLICY users_update_self ON users FOR UPDATE
    USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = 'member');

CREATE POLICY wallets_select ON wallets FOR SELECT
    USING (user_id = auth.uid() OR (auth.is_admin() AND community_id = auth.community_id()));

CREATE POLICY ledger_select ON ledger FOR SELECT
    USING (user_id = auth.uid() OR (auth.is_admin() AND EXISTS (
        SELECT 1 FROM users u WHERE u.id = ledger.user_id AND u.community_id = auth.community_id()
    )));

CREATE POLICY requests_select ON loan_requests FOR SELECT
    USING (community_id = auth.community_id() AND
        (status IN ('open','partially_funded') OR borrower_id = auth.uid() OR auth.is_admin()));

CREATE POLICY requests_insert ON loan_requests FOR INSERT
    WITH CHECK (borrower_id = auth.uid() AND community_id = auth.community_id());

CREATE POLICY requests_update_own ON loan_requests FOR UPDATE
    USING (borrower_id = auth.uid() AND status IN ('draft','open'));

CREATE POLICY offers_select ON loan_offers FOR SELECT
    USING (lender_id = auth.uid() OR EXISTS (
        SELECT 1 FROM loan_requests r WHERE r.id = loan_offers.request_id AND r.borrower_id = auth.uid()
    ) OR auth.is_admin());

CREATE POLICY offers_insert ON loan_offers FOR INSERT
    WITH CHECK (lender_id = auth.uid() AND community_id = auth.community_id());

CREATE POLICY loans_select ON loans FOR SELECT
    USING (borrower_id = auth.uid() OR lender_id = auth.uid() OR auth.is_admin());

CREATE POLICY documents_select ON documents FOR SELECT
    USING (user_id = auth.uid() OR auth.is_admin());

CREATE POLICY documents_insert ON documents FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_select ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON notifications FOR UPDATE
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY assessments_select ON borrower_assessments FOR SELECT
    USING (user_id = auth.uid() OR auth.is_admin());
CREATE POLICY assessments_insert ON borrower_assessments FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY scores_select ON credit_scores FOR SELECT
    USING (user_id = auth.uid() OR community_id = auth.community_id() OR auth.is_admin());

CREATE POLICY repayments_select ON repayments FOR SELECT
    USING (EXISTS (SELECT 1 FROM loans l WHERE l.id = repayments.loan_id
        AND (l.borrower_id = auth.uid() OR l.lender_id = auth.uid())) OR auth.is_admin());

CREATE POLICY strategies_all ON auto_invest_strategies FOR ALL
    USING (lender_id = auth.uid() OR auth.is_admin())
    WITH CHECK (lender_id = auth.uid());

CREATE POLICY aml_select ON aml_screenings FOR SELECT
    USING (user_id = auth.uid() OR auth.is_admin());

CREATE POLICY audit_select_admin ON audit_log FOR SELECT USING (auth.is_admin());

CREATE POLICY consent_select_self ON consent_records FOR SELECT
    USING (user_id = auth.uid() OR auth.is_admin());

INSERT INTO storage.buckets (id, name, public) VALUES ('documents','documents',false)
ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements','agreements',false)
ON CONFLICT DO NOTHING;

CREATE POLICY documents_storage_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY documents_storage_select ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'documents' AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (SELECT role = 'admin' FROM users WHERE id = auth.uid())
    ));

CREATE POLICY agreements_storage_select ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'agreements' AND (
        EXISTS (SELECT 1 FROM loans WHERE loans.id::text = (storage.foldername(name))[1]
            AND (loans.borrower_id = auth.uid() OR loans.lender_id = auth.uid()))
        OR (SELECT role = 'admin' FROM users WHERE id = auth.uid())
    ));
```

### File: `supabase/migrations/003_wallet_functions.sql`

```sql
CREATE OR REPLACE FUNCTION credit_wallet_atomic(
    p_user_id UUID, p_amount_cents BIGINT, p_entry_type ledger_entry_type,
    p_related_loan_id UUID DEFAULT NULL, p_related_stripe_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE v_wallet_id UUID; v_new_balance BIGINT;
BEGIN
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'Wallet not found for user %', p_user_id; END IF;

    UPDATE wallets SET available_balance_cents = available_balance_cents + p_amount_cents,
        updated_at = now() WHERE id = v_wallet_id
    RETURNING available_balance_cents INTO v_new_balance;

    INSERT INTO ledger (wallet_id, user_id, entry_type, amount_cents, balance_after_cents,
        related_loan_id, related_stripe_id, description)
    VALUES (v_wallet_id, p_user_id, p_entry_type, p_amount_cents, v_new_balance,
        p_related_loan_id, p_related_stripe_id, p_description);

    RETURN v_new_balance;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION debit_wallet_atomic(
    p_user_id UUID, p_amount_cents BIGINT, p_entry_type ledger_entry_type,
    p_related_loan_id UUID DEFAULT NULL, p_description TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE v_wallet_id UUID; v_current BIGINT; v_new_balance BIGINT;
BEGIN
    SELECT id, available_balance_cents INTO v_wallet_id, v_current
        FROM wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_current < p_amount_cents THEN
        RAISE EXCEPTION 'insufficient_balance: have %, need %', v_current, p_amount_cents;
    END IF;

    UPDATE wallets SET available_balance_cents = available_balance_cents - p_amount_cents,
        updated_at = now() WHERE id = v_wallet_id
    RETURNING available_balance_cents INTO v_new_balance;

    INSERT INTO ledger (wallet_id, user_id, entry_type, amount_cents, balance_after_cents,
        related_loan_id, description)
    VALUES (v_wallet_id, p_user_id, p_entry_type, -p_amount_cents, v_new_balance,
        p_related_loan_id, p_description);

    RETURN v_new_balance;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION transfer_wallet_atomic(
    p_from_user_id UUID, p_to_user_id UUID, p_amount_cents BIGINT,
    p_entry_type_from ledger_entry_type, p_entry_type_to ledger_entry_type,
    p_related_loan_id UUID DEFAULT NULL, p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    PERFORM debit_wallet_atomic(p_from_user_id, p_amount_cents, p_entry_type_from, p_related_loan_id, p_description);
    PERFORM credit_wallet_atomic(p_to_user_id, p_amount_cents, p_entry_type_to, p_related_loan_id, NULL, p_description);
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_due_repayments() RETURNS INTEGER AS $$
DECLARE v_repayment RECORD; v_processed INTEGER := 0;
BEGIN
    FOR v_repayment IN
        SELECT r.*, l.borrower_id, l.lender_id, l.community_id
        FROM repayments r JOIN loans l ON l.id = r.loan_id
        WHERE r.status = 'scheduled' AND r.due_date <= CURRENT_DATE AND l.status = 'active'
    LOOP
        BEGIN
            PERFORM debit_wallet_atomic(v_repayment.borrower_id, v_repayment.total_due_cents,
                'repayment_principal', v_repayment.loan_id,
                'Loan repayment instalment ' || v_repayment.sequence_number);

            PERFORM credit_wallet_atomic(v_repayment.lender_id,
                v_repayment.total_due_cents - v_repayment.platform_fee_cents,
                'repayment_interest', v_repayment.loan_id, NULL,
                'Repayment instalment ' || v_repayment.sequence_number);

            INSERT INTO ledger (wallet_id, user_id, entry_type, amount_cents, balance_after_cents,
                related_loan_id, description)
            VALUES (NULL, NULL, 'platform_fee', v_repayment.platform_fee_cents, 0,
                v_repayment.loan_id, '15% fee on instalment ' || v_repayment.sequence_number);

            UPDATE repayments SET status='paid', paid_amount_cents=total_due_cents, paid_at=now()
            WHERE id = v_repayment.id;

            v_processed := v_processed + 1;

            IF NOT EXISTS (SELECT 1 FROM repayments WHERE loan_id = v_repayment.loan_id AND status='scheduled') THEN
                UPDATE loans SET status='paid_off', paid_off_at=now() WHERE id = v_repayment.loan_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            UPDATE repayments SET status='late', days_late=(CURRENT_DATE - due_date)
            WHERE id = v_repayment.id;
        END;
    END LOOP;
    RETURN v_processed;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_late_repayments() RETURNS VOID AS $$
BEGIN
    UPDATE repayments SET late_fee_cents=500, days_late=(CURRENT_DATE - due_date), status='late'
    WHERE status IN ('scheduled','late') AND due_date < CURRENT_DATE - INTERVAL '3 days' AND late_fee_cents=0;

    UPDATE loans SET status='in_default'
    WHERE id IN (SELECT DISTINCT loan_id FROM repayments WHERE status='late' AND days_late >= 14);
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_invest_run() RETURNS INTEGER AS $$
DECLARE v_strategy RECORD; v_request RECORD; v_lender_balance BIGINT; v_offer_count INTEGER := 0;
BEGIN
    FOR v_strategy IN SELECT * FROM auto_invest_strategies WHERE is_active = TRUE LOOP
        SELECT available_balance_cents INTO v_lender_balance FROM wallets WHERE user_id = v_strategy.lender_id;
        IF v_lender_balance < v_strategy.investment_per_loan_cents THEN CONTINUE; END IF;

        FOR v_request IN
            SELECT lr.*, cs.total_score
            FROM loan_requests lr
            JOIN credit_scores cs ON cs.user_id = lr.borrower_id
            WHERE lr.status IN ('open','partially_funded')
              AND lr.community_id = v_strategy.community_id
              AND cs.total_score >= v_strategy.min_score
              AND lr.max_apr_bps >= COALESCE(v_strategy.min_apr_bps, 0)
              AND lr.max_apr_bps <= COALESCE(v_strategy.max_apr_bps, 9999)
              AND lr.requested_term_months BETWEEN COALESCE(v_strategy.min_term_months,1) AND COALESCE(v_strategy.max_term_months,12)
              AND (v_strategy.allowed_purposes IS NULL OR lr.purpose = ANY(v_strategy.allowed_purposes))
              AND NOT EXISTS (SELECT 1 FROM loan_offers lo WHERE lo.request_id = lr.id AND lo.lender_id = v_strategy.lender_id)
              AND cs.computed_at = (SELECT MAX(computed_at) FROM credit_scores WHERE user_id = lr.borrower_id)
            LIMIT 5
        LOOP
            INSERT INTO loan_offers (request_id, lender_id, community_id, amount_cents, apr_bps,
                term_months, status, message_to_borrower)
            VALUES (v_request.id, v_strategy.lender_id, v_strategy.community_id,
                LEAST(v_strategy.investment_per_loan_cents, v_request.amount_cents - v_request.funded_amount_cents),
                v_request.max_apr_bps, v_request.requested_term_months, 'pending',
                'Auto-Invest: ' || v_strategy.name);

            v_offer_count := v_offer_count + 1;
            v_lender_balance := v_lender_balance - v_strategy.investment_per_loan_cents;
            EXIT WHEN v_lender_balance < v_strategy.investment_per_loan_cents;
        END LOOP;

        UPDATE auto_invest_strategies SET last_run_at = now() WHERE id = v_strategy.id;
    END LOOP;
    RETURN v_offer_count;
END $$ LANGUAGE plpgsql;

-- DEMO ONLY
CREATE OR REPLACE FUNCTION time_warp_loan(p_loan_id UUID, p_months INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE repayments SET due_date = due_date - (p_months || ' months')::INTERVAL
    WHERE loan_id = p_loan_id AND status = 'scheduled';
END $$ LANGUAGE plpgsql;
```

### File: `supabase/migrations/004_seed_demo.sql`

**Manual prep first:** In Supabase Dashboard → Authentication → Users → "Add user", create three accounts with email + password (password: `Demo2026!` for all):

- `x24269522@student.ncirl.ie` (Smruti)
- `x24197432@student.ncirl.ie` (Umer)
- `admin@ncirl.ie` (you — or use your real NCI email)

After creating, copy the UUID for each (visible in the same Users page) and replace the three placeholder UUIDs below before running.

```sql
-- REPLACE these three UUIDs with the auth.users IDs from the Authentication panel:
DO $$
DECLARE
    v_community UUID;
    v_smruti UUID := '00000000-0000-0000-0000-000000000001'; -- REPLACE
    v_umer   UUID := '00000000-0000-0000-0000-000000000002'; -- REPLACE
    v_admin  UUID := '00000000-0000-0000-0000-000000000003'; -- REPLACE
BEGIN
    SELECT id INTO v_community FROM communities WHERE slug = 'nci';

    INSERT INTO users (id, community_id, email, role, status, first_name, last_name,
        date_of_birth, country, totp_enabled, identity_verified_at)
    VALUES (v_admin, v_community, 'admin@ncirl.ie', 'admin', 'verified',
        'Admin', 'User', '1990-01-01', 'IE', TRUE, now())
    ON CONFLICT (id) DO UPDATE SET role='admin', status='verified';

    INSERT INTO users (id, community_id, email, role, status, first_name, last_name, date_of_birth,
        gender, mobile_e164, address_line1, city, postal_code, country, totp_enabled,
        identity_verified_at, identity_verification_method, nci_program, nci_year,
        is_part_time_employed, welcome_bonus_active_until)
    VALUES (v_smruti, v_community, 'x24269522@student.ncirl.ie', 'member', 'verified',
        'Smruti', 'Patil', '2000-03-15', 'female', '+353871234001',
        '14 Mayor Street Lower', 'Dublin', 'D01 F5P2', 'IE', TRUE,
        now(), 'manual_admin', 'MSc Data Analytics', 1, TRUE, now() + INTERVAL '90 days')
    ON CONFLICT (id) DO UPDATE SET status='verified';

    INSERT INTO users (id, community_id, email, role, status, first_name, last_name, date_of_birth,
        gender, mobile_e164, address_line1, city, postal_code, country, totp_enabled,
        identity_verified_at, identity_verification_method, nci_program, nci_year,
        is_part_time_employed, welcome_bonus_active_until)
    VALUES (v_umer, v_community, 'x24197432@student.ncirl.ie', 'member', 'verified',
        'Umer', 'Khan', '1999-08-22', 'male', '+353871234002',
        '7 Pearse Street', 'Dublin', 'D02 RX01', 'IE', TRUE,
        now(), 'manual_admin', 'MSc Cloud Computing', 1, TRUE, now() + INTERVAL '90 days')
    ON CONFLICT (id) DO UPDATE SET status='verified';

    -- Pre-fund Smruti
    PERFORM credit_wallet_atomic(v_smruti, 50000, 'deposit_cleared', NULL, NULL, 'Pre-demo deposit');

    INSERT INTO borrower_assessments (user_id, community_id, monthly_income_cents,
        monthly_expenses_cents, existing_debt_cents, employment_status, employment_months,
        has_emergency_fund, verified_income_cents, income_verification_method,
        nci_semesters_completed, has_irp, irp_expiry_date)
    VALUES (v_umer, v_community, 120000, 75000, 0, 'part_time', 4, FALSE,
        120000, 'payslip_admin', 1, TRUE, '2027-09-30');

    INSERT INTO credit_scores (user_id, community_id, total_score,
        identity_score, income_score, stability_score, financial_score, reputation_score,
        breakdown, algorithm_version)
    VALUES (v_umer, v_community, 72, 18, 17, 8, 19, 10,
        '{"identity_verified":{"points":8,"max":8,"reason":"Identity documents approved"}}'::jsonb,
        'v1.0');
END $$;
```

---

## Part 3 — Library code

### File: `lib/db/client.ts`

```ts
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSb } from "@supabase/supabase-js";

export function createBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function createServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export function createService() {
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

### File: `lib/auth/middleware.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const publicPaths = ["/", "/login", "/register", "/verify-email", "/forgot-password",
    "/how-it-works", "/help", "/risk-warning", "/privacy-policy", "/terms"];
  const isPublic = publicPaths.some(p => path === p || path.startsWith(p + "/"));
  const isApi = path.startsWith("/api/");

  if (!user && !isPublic && !isApi) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}
```

### File: `lib/auth/domain-allowlist.ts`

```ts
const NCI_DOMAINS = (process.env.NCI_EMAIL_DOMAINS || "student.ncirl.ie,ncirl.ie")
  .split(",").map(d => d.trim().toLowerCase());

export function isNciEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && NCI_DOMAINS.includes(domain);
}

export function getAllowedDomains(): string[] {
  return [...NCI_DOMAINS];
}
```

### File: `lib/auth/session.ts`

```ts
import { createServer, createService } from "@/lib/db/client";
import { redirect } from "next/navigation";

export async function requireUser() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireUserProfile() {
  const user = await requireUser();
  const supabase = await createServer();
  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  return { user, profile };
}

export async function requireVerified() {
  const { user, profile } = await requireUserProfile();
  if (profile.status !== "verified") redirect("/onboarding/complete");
  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await requireUserProfile();
  if (profile.role !== "admin") redirect("/dashboard");
  return { user, profile };
}
```

### File: `lib/auth/totp.ts`

```ts
import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET || "fallback-dev-key-change-me-1234567890123";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptSecret(encrypted: string): string {
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export async function setupTotp(email: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, "121.ai by LendLoop", secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase().match(/.{1,4}/g)!.join("-")
  );
  return { secret, qrDataUrl, backupCodes };
}

export function verifyTotp(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}
```

### File: `lib/audit/log.ts`

```ts
import { headers } from "next/headers";
import { createService } from "@/lib/db/client";

export async function writeAuditLog(input: {
  actor_user_id?: string;
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  before_state?: any;
  after_state?: any;
  metadata?: any;
}) {
  const svc = createService();
  const h = await headers();
  await svc.from("audit_log").insert({
    ...input,
    actor_ip: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null,
    actor_user_agent: h.get("user-agent") ?? null,
  });
}
```

### File: `lib/finance/wallet.ts`

```ts
import { createService } from "@/lib/db/client";

type LedgerType =
  | "deposit_pending" | "deposit_cleared"
  | "investment_committed" | "investment_disbursed"
  | "repayment_principal" | "repayment_interest" | "repayment_late_fee"
  | "platform_fee" | "welcome_bonus"
  | "withdrawal_initiated" | "withdrawal_completed"
  | "manual_adjustment";

export async function creditWallet(p: {
  userId: string; amountCents: number; entryType: LedgerType;
  relatedLoanId?: string; relatedStripeId?: string; description?: string;
}) {
  const svc = createService();
  const { data, error } = await svc.rpc("credit_wallet_atomic", {
    p_user_id: p.userId, p_amount_cents: p.amountCents, p_entry_type: p.entryType,
    p_related_loan_id: p.relatedLoanId ?? null,
    p_related_stripe_id: p.relatedStripeId ?? null,
    p_description: p.description ?? null,
  });
  if (error) throw error;
  return data as number;
}

export async function debitWallet(p: {
  userId: string; amountCents: number; entryType: LedgerType;
  relatedLoanId?: string; description?: string;
}) {
  const svc = createService();
  const { data, error } = await svc.rpc("debit_wallet_atomic", {
    p_user_id: p.userId, p_amount_cents: p.amountCents, p_entry_type: p.entryType,
    p_related_loan_id: p.relatedLoanId ?? null,
    p_description: p.description ?? null,
  });
  if (error) {
    if (error.message?.includes("insufficient_balance")) throw new Error("Insufficient balance");
    throw error;
  }
  return data as number;
}

export async function transferWallet(p: {
  fromUserId: string; toUserId: string; amountCents: number;
  entryTypeFrom: LedgerType; entryTypeTo: LedgerType;
  relatedLoanId?: string; description?: string;
}) {
  const svc = createService();
  const { error } = await svc.rpc("transfer_wallet_atomic", {
    p_from_user_id: p.fromUserId, p_to_user_id: p.toUserId,
    p_amount_cents: p.amountCents,
    p_entry_type_from: p.entryTypeFrom, p_entry_type_to: p.entryTypeTo,
    p_related_loan_id: p.relatedLoanId ?? null,
    p_description: p.description ?? null,
  });
  if (error) throw error;
}

export async function getWallet(userId: string) {
  const svc = createService();
  const { data, error } = await svc.from("wallets").select("*").eq("user_id", userId).single();
  if (error) throw error;
  return data;
}
```

### File: `lib/finance/amortization.ts`

```ts
import { addMonths } from "date-fns";

export function buildSchedule(p: {
  principalCents: number; aprBps: number; termMonths: number; startDate: Date;
}) {
  const monthlyRate = p.aprBps / 10000 / 12;
  const n = p.termMonths;
  const P = p.principalCents;
  const monthlyPayment = monthlyRate === 0
    ? Math.round(P / n)
    : Math.round((P * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n)));

  const rows = [];
  let outstanding = P;
  for (let i = 1; i <= n; i++) {
    const interest = Math.round(outstanding * monthlyRate);
    let principal = monthlyPayment - interest;
    if (i === n) principal = outstanding;
    const platformFee = Math.round(interest * 0.15);
    rows.push({
      sequence_number: i,
      due_date: addMonths(p.startDate, i),
      principal_cents: principal,
      interest_cents: interest,
      platform_fee_cents: platformFee,
      total_due_cents: principal + interest,
    });
    outstanding -= principal;
  }
  return rows;
}

export function calcMonthlyPayment(principalCents: number, aprBps: number, termMonths: number): number {
  const r = aprBps / 10000 / 12;
  if (r === 0) return Math.round(principalCents / termMonths);
  return Math.round((principalCents * r) / (1 - Math.pow(1 + r, -termMonths)));
}

export function calcTotalInterest(principalCents: number, aprBps: number, termMonths: number): number {
  return calcMonthlyPayment(principalCents, aprBps, termMonths) * termMonths - principalCents;
}
```

### File: `lib/scoring/score.ts`

```ts
export interface ScoreInputs {
  identity_verified: boolean;
  has_irp_or_eu_passport: boolean;
  email_verified: boolean;
  has_2fa: boolean;
  has_student_id: boolean;
  declared_monthly_income_cents: number;
  income_verified: boolean;
  income_verification_age_days: number;
  employment_status: "part_time" | "full_time" | "student_only";
  nci_semesters_completed: number;
  account_age_days: number;
  has_emergency_fund: boolean;
  declared_monthly_expenses_cents: number;
  existing_debt_cents: number;
  total_loans_completed: number;
  total_loans_active: number;
  on_time_payment_count: number;
  late_payment_count: number;
  defaulted_loan_count: number;
}

export interface ScoreOutput {
  total: number;
  components: { identity: number; income: number; stability: number; financial: number; reputation: number };
  breakdown: Record<string, { points: number; max: number; reason: string }>;
  algorithm_version: "v1.0";
}

export function computeScore(i: ScoreInputs): ScoreOutput {
  const breakdown: ScoreOutput["breakdown"] = {};

  let id = 0;
  if (i.identity_verified) { id += 8; breakdown.identity_verified = { points: 8, max: 8, reason: "Identity documents approved" }; }
  else breakdown.identity_verified = { points: 0, max: 8, reason: "Identity not yet verified" };
  if (i.has_irp_or_eu_passport) { id += 4; breakdown.legal_status = { points: 4, max: 4, reason: "Valid IRP or EU passport" }; }
  else breakdown.legal_status = { points: 0, max: 4, reason: "Legal residency not confirmed" };
  if (i.email_verified) { id += 2; breakdown.email = { points: 2, max: 2, reason: "NCI email verified" }; }
  if (i.has_2fa) { id += 2; breakdown.two_fa = { points: 2, max: 2, reason: "2FA enabled" }; }
  if (i.has_student_id) { id += 4; breakdown.student_id = { points: 4, max: 4, reason: "Active NCI student ID" }; }

  let inc = 0;
  const m = i.declared_monthly_income_cents / 100;
  if (m >= 1500) { inc += 10; breakdown.income_amount = { points: 10, max: 10, reason: `Monthly income €${m} ≥ €1500` }; }
  else if (m >= 800) { inc += 7; breakdown.income_amount = { points: 7, max: 10, reason: `Monthly income €${m}` }; }
  else if (m >= 400) { inc += 4; breakdown.income_amount = { points: 4, max: 10, reason: `Monthly income €${m}` }; }
  else breakdown.income_amount = { points: 0, max: 10, reason: "Income below €400" };

  if (i.income_verified) {
    if (i.income_verification_age_days <= 60) { inc += 10; breakdown.income_verified = { points: 10, max: 10, reason: "Verified, fresh payslip" }; }
    else if (i.income_verification_age_days <= 180) { inc += 5; breakdown.income_verified = { points: 5, max: 10, reason: "Verified, payslip 60-180d old" }; }
    else { inc += 2; breakdown.income_verified = { points: 2, max: 10, reason: "Verification stale" }; }
  } else breakdown.income_verified = { points: 0, max: 10, reason: "Income not verified" };

  if (i.employment_status === "full_time") { inc += 5; breakdown.employment = { points: 5, max: 5, reason: "Full-time" }; }
  else if (i.employment_status === "part_time") { inc += 3; breakdown.employment = { points: 3, max: 5, reason: "Part-time" }; }
  else breakdown.employment = { points: 0, max: 5, reason: "Student only" };

  let stab = 0;
  if (i.nci_semesters_completed >= 3) { stab += 6; breakdown.nci_tenure = { points: 6, max: 6, reason: `${i.nci_semesters_completed} semesters` }; }
  else if (i.nci_semesters_completed >= 1) { stab += 3; breakdown.nci_tenure = { points: 3, max: 6, reason: `${i.nci_semesters_completed} semester(s)` }; }
  else breakdown.nci_tenure = { points: 0, max: 6, reason: "No semesters" };

  if (i.account_age_days >= 90) { stab += 4; breakdown.account_age = { points: 4, max: 4, reason: `${i.account_age_days}d old` }; }
  else if (i.account_age_days >= 30) { stab += 2; breakdown.account_age = { points: 2, max: 4, reason: `${i.account_age_days}d old` }; }
  else breakdown.account_age = { points: 0, max: 4, reason: "New account" };

  if (i.has_emergency_fund) { stab += 5; breakdown.emergency_fund = { points: 5, max: 5, reason: "Emergency fund declared" }; }
  else breakdown.emergency_fund = { points: 0, max: 5, reason: "No emergency fund" };

  let fin = 0;
  const surplus = i.declared_monthly_income_cents - i.declared_monthly_expenses_cents;
  const ratio = i.declared_monthly_income_cents > 0 ? surplus / i.declared_monthly_income_cents : 0;
  if (ratio >= 0.30) { fin += 12; breakdown.surplus = { points: 12, max: 12, reason: `Surplus ratio ${(ratio * 100).toFixed(0)}%` }; }
  else if (ratio >= 0.15) { fin += 8; breakdown.surplus = { points: 8, max: 12, reason: `Surplus ratio ${(ratio * 100).toFixed(0)}%` }; }
  else if (ratio >= 0.05) { fin += 4; breakdown.surplus = { points: 4, max: 12, reason: `Surplus ratio ${(ratio * 100).toFixed(0)}%` }; }
  else breakdown.surplus = { points: 0, max: 12, reason: "No / negative surplus" };

  const dti = i.declared_monthly_income_cents > 0 ? i.existing_debt_cents / i.declared_monthly_income_cents : 99;
  if (dti === 0) { fin += 8; breakdown.debt = { points: 8, max: 8, reason: "No existing debt" }; }
  else if (dti <= 3) { fin += 6; breakdown.debt = { points: 6, max: 8, reason: `Debt ${dti.toFixed(1)} months income` }; }
  else if (dti <= 6) { fin += 3; breakdown.debt = { points: 3, max: 8, reason: `Debt ${dti.toFixed(1)} months income` }; }
  else breakdown.debt = { points: 0, max: 8, reason: "Excessive debt" };

  let rep = 0;
  if (i.defaulted_loan_count > 0) {
    rep = 0;
    breakdown.reputation = { points: 0, max: 20, reason: `${i.defaulted_loan_count} defaulted loan(s)` };
  } else if (i.total_loans_completed === 0) {
    rep = 10;
    breakdown.reputation = { points: 10, max: 20, reason: "No prior loans (neutral)" };
  } else {
    const total = i.on_time_payment_count + i.late_payment_count;
    const onTime = total > 0 ? i.on_time_payment_count / total : 1;
    if (onTime >= 0.95) { rep = 20; breakdown.reputation = { points: 20, max: 20, reason: `${i.total_loans_completed} loans, ${(onTime * 100).toFixed(0)}% on-time` }; }
    else if (onTime >= 0.80) { rep = 14; breakdown.reputation = { points: 14, max: 20, reason: `${i.total_loans_completed} loans, ${(onTime * 100).toFixed(0)}% on-time` }; }
    else { rep = 6; breakdown.reputation = { points: 6, max: 20, reason: `${i.total_loans_completed} loans, ${(onTime * 100).toFixed(0)}% on-time` }; }
  }

  return {
    total: id + inc + stab + fin + rep,
    components: { identity: id, income: inc, stability: stab, financial: fin, reputation: rep },
    breakdown,
    algorithm_version: "v1.0",
  };
}
```

### File: `lib/email/client.ts`

```ts
import { Resend } from "resend";
import { render } from "@react-email/render";
import * as React from "react";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail(opts: {
  to: string;
  subject: string;
  template: React.ReactElement;
}) {
  const html = await render(opts.template);
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: opts.to,
    subject: opts.subject,
    html,
  });
}
```

### File: `lib/notifications/send.ts`

```ts
import { createService } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/client";
import * as React from "react";
import { GenericEmail } from "@/emails/generic";

export async function sendNotification(
  userId: string,
  type: string,
  payload: { title: string; body: string; link_url?: string; metadata?: any }
) {
  const svc = createService();
  const { data: profile } = await svc.from("users")
    .select("email,first_name,community_id").eq("id", userId).single();
  if (!profile) return;

  await svc.from("notifications").insert({
    user_id: userId,
    community_id: profile.community_id,
    type, title: payload.title, body: payload.body,
    link_url: payload.link_url, metadata: payload.metadata,
  });

  try {
    await sendEmail({
      to: profile.email,
      subject: payload.title,
      template: React.createElement(GenericEmail, {
        firstName: profile.first_name || "there",
        title: payload.title,
        body: payload.body,
        linkUrl: payload.link_url ? `${process.env.NEXT_PUBLIC_APP_URL}${payload.link_url}` : undefined,
      }),
    });
  } catch (e) {
    console.error("Email send failed:", e);
  }
}
```

### File: `lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEur(cents: number): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatBps(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-IE", { year: "numeric", month: "short", day: "numeric" });
}

export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? "unknown";
}
```

(continued in next file part)

---

## Part 4 — Email templates

### File: `emails/generic.tsx`

```tsx
import * as React from "react";
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";

export function GenericEmail({ firstName, title, body, linkUrl }: {
  firstName: string; title: string; body: string; linkUrl?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f7f7", padding: "32px 0" }}>
        <Container style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 560, margin: "0 auto" }}>
          <Heading style={{ color: "#10b981", fontSize: 22, marginBottom: 8 }}>121.ai by LendLoop</Heading>
          <Text style={{ fontSize: 16, color: "#111" }}>Hi {firstName},</Text>
          <Heading as="h2" style={{ fontSize: 18, marginTop: 16, color: "#111" }}>{title}</Heading>
          <Text style={{ fontSize: 15, lineHeight: 1.6, color: "#333", whiteSpace: "pre-wrap" }}>{body}</Text>
          {linkUrl && (
            <Section style={{ marginTop: 24 }}>
              <Link href={linkUrl} style={{
                background: "#10b981", color: "#fff", padding: "12px 20px",
                borderRadius: 8, textDecoration: "none", fontWeight: 600, display: "inline-block"
              }}>Open 121.ai</Link>
            </Section>
          )}
          <Text style={{ fontSize: 12, color: "#888", marginTop: 32, borderTop: "1px solid #eee", paddingTop: 16 }}>
            121.ai by LendLoop — Pre-MVP demo for the NCI community.<br />
            Capital is at risk. Your loans are not protected by deposit insurance.<br />
            This service is not yet authorised by the Central Bank of Ireland.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### File: `emails/verify-email.tsx`

```tsx
import * as React from "react";
import { GenericEmail } from "./generic";

export function VerifyEmail({ firstName, code }: { firstName: string; code: string }) {
  return (
    <GenericEmail
      firstName={firstName}
      title="Verify your NCI email"
      body={`Your verification code is:\n\n${code}\n\nThis code expires in 15 minutes. If you didn't request this, ignore this email.`}
    />
  );
}
```

### File: `emails/kyc-approved.tsx`

```tsx
import * as React from "react";
import { GenericEmail } from "./generic";

export function KycApprovedEmail({ firstName }: { firstName: string }) {
  return (
    <GenericEmail
      firstName={firstName}
      title="Your account is verified ✓"
      body="Your identity has been confirmed and your 121.ai account is now fully verified.\n\nYou can now deposit funds, browse loan requests, and either lend to or borrow from fellow NCI students."
      linkUrl="/dashboard"
    />
  );
}
```

### File: `emails/offer-received.tsx`

```tsx
import * as React from "react";
import { GenericEmail } from "./generic";

export function OfferReceivedEmail({ firstName, lenderName, amountEur, aprPct, requestId }: {
  firstName: string; lenderName: string; amountEur: string; aprPct: string; requestId: string;
}) {
  return (
    <GenericEmail
      firstName={firstName}
      title="You have a new loan offer"
      body={`${lenderName} has offered to fund €${amountEur} of your request at ${aprPct}% APR.\n\nReview the offer and decide whether to accept it.`}
      linkUrl={`/borrow/${requestId}`}
    />
  );
}
```

### File: `emails/loan-disbursed.tsx`

```tsx
import * as React from "react";
import { GenericEmail } from "./generic";

export function LoanDisbursedEmail({ firstName, amountEur, monthlyEur, loanId }: {
  firstName: string; amountEur: string; monthlyEur: string; loanId: string;
}) {
  return (
    <GenericEmail
      firstName={firstName}
      title={`Your loan is funded — €${amountEur} disbursed`}
      body={`Your loan agreement is signed and €${amountEur} has been credited to your wallet.\n\nFirst repayment of €${monthlyEur} is due in 30 days. You can pay early at any time without penalty.`}
      linkUrl={`/loans/${loanId}`}
    />
  );
}
```

### File: `emails/repayment-due.tsx`

```tsx
import * as React from "react";
import { GenericEmail } from "./generic";

export function RepaymentDueEmail({ firstName, amountEur, dueDate, loanId }: {
  firstName: string; amountEur: string; dueDate: string; loanId: string;
}) {
  return (
    <GenericEmail
      firstName={firstName}
      title={`Repayment of €${amountEur} due on ${dueDate}`}
      body={`Your next loan repayment of €${amountEur} is due on ${dueDate}.\n\nMake sure your wallet has sufficient balance. Repayments are taken automatically.`}
      linkUrl={`/loans/${loanId}`}
    />
  );
}
```

---

## Part 5 — PDF generation

### File: `lib/pdf/agreement.tsx`

```tsx
import * as React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#222" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 10, marginBottom: 18, textAlign: "center", color: "#666" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4, borderBottom: "1px solid #999", paddingBottom: 2 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 160, color: "#444" },
  value: { flex: 1, fontWeight: 700 },
  para: { marginBottom: 6, lineHeight: 1.4 },
  table: { marginTop: 6, border: "1px solid #aaa" },
  trh: { flexDirection: "row", backgroundColor: "#eee", padding: 4, fontWeight: 700, fontSize: 9 },
  tr: { flexDirection: "row", padding: 4, borderTop: "1px solid #ddd", fontSize: 9 },
  td1: { width: 30 }, td2: { width: 80 }, td3: { width: 70 }, td4: { width: 70 }, td5: { width: 70 },
  signature: { marginTop: 18, padding: 10, border: "1px solid #ccc", backgroundColor: "#fafafa" },
});

export interface AgreementProps {
  loanId: string;
  borrower: { name: string; email: string; address: string };
  lender: { name: string; email: string; address: string };
  principalEur: string;
  aprPct: string;
  termMonths: number;
  monthlyPaymentEur: string;
  totalInterestEur: string;
  totalRepaymentEur: string;
  schedule: Array<{ n: number; due: string; principal: string; interest: string; total: string }>;
  borrowerSignedAt?: string;
  borrowerIp?: string;
  lenderSignedAt?: string;
  lenderIp?: string;
}

export function LoanAgreementPDF(p: AgreementProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Peer-to-Peer Loan Agreement</Text>
        <Text style={styles.subtitle}>121.ai by LendLoop · Loan ID: {p.loanId}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Parties</Text>
          <View style={styles.row}><Text style={styles.label}>Borrower</Text><Text style={styles.value}>{p.borrower.name} ({p.borrower.email})</Text></View>
          <View style={styles.row}><Text style={styles.label}>Borrower address</Text><Text style={styles.value}>{p.borrower.address}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Lender</Text><Text style={styles.value}>{p.lender.name} ({p.lender.email})</Text></View>
          <View style={styles.row}><Text style={styles.label}>Lender address</Text><Text style={styles.value}>{p.lender.address}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Platform</Text><Text style={styles.value}>121.ai by LendLoop (intermediary, not a party to this loan)</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Key Financial Terms</Text>
          <View style={styles.row}><Text style={styles.label}>Principal</Text><Text style={styles.value}>€{p.principalEur}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Annual Percentage Rate</Text><Text style={styles.value}>{p.aprPct}%</Text></View>
          <View style={styles.row}><Text style={styles.label}>Term</Text><Text style={styles.value}>{p.termMonths} months</Text></View>
          <View style={styles.row}><Text style={styles.label}>Monthly payment</Text><Text style={styles.value}>€{p.monthlyPaymentEur}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Total interest</Text><Text style={styles.value}>€{p.totalInterestEur}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Total repayment</Text><Text style={styles.value}>€{p.totalRepaymentEur}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Repayment Schedule</Text>
          <View style={styles.table}>
            <View style={styles.trh}>
              <Text style={styles.td1}>#</Text><Text style={styles.td2}>Due Date</Text>
              <Text style={styles.td3}>Principal</Text><Text style={styles.td4}>Interest</Text>
              <Text style={styles.td5}>Total</Text>
            </View>
            {p.schedule.map(row => (
              <View key={row.n} style={styles.tr}>
                <Text style={styles.td1}>{row.n}</Text><Text style={styles.td2}>{row.due}</Text>
                <Text style={styles.td3}>€{row.principal}</Text><Text style={styles.td4}>€{row.interest}</Text>
                <Text style={styles.td5}>€{row.total}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Repayment & Default</Text>
          <Text style={styles.para}>The Borrower agrees to repay each instalment by direct debit from their 121.ai wallet on or before each due date. Early repayment in full or in part is permitted at any time without penalty.</Text>
          <Text style={styles.para}>If a payment is more than 3 days late, a late fee of €5.00 applies. If payment remains outstanding for 14 or more days, the loan enters default status. The Borrower remains liable for the full outstanding balance.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Platform Role & Limits</Text>
          <Text style={styles.para}>121.ai by LendLoop acts as a technology intermediary that introduces the Borrower and Lender. The platform is NOT a party to this loan, NOT a bank, NOT authorised by the Central Bank of Ireland, and does NOT guarantee repayment.</Text>
          <Text style={styles.para}>The Lender's funds are at risk. There is no deposit insurance, no investor compensation scheme, and no government guarantee. The Lender may lose part or all of the principal lent.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Governing Law</Text>
          <Text style={styles.para}>This agreement is governed by Irish law. Any dispute is subject to the exclusive jurisdiction of the Irish courts.</Text>
        </View>

        <View style={styles.signature}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>Electronic Signatures</Text>
          {p.borrowerSignedAt && (
            <Text>Borrower ({p.borrower.name}): signed {p.borrowerSignedAt} from IP {p.borrowerIp || "n/a"}</Text>
          )}
          {p.lenderSignedAt && (
            <Text>Lender ({p.lender.name}): signed {p.lenderSignedAt} from IP {p.lenderIp || "n/a"}</Text>
          )}
          <Text style={{ fontSize: 8, color: "#888", marginTop: 6 }}>
            Both parties consent to electronic signature under the eIDAS Regulation (EU) No 910/2014 and the Irish Electronic Commerce Act 2000.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
```

### File: `lib/pdf/render.ts`

```ts
import { renderToBuffer } from "@react-pdf/renderer";
import * as React from "react";
import { LoanAgreementPDF, type AgreementProps } from "./agreement";

export async function renderAgreementPdf(props: AgreementProps): Promise<Buffer> {
  return renderToBuffer(React.createElement(LoanAgreementPDF, props) as any);
}
```

---

## Part 6 — Server Actions

### File: `app/actions/auth.ts`

```ts
"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createServer, createService } from "@/lib/db/client";
import { isNciEmail } from "@/lib/auth/domain-allowlist";
import { writeAuditLog } from "@/lib/audit/log";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(72),
  consent_terms: z.literal("on"),
  consent_privacy: z.literal("on"),
  consent_risk: z.literal("on"),
});

export async function registerAction(_prev: any, formData: FormData) {
  const parsed = RegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    consent_terms: formData.get("consent_terms"),
    consent_privacy: formData.get("consent_privacy"),
    consent_risk: formData.get("consent_risk"),
  });
  if (!parsed.success) return { error: "Please complete all fields and consents." };

  const { email, password } = parsed.data;
  if (!isNciEmail(email)) {
    return { error: "Registration is currently limited to NCI students and staff (@student.ncirl.ie or @ncirl.ie)." };
  }

  const supabase = await createServer();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/personal-details` },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Registration failed." };

  const svc = createService();
  const { data: community } = await svc.from("communities").select("id").eq("slug", "nci").single();

  await svc.from("users").insert({
    id: data.user.id,
    email,
    community_id: community!.id,
    status: "pending_email_verification",
  });

  await svc.from("consent_records").insert([
    { user_id: data.user.id, consent_type: "terms", version: "v1.0", granted: true },
    { user_id: data.user.id, consent_type: "privacy", version: "v1.0", granted: true },
    { user_id: data.user.id, consent_type: "risk_warning", version: "v1.0", granted: true },
  ]);

  await writeAuditLog({
    actor_user_id: data.user.id,
    action_type: "user.register",
    resource_type: "user", resource_id: data.user.id,
  });

  redirect("/verify-email?sent=1");
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(_prev: any, formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Invalid credentials." };

  const supabase = await createServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createServer();
  await supabase.auth.signOut();
  redirect("/login");
}
```

### File: `app/actions/onboarding.ts`

```ts
"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createServer, createService } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { setupTotp, verifyTotp, encryptSecret, decryptSecret } from "@/lib/auth/totp";
import { writeAuditLog } from "@/lib/audit/log";
import { computeScore } from "@/lib/scoring/score";
import { sendNotification } from "@/lib/notifications/send";
import bcrypt from "bcryptjs";

const PersonalSchema = z.object({
  first_name: z.string().min(1).max(60),
  last_name: z.string().min(1).max(60),
  date_of_birth: z.string(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  mobile_e164: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  address_line1: z.string().min(1).max(120),
  address_line2: z.string().max(120).optional(),
  city: z.string().min(1).max(80),
  postal_code: z.string().min(1).max(20),
  country: z.string().length(2),
  nci_program: z.string().min(1),
  nci_year: z.coerce.number().int().min(1).max(8),
});

export async function savePersonalAction(_prev: any, formData: FormData) {
  const user = await requireUser();
  const parsed = PersonalSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fill in all required fields correctly." };

  const dob = new Date(parsed.data.date_of_birth);
  const age18 = new Date(); age18.setFullYear(age18.getFullYear() - 18);
  if (dob > age18) return { error: "You must be at least 18 years old." };

  const svc = createService();
  await svc.from("users").update({
    ...parsed.data,
    status: "pending_2fa",
  }).eq("id", user.id);

  await writeAuditLog({
    actor_user_id: user.id,
    action_type: "onboarding.personal_details",
    resource_type: "user", resource_id: user.id,
  });

  redirect("/onboarding/two-factor");
}

export async function startTotpSetupAction() {
  const user = await requireUser();
  const setup = await setupTotp(user.email!);

  const svc = createService();
  const codeHashes = await Promise.all(setup.backupCodes.map(c => bcrypt.hash(c, 10)));

  await svc.from("users").update({
    totp_secret_encrypted: encryptSecret(setup.secret),
    backup_codes_hashed: codeHashes,
  }).eq("id", user.id);

  return { qrDataUrl: setup.qrDataUrl, backupCodes: setup.backupCodes };
}

export async function confirmTotpAction(_prev: any, formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") || "").trim();
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };

  const svc = createService();
  const { data: u } = await svc.from("users").select("totp_secret_encrypted").eq("id", user.id).single();
  if (!u?.totp_secret_encrypted) return { error: "2FA not initialised." };

  const secret = decryptSecret(u.totp_secret_encrypted);
  if (!verifyTotp(code, secret)) return { error: "Code is incorrect." };

  await svc.from("users").update({
    totp_enabled: true, status: "pending_identity",
  }).eq("id", user.id);

  await writeAuditLog({ actor_user_id: user.id, action_type: "auth.2fa.enabled" });

  redirect("/onboarding/identity");
}

export async function uploadIdentityAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createServer();
  const svc = createService();

  const front = formData.get("identity_front") as File | null;
  const back = formData.get("identity_back") as File | null;
  const selfie = formData.get("selfie") as File | null;
  const docType = String(formData.get("doc_type") || "passport");

  if (!front || !selfie) return { error: "Identity front + selfie are required." };

  const { data: profile } = await svc.from("users").select("community_id").eq("id", user.id).single();
  if (!profile) return { error: "User profile not found." };

  async function upload(file: File, kind: string) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents")
      .upload(path, file, { contentType: file.type });
    if (upErr) throw new Error(upErr.message);
    await svc.from("documents").insert({
      user_id: user.id, community_id: profile!.community_id,
      kind, status: "under_review", storage_path: path,
      original_filename: file.name, mime_type: file.type, file_size_bytes: file.size,
    });
  }

  try {
    await upload(front, "identity_front");
    if (back) await upload(back, "identity_back");
    await upload(selfie, "selfie");
  } catch (e: any) {
    return { error: "Upload failed: " + e.message };
  }

  await svc.from("users").update({
    identity_doc_type: docType,
    status: "pending_admin_approval",
  }).eq("id", user.id);

  await writeAuditLog({ actor_user_id: user.id, action_type: "kyc.documents_uploaded" });

  redirect("/onboarding/complete");
}

const AssessmentSchema = z.object({
  monthly_income_eur: z.coerce.number().min(0).max(10000),
  monthly_expenses_eur: z.coerce.number().min(0).max(10000),
  existing_debt_eur: z.coerce.number().min(0).max(50000).default(0),
  employment_status: z.enum(["full_time", "part_time", "student_only"]),
  employment_months: z.coerce.number().int().min(0).max(600),
  has_emergency_fund: z.coerce.boolean(),
  has_irp: z.coerce.boolean(),
  nci_semesters_completed: z.coerce.number().int().min(0).max(20),
});

export async function saveAssessmentAction(_prev: any, formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = AssessmentSchema.safeParse({
    ...raw,
    has_emergency_fund: raw.has_emergency_fund === "on",
    has_irp: raw.has_irp === "on",
  });
  if (!parsed.success) return { error: "Please fill in all fields." };

  const svc = createService();
  const { data: profile } = await svc.from("users").select("community_id, identity_verified_at, totp_enabled, created_at").eq("id", user.id).single();

  await svc.from("borrower_assessments").insert({
    user_id: user.id, community_id: profile!.community_id,
    monthly_income_cents: Math.round(parsed.data.monthly_income_eur * 100),
    monthly_expenses_cents: Math.round(parsed.data.monthly_expenses_eur * 100),
    existing_debt_cents: Math.round(parsed.data.existing_debt_eur * 100),
    employment_status: parsed.data.employment_status,
    employment_months: parsed.data.employment_months,
    has_emergency_fund: parsed.data.has_emergency_fund,
    has_irp: parsed.data.has_irp,
    nci_semesters_completed: parsed.data.nci_semesters_completed,
  });

  // Compute initial score
  const accountAgeDays = Math.floor((Date.now() - new Date(profile!.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const score = computeScore({
    identity_verified: !!profile!.identity_verified_at,
    has_irp_or_eu_passport: parsed.data.has_irp,
    email_verified: true, has_2fa: !!profile!.totp_enabled,
    has_student_id: false,
    declared_monthly_income_cents: Math.round(parsed.data.monthly_income_eur * 100),
    income_verified: false, income_verification_age_days: 9999,
    employment_status: parsed.data.employment_status,
    nci_semesters_completed: parsed.data.nci_semesters_completed,
    account_age_days: accountAgeDays,
    has_emergency_fund: parsed.data.has_emergency_fund,
    declared_monthly_expenses_cents: Math.round(parsed.data.monthly_expenses_eur * 100),
    existing_debt_cents: Math.round(parsed.data.existing_debt_eur * 100),
    total_loans_completed: 0, total_loans_active: 0,
    on_time_payment_count: 0, late_payment_count: 0, defaulted_loan_count: 0,
  });

  await svc.from("credit_scores").insert({
    user_id: user.id, community_id: profile!.community_id,
    total_score: score.total,
    identity_score: score.components.identity,
    income_score: score.components.income,
    stability_score: score.components.stability,
    financial_score: score.components.financial,
    reputation_score: score.components.reputation,
    breakdown: score.breakdown,
    algorithm_version: "v1.0",
  });

  await writeAuditLog({ actor_user_id: user.id, action_type: "borrower.assessment_submitted" });

  return { ok: true, score: score.total };
}
```

### File: `app/actions/wallet.ts`

```ts
"use server";
import { z } from "zod";
import Stripe from "stripe";
import { requireVerified } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" as any });

const DepositSchema = z.object({
  amount_eur: z.coerce.number().min(10).max(2000),
});

export async function createDepositSessionAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const parsed = DepositSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Amount must be between €10 and €2000." };

  const amountCents = Math.round(parsed.data.amount_eur * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "eur",
        product_data: { name: "121.ai wallet top-up" },
        unit_amount: amountCents,
      },
    }],
    metadata: { user_id: user.id, purpose: "wallet_deposit" },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?deposit=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/deposit?cancelled=1`,
  });

  await writeAuditLog({
    actor_user_id: user.id, action_type: "wallet.deposit.initiated",
    metadata: { amount_cents: amountCents, session_id: session.id },
  });

  return { url: session.url };
}
```

### File: `app/actions/borrow.ts`

```ts
"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createService } from "@/lib/db/client";
import { requireVerified } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { calcMonthlyPayment, calcTotalInterest } from "@/lib/finance/amortization";

const LoanRequestSchema = z.object({
  amount_eur: z.coerce.number().min(100).max(2000),
  purpose: z.enum(["tuition_topup", "laptop_equipment", "emergency", "living_expenses", "travel_home", "other"]),
  purpose_description: z.string().max(500).optional(),
  term_months: z.coerce.number().int().min(1).max(12),
  max_apr_pct: z.coerce.number().min(1).max(12),
});

export async function createLoanRequestAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const parsed = LoanRequestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please complete all loan request fields." };

  const svc = createService();
  const { data: profile } = await svc.from("users").select("community_id").eq("id", user.id).single();
  const { data: scoreRow } = await svc.from("credit_scores").select("total_score, breakdown")
    .eq("user_id", user.id).order("computed_at", { ascending: false }).limit(1).single();
  if (!scoreRow) return { error: "Please complete your borrower assessment first." };

  const amountCents = Math.round(parsed.data.amount_eur * 100);
  const { data: req, error } = await svc.from("loan_requests").insert({
    borrower_id: user.id, community_id: profile!.community_id,
    amount_cents: amountCents, purpose: parsed.data.purpose,
    purpose_description: parsed.data.purpose_description ?? null,
    requested_term_months: parsed.data.term_months,
    max_apr_bps: Math.round(parsed.data.max_apr_pct * 100),
    status: "open", posted_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    score_at_request: scoreRow.total_score,
    score_breakdown_at_request: scoreRow.breakdown,
  }).select("id").single();
  if (error || !req) return { error: error?.message ?? "Could not create request." };

  await writeAuditLog({
    actor_user_id: user.id, action_type: "loan.request.created",
    resource_type: "loan_request", resource_id: req.id,
    metadata: { amount_cents: amountCents, term_months: parsed.data.term_months },
  });

  redirect(`/borrow/${req.id}`);
}

export async function acceptOfferAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const offerId = String(formData.get("offer_id") || "");
  if (!offerId) return { error: "Missing offer." };

  const svc = createService();
  const { data: offer } = await svc.from("loan_offers").select("*, loan_requests!inner(borrower_id, amount_cents, requested_term_months)")
    .eq("id", offerId).single();
  if (!offer) return { error: "Offer not found." };
  if ((offer as any).loan_requests.borrower_id !== user.id) return { error: "Not your request." };
  if (offer.status !== "pending") return { error: "Offer no longer available." };

  const principal = offer.amount_cents;
  const monthly = calcMonthlyPayment(principal, offer.apr_bps, offer.term_months);
  const totalInt = calcTotalInterest(principal, offer.apr_bps, offer.term_months);

  const { data: loan, error: loanErr } = await svc.from("loans").insert({
    request_id: offer.request_id, offer_id: offer.id,
    borrower_id: user.id, lender_id: offer.lender_id,
    community_id: offer.community_id,
    principal_cents: principal, apr_bps: offer.apr_bps,
    term_months: offer.term_months,
    monthly_payment_cents: monthly, total_interest_cents: totalInt,
    status: "pending_signature",
  }).select("id").single();
  if (loanErr || !loan) return { error: loanErr?.message ?? "Loan creation failed." };

  await svc.from("loan_offers").update({ status: "accepted", decided_at: new Date().toISOString() }).eq("id", offer.id);
  await svc.from("loan_offers").update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("request_id", offer.request_id).neq("id", offer.id).eq("status", "pending");
  await svc.from("loan_requests").update({ status: "fully_funded" }).eq("id", offer.request_id);

  await writeAuditLog({
    actor_user_id: user.id, action_type: "offer.accepted",
    resource_type: "loan", resource_id: loan.id,
  });

  redirect(`/agreements/${loan.id}/sign`);
}
```

### File: `app/actions/lend.ts`

```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createService } from "@/lib/db/client";
import { requireVerified } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { sendNotification } from "@/lib/notifications/send";
import { formatEur, formatBps } from "@/lib/utils";

const OfferSchema = z.object({
  request_id: z.string().uuid(),
  amount_eur: z.coerce.number().min(10).max(2000),
  apr_pct: z.coerce.number().min(1).max(12),
  term_months: z.coerce.number().int().min(1).max(12),
  message: z.string().max(500).optional(),
});

export async function createOfferAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const parsed = OfferSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please complete all offer fields correctly." };

  const svc = createService();
  const { data: req } = await svc.from("loan_requests").select("*").eq("id", parsed.data.request_id).single();
  if (!req) return { error: "Loan request not found." };
  if (req.borrower_id === user.id) return { error: "You cannot offer to fund your own request." };
  if (!["open", "partially_funded"].includes(req.status)) return { error: "This request is no longer open." };

  const aprBps = Math.round(parsed.data.apr_pct * 100);
  if (aprBps > req.max_apr_bps) return { error: `APR cannot exceed ${formatBps(req.max_apr_bps)}.` };

  const amountCents = Math.round(parsed.data.amount_eur * 100);
  const { data: wallet } = await svc.from("wallets").select("available_balance_cents").eq("user_id", user.id).single();
  if (!wallet || wallet.available_balance_cents < amountCents) {
    return { error: "Insufficient wallet balance. Please deposit funds first." };
  }

  const { data: offer, error } = await svc.from("loan_offers").insert({
    request_id: req.id, lender_id: user.id, community_id: req.community_id,
    amount_cents: amountCents, apr_bps: aprBps,
    term_months: parsed.data.term_months, status: "pending",
    message_to_borrower: parsed.data.message ?? null,
  }).select("id").single();
  if (error) return { error: error.message };

  const { data: lender } = await svc.from("users").select("first_name, last_name").eq("id", user.id).single();
  await sendNotification(req.borrower_id, "offer_received", {
    title: "New loan offer received",
    body: `${lender?.first_name} ${lender?.last_name?.[0] ?? ""}. has offered to fund ${formatEur(amountCents)} at ${formatBps(aprBps)} APR over ${parsed.data.term_months} months.`,
    link_url: `/borrow/${req.id}`,
  });

  await writeAuditLog({
    actor_user_id: user.id, action_type: "offer.created",
    resource_type: "loan_offer", resource_id: offer!.id,
    metadata: { amount_cents: amountCents, apr_bps: aprBps },
  });

  revalidatePath("/invest");
  return { ok: true };
}

const StrategySchema = z.object({
  name: z.string().min(1).max(80),
  min_score: z.coerce.number().int().min(0).max(100),
  min_apr_pct: z.coerce.number().min(0).max(20),
  max_apr_pct: z.coerce.number().min(0).max(20),
  max_term_months: z.coerce.number().int().min(1).max(12),
  investment_per_loan_eur: z.coerce.number().min(10).max(2000),
});

export async function saveAutoInvestStrategyAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const parsed = StrategySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please complete all strategy fields." };

  const svc = createService();
  const { data: profile } = await svc.from("users").select("community_id").eq("id", user.id).single();

  await svc.from("auto_invest_strategies").upsert({
    lender_id: user.id, community_id: profile!.community_id,
    name: parsed.data.name, is_active: true,
    min_score: parsed.data.min_score,
    min_apr_bps: Math.round(parsed.data.min_apr_pct * 100),
    max_apr_bps: Math.round(parsed.data.max_apr_pct * 100),
    max_term_months: parsed.data.max_term_months,
    investment_per_loan_cents: Math.round(parsed.data.investment_per_loan_eur * 100),
  }, { onConflict: "lender_id" });

  await writeAuditLog({ actor_user_id: user.id, action_type: "auto_invest.strategy.saved" });
  revalidatePath("/auto-invest");
  return { ok: true };
}
```

### File: `app/actions/agreement.ts`

```ts
"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createService } from "@/lib/db/client";
import { requireVerified } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { sendNotification } from "@/lib/notifications/send";
import { transferWallet } from "@/lib/finance/wallet";
import { buildSchedule } from "@/lib/finance/amortization";
import { formatEur } from "@/lib/utils";

export async function signAgreementAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const loanId = String(formData.get("loan_id") || "");
  if (!loanId) return { error: "Missing loan." };

  const svc = createService();
  const { data: loan } = await svc.from("loans").select("*").eq("id", loanId).single();
  if (!loan) return { error: "Loan not found." };
  if (loan.status !== "pending_signature" && loan.status !== "pending_disbursement") {
    return { error: "Loan is not awaiting signature." };
  }

  const isBorrower = loan.borrower_id === user.id;
  const isLender = loan.lender_id === user.id;
  if (!isBorrower && !isLender) return { error: "Not authorised." };

  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown";
  const update: any = {};
  if (isBorrower) {
    if (loan.borrower_signed_at) return { error: "Already signed." };
    update.borrower_signed_at = new Date().toISOString();
    update.borrower_signature_ip = ip;
  } else {
    if (loan.lender_signed_at) return { error: "Already signed." };
    update.lender_signed_at = new Date().toISOString();
    update.lender_signature_ip = ip;
  }
  await svc.from("loans").update(update).eq("id", loan.id);

  await writeAuditLog({
    actor_user_id: user.id,
    action_type: isBorrower ? "loan.signed.borrower" : "loan.signed.lender",
    resource_type: "loan", resource_id: loan.id,
  });

  // Both signed → disburse
  const { data: refreshed } = await svc.from("loans").select("*").eq("id", loan.id).single();
  if (refreshed?.borrower_signed_at && refreshed?.lender_signed_at && refreshed.status !== "active") {
    await transferWallet({
      fromUserId: refreshed.lender_id, toUserId: refreshed.borrower_id,
      amountCents: refreshed.principal_cents,
      entryTypeFrom: "investment_disbursed", entryTypeTo: "investment_disbursed",
      relatedLoanId: refreshed.id,
      description: `Loan disbursement ${refreshed.id.slice(0, 8)}`,
    });

    const schedule = buildSchedule({
      principalCents: refreshed.principal_cents,
      aprBps: refreshed.apr_bps,
      termMonths: refreshed.term_months,
      startDate: new Date(),
    });
    await svc.from("repayments").insert(schedule.map(s => ({
      loan_id: refreshed.id,
      sequence_number: s.sequence_number,
      due_date: s.due_date.toISOString().slice(0, 10),
      principal_cents: s.principal_cents,
      interest_cents: s.interest_cents,
      platform_fee_cents: s.platform_fee_cents,
      total_due_cents: s.total_due_cents,
    })));

    await svc.from("loans").update({
      status: "active",
      disbursed_at: new Date().toISOString(),
      first_payment_due_at: schedule[0].due_date.toISOString().slice(0, 10),
    }).eq("id", refreshed.id);

    await sendNotification(refreshed.borrower_id, "loan_disbursed", {
      title: "Your loan is funded!",
      body: `${formatEur(refreshed.principal_cents)} has been credited to your wallet. First repayment of ${formatEur(refreshed.monthly_payment_cents)} is due in 30 days.`,
      link_url: `/loans/${refreshed.id}`,
    });
  }

  redirect(`/loans/${loan.id}`);
}
```

### File: `app/actions/admin.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { createService } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { sendNotification } from "@/lib/notifications/send";

export async function approveKycAction(_prev: any, formData: FormData) {
  const { user: admin } = await requireAdmin();
  const userId = String(formData.get("user_id") || "");
  if (!userId) return { error: "Missing user." };

  const svc = createService();
  const { data: target } = await svc.from("users").select("first_name, status").eq("id", userId).single();
  if (!target) return { error: "User not found." };

  await svc.from("users").update({
    status: "verified",
    identity_verified_at: new Date().toISOString(),
    identity_verification_method: "manual_admin",
  }).eq("id", userId);

  await svc.from("documents").update({
    status: "approved",
    reviewed_by: admin.id,
    reviewed_at: new Date().toISOString(),
  }).eq("user_id", userId).in("status", ["uploaded", "under_review"]);

  await svc.from("aml_screenings").insert({
    user_id: userId, provider: "simulated", result: "clear",
    pep_match: false, sanctions_match: false, adverse_media_match: false,
  });

  await sendNotification(userId, "kyc_approved", {
    title: "Account verified",
    body: "Your identity has been confirmed. You can now access full platform features.",
    link_url: "/dashboard",
  });

  await writeAuditLog({
    actor_user_id: admin.id, action_type: "admin.kyc.approved",
    resource_type: "user", resource_id: userId,
  });

  revalidatePath("/admin/pending-kyc");
  return { ok: true };
}

export async function rejectKycAction(_prev: any, formData: FormData) {
  const { user: admin } = await requireAdmin();
  const userId = String(formData.get("user_id") || "");
  const reason = String(formData.get("reason") || "Documents not acceptable.");
  if (!userId) return { error: "Missing user." };

  const svc = createService();
  await svc.from("documents").update({
    status: "rejected", rejection_reason: reason,
    reviewed_by: admin.id, reviewed_at: new Date().toISOString(),
  }).eq("user_id", userId).in("status", ["uploaded", "under_review"]);

  await svc.from("users").update({ status: "pending_identity" }).eq("id", userId);

  await sendNotification(userId, "kyc_rejected", {
    title: "Identity verification needs attention",
    body: `Your documents could not be approved. Reason: ${reason}\n\nPlease re-upload clearer copies.`,
    link_url: "/onboarding/identity",
  });

  await writeAuditLog({
    actor_user_id: admin.id, action_type: "admin.kyc.rejected",
    resource_type: "user", resource_id: userId, metadata: { reason },
  });

  revalidatePath("/admin/pending-kyc");
  return { ok: true };
}

export async function timeWarpLoanAction(_prev: any, formData: FormData) {
  await requireAdmin();
  const loanId = String(formData.get("loan_id") || "");
  const months = Number(formData.get("months") || 1);
  if (!loanId) return { error: "Missing loan." };

  const svc = createService();
  await svc.rpc("time_warp_loan", { p_loan_id: loanId, p_months: months });
  await svc.rpc("process_due_repayments");

  await writeAuditLog({
    action_type: "admin.demo.time_warp",
    resource_type: "loan", resource_id: loanId,
    metadata: { months_advanced: months },
  });

  revalidatePath(`/admin/loans/${loanId}`);
  return { ok: true };
}

export async function runAutoInvestAction() {
  await requireAdmin();
  const svc = createService();
  const { data } = await svc.rpc("auto_invest_run");
  return { ok: true, offers_created: data };
}
```

---

## Part 7 — Auth & onboarding pages

### File: `app/page.tsx` (REPLACE the scaffolded landing)

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="font-bold text-lg text-[var(--primary)]">121.ai <span className="text-[var(--muted)] font-normal text-sm">by LendLoop</span></div>
        <nav className="flex gap-3 text-sm">
          <Link href="/login" className="px-4 py-2 rounded-md hover:bg-[var(--card)]">Sign in</Link>
          <Link href="/register" className="px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-fg)] font-medium">Join</Link>
        </nav>
      </header>

      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Peer-to-peer lending for the NCI community</h1>
        <p className="mt-6 text-lg text-[var(--muted)] max-w-2xl mx-auto">
          Students helping students. Borrow small amounts from fellow NCI members at fair rates,
          or earn modest returns by lending what you can spare. Closed community, lower risk.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/register" className="px-6 py-3 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">Get started</Link>
          <Link href="/how-it-works" className="px-6 py-3 rounded-lg border border-[var(--border)] font-semibold">How it works</Link>
        </div>
        <p className="mt-12 text-xs text-[var(--muted)] max-w-xl mx-auto">
          Demo platform. Capital is at risk. Not protected by deposit insurance.
          Not yet authorised by the Central Bank of Ireland.
        </p>
      </section>

      <footer className="mt-auto px-6 py-6 border-t border-[var(--border)] text-xs text-[var(--muted)] flex flex-wrap gap-4 justify-center">
        <Link href="/risk-warning">Risk warning</Link>
        <Link href="/privacy-policy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <span>© 2026 LendLoop</span>
      </footer>
    </main>
  );
}
```

### File: `app/(auth)/layout.tsx`

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--bg)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-[var(--primary)]">121.ai</div>
          <div className="text-sm text-[var(--muted)]">by LendLoop</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### File: `app/(auth)/login/page.tsx`

```tsx
"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, { error: "" } as any);
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-bold">Sign in</h1>
      <div>
        <label className="text-sm font-medium">NCI email</label>
        <input name="email" type="email" required placeholder="x12345678@student.ncirl.ie" />
      </div>
      <div>
        <label className="text-sm font-medium">Password</label>
        <input name="password" type="password" required />
      </div>
      {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      <SubmitBtn />
      <p className="text-sm text-center text-[var(--muted)]">
        Don't have an account? <Link href="/register" className="text-[var(--primary)] font-medium">Join</Link>
      </p>
    </form>
  );
}
```

### File: `app/(auth)/register/page.tsx`

```tsx
"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">
      {pending ? "Creating account..." : "Create account"}
    </button>
  );
}

export default function RegisterPage() {
  const [state, action] = useFormState(registerAction, { error: "" } as any);
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-bold">Create your account</h1>
      <p className="text-sm text-[var(--muted)]">Open to current NCI students and staff only.</p>

      <div>
        <label className="text-sm font-medium">NCI email</label>
        <input name="email" type="email" required placeholder="x12345678@student.ncirl.ie" />
      </div>
      <div>
        <label className="text-sm font-medium">Password (min 10 chars)</label>
        <input name="password" type="password" required minLength={10} />
      </div>

      <div className="space-y-2 text-sm pt-2 border-t border-[var(--border)]">
        <label className="flex gap-2 items-start">
          <input type="checkbox" name="consent_terms" required className="mt-1 w-4" />
          <span>I agree to the <Link href="/terms" className="text-[var(--primary)] underline">Terms of Service</Link>.</span>
        </label>
        <label className="flex gap-2 items-start">
          <input type="checkbox" name="consent_privacy" required className="mt-1 w-4" />
          <span>I agree to the <Link href="/privacy-policy" className="text-[var(--primary)] underline">Privacy Policy</Link>.</span>
        </label>
        <label className="flex gap-2 items-start">
          <input type="checkbox" name="consent_risk" required className="mt-1 w-4" />
          <span>I understand that <strong>capital is at risk</strong> and not protected by deposit insurance.</span>
        </label>
      </div>

      {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      <SubmitBtn />
      <p className="text-sm text-center text-[var(--muted)]">
        Have an account? <Link href="/login" className="text-[var(--primary)] font-medium">Sign in</Link>
      </p>
    </form>
  );
}
```

### File: `app/(auth)/verify-email/page.tsx`

```tsx
export default async function VerifyEmailPage({
  searchParams,
}: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="text-center space-y-4">
      <h1 className="text-xl font-bold">Check your inbox</h1>
      {sp.sent && (
        <p className="text-sm text-[var(--muted)]">
          We sent a verification link to your NCI email. Click it to continue setup.
        </p>
      )}
      <p className="text-xs text-[var(--muted)]">
        For demo accounts pre-seeded by an admin, this step is skipped.
      </p>
    </div>
  );
}
```

### File: `app/onboarding/layout.tsx`

```tsx
import Link from "next/link";

const steps = [
  { path: "/onboarding/personal-details", label: "Personal" },
  { path: "/onboarding/two-factor", label: "Two-factor" },
  { path: "/onboarding/identity", label: "Identity" },
  { path: "/onboarding/complete", label: "Complete" },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-8 bg-[var(--bg)]">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-[var(--primary)] block text-center mb-6">121.ai</Link>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <ol className="flex justify-between text-xs text-[var(--muted)] mb-6">
            {steps.map((s, i) => (
              <li key={s.path}>{i + 1}. {s.label}</li>
            ))}
          </ol>
          {children}
        </div>
      </div>
    </div>
  );
}
```

### File: `app/onboarding/personal-details/page.tsx`

```tsx
"use client";
import { useFormState, useFormStatus } from "react-dom";
import { savePersonalAction } from "@/app/actions/onboarding";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Saving..." : "Save & continue"}</button>;
}

export default function PersonalDetailsPage() {
  const [state, action] = useFormState(savePersonalAction, { error: "" } as any);
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-bold">Tell us about yourself</h1>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm">First name</label><input name="first_name" required /></div>
        <div><label className="text-sm">Last name</label><input name="last_name" required /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm">Date of birth</label><input name="date_of_birth" type="date" required /></div>
        <div>
          <label className="text-sm">Gender</label>
          <select name="gender" required>
            <option value="prefer_not_to_say">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div><label className="text-sm">Mobile (with country code)</label><input name="mobile_e164" placeholder="+353871234567" required /></div>

      <div><label className="text-sm">Address line 1</label><input name="address_line1" required /></div>
      <div><label className="text-sm">Address line 2 (optional)</label><input name="address_line2" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm">City</label><input name="city" required defaultValue="Dublin" /></div>
        <div><label className="text-sm">Postal code</label><input name="postal_code" required /></div>
      </div>
      <div><label className="text-sm">Country</label><input name="country" required defaultValue="IE" maxLength={2} /></div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
        <div><label className="text-sm">NCI program</label><input name="nci_program" required placeholder="MSc Cloud Computing" /></div>
        <div><label className="text-sm">NCI year</label><input name="nci_year" type="number" min={1} max={8} required defaultValue={1} /></div>
      </div>

      {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      <SubmitBtn />
    </form>
  );
}
```

### File: `app/onboarding/two-factor/page.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { startTotpSetupAction, confirmTotpAction } from "@/app/actions/onboarding";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Verifying..." : "Verify & continue"}</button>;
}

export default function TwoFactorPage() {
  const [setup, setSetup] = useState<{ qrDataUrl: string; backupCodes: string[] } | null>(null);
  const [state, action] = useFormState(confirmTotpAction, { error: "" } as any);

  useEffect(() => {
    startTotpSetupAction().then(setSetup);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Set up two-factor authentication</h1>
      <p className="text-sm text-[var(--muted)]">Use Google Authenticator, 1Password, or any TOTP app to scan this QR code.</p>

      {setup ? (
        <>
          <img src={setup.qrDataUrl} alt="2FA QR code" className="mx-auto w-48 h-48 bg-white p-2 rounded-lg" />
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Backup codes (save these now)</summary>
            <pre className="mt-2 p-3 bg-[var(--bg)] rounded-md text-xs grid grid-cols-2 gap-1">
              {setup.backupCodes.map(c => <span key={c}>{c}</span>)}
            </pre>
          </details>
          <form action={action} className="space-y-3 pt-2 border-t border-[var(--border)]">
            <div>
              <label className="text-sm">Enter the 6-digit code from your app</label>
              <input name="code" placeholder="123456" inputMode="numeric" maxLength={6} required />
            </div>
            {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
            <SubmitBtn />
          </form>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)] text-center">Generating QR…</p>
      )}
    </div>
  );
}
```

### File: `app/onboarding/identity/page.tsx`

```tsx
"use client";
import { useState } from "react";
import { uploadIdentityAction } from "@/app/actions/onboarding";

export default function IdentityPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await uploadIdentityAction(fd);
    if (res?.error) { setError(res.error); setLoading(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-bold">Upload identity documents</h1>
      <p className="text-sm text-[var(--muted)]">An admin will review within minutes. For demo accounts this is pre-approved.</p>

      <div>
        <label className="text-sm">Document type</label>
        <select name="doc_type" required defaultValue="passport">
          <option value="passport">Passport</option>
          <option value="irp_card">IRP card</option>
          <option value="national_id">National ID</option>
          <option value="driving_licence">Driving licence</option>
        </select>
      </div>

      <div>
        <label className="text-sm">Document — front</label>
        <input name="identity_front" type="file" accept="image/*,.pdf" required />
      </div>
      <div>
        <label className="text-sm">Document — back (optional for passports)</label>
        <input name="identity_back" type="file" accept="image/*,.pdf" />
      </div>
      <div>
        <label className="text-sm">Selfie (face clearly visible)</label>
        <input name="selfie" type="file" accept="image/*" required />
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      <button disabled={loading} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">
        {loading ? "Uploading…" : "Submit for review"}
      </button>
    </form>
  );
}
```

### File: `app/onboarding/complete/page.tsx`

```tsx
import Link from "next/link";
import { requireUserProfile } from "@/lib/auth/session";

export default async function CompletePage() {
  const { profile } = await requireUserProfile();
  const verified = profile.status === "verified";

  return (
    <div className="text-center space-y-4">
      <h1 className="text-xl font-bold">{verified ? "You're all set!" : "Awaiting review"}</h1>
      <p className="text-sm text-[var(--muted)]">
        {verified
          ? "Your account is fully verified. Welcome to 121.ai."
          : "Your documents are with our admin team. You'll get an email when they're approved (usually within minutes during demo)."}
      </p>
      <Link href={verified ? "/dashboard" : "/login"} className="inline-block px-5 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">
        {verified ? "Go to dashboard" : "Back to sign in"}
      </Link>
    </div>
  );
}
```

---

## Part 8 — Authenticated app pages

### File: `app/(app)/layout.tsx`

```tsx
import Link from "next/link";
import { requireUserProfile } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUserProfile();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="font-bold text-lg text-[var(--primary)]">121.ai</Link>
          <nav className="flex gap-1 text-sm overflow-x-auto">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Dashboard</Link>
            <Link href="/invest" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Invest</Link>
            <Link href="/borrow" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Borrow</Link>
            <Link href="/transactions" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Transactions</Link>
            <Link href="/auto-invest" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Auto-Invest</Link>
            {profile.role === "admin" && <Link href="/admin" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--warning)]">Admin</Link>}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:inline text-[var(--muted)]">{profile.first_name}</span>
            <form action={logoutAction}>
              <button className="px-3 py-1.5 rounded-md border border-[var(--border)]">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
      <footer className="border-t border-[var(--border)] py-4 text-xs text-center text-[var(--muted)]">
        Capital is at risk. Demo platform only.
      </footer>
    </div>
  );
}
```

### File: `app/(app)/dashboard/page.tsx`

```tsx
import Link from "next/link";
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur } from "@/lib/utils";

export default async function DashboardPage() {
  const { user, profile } = await requireVerified();
  const svc = createService();

  const { data: wallet } = await svc.from("wallets").select("*").eq("user_id", user.id).single();
  const { data: activeAsBorrower } = await svc.from("loans").select("id, principal_cents, status").eq("borrower_id", user.id).neq("status", "paid_off");
  const { data: activeAsLender } = await svc.from("loans").select("id, principal_cents, status").eq("lender_id", user.id).neq("status", "paid_off");
  const { data: openRequests } = await svc.from("loan_requests")
    .select("id, amount_cents, requested_term_months, max_apr_bps, score_at_request, purpose")
    .eq("community_id", profile.community_id)
    .in("status", ["open", "partially_funded"])
    .neq("borrower_id", user.id)
    .order("posted_at", { ascending: false }).limit(3);

  const totalLent = activeAsLender?.reduce((s, l) => s + l.principal_cents, 0) ?? 0;
  const totalBorrowed = activeAsBorrower?.reduce((s, l) => s + l.principal_cents, 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {profile.first_name} 👋</h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <div className="text-xs text-[var(--muted)]">Wallet balance</div>
          <div className="text-2xl font-bold">{formatEur(wallet?.available_balance_cents ?? 0)}</div>
          <Link href="/deposit" className="text-xs text-[var(--primary)] font-medium mt-2 inline-block">Deposit funds →</Link>
        </div>
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <div className="text-xs text-[var(--muted)]">Currently lent</div>
          <div className="text-2xl font-bold">{formatEur(totalLent)}</div>
          <div className="text-xs text-[var(--muted)]">{activeAsLender?.length ?? 0} active loans</div>
        </div>
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <div className="text-xs text-[var(--muted)]">Currently borrowed</div>
          <div className="text-2xl font-bold">{formatEur(totalBorrowed)}</div>
          <div className="text-xs text-[var(--muted)]">{activeAsBorrower?.length ?? 0} active loans</div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-baseline">
          <h2 className="font-bold">Open loan requests in your community</h2>
          <Link href="/invest" className="text-sm text-[var(--primary)]">View all →</Link>
        </div>
        <div className="mt-3 grid gap-2">
          {openRequests?.map(r => (
            <Link key={r.id} href={`/invest/${r.id}`} className="flex justify-between items-center p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)]">
              <div>
                <div className="font-semibold">{formatEur(r.amount_cents)} · {r.requested_term_months}mo</div>
                <div className="text-xs text-[var(--muted)] capitalize">{r.purpose.replace(/_/g, " ")}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[var(--primary)]">Score {r.score_at_request ?? "—"}</div>
                <div className="text-xs text-[var(--muted)]">≤{(r.max_apr_bps / 100).toFixed(1)}% APR</div>
              </div>
            </Link>
          )) ?? <p className="text-sm text-[var(--muted)]">No open requests right now.</p>}
        </div>
      </section>

      <section className="flex gap-2">
        <Link href="/borrow" className="flex-1 px-4 py-3 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold text-center">Request a loan</Link>
        <Link href="/auto-invest" className="flex-1 px-4 py-3 rounded-lg border border-[var(--border)] font-semibold text-center">Set up Auto-Invest</Link>
      </section>
    </div>
  );
}
```

### File: `app/(app)/deposit/page.tsx`

```tsx
"use client";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { createDepositSessionAction } from "@/app/actions/wallet";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Redirecting..." : "Continue to payment"}</button>;
}

export default function DepositPage() {
  const [state, action] = useFormState(createDepositSessionAction, { url: "", error: "" } as any);

  useEffect(() => {
    if (state?.url) window.location.href = state.url;
  }, [state]);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Deposit funds</h1>
      <p className="text-sm text-[var(--muted)]">
        Demo mode: payments are processed via Stripe test mode. Use card <code>4242 4242 4242 4242</code>, any future expiry, any CVC.
      </p>
      <form action={action} className="space-y-3">
        <div>
          <label className="text-sm">Amount (EUR)</label>
          <input name="amount_eur" type="number" min={10} max={2000} step={0.01} defaultValue={100} required />
        </div>
        {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        <SubmitBtn />
      </form>
    </div>
  );
}
```

### File: `app/(app)/invest/page.tsx`

```tsx
import Link from "next/link";
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur } from "@/lib/utils";

export default async function InvestPage() {
  const { user, profile } = await requireVerified();
  const svc = createService();

  const { data: requests } = await svc.from("loan_requests")
    .select("id, amount_cents, requested_term_months, max_apr_bps, purpose, score_at_request, posted_at")
    .eq("community_id", profile.community_id)
    .in("status", ["open", "partially_funded"])
    .neq("borrower_id", user.id)
    .order("posted_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-baseline">
        <h1 className="text-2xl font-bold">Browse loan requests</h1>
        <Link href="/auto-invest" className="text-sm text-[var(--primary)]">Set up Auto-Invest →</Link>
      </div>

      <div className="grid gap-3">
        {requests?.length ? requests.map(r => (
          <Link key={r.id} href={`/invest/${r.id}`} className="block p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] transition">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-lg">{formatEur(r.amount_cents)}</div>
                <div className="text-sm text-[var(--muted)] capitalize">{r.purpose.replace(/_/g, " ")} · {r.requested_term_months} months</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--primary)]">{r.score_at_request ?? "—"}</div>
                <div className="text-xs text-[var(--muted)]">Score</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-[var(--muted)]">Borrower's max APR: {(r.max_apr_bps / 100).toFixed(2)}%</div>
          </Link>
        )) : <p className="text-sm text-[var(--muted)]">No open requests in your community right now.</p>}
      </div>
    </div>
  );
}
```

### File: `app/(app)/invest/[id]/page.tsx`

```tsx
"use client";
import { use, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createOfferAction } from "@/app/actions/lend";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Submitting..." : "Submit offer"}</button>;
}

export default function InvestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, action] = useFormState(createOfferAction, { ok: false, error: "" } as any);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Make an offer</h1>
      <p className="text-sm text-[var(--muted)]">Loan request ID: <code>{id.slice(0, 8)}…</code></p>

      <form action={action} className="space-y-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <input type="hidden" name="request_id" value={id} />
        <div>
          <label className="text-sm">Amount you'll lend (EUR)</label>
          <input name="amount_eur" type="number" min={10} max={2000} step={1} required defaultValue={500} />
        </div>
        <div>
          <label className="text-sm">Your APR (%)</label>
          <input name="apr_pct" type="number" min={1} max={12} step={0.1} required defaultValue={8} />
        </div>
        <div>
          <label className="text-sm">Term (months)</label>
          <input name="term_months" type="number" min={1} max={12} required defaultValue={6} />
        </div>
        <div>
          <label className="text-sm">Message to borrower (optional)</label>
          <textarea name="message" maxLength={500} rows={3} placeholder="Best of luck with your studies!" />
        </div>
        {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        {state?.ok && <p className="text-sm text-[var(--success)]">✓ Offer submitted. The borrower has been notified.</p>}
        <SubmitBtn />
      </form>
    </div>
  );
}
```

### File: `app/(app)/borrow/page.tsx`

```tsx
"use client";
import { useFormState, useFormStatus } from "react-dom";
import { createLoanRequestAction } from "@/app/actions/borrow";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Posting..." : "Post loan request"}</button>;
}

export default function BorrowPage() {
  const [state, action] = useFormState(createLoanRequestAction, { error: "" } as any);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Request a loan</h1>
      <p className="text-sm text-[var(--muted)]">Once posted, fellow NCI members can offer to fund you. You decide which offer to accept.</p>

      <form action={action} className="space-y-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div>
          <label className="text-sm">Amount (EUR)</label>
          <input name="amount_eur" type="number" min={100} max={2000} step={10} required defaultValue={500} />
        </div>
        <div>
          <label className="text-sm">Purpose</label>
          <select name="purpose" required>
            <option value="emergency">Emergency</option>
            <option value="laptop_equipment">Laptop / equipment</option>
            <option value="tuition_topup">Tuition top-up</option>
            <option value="living_expenses">Living expenses</option>
            <option value="travel_home">Travel home</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Description (optional)</label>
          <textarea name="purpose_description" maxLength={500} rows={3} placeholder="A few sentences for lenders..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Term (months)</label>
            <input name="term_months" type="number" min={1} max={12} required defaultValue={6} />
          </div>
          <div>
            <label className="text-sm">Max APR you'll pay (%)</label>
            <input name="max_apr_pct" type="number" min={1} max={12} step={0.1} required defaultValue={10} />
          </div>
        </div>
        {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        <SubmitBtn />
      </form>
    </div>
  );
}
```

### File: `app/(app)/borrow/[id]/page.tsx`

```tsx
import Link from "next/link";
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur, formatBps, formatDate } from "@/lib/utils";
import { acceptOfferAction } from "@/app/actions/borrow";

export default async function LoanRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireVerified();
  const svc = createService();

  const { data: req } = await svc.from("loan_requests").select("*").eq("id", id).single();
  if (!req || req.borrower_id !== user.id) {
    return <p className="text-sm text-[var(--error)]">Request not found.</p>;
  }
  const { data: offers } = await svc.from("loan_offers")
    .select("*, lender:users!loan_offers_lender_id_fkey(first_name, last_name)")
    .eq("request_id", id).order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Your loan request</h1>
      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <div className="text-2xl font-bold">{formatEur(req.amount_cents)}</div>
        <div className="text-sm text-[var(--muted)] capitalize">{req.purpose.replace(/_/g, " ")} · {req.requested_term_months} months · ≤{formatBps(req.max_apr_bps)} APR</div>
        <div className="text-xs text-[var(--muted)] mt-2">Status: <span className="font-semibold capitalize">{req.status.replace(/_/g, " ")}</span></div>
      </div>

      <h2 className="font-bold">Offers received ({offers?.length ?? 0})</h2>
      <div className="space-y-2">
        {offers?.length ? offers.map((o: any) => (
          <div key={o.id} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl flex justify-between items-center">
            <div>
              <div className="font-semibold">{o.lender?.first_name ?? "Anonymous"} {o.lender?.last_name?.[0] ?? ""}.</div>
              <div className="text-sm">{formatEur(o.amount_cents)} at {formatBps(o.apr_bps)} APR · {o.term_months}mo</div>
              {o.message_to_borrower && <div className="text-xs italic text-[var(--muted)] mt-1">"{o.message_to_borrower}"</div>}
            </div>
            {o.status === "pending" && (
              <form action={acceptOfferAction}>
                <input type="hidden" name="offer_id" value={o.id} />
                <button className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-semibold">Accept</button>
              </form>
            )}
            {o.status === "accepted" && <span className="text-sm text-[var(--success)]">Accepted</span>}
            {o.status === "rejected" && <span className="text-sm text-[var(--muted)]">Rejected</span>}
          </div>
        )) : <p className="text-sm text-[var(--muted)]">Offers will appear here as lenders submit them.</p>}
      </div>
    </div>
  );
}
```

### File: `app/(app)/loans/[id]/page.tsx`

```tsx
import Link from "next/link";
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur, formatBps, formatDate } from "@/lib/utils";

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireVerified();
  const svc = createService();

  const { data: loan } = await svc.from("loans").select("*").eq("id", id).single();
  if (!loan || (loan.borrower_id !== user.id && loan.lender_id !== user.id)) {
    return <p className="text-sm text-[var(--error)]">Loan not found.</p>;
  }
  const { data: repayments } = await svc.from("repayments").select("*").eq("loan_id", id).order("sequence_number");

  const isBorrower = loan.borrower_id === user.id;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Loan details</h1>

      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <div className="text-2xl font-bold">{formatEur(loan.principal_cents)}</div>
        <div className="text-sm text-[var(--muted)]">{formatBps(loan.apr_bps)} APR · {loan.term_months} months · {formatEur(loan.monthly_payment_cents)}/mo</div>
        <div className="text-xs text-[var(--muted)] mt-2">Status: <span className="font-semibold capitalize">{loan.status.replace(/_/g, " ")}</span></div>
        <div className="text-xs text-[var(--muted)]">You are the {isBorrower ? "borrower" : "lender"}.</div>
      </div>

      {loan.status === "pending_signature" && (
        <Link href={`/agreements/${loan.id}/sign`} className="block w-full text-center px-4 py-3 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">
          Review & sign agreement
        </Link>
      )}

      <h2 className="font-bold">Repayment schedule</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)]">
            <tr><th className="p-2 text-left">#</th><th className="p-2 text-left">Due</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Status</th></tr>
          </thead>
          <tbody>
            {repayments?.map(r => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="p-2">{r.sequence_number}</td>
                <td className="p-2">{formatDate(r.due_date)}</td>
                <td className="p-2 text-right">{formatEur(r.total_due_cents)}</td>
                <td className="p-2 text-right capitalize">
                  {r.status === "paid" && <span className="text-[var(--success)]">✓ Paid</span>}
                  {r.status === "scheduled" && <span className="text-[var(--muted)]">Scheduled</span>}
                  {r.status === "late" && <span className="text-[var(--warning)]">Late</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loan.status === "active" && (
        <Link href={`/api/agreements/${loan.id}/pdf`} className="text-sm text-[var(--primary)] underline">Download signed agreement (PDF)</Link>
      )}
    </div>
  );
}
```

### File: `app/(app)/agreements/[id]/sign/page.tsx`

```tsx
"use client";
import { use } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signAgreementAction } from "@/app/actions/agreement";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-3 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-bold">{pending ? "Signing..." : "I agree — sign electronically"}</button>;
}

export default function SignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, action] = useFormState(signAgreementAction, { error: "" } as any);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Loan agreement</h1>
      <iframe src={`/api/agreements/${id}/pdf?preview=1`} className="w-full h-[60vh] border border-[var(--border)] rounded-xl bg-white" />

      <form action={action} className="space-y-3">
        <input type="hidden" name="loan_id" value={id} />
        <label className="flex gap-2 items-start text-sm">
          <input type="checkbox" required className="mt-1 w-4" />
          <span>I have read the agreement above and consent to signing it electronically. I understand this constitutes a legally binding contract under Irish law.</span>
        </label>
        {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        <SubmitBtn />
      </form>
    </div>
  );
}
```

### File: `app/(app)/transactions/page.tsx`

```tsx
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur, formatDate } from "@/lib/utils";

export default async function TransactionsPage() {
  const { user } = await requireVerified();
  const svc = createService();
  const { data: ledger } = await svc.from("ledger").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <div className="overflow-x-auto bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-left">
            <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">Balance</th></tr>
          </thead>
          <tbody>
            {ledger?.map(l => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="p-3 whitespace-nowrap">{formatDate(l.created_at)}</td>
                <td className="p-3 capitalize">{l.entry_type.replace(/_/g, " ")}</td>
                <td className="p-3">{l.description ?? "—"}</td>
                <td className={`p-3 text-right font-mono ${l.amount_cents >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                  {l.amount_cents >= 0 ? "+" : ""}{formatEur(l.amount_cents)}
                </td>
                <td className="p-3 text-right font-mono">{formatEur(l.balance_after_cents)}</td>
              </tr>
            ))}
            {(!ledger || ledger.length === 0) && (
              <tr><td colSpan={5} className="p-6 text-center text-[var(--muted)]">No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### File: `app/(app)/auto-invest/page.tsx`

```tsx
"use client";
import { useFormState, useFormStatus } from "react-dom";
import { saveAutoInvestStrategyAction } from "@/app/actions/lend";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Saving..." : "Save strategy"}</button>;
}

export default function AutoInvestPage() {
  const [state, action] = useFormState(saveAutoInvestStrategyAction, { error: "" } as any);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Auto-Invest strategy</h1>
      <p className="text-sm text-[var(--muted)]">When a new loan request matches your criteria, an offer will be submitted automatically using your wallet balance.</p>

      <form action={action} className="space-y-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div>
          <label className="text-sm">Strategy name</label>
          <input name="name" required defaultValue="Conservative NCI" />
        </div>
        <div>
          <label className="text-sm">Minimum borrower score</label>
          <input name="min_score" type="number" min={0} max={100} required defaultValue={65} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm">Min APR (%)</label><input name="min_apr_pct" type="number" min={0} max={12} step={0.1} required defaultValue={6} /></div>
          <div><label className="text-sm">Max APR (%)</label><input name="max_apr_pct" type="number" min={0} max={12} step={0.1} required defaultValue={10} /></div>
        </div>
        <div>
          <label className="text-sm">Max term (months)</label>
          <input name="max_term_months" type="number" min={1} max={12} required defaultValue={6} />
        </div>
        <div>
          <label className="text-sm">Investment per loan (EUR)</label>
          <input name="investment_per_loan_eur" type="number" min={10} max={2000} required defaultValue={50} />
        </div>
        {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        {state?.ok && <p className="text-sm text-[var(--success)]">✓ Strategy saved.</p>}
        <SubmitBtn />
      </form>
    </div>
  );
}
```

---

## Part 9 — Admin pages

### File: `app/admin/layout.tsx`

```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--warning)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-bold text-lg text-[var(--primary)]">121.ai</Link>
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--warning)] text-white font-bold">ADMIN</span>
          </div>
          <nav className="flex gap-1 text-sm">
            <Link href="/admin" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Overview</Link>
            <Link href="/admin/pending-kyc" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Pending KYC</Link>
            <Link href="/admin/users" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Users</Link>
            <Link href="/admin/loans" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Loans</Link>
            <Link href="/admin/audit-log" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Audit log</Link>
          </nav>
          <form action={logoutAction}>
            <button className="px-3 py-1.5 rounded-md border border-[var(--border)] text-sm">Sign out</button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
```

### File: `app/admin/page.tsx`

```tsx
import Link from "next/link";
import { createService } from "@/lib/db/client";
import { formatEur } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const svc = createService();
  const [{ count: totalUsers }, { count: pendingKyc }, { count: activeLoans }, { data: ledgerSums }] = await Promise.all([
    svc.from("users").select("*", { count: "exact", head: true }),
    svc.from("users").select("*", { count: "exact", head: true }).in("status", ["pending_admin_approval", "pending_identity"]),
    svc.from("loans").select("*", { count: "exact", head: true }).in("status", ["active", "in_grace"]),
    svc.from("ledger").select("amount_cents").eq("entry_type", "platform_fee"),
  ]);

  const totalFees = ledgerSums?.reduce((s, l) => s + l.amount_cents, 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total users" value={String(totalUsers ?? 0)} />
        <Card label="Pending KYC" value={String(pendingKyc ?? 0)} cta={{ href: "/admin/pending-kyc", label: "Review →" }} />
        <Card label="Active loans" value={String(activeLoans ?? 0)} />
        <Card label="Platform fees collected" value={formatEur(totalFees)} />
      </div>
    </div>
  );
}

function Card({ label, value, cta }: { label: string; value: string; cta?: { href: string; label: string } }) {
  return (
    <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {cta && <Link href={cta.href} className="text-xs text-[var(--primary)] mt-1 inline-block">{cta.label}</Link>}
    </div>
  );
}
```

### File: `app/admin/pending-kyc/page.tsx`

```tsx
import { createService } from "@/lib/db/client";
import { approveKycAction, rejectKycAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";

export default async function PendingKycPage() {
  const svc = createService();
  const { data: pending } = await svc.from("users")
    .select("id, email, first_name, last_name, status, created_at")
    .in("status", ["pending_admin_approval", "pending_identity"])
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending KYC reviews</h1>
      {pending?.length ? (
        <div className="space-y-3">
          {pending.map(u => (
            <div key={u.id} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{u.first_name ?? "—"} {u.last_name ?? ""}</div>
                <div className="text-xs text-[var(--muted)]">{u.email}</div>
                <div className="text-xs text-[var(--muted)]">Submitted {formatDate(u.created_at)} · Status: {u.status.replace(/_/g, " ")}</div>
              </div>
              <div className="flex gap-2">
                <form action={approveKycAction}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <button className="px-3 py-1.5 rounded-md bg-[var(--success)] text-white text-sm font-semibold">Approve</button>
                </form>
                <form action={rejectKycAction} className="flex gap-1">
                  <input type="hidden" name="user_id" value={u.id} />
                  <input name="reason" placeholder="Reason..." className="!w-32 !py-1 !text-xs" />
                  <button className="px-3 py-1.5 rounded-md bg-[var(--error)] text-white text-sm font-semibold">Reject</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-[var(--muted)]">Nothing pending.</p>}
    </div>
  );
}
```

### File: `app/admin/users/page.tsx`

```tsx
import { createService } from "@/lib/db/client";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const svc = createService();
  const { data: users } = await svc.from("users")
    .select("id, email, first_name, last_name, role, status, created_at")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="overflow-x-auto bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-left">
            <tr><th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Joined</th></tr>
          </thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.first_name ?? "—"} {u.last_name ?? ""}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3 capitalize">{u.status.replace(/_/g, " ")}</td>
                <td className="p-3">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### File: `app/admin/loans/page.tsx`

```tsx
import Link from "next/link";
import { createService } from "@/lib/db/client";
import { formatEur, formatDate } from "@/lib/utils";

export default async function AdminLoansPage() {
  const svc = createService();
  const { data: loans } = await svc.from("loans")
    .select("id, principal_cents, apr_bps, term_months, status, created_at")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Loans</h1>
      <div className="overflow-x-auto bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-left">
            <tr><th className="p-3">ID</th><th className="p-3">Principal</th><th className="p-3">Term</th><th className="p-3">APR</th><th className="p-3">Status</th><th className="p-3">Created</th></tr>
          </thead>
          <tbody>
            {loans?.map(l => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="p-3 font-mono"><Link href={`/admin/loans/${l.id}`} className="text-[var(--primary)]">{l.id.slice(0, 8)}...</Link></td>
                <td className="p-3">{formatEur(l.principal_cents)}</td>
                <td className="p-3">{l.term_months}mo</td>
                <td className="p-3">{(l.apr_bps / 100).toFixed(2)}%</td>
                <td className="p-3 capitalize">{l.status.replace(/_/g, " ")}</td>
                <td className="p-3">{formatDate(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### File: `app/admin/loans/[id]/page.tsx`

```tsx
import { createService } from "@/lib/db/client";
import { formatEur, formatBps, formatDate } from "@/lib/utils";
import { timeWarpLoanAction } from "@/app/actions/admin";

export default async function AdminLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const svc = createService();
  const { data: loan } = await svc.from("loans").select("*").eq("id", id).single();
  if (!loan) return <p>Not found.</p>;
  const { data: repayments } = await svc.from("repayments").select("*").eq("loan_id", id).order("sequence_number");

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Loan {id.slice(0, 8)}</h1>
      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <div className="text-2xl font-bold">{formatEur(loan.principal_cents)}</div>
        <div className="text-sm">{formatBps(loan.apr_bps)} · {loan.term_months}mo · {formatEur(loan.monthly_payment_cents)}/mo</div>
        <div className="text-xs text-[var(--muted)] capitalize mt-1">Status: {loan.status.replace(/_/g, " ")}</div>
      </div>

      <div className="p-4 bg-[var(--warning)]/10 border border-[var(--warning)] rounded-xl">
        <h2 className="font-bold mb-2">Demo helpers</h2>
        <form action={timeWarpLoanAction} className="flex gap-2 items-end">
          <input type="hidden" name="loan_id" value={loan.id} />
          <div>
            <label className="text-xs">Advance time by (months)</label>
            <input name="months" type="number" min={1} max={12} defaultValue={1} className="!w-24" />
          </div>
          <button className="px-3 py-2 rounded-md bg-[var(--warning)] text-white text-sm font-semibold">Time-warp & process repayments</button>
        </form>
        <p className="text-xs text-[var(--muted)] mt-2">Backdates the next due date(s) and runs the repayment processor immediately.</p>
      </div>

      <h2 className="font-bold">Repayments</h2>
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg)] text-left">
          <tr><th className="p-2">#</th><th className="p-2">Due</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Status</th></tr>
        </thead>
        <tbody>
          {repayments?.map(r => (
            <tr key={r.id} className="border-t border-[var(--border)]">
              <td className="p-2">{r.sequence_number}</td>
              <td className="p-2">{formatDate(r.due_date)}</td>
              <td className="p-2 text-right">{formatEur(r.total_due_cents)}</td>
              <td className="p-2 text-right capitalize">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### File: `app/admin/audit-log/page.tsx`

```tsx
import { createService } from "@/lib/db/client";
import { formatDate } from "@/lib/utils";

export default async function AuditLogPage() {
  const svc = createService();
  const { data: entries } = await svc.from("audit_log").select("*")
    .order("created_at", { ascending: false }).limit(200);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <div className="overflow-x-auto bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-left">
            <tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Resource</th><th className="p-3">Actor IP</th></tr>
          </thead>
          <tbody>
            {entries?.map(e => (
              <tr key={e.id} className="border-t border-[var(--border)]">
                <td className="p-3 whitespace-nowrap">{formatDate(e.created_at)}</td>
                <td className="p-3 font-mono">{e.action_type}</td>
                <td className="p-3 font-mono text-xs">{e.resource_type}/{e.resource_id?.slice(0, 8) ?? "—"}</td>
                <td className="p-3 text-xs text-[var(--muted)]">{e.actor_ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Part 10 — API routes

### File: `app/api/webhooks/stripe/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createService } from "@/lib/db/client";
import { creditWallet } from "@/lib/finance/wallet";
import { sendNotification } from "@/lib/notifications/send";
import { formatEur } from "@/lib/utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" as any });

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  const svc = createService();

  // Idempotency: skip if we've seen this event id
  const { data: existing } = await svc.from("webhooks_inbound").select("id").eq("event_id", event.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, skipped: "duplicate" });

  await svc.from("webhooks_inbound").insert({
    provider: "stripe", event_id: event.id, event_type: event.type,
    payload: event as any, signature_valid: true, processed: false,
  });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const purpose = session.metadata?.purpose;
      const amount = session.amount_total ?? 0;

      if (userId && purpose === "wallet_deposit" && amount > 0) {
        await creditWallet({
          userId, amountCents: amount,
          entryType: "deposit_cleared",
          relatedStripeId: session.id,
          description: "Stripe deposit",
        });
        await sendNotification(userId, "deposit_received", {
          title: "Deposit received",
          body: `${formatEur(amount)} has been credited to your wallet.`,
          link_url: "/dashboard",
        });
      }
    }

    await svc.from("webhooks_inbound").update({
      processed: true, processed_at: new Date().toISOString(),
    }).eq("event_id", event.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await svc.from("webhooks_inbound").update({
      processed: false, processing_error: err.message,
    }).eq("event_id", event.id);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### File: `app/api/agreements/[id]/pdf/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { createService } from "@/lib/db/client";
import { renderAgreementPdf } from "@/lib/pdf/render";
import { buildSchedule } from "@/lib/finance/amortization";
import { requireUser } from "@/lib/auth/session";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await requireUser();
  const svc = createService();

  const { data: loan } = await svc.from("loans").select("*").eq("id", id).single();
  if (!loan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (loan.borrower_id !== user.id && loan.lender_id !== user.id) {
    const { data: profile } = await svc.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [{ data: borrower }, { data: lender }] = await Promise.all([
    svc.from("users").select("first_name, last_name, email, address_line1, address_line2, city, postal_code, country").eq("id", loan.borrower_id).single(),
    svc.from("users").select("first_name, last_name, email, address_line1, address_line2, city, postal_code, country").eq("id", loan.lender_id).single(),
  ]);

  const schedule = buildSchedule({
    principalCents: loan.principal_cents,
    aprBps: loan.apr_bps,
    termMonths: loan.term_months,
    startDate: loan.disbursed_at ? new Date(loan.disbursed_at) : new Date(),
  });

  const eur = (c: number) => (c / 100).toFixed(2);
  const totalRepay = loan.principal_cents + loan.total_interest_cents;

  const pdf = await renderAgreementPdf({
    loanId: loan.id,
    borrower: {
      name: `${borrower?.first_name} ${borrower?.last_name}`,
      email: borrower?.email ?? "",
      address: [borrower?.address_line1, borrower?.city, borrower?.postal_code, borrower?.country].filter(Boolean).join(", "),
    },
    lender: {
      name: `${lender?.first_name} ${lender?.last_name}`,
      email: lender?.email ?? "",
      address: [lender?.address_line1, lender?.city, lender?.postal_code, lender?.country].filter(Boolean).join(", "),
    },
    principalEur: eur(loan.principal_cents),
    aprPct: (loan.apr_bps / 100).toFixed(2),
    termMonths: loan.term_months,
    monthlyPaymentEur: eur(loan.monthly_payment_cents),
    totalInterestEur: eur(loan.total_interest_cents),
    totalRepaymentEur: eur(totalRepay),
    schedule: schedule.map(s => ({
      n: s.sequence_number,
      due: s.due_date.toISOString().slice(0, 10),
      principal: eur(s.principal_cents),
      interest: eur(s.interest_cents),
      total: eur(s.total_due_cents),
    })),
    borrowerSignedAt: loan.borrower_signed_at ?? undefined,
    borrowerIp: loan.borrower_signature_ip ?? undefined,
    lenderSignedAt: loan.lender_signed_at ?? undefined,
    lenderIp: loan.lender_signature_ip ?? undefined,
  });

  return new NextResponse(pdf as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="loan-agreement-${loan.id.slice(0, 8)}.pdf"`,
    },
  });
}
```

### File: `app/api/export/my-data/route.ts`

```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";

export async function GET() {
  const user = await requireUser();
  const svc = createService();

  const [profile, wallet, ledger, loans, scores, consents] = await Promise.all([
    svc.from("users").select("*").eq("id", user.id).single(),
    svc.from("wallets").select("*").eq("user_id", user.id).single(),
    svc.from("ledger").select("*").eq("user_id", user.id),
    svc.from("loans").select("*").or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`),
    svc.from("credit_scores").select("*").eq("user_id", user.id),
    svc.from("consent_records").select("*").eq("user_id", user.id),
  ]);

  return new NextResponse(
    JSON.stringify({
      profile: profile.data,
      wallet: wallet.data,
      ledger: ledger.data,
      loans: loans.data,
      scores: scores.data,
      consents: consents.data,
      exported_at: new Date().toISOString(),
    }, null, 2),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="my-data-${user.id}.json"`,
      },
    }
  );
}
```

---

## Part 11 — Migration run order & testing

### SQL migrations — run in this exact order in Supabase SQL Editor:

1. `001_init.sql` — creates all tables, types, triggers, NCI community
2. `002_rls.sql` — turns on row-level security and storage buckets
3. `003_wallet_functions.sql` — atomic wallet ops, repayment processor, auto-invest sweeper, time-warp helper
4. `004_seed_demo.sql` — pre-seeds Smruti, Umer, admin (manual UUID step required — see note in Part 2)

If a migration fails, read the error carefully. Most common issues:
- "type X already exists" → you ran 001 twice. Drop the schema and start over: in SQL editor run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` then re-run from migration 001.
- "function auth.uid() does not exist" → you're in the wrong project. Check the URL bar for `xcdoblwozizjjqyayqmd`.
- "permission denied" → use the SQL editor, not psql with anon key.

### Smoke tests after migrations:

In the Supabase SQL Editor, run these to confirm everything is wired:

```sql
-- Should return 1
SELECT COUNT(*) FROM communities WHERE slug = 'nci';

-- Should return 3 (admin, Smruti, Umer)
SELECT email, status, role FROM users ORDER BY role DESC, email;

-- Smruti should have €500
SELECT u.email, w.available_balance_cents
FROM wallets w JOIN users u ON u.id = w.user_id
WHERE u.email LIKE 'x24269522%';

-- Umer should have score 72
SELECT u.email, cs.total_score, cs.computed_at
FROM credit_scores cs JOIN users u ON u.id = cs.user_id
WHERE u.email LIKE 'x24197432%';

-- Verify storage buckets exist
SELECT id, name, public FROM storage.buckets;
```

Expected: 1 community, 3 users, Smruti's balance = 50000, Umer's score = 72, two buckets (`documents`, `agreements`).

---

## Part 12 — Stripe webhook setup & first run

### Stripe webhook (one-time per dev session)

1. Open a **second** terminal tab (keep the first for `npm run dev`).
2. Run:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
3. Stripe CLI will print a line like:
   ```
   Ready! Your webhook signing secret is whsec_AbCdEf123456...
   ```
4. Copy the `whsec_...` value.
5. Open `.env.local` in your editor and set:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_AbCdEf123456...
   ```
6. Save the file. **Restart `npm run dev`** so it picks up the new env var.

Leave the `stripe listen` terminal running for the whole demo. Each Stripe event will be printed there as it forwards to your local server.

### First run

In the first terminal:

```bash
cd ~/Desktop/121ai
npm run dev
```

Wait for `✓ Ready in 2.x s` and `Local: http://localhost:3000`.

Open http://localhost:3000 in the browser and:

1. Click **Sign in**, log in as `x24269522@student.ncirl.ie` / `Demo2026!`.
2. You should land on `/dashboard` with €500 balance.
3. Open a private/incognito window, log in as `x24197432@student.ncirl.ie` / `Demo2026!`. Should also land on `/dashboard`.
4. As Umer, click **Borrow** → fill in €500, 6 months, ≤10% APR, purpose "laptop_equipment", submit.
5. As Smruti (other window), click **Invest**. Umer's request should appear. Click it, offer €500 at 8% APR for 6 months.
6. Back as Umer, refresh `/borrow/[id]`. Accept the offer.
7. Sign the agreement (both sides — switch windows). On second signature, the loan auto-disburses.
8. Open `/transactions` in both windows — you'll see the ledger entries.
9. To advance time: log in as admin → Admin → Loans → click the loan → use "Time-warp" with 1 month → repayment processes immediately.

If Stripe deposit testing matters: as Smruti, click **Deposit** → €100 → use card `4242 4242 4242 4242`, expiry `12/34`, CVC `123`. The webhook will fire, the wallet credits, and a notification email is sent (visible in Resend dashboard).

---

## Final checklist before demo

- [ ] All 4 SQL migrations ran without errors
- [ ] Smoke tests in Part 11 all return expected values
- [ ] All env vars in `.env.local` are filled with rotated values
- [ ] `npm run dev` starts without error
- [ ] `stripe listen` is running in a second terminal
- [ ] You can log in as Smruti and see €500
- [ ] You can log in as Umer and request a loan
- [ ] You can complete one full borrow → offer → accept → sign → disburse → time-warp loop end-to-end
- [ ] Bookmark these URLs in your demo browser:
  - http://localhost:3000/login
  - http://localhost:3000/dashboard
  - http://localhost:3000/admin (logged in as admin in a third window)

If anything in Steps 1–9 fails: copy the exact error and the file path, paste it into the next message, and we'll debug.

**End of full_codebase.md.**