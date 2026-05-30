"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createService } from "@/lib/db/client";
import { requireVerified } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { calcMonthlyPayment, calcTotalInterest } from "@/lib/finance/amortization";
import { sendNotification } from "@/lib/notifications/send";
import { formatEur, formatBps } from "@/lib/utils";
import { MAX_ACTIVE_LOANS_PER_BORROWER, ACTIVE_LOAN_STATUSES } from "@/lib/scoring/limits";

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

export async function acceptCounterOfferAction(formData: FormData) {
  const { user } = await requireVerified();
  const offerId = String(formData.get("offer_id") ?? "");
  if (!offerId) throw new Error("Missing offer.");

  const svc = createService();
  const { data: offer } = await svc.from("loan_offers")
    .select("*, loan_requests!inner(borrower_id, status)")
    .eq("id", offerId).single();
  if (!offer) throw new Error("Counter-offer not found.");
  if (offer.lender_id !== user.id) throw new Error("Not your counter-offer to accept.");
  if (!offer.proposed_by_borrower) throw new Error("This is not a borrower counter-offer.");

  // Stale-click guards — redirect with a flash instead of throwing.
  if (offer.status !== "pending") {
    redirect(`/invest/${offer.request_id}?notice=counter_unavailable`);
  }
  const req: any = (offer as any).loan_requests;
  if (!["open", "partially_funded"].includes(req.status)) {
    redirect(`/invest/${offer.request_id}?notice=request_closed`);
  }

  // Re-check borrower active-loan limit at acceptance time.
  const { count: activeCount } = await svc.from("loans")
    .select("id", { count: "exact", head: true })
    .eq("borrower_id", req.borrower_id)
    .in("status", [...ACTIVE_LOAN_STATUSES]);
  if ((activeCount ?? 0) >= MAX_ACTIVE_LOANS_PER_BORROWER) {
    throw new Error("Borrower has reached the maximum number of active loans.");
  }

  // Lender wallet must still cover the counter amount.
  const { data: wallet } = await svc.from("wallets")
    .select("available_balance_cents").eq("user_id", user.id).single();
  if (!wallet || wallet.available_balance_cents < offer.amount_cents) {
    throw new Error("Insufficient wallet balance to fund this counter-offer.");
  }

  const principal = offer.amount_cents;
  const monthly = calcMonthlyPayment(principal, offer.apr_bps, offer.term_months);
  const totalInt = calcTotalInterest(principal, offer.apr_bps, offer.term_months);

  const { data: loan, error: loanErr } = await svc.from("loans").insert({
    request_id: offer.request_id,
    offer_id: offer.id,
    borrower_id: req.borrower_id,
    lender_id: user.id,
    community_id: offer.community_id,
    principal_cents: principal,
    apr_bps: offer.apr_bps,
    term_months: offer.term_months,
    monthly_payment_cents: monthly,
    total_interest_cents: totalInt,
    status: "pending_signature",
  }).select("id").single();
  if (loanErr || !loan) throw new Error(loanErr?.message ?? "Loan creation failed.");

  await svc.from("loan_offers").update({ status: "accepted", decided_at: new Date().toISOString() }).eq("id", offer.id);
  await svc.from("loan_offers").update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("request_id", offer.request_id).neq("id", offer.id).eq("status", "pending");
  await svc.from("loan_requests").update({ status: "converted" }).eq("id", offer.request_id);

  await sendNotification(req.borrower_id, "offer_accepted", {
    title: "Lender accepted your counter-offer",
    body: `Your counter-offer of ${formatEur(principal)} at ${formatBps(offer.apr_bps)} APR was accepted. Open the agreement to review and sign.`,
    link_url: `/agreements/${loan.id}/sign`,
    metadata: { loanId: loan.id },
  });

  await writeAuditLog({
    actor_user_id: user.id, action_type: "counter_offer.accepted_by_lender",
    resource_type: "loan", resource_id: loan.id,
    metadata: { offer_id: offer.id, principal_cents: principal, apr_bps: offer.apr_bps },
  });

  redirect(`/agreements/${loan.id}/sign`);
}
