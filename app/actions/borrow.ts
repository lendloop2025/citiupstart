"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createService } from "@/lib/db/client";
import { requireVerified } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { calcMonthlyPayment, calcTotalInterest } from "@/lib/finance/amortization";
import { sendNotification } from "@/lib/notifications/send";
import { maxLoanFromScore, MAX_ACTIVE_LOANS_PER_BORROWER, ACTIVE_LOAN_STATUSES } from "@/lib/scoring/limits";
import { formatEur, formatBps } from "@/lib/utils";

const LoanRequestSchema = z.object({
  amount_eur: z.coerce.number().min(100).max(2000),
  purpose: z.enum(["tuition_topup", "laptop_equipment", "emergency", "living_expenses", "travel_home", "other"]),
  purpose_description: z.string().max(500).optional(),
  term_months: z.coerce.number().int().min(1).max(12),
  max_apr_pct: z.coerce.number().min(1).max(12),
});

async function countActiveLoans(svc: ReturnType<typeof createService>, borrowerId: string): Promise<number> {
  const { count } = await svc.from("loans")
    .select("id", { count: "exact", head: true })
    .eq("borrower_id", borrowerId)
    .in("status", [...ACTIVE_LOAN_STATUSES]);
  return count ?? 0;
}

export async function createLoanRequestAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const parsed = LoanRequestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please complete all loan request fields." };

  const svc = createService();
  const { data: profile } = await svc.from("users").select("community_id").eq("id", user.id).single();
  const { data: scoreRow } = await svc.from("credit_scores").select("total_score, breakdown")
    .eq("user_id", user.id).order("computed_at", { ascending: false }).limit(1).single();
  if (!scoreRow) return { error: "Please complete your borrower assessment first." };

  const limit = maxLoanFromScore(scoreRow.total_score);
  if (!limit.eligible) {
    return { error: "Your current credit score is too low to borrow. Improve your score by completing your profile." };
  }

  const amountCents = Math.round(parsed.data.amount_eur * 100);
  if (amountCents > limit.maxAmountCents) {
    return { error: `With a credit score of ${scoreRow.total_score} (${limit.riskTier}), your maximum loan amount is ${formatEur(limit.maxAmountCents)}.` };
  }

  const activeCount = await countActiveLoans(svc, user.id);
  if (activeCount >= MAX_ACTIVE_LOANS_PER_BORROWER) {
    return { error: `You have reached the maximum of ${MAX_ACTIVE_LOANS_PER_BORROWER} active loans. Close an existing loan to request a new one.` };
  }

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

export async function acceptOfferAction(formData: FormData) {
  const { user } = await requireVerified();
  const offerId = String(formData.get("offer_id") || "");
  if (!offerId) throw new Error("Missing offer.");

  const svc = createService();
  const { data: offer } = await svc.from("loan_offers")
    .select("*, loan_requests!inner(borrower_id, amount_cents, requested_term_months, status)")
    .eq("id", offerId).single();
  if (!offer) throw new Error("Offer not found.");
  const req = (offer as any).loan_requests;
  if (req.borrower_id !== user.id) throw new Error("Not your request.");

  // Stale-click guards: instead of throwing a runtime error, send the user back
  // to the request page with a flash banner. The page will re-render with the
  // current state (offer marked accepted/rejected/superseded as applicable).
  if (offer.status !== "pending") {
    redirect(`/borrow/${offer.request_id}?notice=offer_unavailable`);
  }
  if (!["open", "partially_funded"].includes(req.status)) {
    redirect(`/borrow/${offer.request_id}?notice=request_closed`);
  }

  const activeCount = await countActiveLoans(svc, user.id);
  if (activeCount >= MAX_ACTIVE_LOANS_PER_BORROWER) {
    redirect(`/borrow/${offer.request_id}?notice=max_active_loans`);
  }

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
  if (loanErr || !loan) throw new Error(loanErr?.message ?? "Loan creation failed.");

  await svc.from("loan_offers").update({ status: "accepted", decided_at: new Date().toISOString() }).eq("id", offer.id);
  await svc.from("loan_offers").update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("request_id", offer.request_id).neq("id", offer.id).eq("status", "pending");
  await svc.from("loan_requests").update({ status: "converted" }).eq("id", offer.request_id);

  await sendNotification(offer.lender_id, "offer_accepted", {
    title: "Your loan offer was accepted",
    body: `Your offer of ${formatEur(principal)} at ${formatBps(offer.apr_bps)} APR has been accepted. Open the agreement to review and sign.`,
    link_url: `/agreements/${loan.id}/sign`,
    metadata: { loanId: loan.id },
  });

  await writeAuditLog({
    actor_user_id: user.id, action_type: "offer.accepted",
    resource_type: "loan", resource_id: loan.id,
  });

  redirect(`/agreements/${loan.id}/sign`);
}

