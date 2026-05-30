import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import {
  maxLoanFromScore,
  MAX_ACTIVE_LOANS_PER_BORROWER,
  ACTIVE_LOAN_STATUSES,
} from "@/lib/scoring/limits";
import { formatEur } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import BorrowForm from "./borrow-form";

const OPEN_REQUEST_STATUSES = ["open", "partially_funded"] as const;

export default async function BorrowPage() {
  const { user } = await requireVerified();
  const svc = createService();

  const [
    { data: scoreRow },
    { count: activeLoansCount },
    { data: myRequests },
    { data: borrowerLoans },
  ] = await Promise.all([
    svc.from("credit_scores").select("total_score").eq("user_id", user.id)
      .order("computed_at", { ascending: false }).limit(1).maybeSingle(),
    svc.from("loans").select("id", { count: "exact", head: true })
      .eq("borrower_id", user.id).in("status", [...ACTIVE_LOAN_STATUSES]),
    svc.from("loan_requests")
      .select("id, amount_cents, requested_term_months, status, purpose, posted_at, loan_offers(id, status)")
      .eq("borrower_id", user.id)
      .order("posted_at", { ascending: false })
      .limit(10),
    svc.from("loans")
      .select("id, principal_cents, apr_bps, term_months, status, disbursed_at, paid_off_at, lender:users!loans_lender_id_fkey(first_name, last_name)")
      .eq("borrower_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const score = scoreRow?.total_score ?? 0;
  const limit = maxLoanFromScore(score);
  const active = activeLoansCount ?? 0;
  const atMax = active >= MAX_ACTIVE_LOANS_PER_BORROWER;

  if (!scoreRow) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <h1 className="text-3xl font-bold tracking-tight">Request a loan</h1>
        <Card padding="lg">
          <p className="text-[var(--ink-muted)]">
            You need to complete the borrower assessment before requesting a loan.
          </p>
          <LinkButton href="/onboarding/assessment" className="mt-5">
            Complete assessment
          </LinkButton>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight leading-[1.1]">Request a loan</h1>
        <p className="text-[var(--ink-muted)] mt-2">
          Once posted, fellow NCI members can offer to fund you. You decide which offer to accept.
        </p>
      </header>

      {/* Active loans status card */}
      <ActiveLoansCard active={active} />

      {/* Score summary */}
      <Card padding="md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--ink-subtle)]">Your credit score</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-[32px] font-bold tabular leading-none">{score}</span>
              <span className="text-[var(--ink-muted)] text-sm">/ 100 · {limit.riskTier}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--ink-subtle)]">Maximum amount</div>
            <div className="mt-1 text-[24px] font-bold tabular text-[var(--brand)]">
              {limit.eligible ? formatEur(limit.maxAmountCents) : "Not eligible"}
            </div>
          </div>
        </div>
      </Card>

      {atMax ? (
        <Card padding="md" className="!border-[color-mix(in_srgb,var(--warning)_40%,transparent)] !bg-[color-mix(in_srgb,var(--warning)_8%,transparent)]">
          <p className="text-sm text-[var(--ink)]">
            You have reached the maximum of {MAX_ACTIVE_LOANS_PER_BORROWER} active loans.
            Close an existing loan to request a new one.
          </p>
          <Link href="/dashboard" className="inline-block mt-3 text-sm font-semibold text-[var(--brand)] hover:underline">
            View your loans →
          </Link>
        </Card>
      ) : (
        <BorrowForm maxAmountEur={limit.maxAmountCents / 100} eligible={limit.eligible} />
      )}

      <YourRequestsSection requests={(myRequests ?? []) as RequestRow[]} loans={(borrowerLoans ?? []) as LoanRow[]} />
    </div>
  );
}

type RequestRow = {
  id: string;
  amount_cents: number;
  requested_term_months: number;
  status: string;
  purpose: string;
  posted_at: string | null;
  loan_offers?: { id: string; status: string }[];
};

type LoanRow = {
  id: string;
  principal_cents: number;
  apr_bps: number;
  term_months: number;
  status: string;
  disbursed_at: string | null;
  paid_off_at: string | null;
  lender?: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null;
};

