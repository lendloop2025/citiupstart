export interface LoanLimit {
  maxAmountCents: number;
  riskTier: string;
  eligible: boolean;
}

export function maxLoanFromScore(score: number): LoanLimit {
  if (score >= 90) return { maxAmountCents: 200000, riskTier: "Excellent", eligible: true };
  if (score >= 80) return { maxAmountCents: 150000, riskTier: "Low risk", eligible: true };
  if (score >= 65) return { maxAmountCents: 100000, riskTier: "Standard risk", eligible: true };
  if (score >= 50) return { maxAmountCents: 50000, riskTier: "Moderate risk", eligible: true };
  if (score >= 30) return { maxAmountCents: 20000, riskTier: "Elevated risk", eligible: true };
  return { maxAmountCents: 0, riskTier: "High risk", eligible: false };
}

export const MAX_ACTIVE_LOANS_PER_BORROWER = 2;

export const ACTIVE_LOAN_STATUSES = ["pending_signature", "pending_disbursement", "active", "in_grace"] as const;
