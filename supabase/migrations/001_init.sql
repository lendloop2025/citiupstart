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
