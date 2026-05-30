import Link from "next/link";
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur, formatBps, formatDate } from "@/lib/utils";

const ACTIVE_STATUSES = ["pending_signature", "pending_disbursement", "active", "in_grace", "in_default"];
const CLOSED_STATUSES = ["paid_off", "written_off"];

function statusTone(status: string): string {
  if (status === "active") return "text-[var(--success)]";
  if (status === "paid_off") return "text-[var(--ink-muted)]";
  if (status === "in_default" || status === "written_off") return "text-[var(--danger)]";
  if (status === "in_grace") return "text-[var(--warning)]";
  return "text-[var(--brand)]";
}

export default async function LoansIndexPage() {
  const { user } = await requireVerified();
  const svc = createService();

  // Pull every loan the user is involved in (either side), most recent first.
  const { data: loans } = await svc.from("loans")
    .select(`
      id, status, principal_cents, apr_bps, term_months, monthly_payment_cents,
      total_interest_cents, disbursed_at, first_payment_due_at, paid_off_at,
      borrower_id, lender_id, created_at,
      borrower:users!loans_borrower_id_fkey(first_name, last_name),
      lender:users!loans_lender_id_fkey(first_name, last_name)
    `)
    .or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Per-loan repayment progress (paid count / total).
  const loanIds = (loans ?? []).map((l: any) => l.id);
  const { data: reps } = loanIds.length > 0
    ? await svc.from("repayments").select("loan_id, status").in("loan_id", loanIds)
    : { data: [] as any[] };

  const progressByLoan = new Map<string, { paid: number; total: number }>();
  for (const r of reps ?? []) {
    const e = progressByLoan.get(r.loan_id) ?? { paid: 0, total: 0 };
    e.total += 1;
    if (r.status === "paid") e.paid += 1;
    progressByLoan.set(r.loan_id, e);
  }

  const active = (loans ?? []).filter((l: any) => ACTIVE_STATUSES.includes(l.status));
  const closed = (loans ?? []).filter((l: any) => CLOSED_STATUSES.includes(l.status));

  const renderRow = (l: any) => {
    const isBorrower = l.borrower_id === user.id;
    const counter = isBorrower ? l.lender : l.borrower;
    const counterName = `${counter?.first_name ?? ""} ${counter?.last_name?.[0] ?? ""}.`.trim() || "—";
    const progress = progressByLoan.get(l.id);
    const totalRepayment = l.principal_cents + (l.total_interest_cents ?? 0);
    return (
      <Link
        key={l.id}
        href={`/loans/${l.id}`}
        className="card-hover block p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-[var(--ink-subtle)]">
              {isBorrower ? "Borrowing from" : "Lending to"} {counterName}
            </div>
            <div className="text-lg font-bold tabular mt-0.5">
              {formatEur(l.principal_cents)} · {formatBps(l.apr_bps)} · {l.term_months}mo
            </div>
            <div className="text-sm text-[var(--ink-muted)] mt-0.5">
              {formatEur(l.monthly_payment_cents)} per month · total {formatEur(totalRepayment)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-sm font-semibold capitalize ${statusTone(l.status)}`}>
              {l.status.replaceAll("_", " ")}
            </div>
            {progress && (
              <div className="text-xs text-[var(--ink-muted)] mt-0.5 tabular">
                {progress.paid}/{progress.total} paid
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-[var(--ink-subtle)] uppercase tracking-wide">Disbursed</div>
            <div className="tabular mt-0.5">{l.disbursed_at ? formatDate(l.disbursed_at) : "—"}</div>
          </div>
          <div>
            <div className="text-[var(--ink-subtle)] uppercase tracking-wide">Next due</div>
            <div className="tabular mt-0.5">
              {l.status === "paid_off" ? "—" : (l.first_payment_due_at ? formatDate(l.first_payment_due_at) : "—")}
            </div>
          </div>
          <div>
            <div className="text-[var(--ink-subtle)] uppercase tracking-wide">Paid off</div>
            <div className="tabular mt-0.5">{l.paid_off_at ? formatDate(l.paid_off_at) : "—"}</div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight leading-[1.1]">Your loans</h1>
        <p className="text-[var(--ink-muted)]">All loans you have borrowed or funded — active and past.</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Active ({active.length})</h2>
        {active.length > 0 ? (
          <div className="grid gap-2">{active.map(renderRow)}</div>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">No active loans right now.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Previous ({closed.length})</h2>
        {closed.length > 0 ? (
          <div className="grid gap-2">{closed.map(renderRow)}</div>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">No previous loans yet.</p>
        )}
      </section>
    </div>
  );
}
