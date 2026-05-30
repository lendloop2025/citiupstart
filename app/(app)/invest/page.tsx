import Link from "next/link";
import { ArrowRight, Filter } from "lucide-react";
import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/score-badge";

type SortKey = "newest" | "amount" | "term" | "score" | "apr";

function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (m < 60) return `${Math.max(1, Math.round(m))}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default async function InvestPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | undefined>> }>) {
  const sp = await searchParams;
  const sort = (sp.sort ?? "newest") as SortKey;
  const purpose = sp.purpose ?? "all";
  const minScore = sp.min_score ? Number(sp.min_score) : 0;

  const { user, profile } = await requireVerified();
  const svc = createService();

  const [{ data: wallet }, { count: activeLoanCount }, { data: lenderLoans }] = await Promise.all([
    svc.from("wallets").select("available_balance_cents").eq("user_id", user.id).single(),
    svc.from("loans").select("id", { count: "exact", head: true }).eq("lender_id", user.id).neq("status", "paid_off"),
    svc.from("loans").select("principal_cents").eq("lender_id", user.id),
  ]);
  const totalLent = lenderLoans?.reduce((s, l) => s + l.principal_cents, 0) ?? 0;

  let query = svc.from("loan_requests")
    .select("id, amount_cents, requested_term_months, max_apr_bps, purpose, score_at_request, posted_at, funded_amount_cents")
    .eq("community_id", profile.community_id)
    .in("status", ["open", "partially_funded"])
    .neq("borrower_id", user.id)
    .gte("score_at_request", minScore);

  if (purpose !== "all") query = query.eq("purpose", purpose as any);

  switch (sort) {
    case "amount": query = query.order("amount_cents", { ascending: false }); break;
    case "term":   query = query.order("requested_term_months", { ascending: true }); break;
    case "score":  query = query.order("score_at_request", { ascending: false }); break;
    case "apr":    query = query.order("max_apr_bps", { ascending: false }); break;
    default:       query = query.order("posted_at", { ascending: false });
  }

  const { data: requests } = await query;

  const purposes = ["all", "tuition_topup", "laptop_equipment", "emergency", "living_expenses", "travel_home", "other"];

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight leading-[1.1]">Lend money</h1>
          <p className="text-[var(--ink-muted)] mt-2 max-w-2xl">
            Earn returns by funding loans for verified NCI peers. You set the APR, you pick the term.
          </p>
        </div>

        {/* Stats strip — pill-style row */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-pill)] shadow-[var(--shadow-sm)] flex flex-wrap items-center gap-x-8 gap-y-2 px-6 py-3 text-sm">
          <Stat label="Active loans" value={String(activeLoanCount ?? 0)} />
          <span className="hidden sm:inline w-px h-5 bg-[var(--border)]" />
          <Stat label="Total lent" value={formatEur(totalLent)} mono />
          <span className="hidden sm:inline w-px h-5 bg-[var(--border)]" />
          <Stat label="Wallet" value={formatEur(wallet?.available_balance_cents ?? 0)} mono />
          <Link href="/auto-invest" className="ml-auto text-[var(--brand)] font-semibold hover:underline">
            Auto-Invest →
          </Link>
        </div>
      </header>

      {/* Sticky filter bar */}
      <div className="sticky top-[72px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-[var(--bg)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg)]/80 border-b border-[var(--border)] py-3">
        <form className="flex flex-wrap items-end gap-2">
          <PillSelect name="sort" defaultValue={sort} options={[
            { v: "newest", l: "Newest" },
            { v: "amount", l: "Largest amount" },
            { v: "term", l: "Shortest term" },
            { v: "score", l: "Highest score" },
            { v: "apr", l: "Highest APR" },
          ]} />
          <PillSelect name="purpose" defaultValue={purpose} options={purposes.map(p => ({ v: p, l: p === "all" ? "All purposes" : p.replaceAll("_", " ") }))} />
          <PillNumber name="min_score" placeholder="Min score" defaultValue={minScore || ""} />
          <Button type="submit" variant="primary" size="sm" pill>
            <Filter size={14} /> Apply
          </Button>
        </form>
      </div>

      {requests?.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {requests.map(r => {
            const fundedPct = Math.min(100, ((r.funded_amount_cents ?? 0) / r.amount_cents) * 100);
            return (
              <Link key={r.id} href={`/invest/${r.id}`} className="group">
                <Card hover padding="md" className="h-full flex flex-col rounded-[var(--radius-lg)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[var(--text-h2)] font-bold tabular text-[var(--ink)] leading-none">{formatEur(r.amount_cents)}</div>
                      <div className="text-sm text-[var(--ink)] capitalize mt-2 font-medium">{r.purpose.replaceAll("_", " ")}</div>
                    </div>
                    <ScoreBadge score={r.score_at_request} />
                  </div>

                  <div className="my-5 h-px bg-[var(--border)]" />

                  <dl className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-[var(--ink-muted)]">Term</dt>
                      <dd className="font-medium tabular">{r.requested_term_months} months</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--ink-muted)]">Max APR</dt>
                      <dd className="font-medium tabular">{(r.max_apr_bps / 100).toFixed(1)}%</dd>
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <dt className="text-[var(--ink-muted)]">Funded</dt>
                        <dd className="font-medium tabular">{fundedPct.toFixed(0)}%</dd>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-[var(--bg-alt)] overflow-hidden">
                        <div className="h-full bg-[var(--brand)]" style={{ width: `${fundedPct}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--ink-muted)]">Posted</dt>
                      <dd className="text-[var(--ink-subtle)]">{timeAgo(r.posted_at)}</dd>
                    </div>
                  </dl>

                  <div className="mt-6 pt-5 border-t border-[var(--border)]">
                    <span className="inline-flex w-full items-center justify-center gap-2 h-11 rounded-[var(--radius-sm)] bg-[var(--brand)] text-[var(--brand-fg)] font-semibold transition group-hover:bg-[var(--brand-hover)]">
                      Make an offer <ArrowRight size={16} />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card padding="lg">
          <div className="py-10 text-center">
            <h3 className="text-lg font-semibold">No open requests match your filters</h3>
            <p className="text-sm text-[var(--ink-muted)] mt-2">Try widening the score range or clearing the purpose filter.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, mono }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div>
      <span className="text-[var(--ink-subtle)] text-xs uppercase tracking-wide mr-2">{label}</span>
      <span className={`font-semibold ${mono ? "tabular" : ""}`}>{value}</span>
    </div>
  );
}

function PillSelect({
  name,
  defaultValue,
  options,
}: Readonly<{
  name: string;
  defaultValue: string;
  options: { v: string; l: string }[];
}>) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="!h-10 !px-4 !rounded-[var(--radius-pill)] !border-[1.5px] !w-auto !min-w-[160px] capitalize"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}

function PillNumber({
  name,
  placeholder,
  defaultValue,
}: Readonly<{ name: string; placeholder: string; defaultValue: string | number }>) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      className="!h-10 !px-4 !rounded-[var(--radius-pill)] !border-[1.5px] !w-[140px]"
    />
  );
}
