import Link from "next/link";
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur, formatBps, formatDate } from "@/lib/utils";
import { previewEarlyPayoff } from "@/app/actions/repayment";
import EarlyPayoffButton from "./early-payoff-button";

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireVerified();
  const svc = createService();

  const { data: loan } = await svc.from("loans").select("*").eq("id", id).single();
  if (!loan || (loan.borrower_id !== user.id && loan.lender_id !== user.id)) {
    return <p className="text-sm text-[var(--error)]">Loan not found.</p>;
  }
  const { data: repayments } = await svc.from("repayments").select("*").eq("loan_id", id).order("sequence_number");

  const isBorrower = loan.borrower_id === user.id;
  const canPayOff = isBorrower && (loan.status === "active" || loan.status === "in_grace");
  const payoff = canPayOff ? await previewEarlyPayoff(id) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Loan details</h1>

      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <div className="text-2xl font-bold">{formatEur(loan.principal_cents)}</div>
        <div className="text-sm text-[var(--muted)]">{formatBps(loan.apr_bps)} APR · {loan.term_months} months · {formatEur(loan.monthly_payment_cents)}/mo</div>
        <div className="text-xs text-[var(--muted)] mt-2">Status: <span className="font-semibold capitalize">{loan.status.replaceAll("_", " ")}</span></div>
        <div className="text-xs text-[var(--muted)]">You are the {isBorrower ? "borrower" : "lender"}.</div>
      </div>

      {loan.status === "pending_signature" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link
            href={`/agreements/${loan.id}/sign`}
            className="block text-center px-4 py-3 rounded-lg bg-[var(--brand)] text-[var(--brand-fg)] font-semibold"
          >
            Review & sign agreement
          </Link>
          <a
            href={`/api/agreements/${loan.id}/pdf?download=1`}
            download={`loan-agreement-${loan.id.slice(0, 8)}.pdf`}
            className="block text-center px-4 py-3 rounded-lg border border-[var(--border-strong)] font-semibold hover:border-[var(--brand)]"
          >
            Download draft (PDF)
          </a>
        </div>
      )}

      {canPayOff && payoff && (
        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2">
          <h2 className="font-bold">Pay off loan early</h2>
          <div className="text-sm text-[var(--ink-muted)]">
            Closing early settles the full remaining principal plus the entire interest you originally agreed to pay.
            The loan is contracted as a fixed-return product to your lender — closing early shortens the term but
            does not reduce the interest. Your credit score updates immediately on closure.
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-xs text-[var(--ink-muted)]">Remaining principal</div>
              <div className="font-semibold">{formatEur(payoff.remainingPrincipal)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--ink-muted)]">Interest still owed</div>
              <div className="font-semibold">{formatEur(payoff.remainingInterest)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--ink-muted)]">Total payoff</div>
              <div className="font-semibold">{formatEur(payoff.total)}</div>
            </div>
          </div>
          <EarlyPayoffButton loanId={id} totalEur={(payoff.total / 100).toFixed(2)} />
        </div>
      )}

      <h2 className="font-bold">Repayment schedule</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)]">
            <tr><th className="p-2 text-left">#</th><th className="p-2 text-left">Due</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Status</th></tr>
          </thead>
          <tbody>
            {repayments?.map(r => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="p-2">{r.sequence_number}</td>
                <td className="p-2">{formatDate(r.due_date)}</td>
                <td className="p-2 text-right">{formatEur(r.total_due_cents)}</td>
                <td className="p-2 text-right capitalize">
                  {r.status === "paid" && <span className="text-[var(--success)]">✓ Paid</span>}
                  {r.status === "scheduled" && <span className="text-[var(--muted)]">Scheduled</span>}
                  {r.status === "late" && <span className="text-[var(--warning)]">Late</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <a
        href={`/api/agreements/${loan.id}/pdf?download=1`}
        download={`loan-agreement-${loan.id.slice(0, 8)}.pdf`}
        className="text-sm text-[var(--primary)] underline"
      >
        Download {loan.borrower_signed_at && loan.lender_signed_at ? "signed " : ""}agreement (PDF)
      </a>
    </div>
  );
}
