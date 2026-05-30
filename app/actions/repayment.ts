"use server";
import { redirect } from "next/navigation";
import { createService } from "@/lib/db/client";
import { requireVerified } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { sendNotification } from "@/lib/notifications/send";
import { recomputeScore } from "@/lib/scoring/recompute";
import { transferWallet, debitWallet, creditWallet } from "@/lib/finance/wallet";
import { formatEur } from "@/lib/utils";

const PLATFORM_USER_ID_ENV = "PLATFORM_TREASURY_USER_ID";

async function notifyRepaymentReceived(loanId: string, repaymentSeq: number, totalCents: number, monthlyEur: string) {
  const svc = createService();
  const { data: loan } = await svc.from("loans")
    .select("borrower_id, lender_id, term_months").eq("id", loanId).single();
  if (!loan) return;

  await sendNotification(loan.borrower_id, "system_announcement", {
    title: "Repayment received",
    body: `Repayment ${repaymentSeq} of ${formatEur(totalCents)} was processed successfully.`,
    link_url: `/loans/${loanId}`,
  });
  await sendNotification(loan.lender_id, "system_announcement", {
    title: "Repayment received",
    body: `Repayment ${repaymentSeq} of ${formatEur(totalCents)} from your borrower has arrived in your wallet.`,
    link_url: `/loans/${loanId}`,
    metadata: { amountEur: monthlyEur, loanId },
  });
}

async function notifyLoanFullyRepaid(loanId: string) {
  const svc = createService();
  const { data: loan } = await svc.from("loans")
    .select("borrower_id, lender_id, principal_cents").eq("id", loanId).single();
  if (!loan) return;

  await sendNotification(loan.borrower_id, "loan_paid_off", {
    title: "Loan fully repaid",
    body: "Congratulations — you have completed all repayments on this loan. Your credit score has been updated.",
    link_url: `/loans/${loanId}`,
  });
  await sendNotification(loan.lender_id, "loan_paid_off", {
    title: "Loan fully repaid",
    body: `Your borrower has finished repaying ${formatEur(loan.principal_cents)} principal in full.`,
    link_url: `/loans/${loanId}`,
  });
}

export async function processDueRepaymentsAction() {
  const svc = createService();

  const { data: due } = await svc.from("repayments")
    .select("id, loan_id, sequence_number, total_due_cents, platform_fee_cents, due_date, loans!inner(borrower_id, lender_id, status)")
    .eq("status", "scheduled")
    .lte("due_date", new Date().toISOString().slice(0, 10));

  let processed = 0;
  const closedLoans = new Set<string>();
  const borrowersToScore = new Set<string>();

  for (const r of due ?? []) {
    const loan: any = (r as any).loans;
    if (loan.status !== "active") continue;

    try {
      await transferWallet({
        fromUserId: loan.borrower_id,
        toUserId: loan.lender_id,
        amountCents: r.total_due_cents - r.platform_fee_cents,
        entryTypeFrom: "repayment_principal",
        entryTypeTo: "repayment_interest",
        relatedLoanId: r.loan_id,
        description: `Repayment ${r.sequence_number}`,
      });
      // Platform fee debit (already on borrower side covered by total_due; record fee ledger row only)
      await debitWallet({
        userId: loan.borrower_id,
        amountCents: r.platform_fee_cents,
        entryType: "platform_fee",
        relatedLoanId: r.loan_id,
        description: `Platform fee on instalment ${r.sequence_number}`,
      });

      const platformId = process.env[PLATFORM_USER_ID_ENV];
      if (platformId) {
        await creditWallet({
          userId: platformId,
          amountCents: r.platform_fee_cents,
          entryType: "platform_fee",
          relatedLoanId: r.loan_id,
          description: `Platform fee on instalment ${r.sequence_number}`,
        });
      }

      await svc.from("repayments")
        .update({ status: "paid", paid_amount_cents: r.total_due_cents, paid_at: new Date().toISOString() })
        .eq("id", r.id);

      processed++;
      borrowersToScore.add(loan.borrower_id);

      const monthlyEur = ((r.total_due_cents - r.platform_fee_cents) / 100).toFixed(2);
      await notifyRepaymentReceived(r.loan_id, r.sequence_number, r.total_due_cents, monthlyEur);

      const { count: stillDue } = await svc.from("repayments")
        .select("id", { count: "exact", head: true })
        .eq("loan_id", r.loan_id).eq("status", "scheduled");

      if ((stillDue ?? 0) === 0) {
        await svc.from("loans").update({ status: "paid_off", paid_off_at: new Date().toISOString() }).eq("id", r.loan_id);
        closedLoans.add(r.loan_id);
      }
    } catch (e: any) {
      const days = Math.max(0, Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000));
      await svc.from("repayments")
        .update({ status: "late", days_late: days })
        .eq("id", r.id);
      await sendNotification(loan.borrower_id, "repayment_late", {
        title: "Payment overdue",
        body: `Your repayment of ${formatEur(r.total_due_cents)} due on ${r.due_date} could not be collected (${e?.message ?? "unknown error"}). Please top up your wallet to avoid late fees.`,
        link_url: `/loans/${r.loan_id}`,
        metadata: { amountEur: (r.total_due_cents / 100).toFixed(2), dueDate: r.due_date, loanId: r.loan_id },
      });
    }
  }

  for (const loanId of closedLoans) {
    await writeAuditLog({
      action_type: "loan.paid_off",
      resource_type: "loan", resource_id: loanId,
    });
    await notifyLoanFullyRepaid(loanId);
  }

  for (const borrowerId of borrowersToScore) {
    await recomputeScore(borrowerId);
  }

  return { processed, closed: closedLoans.size };
}

