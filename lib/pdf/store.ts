import "server-only";
import { createService } from "@/lib/db/client";
import { renderAgreementPdf } from "@/lib/pdf/render";
import { buildSchedule } from "@/lib/finance/amortization";
import { generateAgreementNarrative, type AgreementNarrative } from "@/lib/llm/agreement";

const FALLBACK_NARRATIVE: AgreementNarrative = {
  preamble:
    "This agreement is made between the Borrower and the Lender named below, with 121.ai by LendLoop acting solely as a technology intermediary. By electronically signing, both parties accept the terms set out in this document as a binding contract.",
  sections: [
    {
      title: "Repayment Obligations",
      paragraphs: [
        "The Borrower agrees to repay each instalment by direct debit from their 121.ai wallet on or before each due date set out in the repayment schedule above. Early repayment in full or in part is permitted at any time without penalty.",
      ],
    },
    {
      title: "Default and Late Payment",
      paragraphs: [
        "If a payment is more than one week late, a late fee of 2% of the missed instalment accrues for each week outstanding. If payment remains outstanding for 90 or more days, the loan enters default status and the Borrower remains liable for the full outstanding balance.",
      ],
    },
    {
      title: "Platform Role and Risk Disclosures",
      paragraphs: [
        "121.ai by LendLoop acts as a technology intermediary that introduces the Borrower and Lender. The platform is not a party to this loan, is not a bank, is not authorised by the Central Bank of Ireland, and does not guarantee repayment.",
        "The Lender's funds are at risk. There is no deposit insurance, no investor compensation scheme, and no government guarantee. The Lender may lose part or all of the principal lent.",
      ],
    },
    {
      title: "Governing Law and Electronic Signature",
      paragraphs: [
        "This agreement is governed by the laws of the Republic of Ireland and any dispute is subject to the exclusive jurisdiction of the Irish courts. Both parties consent to electronic signature under the eIDAS Regulation (EU) No 910/2014 and the Irish Electronic Commerce Act 2000.",
      ],
    },
  ],
};

export async function renderAgreementPdfForLoan(loanId: string): Promise<Buffer | null> {
  const svc = createService();
  const { data: loan } = await svc.from("loans").select("*").eq("id", loanId).single();
  if (!loan) return null;

  const [{ data: borrower }, { data: lender }, { data: community }] = await Promise.all([
    svc.from("users").select("first_name, last_name, email, address_line1, address_line2, city, postal_code, country").eq("id", loan.borrower_id).single(),
    svc.from("users").select("first_name, last_name, email, address_line1, address_line2, city, postal_code, country").eq("id", loan.lender_id).single(),
    svc.from("communities").select("name").eq("id", loan.community_id).single(),
  ]);

  const schedule = buildSchedule({
    principalCents: loan.principal_cents,
    aprBps: loan.apr_bps,
    termMonths: loan.term_months,
    startDate: loan.disbursed_at ? new Date(loan.disbursed_at) : new Date(),
  });

  const eur = (c: number) => (c / 100).toFixed(2);
  const totalRepay = loan.principal_cents + loan.total_interest_cents;

  let narrative: AgreementNarrative;
  try {
    narrative = await generateAgreementNarrative({
      loanId: loan.id,
      borrowerName: `${borrower?.first_name} ${borrower?.last_name}`,
      lenderName: `${lender?.first_name} ${lender?.last_name}`,
      community: community?.name ?? "the platform community",
      principalEur: eur(loan.principal_cents),
      aprPct: (loan.apr_bps / 100).toFixed(2),
      termMonths: loan.term_months,
      monthlyPaymentEur: eur(loan.monthly_payment_cents),
      totalRepaymentEur: eur(totalRepay),
    });
  } catch {
    narrative = FALLBACK_NARRATIVE;
  }

  return renderAgreementPdf({
    loanId: loan.id,
    borrower: {
      name: `${borrower?.first_name} ${borrower?.last_name}`,
      email: borrower?.email ?? "",
      address: [borrower?.address_line1, borrower?.city, borrower?.postal_code, borrower?.country].filter(Boolean).join(", "),
    },
    lender: {
      name: `${lender?.first_name} ${lender?.last_name}`,
      email: lender?.email ?? "",
      address: [lender?.address_line1, lender?.city, lender?.postal_code, lender?.country].filter(Boolean).join(", "),
    },
    principalEur: eur(loan.principal_cents),
    aprPct: (loan.apr_bps / 100).toFixed(2),
    termMonths: loan.term_months,
    monthlyPaymentEur: eur(loan.monthly_payment_cents),
    totalInterestEur: eur(loan.total_interest_cents),
    totalRepaymentEur: eur(totalRepay),
    schedule: schedule.map(s => ({
      n: s.sequence_number,
      due: s.due_date.toISOString().slice(0, 10),
      principal: eur(s.principal_cents),
      interest: eur(s.interest_cents),
      total: eur(s.total_due_cents),
    })),
    borrowerSignedAt: loan.borrower_signed_at ?? undefined,
    borrowerIp: loan.borrower_signature_ip ?? undefined,
    lenderSignedAt: loan.lender_signed_at ?? undefined,
    lenderIp: loan.lender_signature_ip ?? undefined,
    narrative,
  });
}

export async function storeSignedAgreementPdf(loanId: string): Promise<string | null> {
  const buffer = await renderAgreementPdfForLoan(loanId);
  if (!buffer) return null;

  const svc = createService();
  const path = `${loanId}/signed-${Date.now()}.pdf`;
  const { error } = await svc.storage.from("agreements").upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    console.error("Storage upload failed:", error);
    return null;
  }
  return path;
}
