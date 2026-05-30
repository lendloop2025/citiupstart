-- Storage bucket for signed agreement PDFs (per flow.md §6.3).
INSERT INTO storage.buckets (id, name, public)
VALUES ('agreements', 'agreements', false)
ON CONFLICT (id) DO NOTHING;

-- APR ceiling guard at the database level (flow.md §10).
ALTER TABLE loan_requests DROP CONSTRAINT IF EXISTS apr_in_range;
ALTER TABLE loan_requests
  ADD CONSTRAINT apr_in_range CHECK (max_apr_bps BETWEEN 0 AND 1200);

ALTER TABLE loan_offers DROP CONSTRAINT IF EXISTS offer_apr_in_range;
ALTER TABLE loan_offers
  ADD CONSTRAINT offer_apr_in_range CHECK (apr_bps BETWEEN 0 AND 1200);

-- Replace the demo late-fee RPC with the spec rules:
-- 2% of missed instalment per week, default after 90 days outstanding.
CREATE OR REPLACE FUNCTION mark_late_repayments() RETURNS VOID AS $$
DECLARE r RECORD; v_days INTEGER; v_weeks INTEGER; v_fee BIGINT;
BEGIN
    FOR r IN
        SELECT id, total_due_cents, due_date
        FROM repayments
        WHERE status IN ('scheduled','late')
          AND due_date < CURRENT_DATE
    LOOP
        v_days  := GREATEST(0, CURRENT_DATE - r.due_date);
        v_weeks := CEIL(v_days::numeric / 7);
        v_fee   := ROUND(r.total_due_cents * 0.02 * v_weeks);
        UPDATE repayments
           SET status = 'late', late_fee_cents = v_fee, days_late = v_days
         WHERE id = r.id;
    END LOOP;

    UPDATE loans
       SET status = 'in_default'
     WHERE id IN (
       SELECT DISTINCT loan_id FROM repayments
        WHERE status = 'late' AND days_late >= 90
     ) AND status = 'active';
END $$ LANGUAGE plpgsql;