export async function applyLateFeesAndDefaultsAction() {
  const svc = createService();
  const today = new Date();

  const { data: lateReps } = await svc.from("repayments")
    .select("id, loan_id, due_date, total_due_cents, late_fee_cents, days_late")
    .in("status", ["scheduled", "late"])
    .lt("due_date", today.toISOString().slice(0, 10));

  for (const r of lateReps ?? []) {
    const days = Math.max(0, Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000));
    if (days <= 0) continue;
    const weeksLate = Math.ceil(days / 7);
    const newFee = Math.round(r.total_due_cents * 0.02 * weeksLate);
    await svc.from("repayments")
      .update({ status: "late", late_fee_cents: newFee, days_late: days })
      .eq("id", r.id);
  }

  const { data: defaultableLoans } = await svc.from("repayments")
    .select("loan_id")
    .eq("status", "late")
    .gte("days_late", 90);

  const defaultIds = Array.from(new Set((defaultableLoans ?? []).map(d => d.loan_id)));
  if (defaultIds.length > 0) {
    await svc.from("loans").update({ status: "in_default" }).in("id", defaultIds);
    for (const loanId of defaultIds) {
      const { data: loan } = await svc.from("loans").select("borrower_id, lender_id").eq("id", loanId).single();
      if (!loan) continue;
      await sendNotification(loan.borrower_id, "repayment_late", {
        title: "Loan in default",
        body: "Your loan has been marked as in default after 90 days of missed payment. You remain liable for the full outstanding balance.",
        link_url: `/loans/${loanId}`,
      });
      await sendNotification(loan.lender_id, "repayment_late", {
        title: "Loan in default",
        body: "Your borrower has missed payments for 90+ days. The loan has been marked as in default.",
        link_url: `/loans/${loanId}`,
      });
      await recomputeScore(loan.borrower_id);
      await writeAuditLog({
        action_type: "loan.defaulted", resource_type: "loan", resource_id: loanId,
      });
    }
  }

  return { lateUpdated: lateReps?.length ?? 0, defaultedLoans: defaultIds.length };
}

