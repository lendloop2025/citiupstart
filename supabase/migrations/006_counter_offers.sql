-- Counter-offers: borrower can counter a lender's loan_offer with their own
-- terms. The counter is stored as a new loan_offers row (lender_id = original
-- lender) flagged proposed_by_borrower=true, linked to the original via
-- counter_to_offer_id. The lender then accepts/rejects the counter.

ALTER TABLE loan_offers
    ADD COLUMN IF NOT EXISTS counter_to_offer_id UUID REFERENCES loan_offers(id),
    ADD COLUMN IF NOT EXISTS proposed_by_borrower BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_offers_counter_chain
    ON loan_offers(counter_to_offer_id)
    WHERE counter_to_offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offers_lender_pending_counter
    ON loan_offers(lender_id, status)
    WHERE proposed_by_borrower = TRUE AND status = 'pending';
