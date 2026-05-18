-- ============================================================================
-- 002_rls.sql — Row-Level Security policies + storage buckets
-- (helper functions in `public` schema, not `auth` — Supabase compatibility)
-- ============================================================================

-- Enable RLS on all user-data tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_invest_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper functions (public schema; reference auth.uid() which is built-in)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.community_id() RETURNS UUID AS $$
    SELECT community_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
        FALSE
    )
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- Users
-- ============================================================================

CREATE POLICY users_select ON public.users FOR SELECT
    USING (
        id = auth.uid()
        OR community_id = public.community_id()
        OR public.is_admin()
    );

CREATE POLICY users_update_self ON public.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = 'member');

-- ============================================================================
-- Wallets (service role writes only; users read their own)
-- ============================================================================

CREATE POLICY wallets_select ON public.wallets FOR SELECT
    USING (
        user_id = auth.uid()
        OR (public.is_admin() AND community_id = public.community_id())
    );

-- ============================================================================
-- Ledger
-- ============================================================================

CREATE POLICY ledger_select ON public.ledger FOR SELECT
    USING (
        user_id = auth.uid()
        OR (public.is_admin() AND EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = ledger.user_id
            AND u.community_id = public.community_id()
        ))
    );

-- ============================================================================
-- Loan requests
-- ============================================================================

CREATE POLICY requests_select ON public.loan_requests FOR SELECT
    USING (
        community_id = public.community_id()
        AND (
            status IN ('open', 'partially_funded')
            OR borrower_id = auth.uid()
            OR public.is_admin()
        )
    );

CREATE POLICY requests_insert ON public.loan_requests FOR INSERT
    WITH CHECK (
        borrower_id = auth.uid()
        AND community_id = public.community_id()
    );

CREATE POLICY requests_update_own ON public.loan_requests FOR UPDATE
    USING (
        borrower_id = auth.uid()
        AND status IN ('draft', 'open')
    );

-- ============================================================================
-- Loan offers
-- ============================================================================

CREATE POLICY offers_select ON public.loan_offers FOR SELECT
    USING (
        lender_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.loan_requests r
            WHERE r.id = loan_offers.request_id
            AND r.borrower_id = auth.uid()
        )
        OR public.is_admin()
    );

CREATE POLICY offers_insert ON public.loan_offers FOR INSERT
    WITH CHECK (
        lender_id = auth.uid()
        AND community_id = public.community_id()
    );

-- ============================================================================
-- Loans
-- ============================================================================

CREATE POLICY loans_select ON public.loans FOR SELECT
    USING (
        borrower_id = auth.uid()
        OR lender_id = auth.uid()
        OR public.is_admin()
    );

-- ============================================================================
-- Documents
-- ============================================================================

CREATE POLICY documents_select ON public.documents FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY documents_insert ON public.documents FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Notifications
-- ============================================================================

CREATE POLICY notifications_select ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Borrower assessments
-- ============================================================================

CREATE POLICY assessments_select ON public.borrower_assessments FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY assessments_insert ON public.borrower_assessments FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Credit scores
-- ============================================================================

CREATE POLICY scores_select ON public.credit_scores FOR SELECT
    USING (
        user_id = auth.uid()
        OR community_id = public.community_id()
        OR public.is_admin()
    );

-- ============================================================================
-- Repayments
-- ============================================================================

CREATE POLICY repayments_select ON public.repayments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.loans l
            WHERE l.id = repayments.loan_id
            AND (l.borrower_id = auth.uid() OR l.lender_id = auth.uid())
        )
        OR public.is_admin()
    );

-- ============================================================================
-- Auto-invest strategies
-- ============================================================================

CREATE POLICY strategies_all ON public.auto_invest_strategies FOR ALL
    USING (lender_id = auth.uid() OR public.is_admin())
    WITH CHECK (lender_id = auth.uid());

-- ============================================================================
-- AML
-- ============================================================================

CREATE POLICY aml_select ON public.aml_screenings FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================================
-- Audit log (admin only)
-- ============================================================================

CREATE POLICY audit_select_admin ON public.audit_log FOR SELECT
    USING (public.is_admin());

-- ============================================================================
-- Consent records
-- ============================================================================

CREATE POLICY consent_select_self ON public.consent_records FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================================
-- Storage buckets
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('agreements', 'agreements', false)
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
            OR (SELECT role = 'admin' FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY agreements_storage_select ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'agreements'
        AND (
            EXISTS (
                SELECT 1 FROM public.loans
                WHERE loans.id::text = (storage.foldername(name))[1]
                AND (loans.borrower_id = auth.uid() OR loans.lender_id = auth.uid())
            )
            OR (SELECT role = 'admin' FROM public.users WHERE id = auth.uid())
        )
    );