function OfferBadge({ pending, total }: Readonly<{ pending: number; total: number }>) {
  if (pending > 0) {
    return (
      <div className="text-sm font-bold text-[var(--brand)]">
        {pending} pending offer{pending === 1 ? "" : "s"}
      </div>
    );
  }
  if (total > 0) {
    return <div className="text-sm text-[var(--ink-muted)]">No pending offers</div>;
  }
  return <div className="text-sm text-[var(--ink-muted)]">Awaiting offers</div>;
}

function YourRequestsSection({ requests, loans }: Readonly<{ requests: RequestRow[]; loans: LoanRow[] }>) {
  const open = requests.filter(r => OPEN_REQUEST_STATUSES.includes(r.status as any));
  const past = requests.filter(r => !OPEN_REQUEST_STATUSES.includes(r.status as any));

  if (requests.length === 0 && loans.length === 0) return null;

  return (
    <section className="space-y-6">
      {open.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Your open loan requests</h2>
          <div className="grid gap-2">
            {open.map(r => {
              const offers = r.loan_offers ?? [];
              const pendingOffers = offers.filter(o => o.status === "pending").length;
              return (
                <Link
                  key={r.id}
                  href={`/borrow/${r.id}`}
                  className="card-hover flex justify-between items-center p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
                >
                  <div>
                    <div className="font-semibold tabular">
                      {formatEur(r.amount_cents)} · {r.requested_term_months}mo
                    </div>
                    <div className="text-sm text-[var(--ink-muted)] capitalize">
                      {r.purpose.replaceAll("_", " ")} · {r.status.replaceAll("_", " ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <OfferBadge pending={pendingOffers} total={offers.length} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {loans.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Your loans</h2>
          <div className="grid gap-2">
            {loans.map(l => {
              const lender = Array.isArray(l.lender) ? l.lender[0] : l.lender;
              const lenderName = `${lender?.first_name ?? ""} ${lender?.last_name?.[0] ?? ""}.`.trim() || "lender";
              return (
                <Link
                  key={l.id}
                  href={`/loans/${l.id}`}
                  className="card-hover flex justify-between items-center p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
                >
                  <div className="min-w-0">
                    <div className="font-semibold tabular">
                      {formatEur(l.principal_cents)} · {(l.apr_bps / 100).toFixed(2)}% · {l.term_months}mo
                    </div>
                    <div className="text-sm text-[var(--ink-muted)]">
                      From {lenderName} · <span className="capitalize">{l.status.replaceAll("_", " ")}</span>
                    </div>
                  </div>
                  <div className="text-sm text-[var(--brand)] font-semibold shrink-0 ml-3">View →</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Previous requests</h2>
          <div className="grid gap-2">
            {past.map(r => (
              <Link
                key={r.id}
                href={`/borrow/${r.id}`}
                className="card-hover flex justify-between items-center p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
              >
                <div>
                  <div className="font-semibold tabular">
                    {formatEur(r.amount_cents)} · {r.requested_term_months}mo
                  </div>
                  <div className="text-sm text-[var(--ink-muted)] capitalize">
                    {r.purpose.replaceAll("_", " ")} · {r.status.replaceAll("_", " ")}
                  </div>
                </div>
                <div className="text-sm text-[var(--ink-muted)] shrink-0 ml-3">View →</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ActiveLoansCard({ active }: Readonly<{ active: number }>) {
  const atMax = active >= MAX_ACTIVE_LOANS_PER_BORROWER;
  const tone = atMax
    ? {
        bg: "color-mix(in srgb, var(--warning) 8%, transparent)",
        border: "color-mix(in srgb, var(--warning) 40%, transparent)",
        Icon: AlertTriangle,
        iconColor: "var(--warning)",
      }
    : {
        bg: "color-mix(in srgb, var(--success) 8%, transparent)",
        border: "color-mix(in srgb, var(--success) 35%, transparent)",
        Icon: CheckCircle2,
        iconColor: "var(--success)",
      };
  const { Icon } = tone;
  return (
    <div
      className="rounded-[var(--radius-md)] p-5 flex items-center gap-4"
      style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      <Icon size={22} style={{ color: tone.iconColor }} />
      <div className="flex-1">
        <div className="font-semibold">
          You have {active} of {MAX_ACTIVE_LOANS_PER_BORROWER} active loans
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {Array.from({ length: MAX_ACTIVE_LOANS_PER_BORROWER }).map((_, i) => (
            <span
              key={`slot-${i + 1}`}
              className="block w-3 h-3 rounded-full"
              style={{
                background: i < active ? tone.iconColor : "var(--border-strong)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
