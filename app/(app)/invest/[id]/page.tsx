import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur, formatBps } from "@/lib/utils";
import { calcMonthlyPayment } from "@/lib/finance/amortization";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import OfferForm from "./offer-form";
import { acceptCounterOfferAction } from "@/app/actions/lend";

export default async function InvestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await requireVerified();
  const svc = createService();

  const { data: req } = await svc.from("loan_requests")
    .select("*, users!loan_requests_borrower_id_fkey(first_name, last_name)")
    .eq("id", id).single();
  if (!req) return <p className="text-sm text-[var(--danger)]">Loan request not found.</p>;
  if (req.borrower_id === user.id) return <p className="text-sm text-[var(--danger)]">You cannot offer to fund your own request.</p>;
  if (req.community_id !== profile.community_id) return <p className="text-sm text-[var(--danger)]">Out of community.</p>;
  if (!["open", "partially_funded"].includes(req.status)) return <p className="text-sm text-[var(--danger)]">This request is no longer open.</p>;

  const { data: scoreRow } = await svc.from("credit_scores")
    .select("*").eq("user_id", req.borrower_id)
    .order("computed_at", { ascending: false }).limit(1).maybeSingle();

  const { data: assessment } = await svc.from("borrower_assessments")
    .select("monthly_income_cents").eq("user_id", req.borrower_id)
    .order("submitted_at", { ascending: false }).limit(1).maybeSingle();

  const { data: wallet } = await svc.from("wallets")
    .select("available_balance_cents").eq("user_id", user.id).single();

  const { data: counterOffers } = await svc.from("loan_offers")
    .select("id, amount_cents, apr_bps, term_months, message_to_borrower, status, created_at")
    .eq("request_id", id)
    .eq("lender_id", user.id)
    .eq("proposed_by_borrower", true)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const monthlyAtMaxApr = calcMonthlyPayment(req.amount_cents, req.max_apr_bps, req.requested_term_months);
  const incomeCents = assessment?.monthly_income_cents ?? 0;
  const affordabilityPct = incomeCents > 0 ? (monthlyAtMaxApr / incomeCents) * 100 : null;

  const borrowerName = (req as any).users?.first_name ?? "Borrower";

  const components = scoreRow ? [
    { label: "Identity", value: scoreRow.identity_score, max: 20 },
    { label: "Income", value: scoreRow.income_score, max: 25 },
    { label: "Stability", value: scoreRow.stability_score, max: 15 },
    { label: "Financial", value: scoreRow.financial_score, max: 20 },
    { label: "Reputation", value: scoreRow.reputation_score, max: 20 },
  ] : [];

  const affordTone = affordabilityPct == null ? "muted" :
    affordabilityPct < 30 ? "good" : affordabilityPct < 50 ? "warn" : "bad";

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-[var(--fg-subtle)]">Loan request from</div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{borrowerName}</h1>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card padding="md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-[var(--fg-subtle)] uppercase tracking-wide">Requested</div>
                <div className="text-4xl font-bold text-[var(--primary)] tabular mt-1">{formatEur(req.amount_cents)}</div>
              </div>
              <ScoreBadge score={scoreRow?.total_score} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[var(--border)]">
              <div>
                <div className="text-xs text-[var(--fg-subtle)] uppercase tracking-wide">Term</div>
                <div className="font-semibold tabular text-lg mt-0.5">{req.requested_term_months} mo</div>
              </div>
              <div>
                <div className="text-xs text-[var(--fg-subtle)] uppercase tracking-wide">Max APR</div>
                <div className="font-semibold tabular text-lg mt-0.5">{formatBps(req.max_apr_bps)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--fg-subtle)] uppercase tracking-wide">Purpose</div>
                <div className="font-semibold capitalize text-lg mt-0.5">{req.purpose.replaceAll("_", " ")}</div>
              </div>
            </div>
            {req.purpose_description && (
              <p className="text-sm text-[var(--fg-muted)] mt-4 whitespace-pre-wrap leading-relaxed">{req.purpose_description}</p>
            )}
          </Card>

          <Card padding="md">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold">Borrower credit score</h2>
              <div className="text-3xl font-bold text-[var(--primary)] tabular">
                {scoreRow?.total_score ?? "—"}<span className="text-base text-[var(--fg-subtle)]">/100</span>
              </div>
            </div>
            <div className="space-y-3">
              {components.map(c => (
                <div key={c.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--fg-muted)]">{c.label}</span>
                    <span className="font-medium tabular">{c.value} / {c.max}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-alt)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--primary)]"
                      style={{ width: `${(c.value / c.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <h2 className="text-lg font-semibold mb-3">Affordability check</h2>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs text-[var(--fg-subtle)] uppercase tracking-wide">Monthly repayment at max APR</div>
                <div className="text-2xl font-bold tabular mt-1">{formatEur(monthlyAtMaxApr)}</div>
              </div>
              {affordabilityPct !== null && (
                <div
                  className={`text-2xl font-bold tabular ${
                    affordTone === "good" ? "text-[var(--primary)]" :
                    affordTone === "warn" ? "text-[var(--warning)]" :
                    affordTone === "bad" ? "text-[var(--danger)]" : "text-[var(--fg-muted)]"
                  }`}
                >
                  {affordabilityPct.toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--fg-muted)] mt-3">
              {affordabilityPct === null
                ? "Borrower has not declared income."
                : `Of the borrower's declared monthly income. Comfortable threshold is under 30%.`}
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24 space-y-4">
            {counterOffers && counterOffers.length > 0 && (
              <Card padding="md" className="border-[var(--brand)] bg-[var(--brand-soft)]">
                <h2 className="text-lg font-semibold text-[var(--brand)]">
                  Borrower countered your offer
                </h2>
                <p className="text-sm text-[var(--fg-muted)] mt-1 mb-3">
                  Review the borrower's terms below. Accepting opens the agreement to sign.
                </p>
                <ul className="space-y-3">
                  {counterOffers.map((c: any) => (
                    <li key={c.id} className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)]">
                      <div className="text-sm font-semibold tabular">
                        {formatEur(c.amount_cents)} at {formatBps(c.apr_bps)} APR · {c.term_months}mo
                      </div>
                      {c.message_to_borrower && (
                        <p className="text-xs italic text-[var(--ink-muted)] mt-1">
                          "{c.message_to_borrower}"
                        </p>
                      )}
                      <form action={acceptCounterOfferAction} className="mt-3">
                        <input type="hidden" name="offer_id" value={c.id} />
                        <button
                          className="w-full px-3 py-2 rounded-md bg-[var(--brand)] text-[var(--brand-fg)] text-sm font-semibold"
                        >
                          Accept counter & sign agreement
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card padding="md">
              <h2 className="text-lg font-semibold">Make your offer</h2>
              <p className="text-sm text-[var(--fg-muted)] mt-1 mb-4">
                You set the APR, you pick the amount. The borrower decides whether to accept.
              </p>
              <OfferForm
                requestId={id}
                maxApr={req.max_apr_bps / 100}
                maxAmount={Math.min(req.amount_cents, wallet?.available_balance_cents ?? 0) / 100}
                defaultTerm={req.requested_term_months}
                walletEur={(wallet?.available_balance_cents ?? 0) / 100}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
