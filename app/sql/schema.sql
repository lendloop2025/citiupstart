-- ============================================================
-- 121.ai by LendLoop — MLP Database Schema
-- 13 tables: communities + 12 core MLP tables
-- Safe to re-run in development (drops and recreates)
-- ============================================================

CREATE DATABASE IF NOT EXISTS lendloop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lendloop;

-- Drop in reverse FK order for clean re-runs
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS repayments;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS loan_offers;
DROP TABLE IF EXISTS loan_requests;
DROP TABLE IF EXISTS borrower_assessments;
DROP TABLE IF EXISTS borrowers;
DROP TABLE IF EXISTS lenders;
DROP TABLE IF EXISTS user_profile;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS communities;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Table 0: communities
-- ============================================================
CREATE TABLE communities (
    community_id    INT AUTO_INCREMENT PRIMARY KEY,
    community_name  VARCHAR(255) NOT NULL,
    community_type  ENUM('company', 'university', 'cooperative', 'other') NOT NULL DEFAULT 'other',
    description     TEXT,
    is_active       BOOLEAN DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default community for development and demo
INSERT INTO communities (community_name, community_type, description)
VALUES ('121.ai Demo Community', 'other', 'Default community for development and demo purposes');

-- ============================================================
-- Table 1: users
-- ============================================================
CREATE TABLE users (
    user_id             INT AUTO_INCREMENT PRIMARY KEY,
    community_id        INT NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    role                ENUM('lender', 'borrower') NOT NULL,
    is_active           BOOLEAN DEFAULT 1,
    is_email_verified   BOOLEAN DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login          TIMESTAMP NULL,

    FOREIGN KEY (community_id) REFERENCES communities(community_id),
    INDEX idx_email (email),
    INDEX idx_community (community_id),
    INDEX idx_role (role)
);

-- ============================================================
-- Table 2: user_profile
-- ============================================================
CREATE TABLE user_profile (
    profile_id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL UNIQUE,
    full_name           VARCHAR(255) NOT NULL,
    phone               VARCHAR(20),
    date_of_birth       DATE,
    current_address     TEXT,
    years_at_address    INT DEFAULT 0,
    profile_photo_url   VARCHAR(500),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- ============================================================
-- Table 3: lenders
-- ============================================================
CREATE TABLE lenders (
    lender_id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id                 INT NOT NULL UNIQUE,
    available_balance       DECIMAL(12,2) DEFAULT 0.00,
    total_deposited         DECIMAL(12,2) DEFAULT 0.00,
    total_lent              DECIMAL(12,2) DEFAULT 0.00,
    total_earned_interest   DECIMAL(12,2) DEFAULT 0.00,
    active_loans            INT DEFAULT 0,
    completed_loans         INT DEFAULT 0,
    total_loans_given       INT DEFAULT 0,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_available_balance (available_balance)
);

-- ============================================================
-- Table 4: borrowers
-- ============================================================
CREATE TABLE borrowers (
    borrower_id                     INT AUTO_INCREMENT PRIMARY KEY,
    user_id                         INT NOT NULL UNIQUE,
    credibility_score               INT DEFAULT 0,
    identity_verification_score     INT DEFAULT 0,
    financial_strength_score        INT DEFAULT 0,
    credit_history_score            INT DEFAULT 0,
    stability_score                 INT DEFAULT 0,
    platform_reputation_score       INT DEFAULT 0,
    total_borrowed                  DECIMAL(12,2) DEFAULT 0.00,
    total_repaid                    DECIMAL(12,2) DEFAULT 0.00,
    total_outstanding               DECIMAL(12,2) DEFAULT 0.00,
    active_loans                    INT DEFAULT 0,
    completed_loans                 INT DEFAULT 0,
    on_time_payments                INT DEFAULT 0,
    late_payments                   INT DEFAULT 0,
    defaulted_loans                 INT DEFAULT 0,
    created_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_credibility_score (credibility_score DESC)
);

-- ============================================================
-- Table 5: borrower_assessments
-- ============================================================
CREATE TABLE borrower_assessments (
    assessment_id           INT AUTO_INCREMENT PRIMARY KEY,
    borrower_id             INT NOT NULL,

    -- Personal
    full_name               VARCHAR(255),
    date_of_birth           DATE,
    email                   VARCHAR(255),
    phone                   VARCHAR(50),
    current_address         TEXT,
    years_at_address        INT,

    -- Identity
    id_type                 ENUM('Passport', 'Driver''s Licence', 'National ID') NOT NULL,
    id_number               VARCHAR(100),
    id_expiry               DATE,

    -- Employment
    employment_status       ENUM('Employed', 'Self-employed', 'Unemployed', 'Student', 'Retired') NOT NULL,
    company_name            VARCHAR(255),
    job_title               VARCHAR(255),
    years_with_employer     INT,
    business_name           VARCHAR(255),
    years_in_business       INT,

    -- Financial (salary bands — never raw salary)
    salary_band             ENUM(
                                'Under €10,000',
                                '€10,001–€20,000',
                                '€20,001–€30,000',
                                '€30,001–€40,000',
                                '€40,001–€60,000',
                                '€60,001–€80,000',
                                'Over €80,000'
                            ),
    monthly_debt            DECIMAL(10,2),
    self_reported_credit_score INT,

    -- Loan intent
    loan_purpose            ENUM('Business', 'Education', 'Medical', 'Home Improvement', 'Other') NOT NULL,
    loan_amount_needed      DECIMAL(10,2),
    preferred_duration_months INT,

    -- Reference
    reference_name          VARCHAR(255),
    reference_relationship  VARCHAR(100),
    reference_phone         VARCHAR(50),

    -- Score snapshot at time of assessment
    score_total             INT DEFAULT 0,
    score_identity          INT DEFAULT 0,
    score_financial         INT DEFAULT 0,
    score_credit_history    INT DEFAULT 0,
    score_stability         INT DEFAULT 0,
    score_reputation        INT DEFAULT 0,

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (borrower_id) REFERENCES borrowers(borrower_id) ON DELETE CASCADE,
    INDEX idx_borrower_id (borrower_id)
);

-- ============================================================
-- Table 6: loan_requests
-- ============================================================
CREATE TABLE loan_requests (
    request_id          INT AUTO_INCREMENT PRIMARY KEY,
    borrower_id         INT NOT NULL,
    community_id        INT NOT NULL,
    amount              DECIMAL(10,2) NOT NULL,
    purpose             ENUM('Business', 'Education', 'Medical', 'Home Improvement', 'Other') NOT NULL,
    additional_notes    TEXT,
    duration_months     INT NOT NULL,
    receive_method      ENUM('bank_transfer', 'platform_wallet') DEFAULT 'platform_wallet',
    status              ENUM('active', 'offers_received', 'accepted', 'cancelled', 'expired') DEFAULT 'active',
    views_count         INT DEFAULT 0,
    offers_count        INT DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (borrower_id) REFERENCES borrowers(borrower_id),
    FOREIGN KEY (community_id) REFERENCES communities(community_id),
    INDEX idx_borrower_id (borrower_id),
    INDEX idx_community_status (community_id, status),
    INDEX idx_created_at (created_at)
);

-- ============================================================
-- Table 7: loan_offers
-- ============================================================
CREATE TABLE loan_offers (
    offer_id            INT AUTO_INCREMENT PRIMARY KEY,
    request_id          INT NOT NULL,
    lender_id           INT NOT NULL,
    offered_amount      DECIMAL(10,2) NOT NULL,
    interest_rate       DECIMAL(5,2) NOT NULL,
    duration_months     INT NOT NULL,
    monthly_payment     DECIMAL(10,2),
    total_repayable     DECIMAL(10,2),
    lender_message      TEXT,
    status              ENUM('pending', 'accepted', 'rejected', 'expired') DEFAULT 'pending',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (request_id) REFERENCES loan_requests(request_id),
    FOREIGN KEY (lender_id) REFERENCES lenders(lender_id),
    INDEX idx_request_id (request_id),
    INDEX idx_lender_id (lender_id),
    INDEX idx_status (status)
);

-- ============================================================
-- Table 8: loans
-- ============================================================
CREATE TABLE loans (
    loan_id             INT AUTO_INCREMENT PRIMARY KEY,
    borrower_id         INT NOT NULL,
    lender_id           INT NOT NULL,
    request_id          INT,
    offer_id            INT,
    principal_amount    DECIMAL(10,2) NOT NULL,
    interest_rate       DECIMAL(5,2) NOT NULL,
    duration_months     INT NOT NULL,
    monthly_payment     DECIMAL(10,2) NOT NULL,
    total_repayable     DECIMAL(10,2) NOT NULL,
    amount_paid         DECIMAL(10,2) DEFAULT 0.00,
    amount_remaining    DECIMAL(10,2),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    next_payment_date   DATE,
    last_payment_date   DATE,
    status              ENUM(
                            'active',
                            'delinquent_30',
                            'delinquent_60',
                            'default',
                            'completed'
                        ) DEFAULT 'active',
    disbursement_status ENUM('pending', 'completed') DEFAULT 'pending',
    disbursed_at        TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (borrower_id) REFERENCES borrowers(borrower_id),
    FOREIGN KEY (lender_id) REFERENCES lenders(lender_id),
    FOREIGN KEY (request_id) REFERENCES loan_requests(request_id),
    FOREIGN KEY (offer_id) REFERENCES loan_offers(offer_id),
    INDEX idx_borrower_id (borrower_id),
    INDEX idx_lender_id (lender_id),
    INDEX idx_status (status),
    INDEX idx_next_payment (next_payment_date)
);

-- ============================================================
-- Table 9: repayments
-- ============================================================
CREATE TABLE repayments (
    repayment_id        INT AUTO_INCREMENT PRIMARY KEY,
    loan_id             INT NOT NULL,
    amount              DECIMAL(10,2) NOT NULL,
    principal_part      DECIMAL(10,2) NOT NULL,
    interest_part       DECIMAL(10,2) NOT NULL,
    platform_cut        DECIMAL(10,2),          -- 15% of interest_part (or 10% if 3rd party active)
    due_date            DATE NOT NULL,
    payment_date        TIMESTAMP NULL,
    days_late           INT DEFAULT 0,
    is_late             BOOLEAN DEFAULT 0,
    status              ENUM('pending', 'completed', 'missed') DEFAULT 'pending',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
    INDEX idx_loan_id (loan_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
);

-- ============================================================
-- Table 10: transactions  (universal financial ledger)
-- ============================================================
CREATE TABLE transactions (
    transaction_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    transaction_type    ENUM(
                            'deposit',
                            'loan_disbursement',
                            'repayment',
                            'interest_earned',
                            'platform_cut'
                        ) NOT NULL,
    amount              DECIMAL(10,2) NOT NULL,
    counterparty_id     INT,
    reference_type      ENUM('loan', 'repayment', 'deposit', 'other'),
    reference_id        INT,
    balance_after       DECIMAL(10,2),
    description         VARCHAR(500),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_type (transaction_type),
    INDEX idx_created_at (created_at)
);

-- ============================================================
-- Table 11: messages
-- ============================================================
CREATE TABLE messages (
    message_id          INT AUTO_INCREMENT PRIMARY KEY,
    sender_id           INT NOT NULL,
    receiver_id         INT NOT NULL,
    request_id          INT,
    message_text        TEXT NOT NULL,
    is_read             BOOLEAN DEFAULT 0,
    read_at             TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES users(user_id),
    FOREIGN KEY (request_id) REFERENCES loan_requests(request_id),
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_request (request_id),
    INDEX idx_created_at (created_at)
);

-- ============================================================
-- Table 12: notifications
-- ============================================================
CREATE TABLE notifications (
    notification_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    title               VARCHAR(255) NOT NULL,
    message             TEXT NOT NULL,
    notification_type   ENUM(
                            'loan_offer_received',
                            'offer_accepted',
                            'offer_rejected',
                            'repayment_due',
                            'repayment_received',
                            'repayment_overdue',
                            'message_received',
                            'system'
                        ) NOT NULL,
    reference_type      VARCHAR(50),
    reference_id        INT,
    is_read             BOOLEAN DEFAULT 0,
    read_at             TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created_at (created_at)
);
