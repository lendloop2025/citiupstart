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