const CounterOfferSchema = z.object({
  offer_id: z.string().uuid(),
  amount_eur: z.coerce.number().min(10).max(2000),
  apr_pct: z.coerce.number().min(1).max(12),
  term_months: z.coerce.number().int().min(1).max(12),
  message: z.string().max(500).optional(),
});

export async function counterOfferAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const parsed = CounterOfferSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please complete all counter-offer fields." };

  const svc = createService();
  const { data: original } = await svc.from("loan_offers")
    .select("*, loan_requests!inner(borrower_id, max_apr_bps, requested_term_months, status, amount_cents)")
    .eq("id", parsed.data.offer_id).single();
  if (!original) return { error: "Original offer not found." };

  const req: any = (original as any).loan_requests;
  if (req.borrower_id !== user.id) return { error: "You cannot counter an offer on someone else's request." };

  // Idempotency: if the borrower already countered this offer, just send them
  // back to the request page — no duplicate counter, no error popup.
  if (original.status !== "pending") {
    const { data: existingCounter } = await svc.from("loan_offers")
      .select("id").eq("counter_to_offer_id", original.id).maybeSingle();
    if (existingCounter) {
      redirect(`/borrow/${original.request_id}?notice=already_countered`);
    }
    return { error: "This offer is no longer pending." };
  }
  if (!["open", "partially_funded"].includes(req.status)) return { error: "Loan request is no longer open." };

  const aprBps = Math.round(parsed.data.apr_pct * 100);
  if (aprBps > req.max_apr_bps) {
    return { error: `Counter APR cannot exceed your request ceiling of ${formatBps(req.max_apr_bps)}.` };
  }
  const amountCents = Math.round(parsed.data.amount_eur * 100);
  if (amountCents > req.amount_cents) {
    return { error: `Counter amount cannot exceed your requested ${formatEur(req.amount_cents)}.` };
  }

  // Mark the lender's original offer as rejected (the counter supersedes it).
  await svc.from("loan_offers")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", original.id);

  // Insert the borrower's counter-offer; lender_id stays as the original lender,
  // proposed_by_borrower flags it for the lender's inbox.
  const { data: counter, error } = await svc.from("loan_offers").insert({
    request_id: original.request_id,
    lender_id: original.lender_id,
    community_id: original.community_id,
    amount_cents: amountCents,
    apr_bps: aprBps,
    term_months: parsed.data.term_months,
    status: "pending",
    message_to_borrower: parsed.data.message ?? null,
    counter_to_offer_id: original.id,
    proposed_by_borrower: true,
  }).select("id").single();
  if (error || !counter) return { error: error?.message ?? "Could not create counter-offer." };

  const { data: borrower } = await svc.from("users").select("first_name, last_name").eq("id", user.id).single();
  await sendNotification(original.lender_id, "offer_received", {
    title: "Borrower sent a counter-offer",
    body: `${borrower?.first_name ?? "The borrower"} ${borrower?.last_name?.[0] ?? ""}. has countered your offer with ${formatEur(amountCents)} at ${formatBps(aprBps)} APR over ${parsed.data.term_months} months. Review and accept on your dashboard.`,
    link_url: `/invest/${original.request_id}`,
    metadata: { counterOfferId: counter.id, originalOfferId: original.id },
  });

  await writeAuditLog({
    actor_user_id: user.id, action_type: "offer.countered_by_borrower",
    resource_type: "loan_offer", resource_id: counter.id,
    metadata: { original_offer_id: original.id, amount_cents: amountCents, apr_bps: aprBps },
  });

  revalidatePath(`/borrow/${original.request_id}`);
  redirect(`/borrow/${original.request_id}?notice=counter_sent`);
}
