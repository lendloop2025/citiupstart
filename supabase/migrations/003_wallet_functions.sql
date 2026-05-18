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
