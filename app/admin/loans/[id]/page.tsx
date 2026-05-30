import { createService } from "@/lib/db/client";
import { formatEur, formatBps, formatDate } from "@/lib/utils";
import { timeWarpLoanAction } from "@/app/actions/admin";

export default async function AdminLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const svc = createService();
  const { data: loan } = await svc.from("loans").select("*").eq("id", id).single();
  if (!loan) return <p>Not found.</p>;
  const { data: repayments } = await svc.from("repayments").select("*").eq("loan_id", id).order("sequence_number");

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Loan {id.slice(0, 8)}</h1>
      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <div className="text-2xl font-bold">{formatEur(loan.principal_cents)}</div>
        <div className="text-sm">{formatBps(loan.apr_bps)} · {loan.term_months}mo · {formatEur(loan.monthly_payment_cents)}/mo</div>
        <div className="text-xs text-[var(--muted)] capitalize mt-1">Status: {loan.status.replace(/_/g, " ")}</div>
      </div>

      <div className="p-4 bg-[var(--warning)]/10 border border-[var(--warning)] rounded-xl">
        <h2 className="font-bold mb-2">Demo helpers</h2>
        <form action={timeWarpLoanAction} className="flex gap-2 items-end">
          <input type="hidden" name="loan_id" value={loan.id} />
          <div>
            <label className="text-xs">Advance time by (months)</label>
            <input name="months" type="number" min={1} max={12} defaultValue={1} className="!w-24" />
          </div>
          <button className="px-3 py-2 rounded-md bg-[var(--warning)] text-white text-sm font-semibold">Time-warp & process repayments</button>
        </form>
        <p className="text-xs text-[var(--muted)] mt-2">Backdates the next due date(s) and runs the repayment processor immediately.</p>
      </div>

      <h2 className="font-bold">Repayments</h2>
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg)] text-left">
          <tr><th className="p-2">#</th><th className="p-2">Due</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Status</th></tr>
        </thead>
        <tbody>
          {repayments?.map(r => (
            <tr key={r.id} className="border-t border-[var(--border)]">
              <td className="p-2">{r.sequence_number}</td>
              <td className="p-2">{formatDate(r.due_date)}</td>
              <td className="p-2 text-right">{formatEur(r.total_due_cents)}</td>
              <td className="p-2 text-right capitalize">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
