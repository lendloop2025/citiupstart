import Link from "next/link";
import { HandCoins, TrendingUp, Plus } from "lucide-react";
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/score-badge";
import { WalletHeroCard } from "@/components/ui/wallet-hero-card";
import { ActionCard } from "@/components/ui/action-card";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { user, profile } = await requireVerified();
  const svc = createService();

  const [
    { data: wallet },
    { data: activeAsLender },
    { data: activeAsBorrower },
    { data: myRequests },
    { data: openRequests, count: communityOpen },
    { data: recentLedger },
    { count: communityActiveLoans },
    { data: weekLedger },
    { data: pendingSignLoans },
    { data: pendingCounterOffers },
  ] = await Promise.all([
    svc.from("wallets").select("*").eq("user_id", user.id).single(),
    svc.from("loans")
      .select("id, principal_cents, apr_bps, term_months, monthly_payment_cents, status, disbursed_at, first_payment_due_at, paid_off_at, borrower:users!loans_borrower_id_fkey(first_name, last_name)")
      .eq("lender_id", user.id).neq("status", "paid_off")
      .order("created_at", { ascending: false }),
    svc.from("loans")
      .select("id, principal_cents, apr_bps, term_months, monthly_payment_cents, status, disbursed_at, first_payment_due_at, paid_off_at, lender:users!loans_lender_id_fkey(first_name, last_name)")
      .eq("borrower_id", user.id).neq("status", "paid_off")
      .order("created_at", { ascending: false }),
    svc.from("loan_requests")
      .select("id, amount_cents, requested_term_months, status, purpose, loan_offers(id, status)")
      .eq("borrower_id", user.id)
      .in("status", ["open", "partially_funded"])
      .order("posted_at", { ascending: false }),
    svc.from("loan_requests")
      .select("id, amount_cents, requested_term_months, max_apr_bps, score_at_request, purpose, posted_at", { count: "exact" })
      .eq("community_id", profile.community_id)
      .in("status", ["open", "partially_funded"])
      .neq("borrower_id", user.id)
      .order("posted_at", { ascending: false }).limit(3),
    svc.from("ledger").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(5),
    svc.from("loans").select("id", { count: "exact", head: true })
      .eq("community_id", profile.community_id).eq("status", "active"),
    svc.from("ledger")
      .select("amount_cents, entry_type, created_at")
      .eq("community_id", profile.community_id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .in("entry_type", ["loan_principal_out"]),
    svc.from("loans")
      .select("id, principal_cents, apr_bps, term_months, borrower_id, lender_id, borrower_signed_at, lender_signed_at, borrower:users!loans_borrower_id_fkey(first_name, last_name), lender:users!loans_lender_id_fkey(first_name, last_name)")
      .or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`)
      .eq("status", "pending_signature"),
    svc.from("loan_offers")
      .select("id, request_id, amount_cents, apr_bps, term_months")
      .eq("lender_id", user.id)
      .eq("proposed_by_borrower", true)
      .eq("status", "pending"),
  ]);

  const totalLent = activeAsLender?.reduce((s, l) => s + l.principal_cents, 0) ?? 0;
  const totalBorrowed = activeAsBorrower?.reduce((s, l) => s + l.principal_cents, 0) ?? 0;
  const balance = wallet?.available_balance_cents ?? 0;
  const invested = wallet?.invested_balance_cents ?? 0;

  const earningsYtd = (recentLedger ?? [])
    .filter(l => l.entry_type === "repayment_interest")
    .reduce((s, l) => s + Math.abs(l.amount_cents), 0);

  const lentThisWeek = (weekLedger ?? [])
    .reduce((s: number, l: any) => s + Math.abs(l.amount_cents), 0);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight leading-[1.1]">
          {greeting()}, {profile.first_name}
        </h1>
        {lentThisWeek > 0 ? (
          <p className="text-[var(--ink-muted)]">
            Your community lent {formatEur(lentThisWeek)} this week.
          </p>
        ) : (communityOpen ?? 0) > 0 ? (
          <p className="text-[var(--ink-muted)]">
            {communityOpen} open loan request{communityOpen === 1 ? "" : "s"} in your community right now.
          </p>
        ) : (
          <p className="text-[var(--ink-muted)]">Your NCI community is quiet today.</p>
        )}
      </header>

      {/* Pending agreements + counter-offers — surfaced above the wallet so it's the first thing the user sees. */}
      {((pendingSignLoans?.length ?? 0) > 0 || (pendingCounterOffers?.length ?? 0) > 0) && (
        <section className="rounded-[var(--radius-md)] border border-[var(--brand)] bg-[var(--brand-soft)] p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--brand)]">Action needed</h2>
          {pendingSignLoans?.map((l: any) => {
            const isLender = l.lender_id === user.id;
            const counter = isLender ? l.borrower : l.lender;
            const youSigned = isLender ? l.lender_signed_at : l.borrower_signed_at;
            const otherSigned = isLender ? l.borrower_signed_at : l.lender_signed_at;
            const counterName = `${counter?.first_name ?? ""} ${counter?.last_name?.[0] ?? ""}.`.trim();
            let label = "Awaiting your signature";
            if (youSigned && !otherSigned) label = `Waiting for ${counterName} to sign`;
            else if (otherSigned && !youSigned) label = `${counterName} has signed — your turn`;
            return (
              <div key={l.id} className="flex items-center justify-between gap-3 p-3 bg-[var(--surface)] rounded-md">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {label} · {formatEur(l.principal_cents)} at {(l.apr_bps / 100).toFixed(2)}% · {l.term_months}mo
                  </div>
                  <div className="text-xs text-[var(--ink-muted)]">
                    {isLender ? "Borrower" : "Lender"}: {counterName || "—"}
                  </div>
                </div>
                <Link
                  href={`/agreements/${l.id}/sign`}
                  className="shrink-0 px-3 py-1.5 rounded-md bg-[var(--brand)] text-[var(--brand-fg)] text-sm font-semibold"
                >
                  {youSigned ? "View status →" : "Review & sign →"}
                </Link>
              </div>
            );
          })}
          {pendingCounterOffers?.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-[var(--surface)] rounded-md">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  Borrower countered your offer · {formatEur(c.amount_cents)} at {(c.apr_bps / 100).toFixed(2)}% · {c.term_months}mo
                </div>
                <div className="text-xs text-[var(--ink-muted)]">Review and accept or decline.</div>
              </div>
              <Link
                href={`/invest/${c.request_id}`}
                className="shrink-0 px-3 py-1.5 rounded-md bg-[var(--brand)] text-[var(--brand-fg)] text-sm font-semibold"
              >
                Review counter →
              </Link>
            </div>
          ))}
        </section>
      )}

      <WalletHeroCard
        totalCents={balance + invested}
        deltaCents={earningsYtd}
        deltaPct={balance + invested > 0 ? (earningsYtd / (balance + invested)) * 100 : undefined}
        metrics={[
          { label: "Available", value: balance },
          { label: "Lent out", value: totalLent },
          { label: "Borrowed", value: totalBorrowed },
          { label: "Earnings YTD", value: earningsYtd },
        ]}
      />

      {/* Action cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ActionCard
          icon={HandCoins}
          title="Request a loan"
          description="Borrow €100–€2,000 from verified NCI peers. Up to 12 months."
          href="/borrow"
          ctaLabel="Request a loan"
        />
        <ActionCard
          icon={TrendingUp}
          title="Lend money"
          description="Earn up to 12% APR funding loans for NCI students."
          liveLine={
            (communityOpen ?? 0) > 0
              ? `${communityOpen} open request${communityOpen === 1 ? "" : "s"} right now.`
              : undefined
          }
          href="/invest"
          ctaLabel="Browse requests"
        />
      </section>

      {/* Demoted Auto-Invest link */}
      <div className="text-center text-sm text-[var(--ink-subtle)]">
        Looking for hands-off lending?{" "}
        <Link href="/auto-invest" className="font-semibold text-[var(--brand)] hover:underline">
          Set up Auto-Invest →
        </Link>
      </div>

      {/* Active loans (borrower + lender side) */}
      {((activeAsBorrower?.length ?? 0) > 0 || (activeAsLender?.length ?? 0) > 0) && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold">Your active loans</h2>
            <Link href="/loans" className="text-sm text-[var(--brand)] hover:underline font-medium">
              View all (active &amp; previous) →
            </Link>
          </div>
          <div className="grid gap-2">
            {activeAsBorrower?.map((l: any) => (
              <Link
                key={l.id}
                href={`/loans/${l.id}`}
                className="card-hover flex justify-between items-center p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
              >
                <div className="min-w-0">
                  <div className="font-semibold tabular">
                    Borrowing {formatEur(l.principal_cents)} · {(l.apr_bps / 100).toFixed(2)}% · {l.term_months}mo
                  </div>
                  <div className="text-sm text-[var(--ink-muted)]">
                    From {l.lender?.first_name ?? "lender"} {l.lender?.last_name?.[0] ?? ""}.
                    {" · "}{formatEur(l.monthly_payment_cents)}/mo
                    {" · "}
                    <span className="capitalize">{l.status.replaceAll("_", " ")}</span>
                  </div>
                </div>
                <div className="text-sm text-[var(--brand)] font-semibold shrink-0 ml-3">View →</div>
              </Link>
            ))}
            {activeAsLender?.map((l: any) => (
              <Link
                key={l.id}
                href={`/loans/${l.id}`}
                className="card-hover flex justify-between items-center p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
              >
                <div className="min-w-0">
                  <div className="font-semibold tabular">
                    Lending {formatEur(l.principal_cents)} · {(l.apr_bps / 100).toFixed(2)}% · {l.term_months}mo
                  </div>
                  <div className="text-sm text-[var(--ink-muted)]">
                    To {l.borrower?.first_name ?? "borrower"} {l.borrower?.last_name?.[0] ?? ""}.
                    {" · "}{formatEur(l.monthly_payment_cents)}/mo
                    {" · "}
                    <span className="capitalize">{l.status.replaceAll("_", " ")}</span>
                  </div>
                </div>
                <div className="text-sm text-[var(--brand)] font-semibold shrink-0 ml-3">View →</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My active requests */}
      {myRequests && myRequests.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Your loan requests</h2>
          <div className="grid gap-2">
            {myRequests.map((r: any) => {
              const offers = r.loan_offers ?? [];
              const pendingOffers = offers.filter((o: any) => o.status === "pending").length;
              return (
                <Link
                  key={r.id}
                  href={`/borrow/${r.id}`}
                  className="card-hover flex justify-between items-center p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
                >
                  <div>
                    <div className="font-semibold tabular">{formatEur(r.amount_cents)} · {r.requested_term_months}mo</div>
                    <div className="text-sm text-[var(--ink-muted)] capitalize">
                      {r.purpose.replaceAll("_", " ")} · {r.status.replaceAll("_", " ")}
                    </div>
                  </div>
                  <div className="text-right">
                    {pendingOffers > 0 ? (
                      <div className="text-sm font-bold text-[var(--brand)]">
                        {pendingOffers} pending offer{pendingOffers === 1 ? "" : "s"}
                      </div>
                    ) : (
                      <div className="text-sm text-[var(--ink-muted)]">
                        {offers.length > 0 ? "No pending offers" : "Awaiting offers"}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Two-column activity row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link href="/transactions" className="text-sm text-[var(--brand)] hover:underline font-medium">View all →</Link>
          </div>
          {recentLedger && recentLedger.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {recentLedger.map(l => (
                <li key={l.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium capitalize">{l.entry_type.replaceAll("_", " ")}</div>
                    <div className="text-xs text-[var(--ink-subtle)]">{l.description ?? "—"}</div>
                  </div>
                  <div className={`tabular text-sm font-semibold ${l.amount_cents >= 0 ? "text-[var(--success)]" : "text-[var(--ink)]"}`}>
                    {l.amount_cents >= 0 ? "+" : ""}{formatEur(l.amount_cents)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--ink-muted)]">No activity yet — top up your wallet to begin.</p>
              <LinkButton href="/deposit" size="sm" variant="secondary" className="mt-4">
                <Plus size={14} /> Deposit funds
              </LinkButton>
            </div>
          )}
        </Card>

        <Card padding="md">
          <h2 className="text-lg font-semibold mb-3">Your community</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-[var(--ink-muted)]">Open loan requests</span>
              <span className="font-semibold tabular">{communityOpen ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--ink-muted)]">Active loans</span>
              <span className="font-semibold tabular">{communityActiveLoans ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--ink-muted)]">Lent this week</span>
              <span className="font-semibold tabular">{formatEur(lentThisWeek)}</span>
            </li>
          </ul>
          {openRequests && openRequests.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="text-xs text-[var(--ink-subtle)] uppercase tracking-wide mb-2">Top requests</div>
              <ul className="space-y-2">
                {openRequests.map(r => (
                  <li key={r.id} className="flex items-center justify-between">
                    <Link href={`/invest/${r.id}`} className="text-sm hover:text-[var(--brand)] tabular">
                      {formatEur(r.amount_cents)}
                    </Link>
                    <ScoreBadge score={r.score_at_request} size="sm" withDots={false} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