// Early payoff: borrower closes the loan now but pays the full remaining
// principal AND the full remaining contracted interest (no rebate). The lender
// receives the same total return they would have earned over the full term.
export async function earlyPayoffAction(formData: FormData) {
  const { user } = await requireVerified();
  const loanId = String(formData.get("loan_id") ?? "");
  if (!loanId) throw new Error("Missing loan.");

  const svc = createService();
  const { data: loan } = await svc.from("loans").select("*").eq("id", loanId).single();
  if (!loan) throw new Error("Loan not found.");
  if (loan.borrower_id !== user.id) throw new Error("Not authorised.");
  if (loan.status !== "active" && loan.status !== "in_grace") throw new Error("Loan is not in a payable state.");

  const { data: scheduled } = await svc.from("repayments")
    .select("id, sequence_number, principal_cents, interest_cents, platform_fee_cents, total_due_cents")
    .eq("loan_id", loanId).eq("status", "scheduled").order("sequence_number");
  if (!scheduled || scheduled.length === 0) throw new Error("No scheduled repayments remain.");

  const remainingPrincipal = scheduled.reduce((sum, r) => sum + r.principal_cents, 0);
  const remainingInterest = scheduled.reduce((sum, r) => sum + r.interest_cents, 0);
  const remainingPlatformFee = scheduled.reduce((sum, r) => sum + r.platform_fee_cents, 0);
  const lenderReceives = remainingPrincipal + remainingInterest;
  const totalDebit = lenderReceives + remainingPlatformFee;

  await debitWallet({
    userId: user.id,
    amountCents: totalDebit,
    entryType: "repayment_principal",
    relatedLoanId: loanId,
    description: `Early payoff (${formatEur(totalDebit)})`,
  });
  await creditWallet({
    userId: loan.lender_id,
    amountCents: lenderReceives,
    entryType: "repayment_interest",
    relatedLoanId: loanId,
    description: `Early payoff received (full contracted interest)`,
  });
  const platformId = process.env[PLATFORM_USER_ID_ENV];
  if (platformId && remainingPlatformFee > 0) {
    await creditWallet({
      userId: platformId,
      amountCents: remainingPlatformFee,
      entryType: "platform_fee",
      relatedLoanId: loanId,
      description: "Platform fee on early payoff",
    });
  }

  await svc.from("repayments").update({
    status: "paid",
    paid_at: new Date().toISOString(),
  }).eq("loan_id", loanId).eq("status", "scheduled");

  await svc.from("loans").update({
    status: "paid_off",
    paid_off_at: new Date().toISOString(),
  }).eq("id", loanId);

  await writeAuditLog({
    actor_user_id: user.id,
    action_type: "loan.early_payoff",
    resource_type: "loan", resource_id: loanId,
    metadata: {
      remaining_principal_cents: remainingPrincipal,
      remaining_interest_cents: remainingInterest,
      remaining_platform_fee_cents: remainingPlatformFee,
    },
  });

  await recomputeScore(user.id);

  await sendNotification(loan.lender_id, "loan_paid_off", {
    title: "Loan closed early",
    body: `Your borrower paid off the loan early. ${formatEur(lenderReceives)} (full contracted return) has been credited to your wallet.`,
    link_url: `/loans/${loanId}`,
  });
  await sendNotification(user.id, "loan_paid_off", {
    title: "Loan closed early",
    body: `You paid off the remaining ${formatEur(totalDebit)} in full, including the original contracted interest. Your credit score has been updated.`,
    link_url: `/loans/${loanId}`,
  });

  redirect(`/loans/${loanId}`);
}

export async function previewEarlyPayoff(loanId: string) {
  const svc = createService();
  const { data: scheduled } = await svc.from("repayments")
    .select("principal_cents, interest_cents, platform_fee_cents")
    .eq("loan_id", loanId).eq("status", "scheduled").order("sequence_number");
  if (!scheduled || scheduled.length === 0) return null;

  const remainingPrincipal = scheduled.reduce((sum, r) => sum + r.principal_cents, 0);
  const remainingInterest = scheduled.reduce((sum, r) => sum + r.interest_cents, 0);
  const remainingPlatformFee = scheduled.reduce((sum, r) => sum + r.platform_fee_cents, 0);
  return {
    remainingPrincipal,
    remainingInterest,
    remainingPlatformFee,
    total: remainingPrincipal + remainingInterest + remainingPlatformFee,
  };
}
