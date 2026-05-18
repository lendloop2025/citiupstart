"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createService } from "@/lib/db/client";
import { requireVerified } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { sendNotification } from "@/lib/notifications/send";
import { transferWallet } from "@/lib/finance/wallet";
import { buildSchedule } from "@/lib/finance/amortization";
import { storeSignedAgreementPdf } from "@/lib/pdf/store";
import { formatEur } from "@/lib/utils";

export async function signAgreementAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const loanId = String(formData.get("loan_id") || "");
  if (!loanId) return { error: "Missing loan." };

  const svc = createService();
  const { data: loan } = await svc.from("loans").select("*").eq("id", loanId).single();
  if (!loan) return { error: "Loan not found." };
  if (loan.status !== "pending_signature" && loan.status !== "pending_disbursement") {
    return { error: "Loan is not awaiting signature." };
  }

  const isBorrower = loan.borrower_id === user.id;
  const isLender = loan.lender_id === user.id;
  if (!isBorrower && !isLender) return { error: "Not authorised." };

  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown";
  const update: any = {};
  if (isBorrower) {
    if (loan.borrower_signed_at) return { error: "Already signed." };
    update.borrower_signed_at = new Date().toISOString();
    update.borrower_signature_ip = ip;
  } else {
    if (loan.lender_signed_at) return { error: "Already signed." };
    update.lender_signed_at = new Date().toISOString();
    update.lender_signature_ip = ip;
  }
  await svc.from("loans").update(update).eq("id", loan.id);

  await writeAuditLog({
    actor_user_id: user.id,
    action_type: isBorrower ? "loan.signed.borrower" : "loan.signed.lender",
    resource_type: "loan", resource_id: loan.id,
  });

  const { data: refreshed } = await svc.from("loans").select("*").eq("id", loan.id).single();
  if (!refreshed) return { error: "Loan disappeared." };

  const bothSigned = refreshed.borrower_signed_at && refreshed.lender_signed_at;
  const counterpartyId = isBorrower ? refreshed.lender_id : refreshed.borrower_id;
  const signerLabel = isBorrower ? "borrower" : "lender";

  if (!bothSigned) {
    await sendNotification(counterpartyId, "system_announcement", {
      title: "Agreement signed by counterparty",
      body: `The ${signerLabel} has signed the loan agreement. Once you sign, the loan will be disbursed.`,
      link_url: `/agreements/${refreshed.id}/sign`,
    });
    redirect(`/loans/${loan.id}`);
  }

  if (refreshed.status !== "active") {
    await transferWallet({
      fromUserId: refreshed.lender_id, toUserId: refreshed.borrower_id,
      amountCents: refreshed.principal_cents,
      entryTypeFrom: "investment_disbursed", entryTypeTo: "investment_disbursed",
      relatedLoanId: refreshed.id,
      description: `Loan disbursement ${refreshed.id.slice(0, 8)}`,
    });

    const schedule = buildSchedule({
      principalCents: refreshed.principal_cents,
      aprBps: refreshed.apr_bps,
      termMonths: refreshed.term_months,
      startDate: new Date(),
    });
    await svc.from("repayments").insert(schedule.map(s => ({
      loan_id: refreshed.id,
      sequence_number: s.sequence_number,
      due_date: s.due_date.toISOString().slice(0, 10),
      principal_cents: s.principal_cents,
      interest_cents: s.interest_cents,
      platform_fee_cents: s.platform_fee_cents,
      total_due_cents: s.total_due_cents,
    })));

    await svc.from("loans").update({
      status: "active",
      disbursed_at: new Date().toISOString(),
      first_payment_due_at: schedule[0].due_date.toISOString().slice(0, 10),
    }).eq("id", refreshed.id);

    try {
      const path = await storeSignedAgreementPdf(refreshed.id);
      if (path) {
        await svc.from("loans").update({ agreement_pdf_path: path }).eq("id", refreshed.id);
      }
    } catch (e) {
      console.error("Failed to store signed agreement PDF:", e);
    }

    await writeAuditLog({
      actor_user_id: user.id,
      action_type: "loan.disbursed",
      resource_type: "loan", resource_id: refreshed.id,
      metadata: { principal_cents: refreshed.principal_cents },
    });

    const monthlyEur = (refreshed.monthly_payment_cents / 100).toFixed(2);
    const principalEur = (refreshed.principal_cents / 100).toFixed(2);

    await sendNotification(refreshed.borrower_id, "loan_disbursed", {
      title: "Your loan is funded!",
      body: `${formatEur(refreshed.principal_cents)} has been credited to your wallet. First repayment of ${formatEur(refreshed.monthly_payment_cents)} is due in 30 days.`,
      link_url: `/loans/${refreshed.id}`,
      metadata: { amountEur: principalEur, monthlyEur, loanId: refreshed.id },
    });

    await sendNotification(refreshed.lender_id, "loan_disbursed", {
      title: "Loan disbursed to borrower",
      body: `Your investment of ${formatEur(refreshed.principal_cents)} has been transferred to the borrower. Repayments of ${formatEur(refreshed.monthly_payment_cents)} will arrive monthly.`,
      link_url: `/loans/${refreshed.id}`,
      metadata: { amountEur: principalEur, monthlyEur, loanId: refreshed.id },
    });
  }

  redirect(`/loans/${loan.id}`);
}
